import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearPestanaPlantilla } from '@/lib/google-sheets/sheets-client'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: plantilla } = await supabase
    .from('plantillas_generadas')
    .select('*')
    .eq('id', params.id)
    .eq('estado', 'borrador')
    .single()

  if (!plantilla) {
    return NextResponse.json({ error: 'Borrador no encontrado' }, { status: 404 })
  }

  const { data: filas } = await supabase
    .from('plantilla_pacientes')
    .select('*')
    .eq('plantilla_id', plantilla.id)
    .order('orden')

  const idsPacientes = (filas ?? []).map((f: any) => f.paciente_id)
  const { data: datosPacientes } = await supabase
    .from('pacientes')
    .select('*')
    .in('id', idsPacientes)

  const { data: configSheet } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'google_sheets_file_id')
    .single()

  const spreadsheetId = configSheet?.valor
  if (!spreadsheetId) {
    return NextResponse.json({ error: 'No hay archivo de Sheets configurado' }, { status: 500 })
  }

  try {
    const sheetsUrl = await crearPestanaPlantilla({
      spreadsheetId,
      nombreHoja: plantilla.nombre_hoja,
      auxiliarNombre: plantilla.auxiliar_nombre,
      transportistaNombre: plantilla.transportista_nombre,
      pacientes: (filas ?? []).map((f: any) => ({
        ...datosPacientes?.find((d) => d.id === f.paciente_id),
        ...f,
      })),
    })

    await supabase
      .from('plantillas_generadas')
      .update({ estado: 'en_progreso', google_sheets_url: sheetsUrl })
      .eq('id', plantilla.id)

    return NextResponse.json({ sheetsUrl })
  } catch (e) {
    console.error('Error reintentando Sheets:', e)
    return NextResponse.json(
      { error: 'Sigue fallando. Tu borrador sigue guardado, intenta mas tarde.' },
      { status: 502 }
    )
  }
}