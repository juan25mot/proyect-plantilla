'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BuscadorPacientes } from '@/components/generador/BuscadorPacientes'
import { TablaSeleccionados } from '@/components/generador/TablaSeleccionados'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Loader2, UserCheck, Truck, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { EditarPacienteModal } from '@/components/generador/EditarPacienteModal'
import type { Paciente, PacienteSeleccionado } from '@/types/paciente'
import { usePerfil } from '@/lib/auth/PerfilContext'


interface UsuarioOpcion {
  id: string
  nombre: string
}

export default function GeneradorPage() {
  const supabase = createClient()
  const router = useRouter()

  const { rol } = usePerfil()
  const [seleccionados, setSeleccionados] = useState<PacienteSeleccionado[]>([])
  const [auxiliares, setAuxiliares] = useState<UsuarioOpcion[]>([])
  const [transportistas, setTransportistas] = useState<UsuarioOpcion[]>([])
  const [auxiliarId, setAuxiliarId] = useState('')
  const [transportistaId, setTransportistaId] = useState('')
  const [maxPacientes, setMaxPacientes] = useState(50)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pacienteEnEdicion, setPacienteEnEdicion] = useState<Paciente | null>(null)
  const [fechaRuta, setFechaRuta] = useState(new Date().toISOString().split('T')[0])

  // Estado para controlar la notificación flotante informativa
  const [bloqueoPaciente, setBloqueoPaciente] = useState<{
    paciente: Paciente
    nombresRutas: string
  } | null>(null)

  // Helper para mostrar errores temporales en pantalla (5 segundos)
  const mostrarErrorTemporal = (mensaje: string) => {
    setError(mensaje)
    setTimeout(() => {
      setError(null)
    }, 4000)
  }

  useEffect(() => {
    const cargarDatosIniciales = async () => {

      const [usuariosRes, configRes] = await Promise.all([
        supabase.from('perfiles').select('id, nombre, rol').eq('activo', true),
        supabase.from('configuracion').select('valor').eq('clave', 'max_pacientes_por_plantilla').single(),
      ])

      const usuarios = usuariosRes.data ?? []
      setAuxiliares(
        usuarios.filter((u) =>
          ['admin', 'operario', 'auxiliar'].includes(u.rol)
        )
      )
      setTransportistas(usuarios.filter((u) => u.rol === 'transportista'))

      if (configRes.data?.valor) {
        setMaxPacientes(parseInt(configRes.data.valor, 10))
      }
    }

    cargarDatosIniciales()
  }, [supabase])

  const agregarPacienteDirecto = (p: Paciente) => {
    setSeleccionados((prev) => [
      ...prev,
      { ...p, observaciones_jornada: p.observacion ?? '', resultados_enviados: '' },
    ])
  }

  const agregarPaciente = async (p: Paciente) => {
    if (seleccionados.length >= maxPacientes) {
      mostrarErrorTemporal(`No puedes agregar más de ${maxPacientes} pacientes por plantilla.`)
      return
    }

    if (seleccionados.some((s) => s.id === p.id)) return

    // Verifica si el paciente ya esta agendado en OTRA ruta para el mismo dia
    const { data: otrasRutas } = await supabase
      .from('plantilla_pacientes')
      .select('plantillas_generadas!inner(nombre_hoja, fecha_ruta)')
      .eq('paciente_id', p.id)
      .eq('plantillas_generadas.fecha_ruta', fechaRuta)

    if (otrasRutas && otrasRutas.length > 0) {
      const nombresRutas = otrasRutas
        .map((r: any) => r.plantillas_generadas?.nombre_hoja)
        .filter(Boolean)
        .join(', ')

      // Muestra la alerta de bloqueo sin agregar al paciente
      setBloqueoPaciente({ paciente: p, nombresRutas })
      return
    }

    agregarPacienteDirecto(p)
  }

  const quitarPaciente = (id: string) => {
    setSeleccionados((prev) => prev.filter((p) => p.id !== id))
  }

  const cambiarCampo = (
    id: string,
    campo: 'observaciones_jornada' | 'resultados_enviados' | 'direccion',
    valor: string
  ) => {
    setSeleccionados((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    )
  }

  const actualizarPacienteEditado = (actualizado: Paciente) => {
    setSeleccionados((prev) =>
      prev.map((p) => (p.id === actualizado.id ? { ...p, ...actualizado } : p))
    )
  }

  const generarPlantilla = async () => {
    setError(null)

    if (seleccionados.length === 0) {
      mostrarErrorTemporal('Agrega al menos un paciente antes de generar.')
      return
    }
    if (!auxiliarId || !transportistaId) {
      mostrarErrorTemporal('Selecciona auxiliar y transportista.')
      return
    }

    setGenerando(true)

    try {
      const res = await fetch('/api/plantillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auxiliar_id: auxiliarId,
          transportista_id: transportistaId,
          fecha_ruta: fechaRuta,
          pacientes: seleccionados.map((p, i) => ({
            paciente_id: p.id,
            orden: i + 1,
            observaciones_jornada: p.observaciones_jornada,
            resultados_enviados: p.resultados_enviados,
            direccion: p.direccion ?? '',
          })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (body?.borrador) {
          router.push(`/historial?borrador=${body.plantillaId}`)
          return
        }
        throw new Error(body?.error ?? 'No se pudo generar la plantilla.')
      }

      const { plantillaId } = await res.json()
      router.push(`/historial?destacar=${plantillaId}`)
    } catch (e: any) {
      mostrarErrorTemporal(e.message ?? 'Ocurrió un error inesperado.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto relative">
      {/* Capa de bloqueo e Interfaz de Alerta Informativa */}
      {bloqueoPaciente && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent cursor-not-allowed" />

          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-amber-50 border border-amber-300 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5 sm:mt-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-amber-800">
                    Paciente ya agendado hoy
                  </h4>
                  <p className="text-xs text-amber-900 leading-snug">
                    Este paciente no se puede agregar porque ya está registrado en la ruta{' '}
                    <span className="font-semibold">&quot;{bloqueoPaciente.nombresRutas}&quot;</span> para el día{' '}
                    <span className="font-semibold">{fechaRuta}</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setBloqueoPaciente(null)}
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Generador de Plantillas
        </h1>
        <p className="text-sm text-slate-500">
          Busca pacientes, arma la ruta del día y genera la hoja de cálculo
        </p>
      </div>

      {/* Buscador */}
      <BuscadorPacientes
        rol={rol}
        yaSeleccionados={seleccionados.map((p) => p.id)}
        onAgregar={agregarPaciente}
      />

      {/* Asignación de Personal */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-800">
            Personal Asignado
          </CardTitle>
          <CardDescription>
            Selecciona el auxiliar en salud y el transportista encargados de la jornada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                Fecha de la ruta
              </label>
              <input
                type="date"
                value={fechaRuta}
                onChange={(e) => setFechaRuta(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-[#dc2626]" />
                Auxiliar
              </label>
              <select
                value={auxiliarId}
                onChange={(e) => setAuxiliarId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all h-10"
              >
                <option value="">Selecciona un auxiliar</option>
                {auxiliares.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-[#0e1b38]" />
                Transportista
              </label>
              <select
                value={transportistaId}
                onChange={(e) => setTransportistaId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all h-10"
              >
                <option value="">Selecciona un transportista</option>
                {transportistas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de Pacientes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            Pacientes Seleccionados
          </p>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {seleccionados.length} / {maxPacientes}
          </span>
        </div>

        <TablaSeleccionados
          pacientes={seleccionados}
          puedeEditar={rol === 'admin'}
          onReordenar={setSeleccionados}
          onCambiarCampo={cambiarCampo}
          onEditar={(p) => setPacienteEnEdicion(p)}
          onQuitar={quitarPaciente}
        />
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-center animate-in fade-in duration-200">
          <p className="text-xs font-semibold text-red-600">{error}</p>
        </div>
      )}

      {/* Botón de Acción */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={generarPlantilla}
          disabled={generando}
          className="bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold h-11 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"
        >
          {generando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          {generando ? 'Generando Plantilla...' : 'Generar Plantilla'}
        </Button>
      </div>

      <EditarPacienteModal
        paciente={pacienteEnEdicion}
        open={pacienteEnEdicion !== null}
        onClose={() => setPacienteEnEdicion(null)}
        onGuardado={actualizarPacienteEditado}
      />
    </div>
  )
}