import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConfiguracionForm } from '@/components/configuracion/ConfiguracionForm'
import { getPerfilActual } from '@/lib/auth/get-perfil'

export default async function ConfiguracionPage() {
  const { user, perfil } = await getPerfilActual()

  if (perfil?.rol !== 'admin') {
    redirect('/')
  }

  const supabase = await createClient()

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