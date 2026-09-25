'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PacienteFormModal } from './PacienteFormModal'
import {
  Search, Plus, Pencil, UserX, UserCheck, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { Paciente } from '@/types/paciente'

type PacienteResumen = Pick<
  Paciente,
  'id' | 'primer_nombre' | 'primer_apellido' | 'documento' | 'municipio' | 'telefono' | 'activo'
>

const COLUMNAS_LISTA = 'id, primer_nombre, primer_apellido, documento, municipio, telefono, activo'
const TAMANOS_DISPONIBLES = [10, 20, 50, 100]

export function ListaPacientes({
  pacientesIniciales,
  totalInicial,
}: {
  pacientesIniciales: PacienteResumen[]
  totalInicial: number
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [pacientes, setPacientes] = useState<PacienteResumen[]>(pacientesIniciales)
  const [total, setTotal] = useState(totalInicial)
  const [cargando, setCargando] = useState(false)
  const [cargandoEdicion, setCargandoEdicion] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pacienteEnEdicion, setPacienteEnEdicion] = useState<Paciente | null>(null)
  const esPrimeraCarga = useRef(true)

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  const cargar = useCallback(async () => {
    setCargando(true)
    const desde = (pagina - 1) * porPagina
    const hasta = desde + porPagina - 1

    let q = supabase
      .from('pacientes')
      .select(COLUMNAS_LISTA, { count: 'exact' })
      .order('primer_apellido')
      .range(desde, hasta)

    if (soloActivos) q = q.eq('activo', true)

    if (query.trim().length >= 2) {
      q = q.or(
        `primer_nombre.ilike.%${query}%,primer_apellido.ilike.%${query}%,segundo_apellido.ilike.%${query}%,documento.ilike.%${query}%`
      )
    }

    const { data, count } = await q
    setPacientes(data ?? [])
    setTotal(count ?? 0)
    setCargando(false)
  }, [query, soloActivos, pagina, porPagina, supabase])

  // Buscar, cambiar el filtro de activos, o cambiar el tamano de pagina
  // siempre te regresan a la pagina 1
  useEffect(() => {
    if (esPrimeraCarga.current) return
    setPagina(1)
  }, [query, soloActivos, porPagina])

  useEffect(() => {
    if (esPrimeraCarga.current) {
      esPrimeraCarga.current = false
      return
    }
    const timeout = setTimeout(cargar, 350)
    return () => clearTimeout(timeout)
  }, [cargar])

  const toggleActivo = async (p: PacienteResumen) => {
    await supabase.from('pacientes').update({ activo: !p.activo }).eq('id', p.id)
    cargar()
  }

  const abrirEdicion = async (id: string) => {
    setCargandoEdicion(true)
    const { data } = await supabase.from('pacientes').select('*').eq('id', id).single()
    setCargandoEdicion(false)
    if (data) {
      setPacienteEnEdicion(data as Paciente)
      setModalOpen(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, apellido o documento"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={soloActivos} onCheckedChange={(v) => setSoloActivos(Boolean(v))} />
            Mostrar solo activos
          </label>

          <Button
            onClick={() => {
              setPacienteEnEdicion(null)
              setModalOpen(true)
            }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo paciente
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Mostrar</span>
        <select
          value={porPagina}
          onChange={(e) => setPorPagina(Number(e.target.value))}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
        >
          {TAMANOS_DISPONIBLES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500 uppercase">
              <th className="p-3">Paciente</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Municipio</th>
              <th className="p-3">Telefono</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">Cargando...</td>
              </tr>
            )}
            {!cargando && pacientes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">No se encontraron pacientes.</td>
              </tr>
            )}
            {!cargando &&
              pacientes.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-800">
                    {p.primer_nombre} {p.primer_apellido}
                  </td>
                  <td className="p-3 text-slate-500">{p.documento}</td>
                  <td className="p-3 text-slate-500">{p.municipio ?? '-'}</td>
                  <td className="p-3 text-slate-500">{p.telefono ?? '-'}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      onClick={() => abrirEdicion(p.id)}
                      disabled={cargandoEdicion}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 mr-1 disabled:opacity-40"
                    >
                      {cargandoEdicion ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleActivo(p)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                      title={p.activo ? 'Desactivar' : 'Activar'}
                    >
                      {p.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2.5 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              {total === 0
                ? '\u00b7 sin resultados'
                : `\u00b7 pagina ${pagina} de ${totalPaginas} \u00b7 ${total} paciente${total === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1 || cargando}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas || cargando}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PacienteFormModal
        paciente={pacienteEnEdicion}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardado={cargar}
      />
    </div>
  )
}