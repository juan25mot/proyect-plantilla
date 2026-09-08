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

  const { activar } = await request.json()

  if (params.id === user?.id && !activar) {
    return NextResponse.json(
      { error: 'No puedes desactivar tu propia cuenta.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { error: errorBan } = await admin.auth.admin.updateUserById(params.id, {
    ban_duration: activar ? 'none' : '876000h', // "none" = quitar el baneo
  })

  if (errorBan) {
    return NextResponse.json({ error: 'No se pudo actualizar el acceso' }, { status: 500 })
  }

  await admin.from('perfiles').update({ activo: activar }).eq('id', params.id)

  return NextResponse.json({ ok: true })
}