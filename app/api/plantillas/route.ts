import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearPestanaPlantilla } from '@/lib/google-sheets/sheets-client'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'operario'].includes(perfil.rol)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { auxiliar_id, transportista_id, fecha_ruta, pacientes } = body

  if (
    !auxiliar_id || !transportista_id || !fecha_ruta ||
    !Array.isArray(pacientes) || pacientes.length === 0
  ) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const idsPacientes = pacientes.map((p: any) => p.paciente_id)

  // Antes esto eran 4 idas y vueltas seguidas a la base de datos.
  // Ninguna depende de otra para EMPEZAR, asi que se disparan todas juntas.
  const [usuariosRes, rutasMismoDiaRes, pacientesRes, configRes] = await Promise.all([
    supabase.from('perfiles').select('id, nombre').in('id', [auxiliar_id, transportista_id]),
    supabase
      .from('plantillas_generadas')
      .select('id, nombre_hoja')
      .eq('transportista_id', transportista_id)
      .eq('fecha_ruta', fecha_ruta)
      .limit(1),
    supabase.from('pacientes').select('*').in('id', idsPacientes),
    supabase.from('configuracion').select('valor').eq('clave', 'google_sheets_file_id').single(),
  ])

  if (rutasMismoDiaRes.data && rutasMismoDiaRes.data.length > 0) {
    return NextResponse.json(
      {
        error: `Este transportista ya tiene una ruta asignada para el ${fecha_ruta} ("${rutasMismoDiaRes.data[0].nombre_hoja}"). Compléta o elimínala antes de generar otra para ese día.`,
      },
      { status: 409 }
    )
  }

  const datosPacientes = pacientesRes.data
  if (pacientesRes.error || !datosPacientes) {
    return NextResponse.json({ error: 'No se pudieron leer los pacientes' }, { status: 500 })
  }

  const auxiliarNombre = usuariosRes.data?.find((u) => u.id === auxiliar_id)?.nombre ?? ''
  const transportistaNombre = usuariosRes.data?.find((u) => u.id === transportista_id)?.nombre ?? ''
  const spreadsheetId = configRes.data?.valor

  const nombreHoja = `${transportistaNombre} - ${new Date(
    `${fecha_ruta}T00:00:00`
  ).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`

  const { data: plantilla, error: errorPlantilla } = await supabase
    .from('plantillas_generadas')
    .insert({
      auxiliar_id, auxiliar_nombre: auxiliarNombre,
      transportista_id, transportista_nombre: transportistaNombre,
      fecha_ruta, generado_por: user.id,
      nombre_hoja: nombreHoja, estado: 'borrador',
    })
    .select()
    .single()

  if (errorPlantilla || !plantilla) {
    return NextResponse.json({ error: 'No se pudo crear la plantilla' }, { status: 500 })
  }

  const filas = pacientes.map((p: any) => {
    const datos = datosPacientes.find((d) => d.id === p.paciente_id)
    return {
      plantilla_id: plantilla.id,
      paciente_id: p.paciente_id,
      orden: p.orden,
      observaciones_jornada: p.observaciones_jornada ?? '',
      resultados_enviados: p.resultados_enviados ?? '',
      telefono_snapshot: [datos?.telefono, datos?.telefono2].filter(Boolean).join(' / '),
    }
  })

  const { error: errorFilas } = await supabase.from('plantilla_pacientes').insert(filas)

  if (errorFilas) {
    await supabase.from('plantillas_generadas').delete().eq('id', plantilla.id)
    return NextResponse.json(
      { error: 'No se pudieron guardar los pacientes de la plantilla' },
      { status: 500 }
    )
  }

  // Antes eran DOS Promise.all separados (observacion, luego direccion).
  // Se combinan en un solo update por paciente, con ambos campos si aplican.
  const actualizacionesFicha = pacientes
    .map((p: any) => {
      const cambios: Record<string, string> = {}
      if (p.observaciones_jornada?.trim()) cambios.observacion = p.observaciones_jornada
      if (p.direccion?.trim()) cambios.direccion = p.direccion
      return { id: p.paciente_id, cambios }
    })
    .filter((c) => Object.keys(c.cambios).length > 0)
    .map((c) => supabase.from('pacientes').update(c.cambios).eq('id', c.id))

  const direccionesEditadas = new Map(pacientes.map((p: any) => [p.paciente_id, p.direccion]))
  const datosPacientesActualizados = datosPacientes.map((d) => ({
    ...d,
    direccion: direccionesEditadas.get(d.id)?.trim() || d.direccion,
  }))

  // Se lanza en paralelo con la generacion de Sheets - no hay que esperarla
  // para poder seguir, ya que Sheets usa los datos ya actualizados en memoria.
  const actualizacionFichaPromise = actualizacionesFicha.length > 0
    ? Promise.all(actualizacionesFicha)
    : Promise.resolve()

  const [resultado] = await Promise.all([
    intentarGenerarSheets(supabase, plantilla.id, spreadsheetId, {
      nombreHoja, auxiliarNombre, transportistaNombre,
      filas, datosPacientes: datosPacientesActualizados,
    }),
    actualizacionFichaPromise,
  ])

  if (!resultado.ok) {
    return NextResponse.json(
      {
        plantillaId: plantilla.id,
        borrador: true,
        error: 'No se pudo generar la hoja en Google Sheets. Tu selección quedó guardada como borrador — puedes reintentar sin perder nada.',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ plantillaId: plantilla.id, sheetsUrl: resultado.sheetsUrl })
}

async function intentarGenerarSheets(
  supabase: any,
  plantillaId: string,
  spreadsheetId: string | undefined,
  datos: {
    nombreHoja: string
    auxiliarNombre: string
    transportistaNombre: string
    filas: any[]
    datosPacientes: any[]
  }
) {
  if (!spreadsheetId) return { ok: false }

  let resultadoSheets: { url: string; nombreHoja: string } | null = null

  for (let intento = 1; intento <= 2; intento++) {
    try {
      resultadoSheets = await crearPestanaPlantilla({
        spreadsheetId,
        nombreHoja: datos.nombreHoja,
        auxiliarNombre: datos.auxiliarNombre,
        transportistaNombre: datos.transportistaNombre,
        pacientes: datos.filas.map((f) => ({
          ...datos.datosPacientes.find((d) => d.id === f.paciente_id),
          ...f,
        })),
      })
      break
    } catch (e) {
      if (intento === 2) console.error('Error generando hoja de Google Sheets:', e)
    }
  }

  if (!resultadoSheets) return { ok: false }

  await supabase
    .from('plantillas_generadas')
    .update({
      estado: 'en_progreso',
      google_sheets_url: resultadoSheets.url,
      nombre_hoja: resultadoSheets.nombreHoja,
    })
    .eq('id', plantillaId)

  return { ok: true, sheetsUrl: resultadoSheets.url }
}