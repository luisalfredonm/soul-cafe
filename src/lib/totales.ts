// Aritmética de una venta. Sin dependencias a propósito.
//
// Este archivo lo importan tanto el hook de la colección `Pedidos` como la
// creación de pedidos en `lib/pedidos.ts`. Si viviera en cualquiera de los dos,
// el otro no podría usarlo: `Pedidos.ts` lo carga `payload.config.ts`, y
// `lib/pedidos.ts` carga la config. Sería un círculo.
//
// Que la fórmula esté en un solo lugar importa: si el POS calculara el vuelto
// con una regla y el servidor guardara otra, el cajero daría mal el cambio.

export type LineaCalculable = {
  cantidad?: number | null
  precioUnitario?: number | null
  tarifaIva?: number | null
}

export type CalculoLinea = {
  /** Neto antes del descuento. */
  bruto: number
  /** Neto ya con el descuento aplicado. Es la base del IVA. */
  subtotal: number
  montoIva: number
  total: number
}

export type CalculoPedido = {
  lineas: CalculoLinea[]
  bruto: number
  descuentoPorcentaje: number
  descuentoMonto: number
  subtotal: number
  totalIva: number
  total: number
}

/** Deja el descuento dentro de 0–100 aunque llegue basura. */
export function normalizarDescuento(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/**
 * El descuento se aplica al NETO, antes del IVA.
 *
 * Restarlo del total sería más fácil pero dejaría un impuesto que no
 * corresponde al monto cobrado, y la línea no serviría para facturar.
 * El IVA se redondea por línea, como en una factura.
 */
export function calcularLinea(linea: LineaCalculable, descuento: number): CalculoLinea {
  const cantidad = Number(linea.cantidad) || 0
  const unitario = Number(linea.precioUnitario) || 0
  const tarifa = Number(linea.tarifaIva) || 0

  const bruto = cantidad * unitario
  const subtotal = Math.round(bruto * (1 - descuento / 100))
  const montoIva = Math.round((subtotal * tarifa) / 100)

  return { bruto, subtotal, montoIva, total: subtotal + montoIva }
}

export type PagoAplicable = {
  medio?: string | null
  monto?: number | null
}

/**
 * Topa los pagos al total de la venta. Lo que sobra es VUELTO, no ingreso.
 *
 * El monto de un pago era lo único que llegaba del navegador y se guardaba tal
 * cual. La pantalla del cajero ya lo topa antes de mandarlo, pero "el cliente lo
 * hace bien" no es una defensa: una llamada a la acción con un billete de
 * ₡99.999 contra una venta de ₡8.927 guardaba los ₡99.999 como efectivo
 * cobrado. Y eso no se queda en un número feo en un reporte — infla el efectivo
 * del turno, sube el esperado en la gaveta y la caja cierra con un faltante de
 * noventa mil colones que nunca existió.
 *
 * `efectivoRecibido` NO se topa: es lo que el cliente entregó de verdad, y es de
 * donde sale el vuelto. Si quien llama no lo mandó pero metió el billete entero
 * en el monto, se recupera de ahí — que es justo el caso que torcía el arqueo.
 */
export function aplicarPagos<T extends PagoAplicable>(
  pagos: T[],
  total: number,
  efectivoRecibido?: unknown,
): { pagos: T[]; efectivoRecibido: number } {
  let restante = Math.max(0, Math.round(Number(total) || 0))
  const aplicados: T[] = []

  for (const p of pagos) {
    // Un pago que ya no cubre nada no se guarda: sería una fila de ₡0 en el
    // tiquete y una línea de ruido en el arqueo.
    if (restante <= 0) break
    const monto = Math.min(Math.round(Number(p?.monto) || 0), restante)
    if (monto <= 0) continue
    restante -= monto
    aplicados.push({ ...p, monto } as T)
  }

  const entregadoEnEfectivo = pagos
    .filter((p) => p?.medio === 'efectivo')
    .reduce((n, p) => n + (Math.round(Number(p?.monto) || 0)), 0)

  return {
    pagos: aplicados,
    efectivoRecibido: Math.max(Math.round(Number(efectivoRecibido) || 0), entregadoEnEfectivo),
  }
}

export function calcularTotales(
  lineas: LineaCalculable[],
  descuentoPorcentaje: unknown = 0,
): CalculoPedido {
  const descuento = normalizarDescuento(descuentoPorcentaje)
  const calculadas = lineas.map((l) => calcularLinea(l, descuento))

  const bruto = calculadas.reduce((n, l) => n + l.bruto, 0)
  const subtotal = calculadas.reduce((n, l) => n + l.subtotal, 0)
  const totalIva = calculadas.reduce((n, l) => n + l.montoIva, 0)

  return {
    lineas: calculadas,
    bruto,
    descuentoPorcentaje: descuento,
    descuentoMonto: bruto - subtotal,
    subtotal,
    totalIva,
    total: subtotal + totalIva,
  }
}
