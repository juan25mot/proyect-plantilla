import { google } from 'googleapis'

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

const COLUMNAS = [
  'N', 'PRIMER NOMBRE', 'SEGUNDO NOMBRE', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO',
  'TIPO DE ID', 'N DE ID', 'FECHA DE NACIMIENTO', 'EDAD', 'SEXO', 'DIRECCION',
  'MUNICIPIO', 'N TELEFONICO', 'SUBSIDIADO', 'CONTRIBUTIVO', 'HTA', 'DM',
  'OBSERVACIONES', 'RESULTADOS ENVIADOS',
]

function calcularEdad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return ''
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return String(edad)
}

export async function crearPestanaPlantilla({
  spreadsheetId,
  nombreHoja,
  auxiliarNombre,
  transportistaNombre,
  pacientes,
}: {
  spreadsheetId: string
  nombreHoja: string
  auxiliarNombre: string
  transportistaNombre: string
  pacientes: any[]
}): Promise<string> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const addSheetRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: nombreHoja } } }],
    },
  })

  const sheetId = addSheetRes.data.replies?.[0]?.addSheet?.properties?.sheetId

  const filas = pacientes.map((p, i) => [
    i + 1,
    p.primer_nombre ?? '',
    p.segundo_nombre ?? '',
    p.primer_apellido ?? '',
    p.segundo_apellido ?? '',
    p.tipo_documento ?? '',
    p.documento ?? '',
    p.fecha_nacimiento ?? '',
    calcularEdad(p.fecha_nacimiento),
    p.sexo ?? '',
    p.direccion ?? '',
    p.municipio ?? '',
    p.telefono_snapshot ?? '',
    p.subsidiado ? '1' : '',
    p.contributivo ? '1' : '',
    p.hta ? 'SI' : '',
    p.dm ? 'SI' : '',
    p.observaciones_jornada ?? '',
    p.resultados_enviados ?? '',
  ])

  const valores = [
    [
      `AUXILIAR: ${auxiliarNombre}`, '', '', '', '', '', '',
      `TRANSPORTE: ${transportistaNombre}`, '', '', '', '', '', '', '', '', '', '', '',
    ],
    COLUMNAS,
    ...filas,
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${nombreHoja}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valores },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: COLUMNAS.length,
            },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.13, green: 0.32, blue: 0.61 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.53, green: 0.81, blue: 0.92 },
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: 2 + filas.length,
              startColumnIndex: 17,
              endColumnIndex: 19,
            },
            cell: {
              userEnteredFormat: { backgroundColor: { red: 0, green: 1, blue: 1 } },
            },
            fields: 'userEnteredFormat.backgroundColor',
          },
        },
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 2 + filas.length,
              startColumnIndex: 0,
              endColumnIndex: COLUMNAS.length,
            },
            top: { style: 'SOLID', width: 1 },
            bottom: { style: 'SOLID', width: 1 },
            left: { style: 'SOLID', width: 1 },
            right: { style: 'SOLID', width: 1 },
            innerHorizontal: { style: 'SOLID', width: 1 },
            innerVertical: { style: 'SOLID', width: 1 },
          },
        },
      ],
    },
  })

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`
}