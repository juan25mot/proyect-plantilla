'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BuscadorPacientes } from '@/components/generador/BuscadorPacientes'
import { TablaSeleccionados } from '@/components/generador/TablaSeleccionados'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { EditarPacienteModal } from '@/components/generador/EditarPacienteModal'
import type { Paciente, PacienteSeleccionado } from '@/types/paciente'


interface UsuarioOpcion {
    id: string
    nombre: string
}

export default function GeneradorPage() {
    const supabase = createClient()
    const router = useRouter()

    const [rol, setRol] = useState<string>('')
    const [seleccionados, setSeleccionados] = useState<PacienteSeleccionado[]>([])
    const [auxiliares, setAuxiliares] = useState<UsuarioOpcion[]>([])
    const [transportistas, setTransportistas] = useState<UsuarioOpcion[]>([])
    const [auxiliarId, setAuxiliarId] = useState('')
    const [transportistaId, setTransportistaId] = useState('')
    const [maxPacientes, setMaxPacientes] = useState(50)
    const [generando, setGenerando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pacienteEnEdicion, setPacienteEnEdicion] = useState<Paciente | null>(null)

    useEffect(() => {
        const cargarDatosIniciales = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            const [perfilRes, usuariosRes, configRes] = await Promise.all([
                supabase.from('perfiles').select('rol').eq('id', user!.id).single(),
                supabase
                    .from('perfiles')
                    .select('id, nombre, rol')
                    .eq('activo', true),
                supabase
                    .from('configuracion')
                    .select('valor')
                    .eq('clave', 'max_pacientes_por_plantilla')
                    .single(),
            ])

            setRol(perfilRes.data?.rol ?? '')

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

    const agregarPaciente = (p: Paciente) => {
        if (seleccionados.length >= maxPacientes) {
            setError(`No puedes agregar mas de ${maxPacientes} pacientes por plantilla.`)
            return
        }
        setSeleccionados((prev) => [
            ...prev,
            { ...p, observaciones_jornada: '', resultados_enviados: '' },
        ])
    }

    const quitarPaciente = (id: string) => {
        setSeleccionados((prev) => prev.filter((p) => p.id !== id))
    }

    const cambiarCampo = (
        id: string,
        campo: 'observaciones_jornada' | 'resultados_enviados',
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
            setError('Agrega al menos un paciente antes de generar.')
            return
        }
        if (!auxiliarId || !transportistaId) {
            setError('Selecciona auxiliar y transportista.')
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
                    pacientes: seleccionados.map((p, i) => ({
                        paciente_id: p.id,
                        orden: i + 1,
                        observaciones_jornada: p.observaciones_jornada,
                        resultados_enviados: p.resultados_enviados,
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
            setError(e.message ?? 'Ocurrio un error inesperado.')
        } finally {
            setGenerando(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">
                    Generador de Plantillas
                </h1>
                <p className="text-sm text-slate-500">
                    Busca pacientes, arma la ruta del dia y genera la hoja de calculo
                </p>
            </div>

            <BuscadorPacientes
                rol={rol}
                yaSeleccionados={seleccionados.map((p) => p.id)}
                onAgregar={agregarPaciente}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                        Auxiliar
                    </label>
                    <select
                        value={auxiliarId}
                        onChange={(e) => setAuxiliarId(e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                        <option value="">Selecciona un auxiliar</option>
                        {auxiliares.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                        Transportista
                    </label>
                    <select
                        value={transportistaId}
                        onChange={(e) => setTransportistaId(e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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

            <div>
                <p className="text-sm text-slate-500 mb-2">
                    Pacientes seleccionados ({seleccionados.length}/{maxPacientes})
                </p>
                <TablaSeleccionados
                    pacientes={seleccionados}
                    puedeEditar={rol === 'admin'}
                    onReordenar={setSeleccionados}
                    onCambiarCampo={cambiarCampo}
                    onEditar={(p) => setPacienteEnEdicion(p)}
                    onQuitar={quitarPaciente}
                />
            </div>

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}

            <div className="flex justify-end">
                <Button
                    onClick={generarPlantilla}
                    disabled={generando}
                    className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                >
                    {generando ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    {generando ? 'Generando...' : 'Generar Plantilla'}
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