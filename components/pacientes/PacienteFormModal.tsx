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

const VACIO: Omit<Paciente, 'id' | 'activo' | 'hta' | 'dm'> = {
  ocupacion: '',
  tipo_documento: 'CC',
  documento: '',
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  tipo_paciente: '',
  diagnostico_id: '',
  departamento_afiliacion: '',
  ciudad_afiliacion: '',
  sucursal: '',
  fecha_nacimiento: '',
  sexo: null,
  telefono: '',
  telefono2: '',
  direccion: '',
  departamento: '',
  municipio: '',
  subsidiado: false,
  contributivo: false,
  observacion: '',
}

export function PacienteFormModal({
  paciente,
  open,
  onClose,
  onGuardado,
}: {
  paciente: Paciente | null // null = creando uno nuevo
  open: boolean
  onClose: () => void
  onGuardado: () => void
}) {
  const supabase = createClient()
  const esEdicion = paciente !== null

  const [form, setForm] = useState<any>(paciente ?? VACIO)
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(paciente ?? VACIO)
    setError(null)
  }, [paciente, open])

  useEffect(() => {
    if (!open) return
    supabase
      .from('diagnosticos')
      .select('id, descripcion')
      .eq('activo', true)
      .then(({ data }) => setDiagnosticos(data ?? []))
  }, [open, supabase])

  const campo = (key: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm({ ...form, [key]: e.target.value })

  const validar = (): string | null => {
    if (!form.documento?.trim()) return 'El documento es obligatorio.'
    if (!form.primer_nombre?.trim()) return 'El primer nombre es obligatorio.'
    if (!form.primer_apellido?.trim()) return 'El primer apellido es obligatorio.'
    if (!form.diagnostico_id) return 'Selecciona un diagnostico.'
    if (!form.telefono?.trim()) return 'El telefono es obligatorio.'
    return null
  }

  const guardar = async () => {
    setError(null)

    const errorValidacion = validar()
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setGuardando(true)

    // Verifica documento duplicado (excluyendo el propio registro si es edicion)
    let query = supabase
      .from('pacientes')
      .select('id')
      .eq('documento', form.documento.trim())

    if (esEdicion) {
      query = query.neq('id', paciente!.id)
    }

    const { data: existente } = await query.maybeSingle()

    if (existente) {
      setGuardando(false)
      setError(
        'Ya existe un paciente registrado con ese documento. No se puede crear/actualizar con un documento duplicado.'
      )
      return
    }

    const payload = {
      ocupacion: form.ocupacion || null,
      tipo_documento: form.tipo_documento,
      documento: form.documento.trim(),
      primer_nombre: form.primer_nombre,
      segundo_nombre: form.segundo_nombre || null,
      primer_apellido: form.primer_apellido,
      segundo_apellido: form.segundo_apellido || null,
      tipo_paciente: form.tipo_paciente || null,
      diagnostico_id: form.diagnostico_id,
      departamento_afiliacion: form.departamento_afiliacion || null,
      ciudad_afiliacion: form.ciudad_afiliacion || null,
      sucursal: form.sucursal || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo: form.sexo,
      telefono: form.telefono,
      telefono2: form.telefono2 || null,
      direccion: form.direccion || null,
      departamento: form.departamento || null,
      municipio: form.municipio || null,
      subsidiado: form.subsidiado,
      contributivo: form.contributivo,
      observacion: form.observacion || null,
    }

    const { error: guardarError } = esEdicion
      ? await supabase.from('pacientes').update(payload).eq('id', paciente!.id)
      : await supabase.from('pacientes').insert(payload)

    setGuardando(false)

    if (guardarError) {
      setError('No se pudo guardar. Intenta de nuevo.')
      return
    }

    onGuardado()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? 'Editar paciente' : 'Nuevo paciente'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">
              Identificacion
            </p>
          </div>
          <div className="space-y-1">
            <Label>Primer nombre *</Label>
            <Input value={form.primer_nombre} onChange={campo('primer_nombre')} />
          </div>
          <div className="space-y-1">
            <Label>Segundo nombre</Label>
            <Input value={form.segundo_nombre ?? ''} onChange={campo('segundo_nombre')} />
          </div>
          <div className="space-y-1">
            <Label>Primer apellido *</Label>
            <Input value={form.primer_apellido} onChange={campo('primer_apellido')} />
          </div>
          <div className="space-y-1">
            <Label>Segundo apellido</Label>
            <Input value={form.segundo_apellido ?? ''} onChange={campo('segundo_apellido')} />
          </div>
          <div className="space-y-1">
            <Label>Tipo ID</Label>
            <select
              value={form.tipo_documento}
              onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9"
            >
              <option value="CC">CC</option>
              <option value="TI">TI</option>
              <option value="CE">CE</option>
              <option value="PT">PT</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>N de ID *</Label>
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
          <div className="space-y-1">
            <Label>Ocupacion</Label>
            <Input value={form.ocupacion ?? ''} onChange={campo('ocupacion')} />
          </div>

          <div className="col-span-2 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">
              Contacto
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
            <Label>Telefono *</Label>
            <Input value={form.telefono ?? ''} onChange={campo('telefono')} />
          </div>
          <div className="space-y-1">
            <Label>Telefono 2</Label>
            <Input value={form.telefono2 ?? ''} onChange={campo('telefono2')} />
          </div>

          <div className="col-span-2 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">
              Clinico / administrativo
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Diagnostico *</Label>
            <select
              value={form.diagnostico_id}
              onChange={(e) => setForm({ ...form, diagnostico_id: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9"
            >
              <option value="">Selecciona un diagnostico</option>
              {diagnosticos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.descripcion}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              HTA y DM se calculan automaticamente segun el diagnostico elegido.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Tipo paciente</Label>
            <Input value={form.tipo_paciente ?? ''} onChange={campo('tipo_paciente')} />
          </div>
          <div className="space-y-1">
            <Label>Sucursal</Label>
            <Input value={form.sucursal ?? ''} onChange={campo('sucursal')} />
          </div>
          <div className="space-y-1">
            <Label>Departamento afiliacion</Label>
            <Input
              value={form.departamento_afiliacion ?? ''}
              onChange={campo('departamento_afiliacion')}
            />
          </div>
          <div className="space-y-1">
            <Label>Ciudad afiliacion</Label>
            <Input
              value={form.ciudad_afiliacion ?? ''}
              onChange={campo('ciudad_afiliacion')}
            />
          </div>

          <div className="col-span-2 flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.subsidiado}
                onCheckedChange={(v) =>
                  setForm({ ...form, subsidiado: Boolean(v), contributivo: v ? false : form.contributivo })
                }
              />
              Subsidiado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.contributivo}
                onCheckedChange={(v) =>
                  setForm({ ...form, contributivo: Boolean(v), subsidiado: v ? false : form.subsidiado })
                }
              />
              Contributivo
            </label>
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Observacion</Label>
            <Input value={form.observacion ?? ''} onChange={campo('observacion')} />
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
            {esEdicion ? 'Guardar cambios' : 'Crear paciente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}