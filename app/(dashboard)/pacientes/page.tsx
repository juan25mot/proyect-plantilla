import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListaPacientes } from '@/components/pacientes/ListaPacientes'
import { getPerfilActual } from '@/lib/auth/get-perfil'

const TAMANO_INICIAL = 10

export default async function PacientesPage() {
  const { user, perfil } = await getPerfilActual()

  if (perfil?.rol !== 'admin') {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: pacientesIniciales, count } = await supabase
    .from('pacientes')
    .select('id, primer_nombre, primer_apellido, documento, municipio, telefono, activo', {
      count: 'exact',
    })
    .eq('activo', true)
    .order('primer_apellido')
    .range(0, TAMANO_INICIAL - 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
        <p className="text-sm text-slate-500">
          Gestion completa de la base de datos de pacientes
        </p>
      </div>
      <ListaPacientes
        pacientesIniciales={pacientesIniciales ?? []}
        totalInicial={count ?? 0}
      />
    </div>
  )
}