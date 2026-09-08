'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, RefreshCw, Copy, Loader2 } from 'lucide-react'

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
    borrador: { label: 'Borrador', className: 'bg-amber-50 text-amber-700' },
    en_progreso: { label: 'En progreso', className: 'bg-blue-50 text-blue-700' },
    completada: { label: 'Completada', className: 'bg-emerald-50 text-emerald-700' },
}

export function FilaPlantilla({
    plantilla,
    destacada,
}: {
    plantilla: any
    destacada: boolean
}) {
    const router = useRouter()
    const [reintentando, setReintentando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const totalPacientes = plantilla.plantilla_pacientes?.[0]?.count ?? 0
    const estadoInfo = ESTADO_LABEL[plantilla.estado] ?? ESTADO_LABEL.borrador

    const reintentar = async () => {
        setReintentando(true)
        setError(null)

        const res = await fetch(`/api/plantillas/${plantilla.id}/reintentar`, {
            method: 'POST',
        })

        setReintentando(false)

        if (!res.ok) {
            const body = await res.json().catch(() => null)
            setError(body?.error ?? 'No se pudo reintentar.')
            return
        }

        router.refresh()
    }

    const fecha = new Date(`${plantilla.fecha_ruta}T00:00:00`).toLocaleDateString(
        'es-CO',
        { day: '2-digit', month: 'short', year: 'numeric' }
    )

    return (
        <div
            className={`rounded-lg border p-4 ${destacada ? 'border-[#dc2626] bg-red-50/40' : 'border-slate-200 bg-white'
                }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                            {plantilla.nombre_hoja}
                        </p>
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoInfo.className}`}
                        >
                            {estadoInfo.label}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Ruta del {fecha} &bull; {totalPacientes} paciente
                        {totalPacientes === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Auxiliar: {plantilla.auxiliar_nombre || '-'} &bull; Transportista:{' '}
                        {plantilla.transportista_nombre || '-'}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {plantilla.google_sheets_url && (
                        <a
                            href={plantilla.google_sheets_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#dc2626] hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir en Sheets
                        </a>
                    )}

                    {plantilla.estado === 'borrador' && (
                        <button
                            onClick={reintentar}
                            disabled={reintentando}
                            className="inline-flex items-center gap-1 text-xs font-medium rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                        >
                            {reintentando ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Reintentar
                        </button>
                    )}

                    <Link
                        href={`/generador?clonar=${plantilla.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Clonar
                    </Link>
                </div>
            </div>

            {error && <p className="text-xs text-[#dc2626] mt-2">{error}</p>}
        </div>
    )
}