import type { Where } from 'payload'
import type { Pedido } from '@/payload-types'
import { getPayloadClient } from './payload'
import { diaEnCostaRica, finDelDia, hora, inicioDelDia, sumarDias } from './formato'

// Los reportes de ventas.
//
// Toda la agregación pasa por acá. Las pantallas solo pintan lo que este archivo
// devuelve, y el CSV exporta lo mismo que se ve: si el reporte de pantalla y el
// que se le manda al contador salieran de dos consultas distintas, tarde o
// temprano dirían cosas distintas y no habría forma de saber cuál creer.
//
// ---- El corte de fecha ----
//
// Una venta cuenta el día que se COBRÓ (`pagoFecha`), no el día que se abrió.
// Una mesa que se sienta al mediodía y paga a las cinco es plata de las cinco.
// El arqueo ya lo hace así (una cuenta abierta entra en el turno en que se cobra),
// y si los reportes de calendario usaran `createdAt` discreparían del arqueo sin
// que nada lo explicara.
//
// La excepción es el reporte por hora, que sí usa `createdAt`: ahí lo que
// interesa es cuándo entró la demanda, no cuándo se cerró la cuenta.
//
// ---- El tamaño ----
//
// Payload no agrega: hay que traerse los documentos y sumar en JS. A 150 ventas
// al día, un mes son ~4.500 documentos y va sobrado. Un año no. Por eso hay un
// tope explícito: antes de traer nada se cuenta, y si se pasa se devuelve un
// aviso en vez de tumbar el servidor. Cuando ese tope estorbe de verdad, el
// camino es SQL crudo por `payload.db.drizzle`, no subir el número.

/** Cuántas ventas se aceptan en un rango antes de pedir que se acorte. */
export const MAX_VENTAS = 8000

export type Periodo = {
  /** Día inicial en Costa Rica, "2026-08-01". */
  desde: string
  /** Día final, inclusive. */
  hasta: string
  etiqueta: string
}

export type FilaMedio = { medio: string; cantidad: number; monto: number }
export type FilaProducto = {
  clave: string
  nombre: string
  unidades: number
  neto: number
  total: number
  /** Neto de las líneas de este producto que traían costo. */
  netoConCosto: number
  costo: number
  /** `null` cuando el producto no tiene costo puesto: no es lo mismo que ganar todo. */
  margen: number | null
}

/**
 * El margen, con su cobertura al lado.
 *
 * Los dos números van juntos a propósito. Si el reporte dijera "margen 78%"
 * cuando solo la mitad del menú tiene costo puesto, el dueño tomaría decisiones
 * con un número inventado — y las líneas sin costo son justo las que más
 * inflan, porque cuentan como ganancia pura. La cobertura es lo que hace que el
 * porcentaje se pueda leer sin equivocarse.
 */
export type Margen = {
  /** Neto de las líneas que SÍ traían costo: la base sobre la que el margen significa algo. */
  netoConCosto: number
  costo: number
  margen: number
  porcentaje: number
  /** Neto de las líneas sin costo puesto: lo que este margen NO está mirando. */
  netoSinCosto: number
  /** Qué porcentaje del neto vendido tiene costo conocido. */
  cobertura: number
}
export type FilaIva = { tarifa: number; base: number; iva: number }
export type FilaHora = { hora: number; cantidad: number; total: number }
export type FilaCajero = { id: number | null; nombre: string; cantidad: number; total: number }

export type FilaAnulacion = {
  id: number
  numero?: number | null
  total: number
  motivo: string
  cuando: string
  quien: string
}

export type FilaDescuento = {
  id: number
  numero?: number | null
  porcentaje: number
  monto: number
  motivo: string
  cuando: string
  quien: string
}

export type Resumen = {
  cantidad: number
  /** Neto antes de descuentos. */
  bruto: number
  descuentos: number
  /** Neto después de descuentos: la base del IVA. */
  neto: number
  iva: number
  total: number
  ticketPromedio: number
  unidades: number
}

export type ReporteVentas = {
  periodo: Periodo
  /** Cuando se pasa de `MAX_VENTAS`, esto trae el aviso y lo demás viene vacío. */
  excedido: { ventas: number } | null
  resumen: Resumen
  margen: Margen
  porMedio: FilaMedio[]
  porCanal: { canal: string; cantidad: number; total: number }[]
  porHora: FilaHora[]
  porCajero: FilaCajero[]
  productos: FilaProducto[]
  iva: FilaIva[]
  anulaciones: FilaAnulacion[]
  descuentos: FilaDescuento[]
  /** Suma de lo anulado en el rango. No sale del total vendido: nunca entró. */
  totalAnulado: number
}

// ------------------------------------------------------------------ Períodos

/**
 * Traduce lo que venga en la URL a un rango de días.
 *
 * Los presets se resuelven contra el día de Costa Rica, no el del servidor:
 * en Vercel el servidor corre en UTC y a las 7 de la noche de acá ya sería
 * mañana para él. "Hoy" tiene que ser el día del local.
 */
export function resolverPeriodo(params: {
  preset?: string
  desde?: string
  hasta?: string
}): Periodo {
  const hoy = diaEnCostaRica()

  const armar = (desde: string, hasta: string, etiqueta: string): Periodo => ({
    desde,
    hasta,
    etiqueta,
  })

  switch (params.preset) {
    case 'ayer': {
      const ayer = sumarDias(hoy, -1)
      return armar(ayer, ayer, 'Ayer')
    }
    case '7': {
      return armar(sumarDias(hoy, -6), hoy, 'Últimos 7 días')
    }
    case '30': {
      return armar(sumarDias(hoy, -29), hoy, 'Últimos 30 días')
    }
    case 'mes': {
      return armar(`${hoy.slice(0, 7)}-01`, hoy, 'Este mes')
    }
    case 'mesPasado': {
      // El día 1 de este mes menos un día cae siempre en el mes pasado, sea de
      // 28, 30 o 31 días. Restar 30 a mano se equivocaría en febrero.
      const finAnterior = sumarDias(`${hoy.slice(0, 7)}-01`, -1)
      return armar(`${finAnterior.slice(0, 7)}-01`, finAnterior, 'Mes pasado')
    }
    case 'rango': {
      const desde = params.desde || hoy
      const hasta = params.hasta || hoy
      // Al revés se ordena solo: es más útil que un reporte vacío.
      const [a, b] = desde <= hasta ? [desde, hasta] : [hasta, desde]
      return armar(a, b, a === b ? 'Un día' : 'Rango')
    }
    default:
      return armar(hoy, hoy, 'Hoy')
  }
}

// ------------------------------------------------------------------ Agregación

const VACIO: Resumen = {
  cantidad: 0,
  bruto: 0,
  descuentos: 0,
  neto: 0,
  iva: 0,
  total: 0,
  ticketPromedio: 0,
  unidades: 0,
}

const SIN_MARGEN: Margen = {
  netoConCosto: 0,
  costo: 0,
  margen: 0,
  porcentaje: 0,
  netoSinCosto: 0,
  cobertura: 0,
}

/** Las condiciones de "una venta que cuenta", reusadas por el reporte y el CSV. */
export function dondeVendidas(periodo: Periodo): Where {
  return {
    and: [
      { pagoEstado: { equals: 'pagado' } },
      { pagoFecha: { greater_than_equal: inicioDelDia(periodo.desde) } },
      { pagoFecha: { less_than_equal: finDelDia(periodo.hasta) } },
      // Una anulada dejó de ser una venta; una cancelada nunca llegó a serlo.
      { estado: { not_in: ['anulado', 'cancelado'] } },
    ],
  }
}

/**
 * Trae las ventas del rango. `docs` viene en `null` cuando son demasiadas para
 * agregarlas en memoria; `total` dice cuántas eran, para poder avisarlo.
 */
export async function ventasDelPeriodo(
  periodo: Periodo,
): Promise<{ docs: Pedido[] | null; total: number }> {
  const payload = await getPayloadClient()
  const where = dondeVendidas(periodo)

  const { totalDocs } = await payload.count({ collection: 'pedidos', where })
  if (totalDocs > MAX_VENTAS) return { docs: null, total: totalDocs }

  const res = await payload.find({
    collection: 'pedidos',
    where,
    sort: 'pagoFecha',
    pagination: false,
    depth: 0,
  })
  return { docs: res.docs, total: totalDocs }
}

/**
 * Los nombres del personal, en un mapa.
 *
 * Aparte y de una sola consulta: pedir los pedidos con `depth: 1` traería el
 * usuario entero pegado a cada una de las miles de ventas para acabar usando
 * solo el nombre. Cajeros hay cinco; ventas, miles.
 */
async function nombresDePersonal(): Promise<Map<number, string>> {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'usuarios', pagination: false, depth: 0 })
  return new Map(res.docs.map((u) => [Number(u.id), u.nombre || u.email]))
}

function idDe(rel: unknown): number | null {
  if (typeof rel === 'number') return rel
  if (rel && typeof rel === 'object' && 'id' in rel) return Number((rel as { id: unknown }).id)
  return null
}

export async function reporteDeVentas(periodo: Periodo): Promise<ReporteVentas> {
  const payload = await getPayloadClient()

  const [{ docs: ventas, total }, personal, anuladas] = await Promise.all([
    ventasDelPeriodo(periodo),
    nombresDePersonal(),
    payload.find({
      collection: 'pedidos',
      where: {
        and: [
          { estado: { equals: 'anulado' } },
          { anuladoFecha: { greater_than_equal: inicioDelDia(periodo.desde) } },
          { anuladoFecha: { less_than_equal: finDelDia(periodo.hasta) } },
        ],
      },
      sort: '-anuladoFecha',
      limit: 200,
      depth: 0,
    }),
  ])

  // Las anulaciones se cuentan por CUÁNDO SE ANULARON, no por cuándo se vendió.
  // Es un registro de lo que hizo el personal: si hoy alguien anula una venta de
  // ayer, eso pasó hoy y hoy tiene que aparecer.
  const anulaciones: FilaAnulacion[] = anuladas.docs.map((p) => ({
    id: Number(p.id),
    numero: p.numero,
    total: Number(p.total) || 0,
    motivo: p.anulacionMotivo || '—',
    cuando: String(p.anuladoFecha || ''),
    quien: personal.get(Number(idDe(p.anuladoPor))) || '—',
  }))

  const totalAnulado = anulaciones.reduce((n, a) => n + a.total, 0)

  if (!ventas) {
    return {
      periodo,
      excedido: { ventas: total },
      resumen: VACIO,
      margen: SIN_MARGEN,
      porMedio: [],
      porCanal: [],
      porHora: [],
      porCajero: [],
      productos: [],
      iva: [],
      anulaciones,
      descuentos: [],
      totalAnulado,
    }
  }

  const resumen: Resumen = { ...VACIO, cantidad: ventas.length }

  const medios = new Map<string, { cantidad: number; monto: number }>()
  const canales = new Map<string, { cantidad: number; total: number }>()
  const horas = new Map<number, { cantidad: number; total: number }>()
  const cajeros = new Map<number | null, { cantidad: number; total: number }>()
  const productos = new Map<string, FilaProducto>()
  const tarifas = new Map<number, { base: number; iva: number }>()
  const descuentos: FilaDescuento[] = []

  const margen = { ...SIN_MARGEN }

  for (const venta of ventas) {
    const total = Number(venta.total) || 0
    const neto = Number(venta.subtotal) || 0
    const descuento = Number(venta.descuentoMonto) || 0

    resumen.neto += neto
    resumen.descuentos += descuento
    resumen.bruto += neto + descuento
    resumen.iva += Number(venta.totalIva) || 0
    resumen.total += total

    for (const pago of venta.pagos || []) {
      const medio = String(pago?.medio || 'otro')
      const acc = medios.get(medio) || { cantidad: 0, monto: 0 }
      acc.cantidad += 1
      acc.monto += Number(pago?.monto) || 0
      medios.set(medio, acc)
    }

    const canal = String(venta.canal || 'mostrador')
    const accCanal = canales.get(canal) || { cantidad: 0, total: 0 }
    accCanal.cantidad += 1
    accCanal.total += total
    canales.set(canal, accCanal)

    // El pico de demanda es cuando el cliente PIDE. Una cuenta de mesa que se
    // abrió a la una y se cobró a las cinco fue trabajo de la una.
    const h = Number(hora(venta.createdAt).slice(0, 2))
    if (Number.isInteger(h)) {
      const accHora = horas.get(h) || { cantidad: 0, total: 0 }
      accHora.cantidad += 1
      accHora.total += total
      horas.set(h, accHora)
    }

    const cajeroId = idDe(venta.atendidoPor)
    const accCajero = cajeros.get(cajeroId) || { cantidad: 0, total: 0 }
    accCajero.cantidad += 1
    accCajero.total += total
    cajeros.set(cajeroId, accCajero)

    if (descuento > 0) {
      descuentos.push({
        id: Number(venta.id),
        numero: venta.numero,
        porcentaje: Number(venta.descuentoPorcentaje) || 0,
        monto: descuento,
        motivo: venta.descuentoMotivo || '—',
        cuando: String(venta.pagoFecha || venta.createdAt || ''),
        quien: personal.get(Number(cajeroId)) || '—',
      })
    }

    for (const linea of venta.lineas || []) {
      const unidades = Number(linea.cantidad) || 0
      resumen.unidades += unidades

      // Se agrupa por producto, no por nombre: si al capuchino le cambian el
      // rótulo a media temporada sigue siendo el mismo producto y su ranking no
      // se parte en dos. Las líneas sin producto (borrado del menú) caen en su
      // propio grupo por nombre, que es todo lo que queda de ellas.
      const productoId = idDe(linea.producto)
      const clave = productoId ? `p${productoId}` : `n${linea.nombre}`
      const fila = productos.get(clave) || {
        clave,
        nombre: String(linea.nombre),
        unidades: 0,
        neto: 0,
        total: 0,
        netoConCosto: 0,
        costo: 0,
        margen: null,
      }
      // El nombre que se muestra es el de la venta más reciente del rango: las
      // ventas vienen ordenadas por fecha, así que la última pisa a las viejas.
      fila.nombre = String(linea.nombre)
      fila.unidades += unidades
      const netoLinea = Number(linea.subtotal) || 0
      fila.neto += netoLinea
      fila.total += Number(linea.total) || 0

      // El margen se mide contra el neto DESPUÉS del descuento, que es lo que de
      // verdad entró. Un 2x1 no cuesta la mitad de hacerlo: se lo come el margen,
      // y ahí es donde tiene que verse.
      //
      // Una línea sin costo congelado no se cuenta como margen del 100%: se
      // aparta, y su neto queda registrado como lo que el margen no está mirando.
      if (typeof linea.costoUnitario === 'number') {
        const costoLinea = linea.costoUnitario * unidades
        fila.netoConCosto += netoLinea
        fila.costo += costoLinea
        fila.margen = fila.netoConCosto - fila.costo
        margen.netoConCosto += netoLinea
        margen.costo += costoLinea
      } else {
        margen.netoSinCosto += netoLinea
      }

      productos.set(clave, fila)

      // El desglose por tarifa es lo que pide la declaración: base gravada e
      // impuesto, separados por porcentaje. Sale directo de la línea porque la
      // tarifa quedó congelada al vender.
      const tarifa = Number(linea.tarifaIva) || 0
      const accTarifa = tarifas.get(tarifa) || { base: 0, iva: 0 }
      accTarifa.base += Number(linea.subtotal) || 0
      accTarifa.iva += Number(linea.montoIva) || 0
      tarifas.set(tarifa, accTarifa)
    }
  }

  resumen.ticketPromedio = resumen.cantidad > 0 ? Math.round(resumen.total / resumen.cantidad) : 0

  margen.margen = margen.netoConCosto - margen.costo
  margen.porcentaje =
    margen.netoConCosto > 0 ? Math.round((margen.margen / margen.netoConCosto) * 100) : 0
  const netoMirado = margen.netoConCosto + margen.netoSinCosto
  margen.cobertura = netoMirado > 0 ? Math.round((margen.netoConCosto / netoMirado) * 100) : 0

  return {
    periodo,
    excedido: null,
    resumen,
    margen,
    porMedio: [...medios.entries()]
      .map(([medio, v]) => ({ medio, ...v }))
      .sort((a, b) => b.monto - a.monto),
    porCanal: [...canales.entries()]
      .map(([canal, v]) => ({ canal, ...v }))
      .sort((a, b) => b.total - a.total),
    porHora: [...horas.entries()]
      .map(([h, v]) => ({ hora: h, ...v }))
      .sort((a, b) => a.hora - b.hora),
    porCajero: [...cajeros.entries()]
      .map(([id, v]) => ({ id, nombre: personal.get(Number(id)) || '—', ...v }))
      .sort((a, b) => b.total - a.total),
    productos: [...productos.values()].sort((a, b) => b.unidades - a.unidades),
    iva: [...tarifas.entries()]
      .map(([tarifa, v]) => ({ tarifa, ...v }))
      .sort((a, b) => a.tarifa - b.tarifa),
    anulaciones,
    descuentos: descuentos.sort((a, b) => b.monto - a.monto),
    totalAnulado,
  }
}
