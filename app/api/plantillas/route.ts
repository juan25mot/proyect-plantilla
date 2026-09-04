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
        !auxiliar_id ||
        !transportista_id ||
        !fecha_ruta ||
        !Array.isArray(pacientes) ||
        pacientes.length === 0
    ) {
        return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const { data: usuarios } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .in('id', [auxiliar_id, transportista_id])

    const auxiliarNombre = usuarios?.find((u) => u.id === auxiliar_id)?.nombre ?? ''
    const transportistaNombre = usuarios?.find((u) => u.id === transportista_id)?.nombre ?? ''

    // Un transportista no puede tener dos rutas el mismo dia
    // (independiente del dia en que se generen)
    const { data: rutasMismoDia } = await supabase
        .from('plantillas_generadas')
        .select('id, nombre_hoja')
        .eq('transportista_id', transportista_id)
        .eq('fecha_ruta', fecha_ruta)
        .limit(1)

    if (rutasMismoDia && rutasMismoDia.length > 0) {
        return NextResponse.json(
            {
                error: `Este transportista ya tiene una ruta asignada para el ${fecha_ruta} ("${rutasMismoDia[0].nombre_hoja}"). Complétala o elimínala antes de generar otra para ese día.`,
            },
            { status: 409 }
        )
    }

    const idsPacientes = pacientes.map((p: any) => p.paciente_id)
    const { data: datosPacientes, error: errorPacientes } = await supabase
        .from('pacientes')
        .select('*')
        .in('id', idsPacientes)

    if (errorPacientes || !datosPacientes) {
        return NextResponse.json({ error: 'No se pudieron leer los pacientes' }, { status: 500 })
    }

    const nombreHoja = `${transportistaNombre} - ${new Date(
        `${fecha_ruta}T00:00:00`
    ).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`

    // 1. Se crea como 'borrador' - si algo falla despues, esto ya quedo guardado
    const { data: plantilla, error: errorPlantilla } = await supabase
        .from('plantillas_generadas')
        .insert({
            auxiliar_id,
            auxiliar_nombre: auxiliarNombre,
            transportista_id,
            transportista_nombre: transportistaNombre,
            fecha_ruta,
            generado_por: user.id,
            nombre_hoja: nombreHoja,
            estado: 'borrador',
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
        // Aqui si no queda nada util guardado (fallo antes de tener pacientes asociados) - se borra
        await supabase.from('plantillas_generadas').delete().eq('id', plantilla.id)
        return NextResponse.json(
            { error: 'No se pudieron guardar los pacientes de la plantilla' },
            { status: 500 }
        )
    }

    // Actualiza la ficha del paciente con la observacion mas reciente de esta jornada.
    // No borra la nota anterior si esta jornada se dejo en blanco - solo actualiza
    // cuando hay contenido nuevo que escribir.
    const actualizacionesObservacion = filas
        .filter((f) => f.observaciones_jornada && f.observaciones_jornada.trim() !== '')
        .map((f) =>
            supabase
                .from('pacientes')
                .update({ observacion: f.observaciones_jornada })
                .eq('id', f.paciente_id))
    if (actualizacionesObservacion.length > 0) {
        await Promise.all(actualizacionesObservacion)
    }

    // 2. A partir de aqui, el "borrador" ya es recuperable pase lo que pase con Sheets
    const resultado = await intentarGenerarSheets(supabase, plantilla.id, {
        nombreHoja,
        auxiliarNombre,
        transportistaNombre,
        filas,
        datosPacientes,
    })

    if (!resultado.ok) {
        return NextResponse.json(
            {
                plantillaId: plantilla.id,
                borrador: true,
                error:
                    'No se pudo generar la hoja en Google Sheets. Tu seleccion quedo guardada como borrador — puedes reintentar sin perder nada.',
            },
            { status: 502 }
        )
    }

    return NextResponse.json({ plantillaId: plantilla.id, sheetsUrl: resultado.sheetsUrl })
}

async function intentarGenerarSheets(
    supabase: any,
    plantillaId: string,
    datos: {
        nombreHoja: string
        auxiliarNombre: string
        transportistaNombre: string
        filas: any[]
        datosPacientes: any[]
    }
) {
    const { data: configSheet } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'google_sheets_file_id')
        .single()

    const spreadsheetId = configSheet?.valor
    if (!spreadsheetId) return { ok: false }

    let sheetsUrl: string | null = null

    for (let intento = 1; intento <= 2; intento++) {
        try {
            sheetsUrl = await crearPestanaPlantilla({
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

    if (!sheetsUrl) return { ok: false }

    await supabase
        .from('plantillas_generadas')
        .update({ estado: 'en_progreso', google_sheets_url: sheetsUrl })
        .eq('id', plantillaId)

    return { ok: true, sheetsUrl }
}