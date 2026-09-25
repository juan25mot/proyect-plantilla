import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListaUsuarios } from '@/components/usuarios/ListaUsuarios'
import { getPerfilActual } from '@/lib/auth/get-perfil'

export default async function UsuariosPage() {
  const { user, perfil } = await getPerfilActual()

  if (perfil?.rol !== 'admin') {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: usuariosIniciales } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, activo')
    .order('nombre')
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Gestion de cuentas del equipo y sus roles
        </p>
      </div>
      <ListaUsuarios miPropioId={user!.id} usuariosIniciales={usuariosIniciales ?? []} />
    </div>
  )
}