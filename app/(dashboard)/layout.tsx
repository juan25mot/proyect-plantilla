import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { getPerfilActual } from '@/lib/auth/get-perfil'
import { PerfilProvider } from '@/lib/auth/PerfilContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, perfil } = await getPerfilActual()

  if (!user || !perfil || !perfil.activo) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <PerfilProvider perfil={{ userId: user.id, nombre: perfil.nombre, rol: perfil.rol }}>
      <div className="min-h-screen w-full bg-white flex">
        <Sidebar rol={perfil.rol} />
        <div className="flex-1 flex flex-col">
          <Navbar nombre={perfil.nombre} rol={perfil.rol} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </PerfilProvider>
  )
}