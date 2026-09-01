import { createClient } from '@/lib/supabase/server'
import { RutaDelDia } from '@/components/ruta/RutaDelDia'
import { Card, CardContent } from '@/components/ui/card'

export default async function RutaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user!.id)
    .single()

  const rol = perfil?.rol ?? ''
  const soloLectura = rol === 'auxiliar' || rol === 'admin'

  // Transportista ve su propia ruta; auxiliar ve la ruta donde lo asignaron como auxiliar
  const columnaFiltro = rol === 'transportista' ? 'transportista_id' : 'auxiliar_id'

  const { data: plantilla } = await supabase
    .from('plantillas_generadas')
    .select('id, nombre_hoja')
    .eq(columnaFiltro, user!.id)
    .eq('estado', 'en_progreso')
    .maybeSingle()

  if (!plantilla) {
    return (
      <Card className="border-slate-200 shadow-sm max-w-lg">
        <CardContent className="py-10 text-center text-slate-500">
          No tienes una ruta activa en este momento.
        </CardContent>
      </Card>
    )
  }

  const { data: paradas } = await supabase
    .from('plantilla_pacientes')
    .select(
      `id, orden, completado, observaciones_jornada, telefono_snapshot,
       paciente:pacientes ( primer_nombre, primer_apellido, direccion )`
    )
    .eq('plantilla_id', plantilla.id)
    .order('orden')

  return (
    <RutaDelDia
      plantillaId={plantilla.id}
      nombreHoja={plantilla.nombre_hoja}
      paradasIniciales={(paradas ?? []) as any}
      soloLectura={soloLectura}
    />
  )
}