'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MapPin, Phone, CheckCircle2, Circle } from 'lucide-react'

interface Parada {
  id: string
  orden: number
  completado: boolean
  observaciones_jornada: string
  telefono_snapshot: string | null
  paciente: {
    primer_nombre: string
    primer_apellido: string
    direccion: string | null
  }
}

export function TarjetaPaciente({
  parada,
  esSiguiente,
  soloLectura,
  onToggleCompletado,
}: {
  parada: Parada
  esSiguiente: boolean
  soloLectura: boolean
  onToggleCompletado: (id: string, valor: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: parada.id, disabled: soloLectura || parada.completado })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const mapsUrl = parada.paciente.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        parada.paciente.direccion
      )}`
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        parada.completado
          ? 'border-slate-100 bg-slate-50 opacity-60'
          : esSiguiente
          ? 'border-[#dc2626] bg-red-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      {!soloLectura && !parada.completado && (
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-slate-300 hover:text-slate-500"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {!soloLectura ? (
        <button
          onClick={() => onToggleCompletado(parada.id, !parada.completado)}
          className="mt-0.5 shrink-0"
        >
          {parada.completado ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300" />
          )}
        </button>
      ) : (
        <div className="mt-0.5 shrink-0">
          {parada.completado ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            parada.completado ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}
        >
          {parada.orden}. {parada.paciente.primer_nombre}{' '}
          {parada.paciente.primer_apellido}
        </p>

        {parada.paciente.direccion && (
          mapsUrl ? (

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#dc2626] hover:underline mt-0.5"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              {parada.paciente.direccion}
            </a>
          ) : null
        )}

        {parada.telefono_snapshot && (
            
         <a
            href={`tel:${parada.telefono_snapshot.split('/')[0].trim()}`}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#dc2626] mt-0.5"
          >
            <Phone className="h-3 w-3 shrink-0" />
            {parada.telefono_snapshot}
          </a>
        )}

        {parada.observaciones_jornada && (
          <p className="text-xs text-slate-500 mt-1 bg-cyan-50 rounded px-2 py-1 inline-block">
            {parada.observaciones_jornada}
          </p>
        )}
      </div>
    </div>
  )
}