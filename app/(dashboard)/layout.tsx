import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
  .from('perfiles')
  .select('nombre, rol, activo')
  .eq('id', user.id)
  .single()

  // Si no tiene perfil o esta inactivo, no dejarlo entrar
  if (!perfil || !perfil.activo) {
  await supabase.auth.signOut()
  redirect('/login')
}

  return (
    <div className="min-h-screen w-full bg-white flex">
      <Sidebar rol={perfil.rol} />
      <div className="flex-1 flex flex-col">
        <Navbar nombre={perfil.nombre} rol={perfil.rol} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}