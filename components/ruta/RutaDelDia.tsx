'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,} from '@dnd-kit/core'
import {SortableContext,verticalListSortingStrategy,arrayMove,} from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { TarjetaPaciente } from './TarjetaPaciente'
import { BarraProgreso } from './BarraProgreso'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCheck, CloudOff, CloudUpload } from 'lucide-react'

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

type CambioPendiente = { paradaId: string; completado: boolean }

export function RutaDelDia({
  plantillaId,
  nombreHoja,
  paradasIniciales,
  soloLectura,
}: {
  plantillaId: string
  nombreHoja: string
  paradasIniciales: Parada[]
  soloLectura: boolean
}) {
  const supabase = createClient()
  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor))
  const storageKey = `ciades_pendientes_${plantillaId}`

  const [paradas, setParadas] = useState(paradasIniciales)
  const [finalizando, setFinalizando] = useState(false)
  const [pendientes, setPendientes] = useState<CambioPendiente[]>([])
  const [sincronizando, setSincronizando] = useState(false)

  // Al montar, recupera cambios pendientes de una sesion anterior sin señal
  useEffect(() => {
    const guardados = localStorage.getItem(storageKey)
    if (guardados) {
      const lista: CambioPendiente[] = JSON.parse(guardados)
      setPendientes(lista)
      // Aplica esos cambios pendientes visualmente tambien
      setParadas((prev) =>
        prev.map((p) => {
          const pendiente = lista.find((c) => c.paradaId === p.id)
          return pendiente ? { ...p, completado: pendiente.completado } : p
        })
      )
    }
  }, [storageKey])

  const guardarPendientes = (lista: CambioPendiente[]) => {
    setPendientes(lista)
    if (lista.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(lista))
    } else {
      localStorage.removeItem(storageKey)
    }
  }

  const sincronizarPendientes = useCallback(async () => {
    if (pendientes.length === 0 || sincronizando) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    setSincronizando(true)
    const restantes: CambioPendiente[] = []

    for (const cambio of pendientes) {
      const { error } = await supabase
        .from('plantilla_pacientes')
        .update({
          completado: cambio.completado,
          completado_en: cambio.completado ? new Date().toISOString() : null,
        })
        .eq('id', cambio.paradaId)

      if (error) restantes.push(cambio)
    }

    guardarPendientes(restantes)
    setSincronizando(false)
  }, [pendientes, sincronizando, supabase])

  // Reintenta automaticamente cuando el navegador detecta que volvio la señal
  useEffect(() => {
    window.addEventListener('online', sincronizarPendientes)
    // Tambien intenta una vez al montar, por si ya hay señal
    sincronizarPendientes()
    return () => window.removeEventListener('online', sincronizarPendientes)
  }, [sincronizarPendientes])

  const completados = paradas.filter((p) => p.completado).length
  const todasCompletadas = paradas.length > 0 && completados === paradas.length
  const siguienteId = paradas.find((p) => !p.completado)?.id

  const toggleCompletado = async (id: string, valor: boolean) => {
    // Se actualiza en pantalla de inmediato, haya o no señal
    setParadas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, completado: valor } : p))
    )

    // Sin señal: directo a la cola pendiente, sin intentar la peticion
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      guardarPendientes([
        ...pendientes.filter((c) => c.paradaId !== id),
        { paradaId: id, completado: valor },
      ])
      return
    }

    try {
      const { error } = await supabase
        .from('plantilla_pacientes')
        .update({
          completado: valor,
          completado_en: valor ? new Date().toISOString() : null,
        })
        .eq('id', id)

      if (error) throw error
    } catch {
      // Fallo de red (no de logica): se guarda en cola, NO se revierte
      guardarPendientes([
        ...pendientes.filter((c) => c.paradaId !== id),
        { paradaId: id, completado: valor },
      ])
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = paradas.findIndex((p) => p.id === active.id)
    const newIndex = paradas.findIndex((p) => p.id === over.id)
    const reordenadas = arrayMove(paradas, oldIndex, newIndex).map((p, i) => ({
      ...p,
      orden: i + 1,
    }))

    setParadas(reordenadas)

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await Promise.all(
        reordenadas.map((p) =>
          supabase.from('plantilla_pacientes').update({ orden: p.orden }).eq('id', p.id)
        )
      )
    }
    // Si no hay señal, el reordenamiento queda solo visual por ahora.
    // No es critico como el "completado" y se resincroniza solo al recargar con señal.
  }

  const finalizarRuta = async () => {
    if (pendientes.length > 0) return // no dejar finalizar con cambios sin sincronizar

    setFinalizando(true)
    const { error } = await supabase
      .from('plantillas_generadas')
      .update({ estado: 'completada' })
      .eq('id', plantillaId)
    setFinalizando(false)

    if (!error) {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{nombreHoja}</h1>
        <p className="text-sm text-slate-500">
          {soloLectura
            ? 'Vista de referencia'
            : 'Toca una parada para marcarla como completada'}
        </p>
      </div>

      {pendientes.length > 0 && (
        <div className="flex items-center gap-2 text-xs rounded-md bg-amber-50 text-amber-700 px-3 py-2">
          {sincronizando ? (
            <CloudUpload className="h-4 w-4 animate-pulse" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
          {pendientes.length} cambio{pendientes.length > 1 ? 's' : ''} sin
          sincronizar. Se enviaran solos cuando vuelva la señal.
        </div>
      )}

      <BarraProgreso completados={completados} total={paradas.length} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={paradas.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {paradas.map((parada) => (
              <TarjetaPaciente
                key={parada.id}
                parada={parada}
                esSiguiente={parada.id === siguienteId}
                soloLectura={soloLectura}
                onToggleCompletado={toggleCompletado}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!soloLectura && (
        <Button
          onClick={finalizarRuta}
          disabled={!todasCompletadas || finalizando || pendientes.length > 0}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-40"
        >
          {finalizando ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4 mr-2" />
          )}
          {pendientes.length > 0 ? 'Sincronizando cambios...' : 'Finalizar ruta'}
        </Button>
      )}
    </div>
  )
}