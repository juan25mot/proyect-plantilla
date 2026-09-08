import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListaPacientes } from '@/components/pacientes/ListaPacientes'

export default async function PacientesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user!.id)
    .single()

  if (perfil?.rol !== 'admin') {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
        <p className="text-sm text-slate-500">
          Gestion completa de la base de datos de pacientes
        </p>
      </div>
      <ListaPacientes />
    </div>
  )
}