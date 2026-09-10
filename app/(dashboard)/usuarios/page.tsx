import { redirect } from 'next/navigation'
import { ListaUsuarios } from '@/components/usuarios/ListaUsuarios'
import { getPerfilActual } from '@/lib/auth/get-perfil'

export default async function UsuariosPage() {
  const { user, perfil } = await getPerfilActual()


  if (perfil?.rol !== 'admin') {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Gestion de cuentas del equipo y sus roles
        </p>
      </div>
      <ListaUsuarios miPropioId={user!.id} />
    </div>
  )
}