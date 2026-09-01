import Link from 'next/link'
import {
  FileSpreadsheet,
  Route,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

function formatRelativo(fecha: string) {
  const diffMs = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Hace un momento'
  if (min < 60) return `Hace ${min} minuto${min === 1 ? '' : 's'}`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `Hace ${horas} hora${horas === 1 ? '' : 's'}`
  const dias = Math.floor(horas / 24)
  return `Hace ${dias} dia${dias === 1 ? '' : 's'}`
}

async function getStatsGestor(supabase: any) {
  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)

  const inicioAyer = new Date(inicioHoy)
  inicioAyer.setDate(inicioAyer.getDate() - 1)

  const [
    pacientesRes,
    plantillasHoyRes,
    plantillasAyerRes,
    enProgresoRes,
    actividadRes,
  ] = await Promise.all([
    supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true),
    supabase
      .from('plantillas_generadas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_generacion', inicioHoy.toISOString()),
    supabase
      .from('plantillas_generadas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_generacion', inicioAyer.toISOString())
      .lt('fecha_generacion', inicioHoy.toISOString()),
    supabase
      .from('plantillas_generadas')
      .select('id')
      .eq('estado', 'en_progreso'),
    supabase
      .from('plantillas_generadas')
      .select('id, nombre_hoja, estado, fecha_generacion, transportista_nombre')
      .order('fecha_generacion', { ascending: false })
      .limit(4),
  ])

  let totalRuta = 0
  let completadosRuta = 0
  const idsEnProgreso = (enProgresoRes.data ?? []).map((p: any) => p.id)

  if (idsEnProgreso.length > 0) {
    const [{ count: total }, { count: completados }] = await Promise.all([
      supabase
        .from('plantilla_pacientes')
        .select('*', { count: 'exact', head: true })
        .in('plantilla_id', idsEnProgreso),
      supabase
        .from('plantilla_pacientes')
        .select('*', { count: 'exact', head: true })
        .in('plantilla_id', idsEnProgreso)
        .eq('completado', true),
    ])
    totalRuta = total ?? 0
    completadosRuta = completados ?? 0
  }

  return {
    pacientesActivos: pacientesRes.count ?? 0,
    plantillasHoy: plantillasHoyRes.count ?? 0,
    diffVsAyer: (plantillasHoyRes.count ?? 0) - (plantillasAyerRes.count ?? 0),
    totalRuta,
    completadosRuta,
    actividad: actividadRes.data ?? [],
  }
}

async function getStatsTransportista(supabase: any, userId: string) {
  const { data: plantilla } = await supabase
    .from('plantillas_generadas')
    .select('id, nombre_hoja')
    .eq('transportista_id', userId)
    .eq('estado', 'en_progreso')
    .maybeSingle()

  if (!plantilla) {
    return { tieneRuta: false, total: 0, completados: 0, nombreHoja: null }
  }

  const [{ count: total }, { count: completados }] = await Promise.all([
    supabase
      .from('plantilla_pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('plantilla_id', plantilla.id),
    supabase
      .from('plantilla_pacientes')
      .select('*', { count: 'exact', head: true })
      .eq('plantilla_id', plantilla.id)
      .eq('completado', true),
  ])

  return {
    tieneRuta: true,
    total: total ?? 0,
    completados: completados ?? 0,
    nombreHoja: plantilla.nombre_hoja,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user!.id)
    .single()

  const rol = perfil?.rol ?? 'auxiliar'
  const esGestor = rol === 'admin' || rol === 'operario'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {esGestor ? 'Panel Principal' : `Hola, ${perfil?.nombre}`}
          </h1>
          <p className="text-sm text-slate-500">
            {esGestor
              ? 'Resumen operativo del sistema CIADES I.P.S'
              : 'Estado de tu ruta de hoy'}
          </p>
        </div>

        {esGestor && (
          <Link
            href="/generador"
            className="inline-flex items-center gap-2 rounded-md bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </Link>
        )}
      </div>

      {esGestor ? (
        <DashboardGestor supabase={supabase} />
      ) : (
        <DashboardTransportista supabase={supabase} userId={user!.id} />
      )}
    </div>
  )
}

async function DashboardGestor({ supabase }: { supabase: any }) {
  const stats = await getStatsGestor(supabase)
  const porcentajeRuta =
    stats.totalRuta > 0
      ? Math.round((stats.completadosRuta / stats.totalRuta) * 100)
      : 0

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Plantillas Hoy
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-[#dc2626]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.plantillasHoy}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.diffVsAyer >= 0 ? '+' : ''}
              {stats.diffVsAyer} respecto a ayer
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ruta del Dia
            </CardTitle>
            <Route className="h-4 w-4 text-[#0e1b38]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.totalRuta} Pacientes
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.completadosRuta} completados &bull;{' '}
              {stats.totalRuta - stats.completadosRuta} pendientes
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completados
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {porcentajeRuta}%
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              Avance de la jornada
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pacientes
            </CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {stats.pacientesActivos}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registrados en sistema
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">
              Gestion de Operaciones
            </CardTitle>
            <CardDescription>
              Acceso directo a las herramientas de trabajo diario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/generador"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-[#dc2626]" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Generador de Plantillas
                  </p>
                  <p className="text-xs text-slate-500">
                    Creacion e impresion masiva
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/historial"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-[#0e1b38]" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Historial
                  </p>
                  <p className="text-xs text-slate-500">
                    Plantillas generadas y su estado
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800">
              Ultima Actividad
            </CardTitle>
            <CardDescription>
              Plantillas generadas mas recientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.actividad.length === 0 && (
              <p className="text-sm text-slate-400">
                Aun no se han generado plantillas.
              </p>
            )}
            {stats.actividad.map((item: any, i: number) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 text-sm ${
                  i > 0 ? 'border-t border-slate-100 pt-3' : ''
                }`}
              >
                <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">
                    {item.nombre_hoja}{' '}
                    {item.estado === 'completada'
                      ? '(completada)'
                      : '(en progreso)'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatRelativo(item.fecha_generacion)}
                    {item.transportista_nombre
                      ? ` \u2022 ${item.transportista_nombre}`
                      : ''}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

async function DashboardTransportista({
  supabase,
  userId,
}: {
  supabase: any
  userId: string
}) {
  const stats = await getStatsTransportista(supabase, userId)

  if (!stats.tieneRuta) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-10 text-center text-slate-500">
          No tienes una ruta asignada por ahora.
        </CardContent>
      </Card>
    )
  }

  const porcentaje =
    stats.total > 0 ? Math.round((stats.completados / stats.total) * 100) : 0

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800">
          {stats.nombreHoja}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1 text-slate-600">
            <span>
              {stats.completados} de {stats.total} completados
            </span>
            <span className="font-medium">{porcentaje}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-[#dc2626] transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>

        <Link
          href="/ruta"
          className="inline-flex items-center gap-2 rounded-md bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Route className="h-4 w-4" />
          Ver mi ruta
        </Link>
      </CardContent>
    </Card>
  )
}