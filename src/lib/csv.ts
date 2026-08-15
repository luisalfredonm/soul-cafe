// Generación de CSV para exportar reportes.
//
// Dos decisiones que parecen manías y no lo son, porque este archivo lo abre el
// contador en un Excel en español:
//
// - Se separa con punto y coma, no con coma. Excel en configuración regional de
//   Costa Rica (y de casi toda Latinoamérica) espera `;`. Con comas mete la fila
//   entera en la primera columna y el que recibe el archivo cree que se rompió.
//
// - Empieza con el BOM de UTF-8. Sin él, Excel abre el archivo en la codificación
//   del sistema y "Capuchino con canela" llega como "CapuchinoÂ conÂ canela".
//
// Los montos van como enteros pelados, sin separador de miles y sin el símbolo:
// así Excel los toma como números y se pueden sumar. El formato bonito es cosa
// de la pantalla, no del archivo.

const BOM = '﻿'
const SEP = ';'

/**
 * Una celda. Se entrecomilla solo cuando hace falta, y las comillas de adentro
 * se duplican, que es como manda el RFC 4180.
 */
function celda(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function aCsv(encabezados: string[], filas: unknown[][]): string {
  const lineas = [encabezados, ...filas].map((f) => f.map(celda).join(SEP))
  // CRLF por la misma razón que el resto: es lo que Excel espera.
  return BOM + lineas.join('\r\n') + '\r\n'
}

/**
 * Los encabezados HTTP para que el navegador lo baje como archivo en vez de
 * pintarlo como texto.
 */
export function cabecerasCsv(nombreArchivo: string): HeadersInit {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    'Cache-Control': 'no-store',
  }
}
