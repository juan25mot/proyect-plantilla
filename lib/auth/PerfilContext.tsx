'use client'

import { createContext, useContext } from 'react'

interface PerfilInfo {
  userId: string
  nombre: string
  rol: string
}

const PerfilContext = createContext<PerfilInfo | null>(null)

export function PerfilProvider({
  perfil,
  children,
}: {
  perfil: PerfilInfo
  children: React.ReactNode
}) {
  return (
    <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>
  )
}

export function usePerfil() {
  const ctx = useContext(PerfilContext)
  if (!ctx) {
    throw new Error('usePerfil debe usarse dentro de PerfilProvider')
  }
  return ctx
}