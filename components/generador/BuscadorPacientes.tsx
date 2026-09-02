'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, AlertCircle, Loader2, Check, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import type { Paciente } from '@/types/paciente'

export function BuscadorPacientes({
  rol,
  yaSeleccionados,
  onAgregar,
}: {
  rol: string
  yaSeleccionados: string[]
  onAgregar: (paciente: Paciente) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Paciente[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscoAlMenosUnaVez, setBuscoAlMenosUnaVez] = useState(false)

  const buscar = useCallback(
    async (texto: string) => {
      if (texto.trim().length < 2) {
        setResultados([])
        setBuscoAlMenosUnaVez(false)
        return
      }

      setBuscando(true)
      const { data } = await supabase
        .from('pacientes')
        .select(
          'id, activo, tipo_documento, documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, diagnostico_id, fecha_nacimiento, sexo, telefono, telefono2, direccion, departamento, municipio, subsidiado, contributivo, hta, dm, observacion'
        )
        .eq('activo', true)
        .or(
          `primer_nombre.ilike.%${texto}%,primer_apellido.ilike.%${texto}%,segundo_apellido.ilike.%${texto}%,documento.ilike.%${texto}%`
        )
        .limit(10)

      setResultados(data ?? [])
      setBuscando(false)
      setBuscoAlMenosUnaVez(true)
    },
    [supabase]
  )

  useEffect(() => {
    const timeout = setTimeout(() => buscar(query), 350)
    return () => clearTimeout(timeout)
  }, [query, buscar])

  const limpiarBusqueda = () => {
    setQuery('')
    setResultados([])
    setBuscoAlMenosUnaVez(false)
  }

  const sinResultados =
    buscoAlMenosUnaVez && !buscando && resultados.length === 0

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, apellido o documento..."
          className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-[#dc2626] rounded-xl text-slate-800 shadow-sm transition-all"
        />
        
        {/* Botón para limpiar búsqueda con 'X' o indicador de carga */}
        {buscando ? (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={limpiarBusqueda}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {query.trim().length >= 2 && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200/80 bg-white shadow-xl max-h-80 overflow-y-auto divide-y divide-slate-100">
          {buscando && (
            <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#0e1b38]" />
              Buscando pacientes...
            </div>
          )}

          {sinResultados && (
            <div className="p-4 text-sm">
              <div className="flex items-start gap-2.5 text-slate-600">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed">
                  No se encontraron pacientes. Posibles causas: el paciente no está registrado, fue dado de baja o revise la ortografía.
                </p>
              </div>

              {rol === 'admin' ? (
                <Link
                  href="/pacientes"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0e1b38] hover:underline transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Crear nuevo paciente
                </Link>
              ) : (
                <p className="mt-2 text-[11px] text-slate-400">
                  Si crees que debería existir, avisa a un administrador.
                </p>
              )}
            </div>
          )}

          {!buscando &&
            resultados.map((p) => {
              const yaAgregado = yaSeleccionados.includes(p.id)
              return (
                <button
                  key={p.id}
                  disabled={yaAgregado}
                  onClick={() => {
                    onAgregar(p)
                    setQuery('')
                    setResultados([])
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-[#0e1b38] transition-colors">
                      {p.primer_nombre} {p.segundo_nombre} {p.primer_apellido}{' '}
                      {p.segundo_apellido}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">{p.tipo_documento}:</span> {p.documento}
                      {p.municipio ? ` \u00b7 ${p.municipio}` : ''}
                    </p>
                  </div>

                  {/* Botón resaltado en Verde Esmeralda */}
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      yaAgregado
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'
                    }`}
                  >
                    {yaAgregado ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-600" /> Agregado
                      </span>
                    ) : (
                      '+ Agregar'
                    )}
                  </span>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}