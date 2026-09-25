'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Diagnostico } from '@/types/paciente'

let cache: Diagnostico[] | null = null
let cargandoPromesa: Promise<Diagnostico[]> | null = null

async function obtenerDiagnosticos(): Promise<Diagnostico[]> {
  if (cache) return cache
  if (cargandoPromesa) return cargandoPromesa

  const supabase = createClient()
  cargandoPromesa = (async () => {
    const { data } = await supabase
    .from('diagnosticos')
    .select('id, descripcion')
    .eq('activo', true)
    
      cache = data ?? []
      cargandoPromesa = null
      return cache
    })()

  return cargandoPromesa
}

export function useDiagnosticos() {
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>(cache ?? [])

  useEffect(() => {
    if (cache) {
      setDiagnosticos(cache)
      return
    }
    obtenerDiagnosticos().then(setDiagnosticos)
  }, [])

  return diagnosticos
}