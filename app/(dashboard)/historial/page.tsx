import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FilaPlantilla } from '@/components/historial/FilaPlantilla'

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ borrador?: string; destacar?: string }>
}) {
  const { borrador, destacar } = await searchParams
  const destacarId = borrador ?? destacar

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user!.id)
    .single()

  if (!perfil || !['admin', 'operario'].includes(perfil.rol)) {
    redirect('/')
  }

  const { data: plantillas } = await supabase
    .from('plantillas_generadas')
    .select(
      'id, nombre_hoja, fecha_ruta, fecha_generacion, auxiliar_nombre, transportista_nombre, estado, google_sheets_url, plantilla_pacientes(count)'
    )
    .order('fecha_generacion', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Historial</h1>
        <p className="text-sm text-slate-500">
          Plantillas generadas, mas recientes primero
        </p>
      </div>

      {(!plantillas || plantillas.length === 0) && (
        <p className="text-sm text-slate-400">
          Aun no se ha generado ninguna plantilla.
        </p>
      )}

      <div className="space-y-2">
        {(plantillas ?? []).map((p: any) => (
          <FilaPlantilla key={p.id} plantilla={p} destacada={p.id === destacarId} />
        ))}
      </div>
    </div>
  )
}