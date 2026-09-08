import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListaUsuarios } from '@/components/usuarios/ListaUsuarios'

export default async function UsuariosPage() {
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
        <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Gestion de cuentas del equipo y sus roles
        </p>
      </div>
      <ListaUsuarios miPropioId={user!.id} />
    </div>
  )
}