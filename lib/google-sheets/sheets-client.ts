import { google } from 'googleapis'

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function hexToRgb01(hex: string) {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255
  return { red: r, green: g, blue: b }
}

const COLUMNAS = [
  'N', 'PRIMER NOMBRE', 'SEGUNDO NOMBRE', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO',
  'TIPO DE ID', 'N DE ID', 'FECHA DE NACIMIENTO', 'EDAD', 'SEXO', 'DIRECCION',
  'MUNICIPIO', 'N TELEFONICO', 'SUBSIDIADO', 'CONTRIBUTIVO', 'HTA', 'DM',
  'OBSERVACIONES',
]

const ANCHOS_COLUMNAS = [
  25,   // A: N
  110,  // B: PRIMER NOMBRE
  105,  // C: SEGUNDO NOMBRE
  105,  // D: PRIMER APELLIDO
  105,  // E: SEGUNDO APELLIDO
  50,   // F: TIPO DE ID
  110,  // G: N DE ID
  105,  // H: FECHA DE NACIMIENTO
  50,   // I: EDAD
  50,   // J: SEXO
  300,  // K: DIRECCION
  140,  // L: MUNICIPIO
  120,  // M: N TELEFONICO
  55,   // N: SUBSIDIADO
  55,   // O: CONTRIBUTIVO
  55,   // P: HTA
  55,   // Q: DM
  250,  // R: OBSERVACIONES
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
  ])

  const valores = [
    [''], // Fila 1: Barra superior roja (celda vacía combinada)
    [`AUXILIAR: ${auxiliarNombre}`], // Fila 2
    [`TRANSPORTE: ${transportistaNombre}`], // Fila 3
    COLUMNAS, // Fila 4
    ...filas, // Filas 5 en adelante
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
        // 1. Combinar celdas para las 3 primeras filas superiores (A1:R1, A2:R2, A3:R3)
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COLUMNAS.length },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: COLUMNAS.length },
            mergeType: 'MERGE_ALL',
          },
        },
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: COLUMNAS.length },
            mergeType: 'MERGE_ALL',
          },
        },

        // 2. Fila 1: Fondo Rojo
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: COLUMNAS.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb01('#FF0000'),
              },
            },
            fields: 'userEnteredFormat(backgroundColor)',
          },
        },

        // 3. Filas 2 y 3: Auxiliar y Transporte (Azul #00B0F0 + Texto Blanco Negrita)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: COLUMNAS.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb01('#00B0F0'),
                textFormat: {
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                  bold: true,
                  fontSize: 12,
                  fontFamily: 'Arial',
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },

        // 4. Fila 4: Encabezados A4 a Q4 (Azul pastel #C1E4F5 + Texto Negro Negrita)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 17 },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb01('#C1E4F5'),
                textFormat: {
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                  bold: true,
                  fontSize: 10,
                  fontFamily: 'Arial',
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
          },
        },

        // 5. Fila 4: Encabezado OBSERVACIONES R4 (Amarillo #FFFF00 + Texto Negro Negrita)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 17, endColumnIndex: 18 },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb01('#FFFF00'),
                textFormat: {
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                  bold: true,
                  fontSize: 10,
                  fontFamily: 'Arial',
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
          },
        },

        // 6. Filas 5 en adelante: Datos (Verde menta suave #D9EAD3)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 4, endRowIndex: 4 + filas.length, startColumnIndex: 0, endColumnIndex: COLUMNAS.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: hexToRgb01('#ffffff'),
                textFormat: {
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                  fontSize: 10,
                  fontFamily: 'Arial',
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
          },
        },

        // 7. Establecer anchos de columna
        ...ANCHOS_COLUMNAS.map((width, index) => ({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: index,
              endIndex: index + 1,
            },
            properties: { pixelSize: width },
            fields: 'pixelSize',
          },
        })),

        // 8. Altura de fila de encabezados (Fila 4 = Index 3)
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'ROWS', startIndex: 3, endIndex: 4 },
            properties: { pixelSize: 40 },
            fields: 'pixelSize',
          },
        },

        // 9. Altura de filas de datos
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'ROWS', startIndex: 4, endIndex: 4 + filas.length },
            properties: { pixelSize: 38 },
            fields: 'pixelSize',
          },
        },

        // 10. Bordes finos para toda la tabla (Encabezados + Datos)
        {
          updateBorders: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 4 + filas.length,
              startColumnIndex: 0,
              endColumnIndex: COLUMNAS.length,
            },
            top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            left: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            right: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
            innerVertical: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
          },
        },
      ],
    },
  })

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`
}