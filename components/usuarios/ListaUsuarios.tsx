'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UsuarioFormModal } from './UsuarioFormModal'
import { Plus, Pencil, UserX, UserCheck, KeyRound, Loader2, Search } from 'lucide-react'

const ROL_LABEL: Record<string, string> = {
  admin: 'Admin',
  operario: 'Operario',
  transportista: 'Transportista',
  auxiliar: 'Auxiliar',
}

interface Usuario {
  id: string
  nombre: string
  rol: string
  activo: boolean
}

export function ListaUsuarios({
  miPropioId,
  usuariosIniciales,
}: {
  miPropioId: string
  usuariosIniciales: Usuario[]
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales)
  const [modalOpen, setModalOpen] = useState(false)
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const esPrimeraCarga = useRef(true)

  const cargar = useCallback(async () => {
    let q = supabase.from('perfiles').select('id, nombre, rol, activo').order('nombre').limit(50)

    if (query.trim().length >= 2) {
      q = q.ilike('nombre', `%${query}%`)
    }

    const { data } = await q
    setUsuarios(data ?? [])
  }, [query, supabase])

  useEffect(() => {
    if (esPrimeraCarga.current) {
      esPrimeraCarga.current = false
      return
    }
    const timeout = setTimeout(cargar, 350)
    return () => clearTimeout(timeout)
  }, [cargar])

  const toggleEstado = async (u: Usuario) => {
    setError(null)
    setProcesando(u.id)

    const res = await fetch(`/api/usuarios/${u.id}/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activar: !u.activo }),
    })

    setProcesando(null)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'No se pudo actualizar.')
      return
    }
    cargar()
  }

  const resetearContrasena = async (u: Usuario) => {
    const nueva = window.prompt(`Nueva contrasena para ${u.nombre} (minimo 6 caracteres):`)
    if (!nueva) return

    setProcesando(u.id)
    const res = await fetch(`/api/usuarios/${u.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nueva }),
    })
    setProcesando(null)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'No se pudo cambiar la contrasena.')
      return
    }
    window.alert('Contrasena actualizada.')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre"
            className="pl-9"
          />
        </div>

        <Button
          onClick={() => {
            setUsuarioEnEdicion(null)
            setModalOpen(true)
          }}
          className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      {error && <p className="text-sm text-[#dc2626]">{error}</p>}

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium text-slate-500 uppercase">
              <th className="p-3">Nombre</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-400">No se encontraron usuarios.</td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-medium text-slate-800">
                  {u.nombre}
                  {u.id === miPropioId && <span className="text-xs text-slate-400 ml-2">(tu)</span>}
                </td>
                <td className="p-3 text-slate-500">{ROL_LABEL[u.rol] ?? u.rol}</td>
                <td className="p-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  {procesando === u.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setUsuarioEnEdicion(u)
                          setModalOpen(true)
                        }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 mr-1"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => resetearContrasena(u)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 mr-1"
                        title="Resetear contrasena"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleEstado(u)}
                        disabled={u.id === miPropioId}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.activo ? 'Desactivar' : 'Activar'}
                      >
                        {u.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UsuarioFormModal
        usuario={usuarioEnEdicion}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGuardado={cargar}
      />
    </div>
  )
}