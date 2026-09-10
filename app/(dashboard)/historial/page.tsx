import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FilaPlantilla } from '@/components/historial/FilaPlantilla'
import { getPerfilActual } from '@/lib/auth/get-perfil'

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ borrador?: string; destacar?: string }>
}) {
  const { borrador, destacar } = await searchParams
  const destacarId = borrador ?? destacar

  const { user, perfil } = await getPerfilActual()
  
  if (!perfil || !['admin', 'operario'].includes(perfil.rol)) {
    redirect('/')
  }

  const supabase = await createClient()

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