import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verificarAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, status: 401, error: 'No autenticado' }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') {
    return { ok: false as const, status: 403, error: 'No autorizado' }
  }

  return { ok: true as const }
}

export async function POST(request: Request) {
  const check = await verificarAdmin()
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status })
  }

  const { email, password, nombre, rol } = await request.json()

  if (!email || !password || !nombre || !rol) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: nuevoUsuario, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // el admin ya lo esta validando, no necesita confirmar por correo
  })

  if (errorAuth || !nuevoUsuario.user) {
    return NextResponse.json(
      { error: errorAuth?.message ?? 'No se pudo crear el usuario en Auth' },
      { status: 500 }
    )
  }

  const { error: errorPerfil } = await admin.from('perfiles').insert({
    id: nuevoUsuario.user.id,
    nombre,
    rol,
    activo: true,
  })

  if (errorPerfil) {
    // Si fallo el perfil, no dejamos un usuario de Auth huerfano sin perfil
    await admin.auth.admin.deleteUser(nuevoUsuario.user.id)
    return NextResponse.json(
      { error: 'No se pudo crear el perfil del usuario' },
      { status: 500 }
    )
  }

  return NextResponse.json({ id: nuevoUsuario.user.id })
}