'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import type { PacienteSeleccionado } from '@/types/paciente'

function Fila({
  paciente,
  puedeEditar,
  onCambiarCampo,
  onEditar,
  onQuitar,
}: {
  paciente: PacienteSeleccionado
  puedeEditar: boolean
  onCambiarCampo: (
    id: string,
    campo: 'observaciones_jornada' | 'resultados_enviados' | 'direccion',
    valor: string
  ) => void
  onEditar: (paciente: PacienteSeleccionado) => void
  onQuitar: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: paciente.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const telefonos = [paciente.telefono, paciente.telefono2]
    .filter(Boolean)
    .join(' / ')

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-slate-100 bg-white hover:bg-slate-50/80 transition-colors"
    >
      <td className="p-3 w-8 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-300 hover:text-slate-600 transition-colors"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-3 text-sm font-medium text-slate-800 whitespace-nowrap">
        {paciente.primer_nombre} {paciente.primer_apellido}
      </td>
      <td className="p-3 text-xs font-mono text-slate-600 whitespace-nowrap">
        {paciente.documento}
      </td>
      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
        {telefonos || '-'}
      </td>
      <td className="p-2">
        <input
          value={paciente.direccion ?? ''}
          onChange={(e) => onCambiarCampo(paciente.id, 'direccion', e.target.value)}
          className="w-40 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all"
        />
      </td>
      <td className="p-3 text-center">
        {paciente.subsidiado && (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
        )}
      </td>
      <td className="p-3 text-center">
        {paciente.contributivo && (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
        )}
      </td>
      <td className="p-3 text-center">
        {paciente.hta && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
            SI
          </span>
        )}
      </td>
      <td className="p-3 text-center">
        {paciente.dm && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-[#dc2626] border border-red-100">
            SI
          </span>
        )}
      </td>
      <td className="p-3">
        <input
          value={paciente.observaciones_jornada}
          onChange={(e) =>
            onCambiarCampo(paciente.id, 'observaciones_jornada', e.target.value)
          }
          placeholder="Observación..."
          className="w-40 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all"
        />
      </td>
      <td className="p-3">
        <input
          value={paciente.resultados_enviados}
          onChange={(e) =>
            onCambiarCampo(paciente.id, 'resultados_enviados', e.target.value)
          }
          placeholder="Resultados..."
          className="w-36 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition-all"
        />
      </td>
      <td className="p-3 whitespace-nowrap text-right">
        {puedeEditar && (
          <button
            onClick={() => onEditar(paciente)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors mr-1"
            title="Editar paciente"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onQuitar(paciente.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-[#dc2626] transition-colors"
          title="Quitar de la lista"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

export function TablaSeleccionados({
  pacientes,
  puedeEditar,
  onReordenar,
  onCambiarCampo,
  onEditar,
  onQuitar,
}: {
  pacientes: PacienteSeleccionado[]
  puedeEditar: boolean
  onReordenar: (nuevos: PacienteSeleccionado[]) => void
  onCambiarCampo: (
    id: string,
    campo: 'observaciones_jornada' | 'resultados_enviados' | 'direccion',
    valor: string
  ) => void
  onEditar: (paciente: PacienteSeleccionado) => void
  onQuitar: (id: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pacientes.findIndex((p) => p.id === active.id)
    const newIndex = pacientes.findIndex((p) => p.id === over.id)
    onReordenar(arrayMove(pacientes, oldIndex, newIndex))
  }

  if (pacientes.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-10 text-center text-sm text-slate-400">
        Aún no has agregado pacientes. Búscalos arriba para empezar.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-sm bg-white">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200/80">
            <tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-3 w-8"></th>
              <th className="p-3">Paciente</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Teléfono</th>
              <th className="p-2">Direccion</th>
              <th className="p-3 text-center">Sub.</th>
              <th className="p-3 text-center">Cont.</th>
              <th className="p-3 text-center">HTA</th>
              <th className="p-3 text-center">DM</th>
              <th className="p-3">Observaciones</th>
              <th className="p-3">Resultados</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={pacientes.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {pacientes.map((p) => (
                <Fila
                  key={p.id}
                  paciente={p}
                  puedeEditar={puedeEditar}
                  onCambiarCampo={onCambiarCampo}
                  onEditar={onEditar}
                  onQuitar={onQuitar}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
    </div>
  )
}