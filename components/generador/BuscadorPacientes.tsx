'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, AlertCircle } from 'lucide-react'
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
            'id, activo, tipo_documento, documento, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, diagnostico_id, fecha_nacimiento, sexo, telefono, telefono2, direccion, departamento, municipio, subsidiado, contributivo, hta, dm'
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

  // Debounce simple: espera 350ms sin escribir antes de buscar
  useEffect(() => {
    const timeout = setTimeout(() => buscar(query), 350)
    return () => clearTimeout(timeout)
  }, [query, buscar])

  const sinResultados =
    buscoAlMenosUnaVez && !buscando && resultados.length === 0

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, apellido o documento"
          className="pl-9"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          {buscando && (
            <p className="p-3 text-sm text-slate-400">Buscando...</p>
          )}

          {sinResultados && (
            <div className="p-4 text-sm">
              <div className="flex items-start gap-2 text-slate-500">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  No se encontraron pacientes. Posibles causas: el paciente no
                  esta registrado, fue dado de baja, o revise la ortografia.
                </p>
              </div>

              {rol === 'admin' ? (
                <Link
                  href="/pacientes"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#dc2626] hover:underline"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear nuevo paciente
                </Link>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  Si crees que deberia existir, avisa a un administrador.
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
                  className="w-full flex items-center justify-between p-3 text-left border-b border-slate-100 last:border-b-0 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {p.primer_nombre} {p.segundo_nombre} {p.primer_apellido}{' '}
                      {p.segundo_apellido}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.tipo_documento} {p.documento}
                      {p.municipio ? ` \u00b7 ${p.municipio}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-[#dc2626] font-medium">
                    {yaAgregado ? 'Agregado' : 'Agregar'}
                  </span>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}