import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConfiguracionForm } from '@/components/configuracion/ConfiguracionForm'

export default async function ConfiguracionPage() {
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

  const { data: config } = await supabase
    .from('configuracion')
    .select('clave, valor')

  const valores = Object.fromEntries(
    (config ?? []).map((c) => [c.clave, c.valor])
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuracion</h1>
        <p className="text-sm text-slate-500">
          Parametros generales del sistema
        </p>
      </div>
      <ConfiguracionForm valoresIniciales={valores} />
    </div>
  )
}