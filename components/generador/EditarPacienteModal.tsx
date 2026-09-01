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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import type { Paciente, Diagnostico } from '@/types/paciente'

export function EditarPacienteModal({
  paciente,
  open,
  onClose,
  onGuardado,
}: {
  paciente: Paciente | null
  open: boolean
  onClose: () => void
  onGuardado: (actualizado: Paciente) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState<Paciente | null>(paciente)
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(paciente)
    setError(null)
  }, [paciente])

  useEffect(() => {
    if (!open) return
    supabase
      .from('diagnosticos')
      .select('id, descripcion')
      .eq('activo', true)
      .then(({ data }) => setDiagnosticos(data ?? []))
  }, [open, supabase])

  if (!form) return null

  const campo = (key: keyof Paciente) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm({ ...form, [key]: e.target.value })

  const guardar = async () => {
    setGuardando(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from('pacientes')
      .update({
        tipo_documento: form.tipo_documento,
        documento: form.documento,
        primer_nombre: form.primer_nombre,
        segundo_nombre: form.segundo_nombre,
        primer_apellido: form.primer_apellido,
        segundo_apellido: form.segundo_apellido,
        diagnostico_id: form.diagnostico_id,
        fecha_nacimiento: form.fecha_nacimiento,
        sexo: form.sexo,
        telefono: form.telefono,
        telefono2: form.telefono2,
        direccion: form.direccion,
        departamento: form.departamento,
        municipio: form.municipio,
        subsidiado: form.subsidiado,
        contributivo: form.contributivo,
      })
      // El trigger calcular_hta_dm recalcula hta/dm automaticamente al guardar
      .eq('id', form.id)
      .select()
      .single()

    setGuardando(false)

    if (updateError) {
      setError('No se pudo guardar. Intenta de nuevo.')
      return
    }

    onGuardado(data as Paciente)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Primer nombre</Label>
            <Input value={form.primer_nombre} onChange={campo('primer_nombre')} />
          </div>
          <div className="space-y-1">
            <Label>Segundo nombre</Label>
            <Input value={form.segundo_nombre ?? ''} onChange={campo('segundo_nombre')} />
          </div>
          <div className="space-y-1">
            <Label>Primer apellido</Label>
            <Input value={form.primer_apellido} onChange={campo('primer_apellido')} />
          </div>
          <div className="space-y-1">
            <Label>Segundo apellido</Label>
            <Input value={form.segundo_apellido ?? ''} onChange={campo('segundo_apellido')} />
          </div>
          <div className="space-y-1">
            <Label>Tipo ID</Label>
            <Input value={form.tipo_documento} onChange={campo('tipo_documento')} />
          </div>
          <div className="space-y-1">
            <Label>N de ID</Label>
            <Input value={form.documento} onChange={campo('documento')} />
          </div>
          <div className="space-y-1">
            <Label>Fecha nacimiento</Label>
            <Input
              type="date"
              value={form.fecha_nacimiento ?? ''}
              onChange={campo('fecha_nacimiento')}
            />
          </div>
          <div className="space-y-1">
            <Label>Sexo</Label>
            <select
              value={form.sexo ?? ''}
              onChange={(e) =>
                setForm({ ...form, sexo: e.target.value as 'F' | 'M' })
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9"
            >
              <option value="">-</option>
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Diagnostico</Label>
            <select
              value={form.diagnostico_id}
              onChange={(e) => setForm({ ...form, diagnostico_id: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9"
            >
              {diagnosticos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.descripcion}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              HTA y DM se recalculan automaticamente segun el diagnostico elegido.
            </p>
          </div>

          <div className="col-span-2">
            <Label>Direccion</Label>
            <Input value={form.direccion ?? ''} onChange={campo('direccion')} />
          </div>
          <div className="space-y-1">
            <Label>Departamento</Label>
            <Input value={form.departamento ?? ''} onChange={campo('departamento')} />
          </div>
          <div className="space-y-1">
            <Label>Municipio</Label>
            <Input value={form.municipio ?? ''} onChange={campo('municipio')} />
          </div>
          <div className="space-y-1">
            <Label>Telefono</Label>
            <Input value={form.telefono ?? ''} onChange={campo('telefono')} />
          </div>
          <div className="space-y-1">
            <Label>Telefono 2</Label>
            <Input value={form.telefono2 ?? ''} onChange={campo('telefono2')} />
          </div>

          <div className="col-span-2 flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.subsidiado}
                onCheckedChange={(v) =>
                  setForm({ ...form, subsidiado: Boolean(v) })
                }
              />
              Subsidiado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.contributivo}
                onCheckedChange={(v) =>
                  setForm({ ...form, contributivo: Boolean(v) })
                }
              />
              Contributivo
            </label>
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
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}