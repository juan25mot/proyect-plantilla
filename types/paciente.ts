export interface Diagnostico {
  id: string
  descripcion: string
}

export interface Paciente {
  id: string
  activo: boolean
  tipo_documento: string
  documento: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  diagnostico_id: string
  fecha_nacimiento: string | null
  sexo: 'F' | 'M' | null
  telefono: string | null
  telefono2: string | null
  direccion: string | null
  departamento: string | null
  municipio: string | null
  subsidiado: boolean
  contributivo: boolean
  hta: boolean
  dm: boolean
  observacion: string | null
}

export interface PacienteSeleccionado extends Paciente {
  observaciones_jornada: string
  resultados_enviados: string
}