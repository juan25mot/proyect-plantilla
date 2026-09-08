'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'

export function ConfiguracionForm({
  valoresIniciales,
}: {
  valoresIniciales: Record<string, string>
}) {
  const supabase = createClient()

  const [empresaNombre, setEmpresaNombre] = useState(
    valoresIniciales.empresa_nombre ?? ''
  )
  const [sheetsFileId, setSheetsFileId] = useState(
    valoresIniciales.google_sheets_file_id ?? ''
  )
  const [maxPacientes, setMaxPacientes] = useState(
    valoresIniciales.max_pacientes_por_plantilla ?? '50'
  )

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  const guardar = async () => {
    setError(null)
    setExito(false)

    if (!empresaNombre.trim()) {
      setError('El nombre de la empresa es obligatorio.')
      return
    }

    const maxNum = parseInt(maxPacientes, 10)
    if (!maxNum || maxNum < 1) {
      setError('El maximo de pacientes debe ser un numero mayor a 0.')
      return
    }

    setGuardando(true)

    const { error: err } = await supabase.from('configuracion').upsert(
      [
        { clave: 'empresa_nombre', valor: empresaNombre.trim() },
        { clave: 'google_sheets_file_id', valor: sheetsFileId.trim() },
        { clave: 'max_pacientes_por_plantilla', valor: String(maxNum) },
      ],
      { onConflict: 'clave' }
    )

    setGuardando(false)

    if (err) {
      setError('No se pudo guardar. Intenta de nuevo.')
      return
    }

    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800">
          Parametros generales
        </CardTitle>
        <CardDescription>
          Estos valores afectan a toda la aplicacion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nombre de la empresa</Label>
          <Input
            value={empresaNombre}
            onChange={(e) => setEmpresaNombre(e.target.value)}
            placeholder="CIADES"
          />
          <p className="text-xs text-slate-400">
            Aparece en los reportes generados.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>ID del archivo de Google Sheets</Label>
          <Input
            value={sheetsFileId}
            onChange={(e) => setSheetsFileId(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMd..."
          />
          <p className="text-xs text-slate-400">
            Se copia de la URL del archivo en Google Drive. Cambiar esto hace
            que las nuevas plantillas se generen en un archivo distinto.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Maximo de pacientes por plantilla</Label>
          <Input
            type="number"
            min={1}
            value={maxPacientes}
            onChange={(e) => setMaxPacientes(e.target.value)}
          />
          <p className="text-xs text-slate-400">
            Limite que ya aplica el Generador de Plantillas al seleccionar pacientes.
          </p>
        </div>

        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        {exito && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
            <CheckCircle2 className="h-4 w-4" />
            Configuracion guardada.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            onClick={guardar}
            disabled={guardando}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}