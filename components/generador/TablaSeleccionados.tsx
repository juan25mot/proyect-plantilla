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
import { GripVertical, Pencil, X, CheckCircle2 } from 'lucide-react'
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
    campo: 'observaciones_jornada' | 'resultados_enviados',
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
    <tr ref={setNodeRef} style={style} className="border-t border-slate-100">
      <td className="p-2 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-300 hover:text-slate-500"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-2 text-sm text-slate-800 whitespace-nowrap">
        {paciente.primer_nombre} {paciente.primer_apellido}
      </td>
      <td className="p-2 text-sm text-slate-500 whitespace-nowrap">
        {paciente.documento}
      </td>
      <td className="p-2 text-xs text-slate-500 whitespace-nowrap">
        {telefonos || '-'}
      </td>
      <td className="p-2 text-center">
        {paciente.subsidiado && (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
        )}
      </td>
      <td className="p-2 text-center">
        {paciente.contributivo && (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
        )}
      </td>
      <td className="p-2 text-center">
        {paciente.hta && (
          <span className="text-xs font-medium text-[#dc2626]">SI</span>
        )}
      </td>
      <td className="p-2 text-center">
        {paciente.dm && (
          <span className="text-xs font-medium text-[#dc2626]">SI</span>
        )}
      </td>
      <td className="p-2">
        <input
          value={paciente.observaciones_jornada}
          onChange={(e) =>
            onCambiarCampo(paciente.id, 'observaciones_jornada', e.target.value)
          }
          className="w-40 text-sm rounded border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
        />
      </td>
      <td className="p-2">
        <input
          value={paciente.resultados_enviados}
          onChange={(e) =>
            onCambiarCampo(paciente.id, 'resultados_enviados', e.target.value)
          }
          className="w-36 text-sm rounded border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
        />
      </td>
      <td className="p-2 whitespace-nowrap">
        {puedeEditar && (
          <button
            onClick={() => onEditar(paciente)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 mr-1"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onQuitar(paciente.id)}
          className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-[#dc2626]"
        >
          <X className="h-3.5 w-3.5" />
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
    campo: 'observaciones_jornada' | 'resultados_enviados',
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
      <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center text-sm text-slate-400">
        Aun no has agregado pacientes. Buscalos arriba para empezar.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500 uppercase">
              <th className="p-2 w-8"></th>
              <th className="p-2">Paciente</th>
              <th className="p-2">Documento</th>
              <th className="p-2">Telefono</th>
              <th className="p-2 text-center">Sub.</th>
              <th className="p-2 text-center">Cont.</th>
              <th className="p-2 text-center">HTA</th>
              <th className="p-2 text-center">DM</th>
              <th className="p-2">Observaciones</th>
              <th className="p-2">Resultados</th>
              <th className="p-2"></th>
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