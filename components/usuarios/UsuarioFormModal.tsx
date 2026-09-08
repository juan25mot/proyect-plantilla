'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'operario', label: 'Operario' },
  { value: 'transportista', label: 'Transportista' },
  { value: 'auxiliar', label: 'Auxiliar' },
]

interface Usuario {
  id: string
  nombre: string
  rol: string
}

export function UsuarioFormModal({
  usuario,
  open,
  onClose,
  onGuardado,
}: {
  usuario: Usuario | null
  open: boolean
  onClose: () => void
  onGuardado: () => void
}) {
  const supabase = createClient()
  const esEdicion = usuario !== null

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('operario')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setNombre(usuario?.nombre ?? '')
    setRol(usuario?.rol ?? 'operario')
    setEmail('')
    setPassword('')
    setError(null)
  }, [usuario, open])

  const guardar = async () => {
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    setGuardando(true)

    if (esEdicion) {
      // Editar solo toca la tabla perfiles - no necesita la API con service role
      const { error: err } = await supabase
        .from('perfiles')
        .update({ nombre, rol })
        .eq('id', usuario!.id)

      setGuardando(false)
      if (err) {
        setError('No se pudo guardar.')
        return
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setGuardando(false)
        setError('Correo y contrasena son obligatorios.')
        return
      }

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nombre, rol }),
      })

      setGuardando(false)

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'No se pudo crear el usuario.')
        return
      }
    }

    onGuardado()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre completo</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          {!esEdicion && (
            <>
              <div className="space-y-1">
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Contrasena inicial</Label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Rol</Label>
            <Select
              items={ROLES}
              value={rol}
              onValueChange={(v) => setRol(v ?? 'operario')}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={guardando}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}