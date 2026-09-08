import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfilAdmin } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user?.id)
    .single()

  if (perfilAdmin?.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { password } = await request.json()

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: 'La contrasena debe tener al menos 6 caracteres' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(params.id, { password })

  if (error) {
    return NextResponse.json({ error: 'No se pudo cambiar la contrasena' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}