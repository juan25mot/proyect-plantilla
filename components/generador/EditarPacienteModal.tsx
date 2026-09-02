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
          <DialogContent className="max-w-2xl rounded-2xl border-slate-200">
              <DialogHeader className="border-b border-slate-100 pb-2">
                  <DialogTitle className="text-xl font-bold text-slate-800">
                      Editar Paciente
                  </DialogTitle>
              </DialogHeader>

              {/* Formulario en 2 columnas con tipografía text-sm más legible */}
              <div className="grid grid-cols-2 gap-3 py-2">
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Primer nombre</Label>
                      <Input className="h-9 text-sm" value={form.primer_nombre} onChange={campo('primer_nombre')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Segundo nombre</Label>
                      <Input className="h-9 text-sm" value={form.segundo_nombre ?? ''} onChange={campo('segundo_nombre')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Primer apellido</Label>
                      <Input className="h-9 text-sm" value={form.primer_apellido} onChange={campo('primer_apellido')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Segundo apellido</Label>
                      <Input className="h-9 text-sm" value={form.segundo_apellido ?? ''} onChange={campo('segundo_apellido')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Tipo ID</Label>
                      <Input className="h-9 text-sm" value={form.tipo_documento} onChange={campo('tipo_documento')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">N° de ID</Label>
                      <Input className="h-9 text-sm" value={form.documento} onChange={campo('documento')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Fecha nacimiento</Label>
                      <Input
                          type="date"
                          className="h-9 text-sm text-slate-800"
                          value={form.fecha_nacimiento ?? ''}
                          onChange={campo('fecha_nacimiento')}
                      />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Sexo</Label>
                      <select
                          value={form.sexo ?? ''}
                          onChange={(e) =>
                              setForm({ ...form, sexo: e.target.value as 'F' | 'M' })
                          }
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9 text-slate-800 bg-white"
                      >
                          <option value="">-</option>
                          <option value="F">Femenino (F)</option>
                          <option value="M">Masculino (M)</option>
                      </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Diagnóstico</Label>
                      <select
                          value={form.diagnostico_id}
                          onChange={(e) => setForm({ ...form, diagnostico_id: e.target.value })}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9 text-slate-800 bg-white"
                      >
                          {diagnosticos.map((d) => (
                              <option key={d.id} value={d.id}>
                                  {d.descripcion}
                              </option>
                          ))}
                      </select>
                      <p className="text-xs text-slate-400">
                          HTA y DM se recalculan automáticamente según el diagnóstico elegido.
                      </p>
                  </div>

                  <div className="col-span-2 space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Dirección</Label>
                      <Input className="h-9 text-sm" value={form.direccion ?? ''} onChange={campo('direccion')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Departamento</Label>
                      <Input className="h-9 text-sm" value={form.departamento ?? ''} onChange={campo('departamento')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Municipio</Label>
                      <Input className="h-9 text-sm" value={form.municipio ?? ''} onChange={campo('municipio')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Teléfono</Label>
                      <Input className="h-9 text-sm" value={form.telefono ?? ''} onChange={campo('telefono')} />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Teléfono 2</Label>
                      <Input className="h-9 text-sm" value={form.telefono2 ?? ''} onChange={campo('telefono2')} />
                  </div>

                  <div className="col-span-2 flex gap-6 pt-1">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <Checkbox
                              checked={form.subsidiado}
                              onCheckedChange={(v) =>
                                  setForm({ ...form, subsidiado: Boolean(v), contributivo: v ? false : form.contributivo })
                              }
                          />
                          Subsidiado
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <Checkbox
                              checked={form.contributivo}
                              onCheckedChange={(v) =>
                                  setForm({ ...form, contributivo: Boolean(v), subsidiado: v ? false : form.subsidiado })
                              }
                          />
                          Contributivo
                      </label>
                  </div>
              </div>

              {error && <p className="text-sm text-[#dc2626] font-semibold">{error}</p>}

              <DialogFooter className="border-t border-slate-100 pt-2">
                  <Button variant="outline" onClick={onClose} disabled={guardando} className="text-sm">
                      Cancelar
                  </Button>
                  <Button
                      onClick={guardar}
                      disabled={guardando}
                      className="bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold"
                  >
                      {guardando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      Guardar cambios
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  )
}