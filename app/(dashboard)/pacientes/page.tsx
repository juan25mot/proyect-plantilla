import { redirect } from 'next/navigation'
import { ListaPacientes } from '@/components/pacientes/ListaPacientes'
import { getPerfilActual } from '@/lib/auth/get-perfil'

export default async function PacientesPage() {
  const { user, perfil } = await getPerfilActual()

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