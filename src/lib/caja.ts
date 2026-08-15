import { getPayloadClient } from './payload'
import { efectoEnGaveta, TIPOS_MOVIMIENTO, type TipoMovimiento } from './movimientos'
import { cuentasAbiertas } from './pedidos'

// Turnos de caja: abrir, sumar lo del turno, cerrar con arqueo.
//
// El arqueo se calcula SIEMPRE a partir de los pedidos guardados, nunca de un
// contador que se vaya sumando. Si un contador se desincroniza no hay forma de
// saber cuál de los dos números es el bueno; recontando los pedidos, el resultado
// es reproducible.

export type TotalesCaja = {
  cantidadVentas: number
  totalVentas: number
  totalEfectivo: number
  totalTarjeta: number
  totalSinpe: number
  totalLinea: number
  /** Fondo + efectivo cobrado + lo que entró − lo que salió. */
  esperadoEfectivo: number
  /** Movimientos que METIERON plata a la gaveta. */
  totalIngresos: number
  /** Movimientos que la SACARON: retiros y gastos, ya sumados en positivo. */
  totalSalidas: number
  cantidadMovimientos: number
  /** Neto antes de descuentos. */
  totalBruto: number
  totalDescuentos: number
  totalIva: number
  /** Anuladas DURANTE este turno, sin importar en cuál se habían vendido. */
  cantidadAnuladas: number
  totalAnulado: number
}

export class ErrorCaja extends Error {
  constructor(
    public codigo:
      | 'sin-caja'
      | 'ya-abierta'
      | 'ya-cerrada'
      | 'mesas-abiertas'
      | 'monto-invalido'
      | 'sin-motivo',
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorCaja'
  }
}

/** El turno abierto ahora mismo, o null si la caja está cerrada. */
export async function cajaAbierta() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'cajas',
    where: { estado: { equals: 'abierta' } },
    sort: '-aperturaFecha',
    limit: 1,
    depth: 0,
  })
  return res.docs[0] ?? null
}

export async function abrirCaja({
  fondoInicial,
  usuarioId,
}: {
  fondoInicial: number
  usuarioId: number
}) {
  const abierta = await cajaAbierta()
  if (abierta) {
    throw new ErrorCaja('ya-abierta', 'Ya hay una caja abierta. Hay que cerrarla antes de abrir otra.')
  }

  const payload = await getPayloadClient()
  return payload.create({
    collection: 'cajas',
    data: {
      estado: 'abierta',
      fondoInicial: Math.max(0, Math.round(Number(fondoInicial) || 0)),
      abiertaPor: usuarioId,
      aperturaFecha: new Date().toISOString(),
    },
  })
}

/**
 * Suma todo lo cobrado en un turno.
 *
 * Las ventas anuladas quedan fuera del total: existen para dejar rastro, no para
 * cuadrar. Pero sí se cuentan aparte, porque cuántas se anulan y por cuánto es
 * justo lo que hay que poder mirar.
 *
 * Las canceladas también quedan fuera. Una cancelada nunca llegó a ser venta, y
 * si arrastrara su monto al arqueo la gaveta nunca cuadraría.
 */
export async function totalesDeCaja(cajaId: number): Promise<TotalesCaja> {
  const payload = await getPayloadClient()

  const [caja, ventas, anuladas, movimientos] = await Promise.all([
    payload.findByID({ collection: 'cajas', id: cajaId, depth: 0 }).catch(() => null),
    payload.find({
      collection: 'pedidos',
      where: {
        and: [{ caja: { equals: cajaId } }, { estado: { not_in: ['anulado', 'cancelado'] } }],
      },
      pagination: false,
      depth: 0,
    }),
    payload.find({
      collection: 'pedidos',
      where: { and: [{ caja: { equals: cajaId } }, { estado: { equals: 'anulado' } }] },
      pagination: false,
      depth: 0,
    }),
    payload.find({
      collection: 'movimientos',
      where: { caja: { equals: cajaId } },
      pagination: false,
      depth: 0,
    }),
  ])

  const acumulado = { efectivo: 0, tarjeta: 0, sinpe: 0, linea: 0 }
  let totalVentas = 0
  let totalBruto = 0
  let totalDescuentos = 0
  let totalIva = 0

  for (const venta of ventas.docs) {
    const neto = Number(venta.subtotal) || 0
    const descuento = Number(venta.descuentoMonto) || 0

    totalVentas += Number(venta.total) || 0
    totalBruto += neto + descuento
    totalDescuentos += descuento
    totalIva += Number(venta.totalIva) || 0

    for (const pago of venta.pagos || []) {
      const monto = Number(pago?.monto) || 0
      if (pago?.medio && pago.medio in acumulado) {
        acumulado[pago.medio as keyof typeof acumulado] += monto
      }
    }
  }

  // Lo que se movió de la gaveta sin ser una venta. Sin esto, sacar plata para
  // pagarle al proveedor de la leche aparecería como faltante al cerrar.
  let totalIngresos = 0
  let totalSalidas = 0
  for (const m of movimientos.docs) {
    const efecto = efectoEnGaveta(m.tipo, m.monto)
    if (efecto > 0) totalIngresos += efecto
    else totalSalidas += -efecto
  }

  const fondo = Number(caja?.fondoInicial) || 0

  return {
    cantidadVentas: ventas.docs.length,
    totalVentas,
    totalEfectivo: acumulado.efectivo,
    totalTarjeta: acumulado.tarjeta,
    totalSinpe: acumulado.sinpe,
    totalLinea: acumulado.linea,
    esperadoEfectivo: fondo + acumulado.efectivo + totalIngresos - totalSalidas,
    totalIngresos,
    totalSalidas,
    cantidadMovimientos: movimientos.docs.length,
    totalBruto,
    totalDescuentos,
    totalIva,
    cantidadAnuladas: anuladas.docs.length,
    totalAnulado: anuladas.docs.reduce((n, p) => n + (Number(p.total) || 0), 0),
  }
}

/** Los movimientos de un turno, del más viejo al más nuevo. */
export async function movimientosDeCaja(cajaId: number) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'movimientos',
    where: { caja: { equals: cajaId } },
    sort: 'fecha',
    pagination: false,
    depth: 1,
  })
  return res.docs
}

/**
 * Anota que entró o salió plata de la gaveta.
 *
 * Solo con la caja abierta: un movimiento tiene que caer en un turno para entrar
 * en su arqueo, y meterlo en uno ya cerrado le cambiaría el resultado a un
 * cierre que ya se firmó.
 */
export async function registrarMovimiento({
  tipo,
  monto,
  motivo,
  usuarioId,
}: {
  tipo: TipoMovimiento
  monto: number
  motivo: string
  usuarioId: number
}) {
  const caja = await cajaAbierta()
  if (!caja) {
    throw new ErrorCaja(
      'sin-caja',
      'Hay que abrir la caja antes de anotar un movimiento: si no, no hay arqueo donde caiga.',
    )
  }

  const entero = Math.round(Number(monto) || 0)
  if (!Number.isFinite(entero) || entero <= 0) {
    throw new ErrorCaja('monto-invalido', 'El monto tiene que ser mayor que cero.')
  }
  if (!TIPOS_MOVIMIENTO.some((t) => t.valor === tipo)) {
    throw new ErrorCaja('monto-invalido', `Tipo de movimiento desconocido: "${tipo}".`)
  }
  if (!motivo?.trim()) {
    throw new ErrorCaja(
      'sin-motivo',
      'Hay que escribir el motivo. Un movimiento sin explicación no se distingue de un faltante.',
    )
  }

  const payload = await getPayloadClient()
  return payload.create({
    collection: 'movimientos',
    data: {
      caja: Number(caja.id),
      tipo,
      monto: entero,
      motivo: motivo.trim(),
      registradoPor: usuarioId,
      fecha: new Date().toISOString(),
    },
  })
}

export async function cerrarCaja({
  cajaId,
  efectivoContado,
  notas,
  usuarioId,
}: {
  cajaId: number
  efectivoContado: number
  notas?: string
  usuarioId: number
}) {
  const payload = await getPayloadClient()
  const caja = await payload.findByID({ collection: 'cajas', id: cajaId, depth: 0 })

  if (!caja) throw new ErrorCaja('sin-caja', 'Ese turno de caja no existe.')
  if (caja.estado === 'cerrada') throw new ErrorCaja('ya-cerrada', 'Ese turno ya estaba cerrado.')

  // Una mesa sin cobrar al cerrar el turno es plata que nadie sabe si entró.
  // El cobro caería en el turno siguiente y el arqueo de hoy quedaría corto sin
  // que nada lo explique. Mejor no dejar cerrar.
  const abiertas = await cuentasAbiertas()
  if (abiertas.length > 0) {
    const mesas = abiertas.map((c) => c.mesa).join(', ')
    throw new ErrorCaja(
      'mesas-abiertas',
      `Hay ${abiertas.length} cuenta(s) sin cobrar en las mesas ${mesas}. Cobralas o anulalas antes de cerrar.`,
    )
  }

  const totales = await totalesDeCaja(cajaId)

  // `esperadoEfectivo` y `diferencia` los vuelve a calcular el hook de la
  // colección al guardar, para que también cuadren si alguien cierra a mano
  // desde el panel.
  return payload.update({
    collection: 'cajas',
    id: cajaId,
    data: {
      estado: 'cerrada',
      cerradaPor: usuarioId,
      cierreFecha: new Date().toISOString(),
      efectivoContado: Math.max(0, Math.round(Number(efectivoContado) || 0)),
      notas: notas?.trim() || undefined,
      cantidadVentas: totales.cantidadVentas,
      totalVentas: totales.totalVentas,
      totalEfectivo: totales.totalEfectivo,
      totalTarjeta: totales.totalTarjeta,
      totalSinpe: totales.totalSinpe,
      totalLinea: totales.totalLinea,
      totalBruto: totales.totalBruto,
      totalDescuentos: totales.totalDescuentos,
      totalIva: totales.totalIva,
      cantidadAnuladas: totales.cantidadAnuladas,
      totalAnulado: totales.totalAnulado,
      totalIngresos: totales.totalIngresos,
      totalSalidas: totales.totalSalidas,
    },
  })
}
