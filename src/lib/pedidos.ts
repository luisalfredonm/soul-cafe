import type { Where } from 'payload'
import { getPayloadClient } from './payload'
import { conNumeroDeVenta } from './consecutivo'
import { aplicarPagos, calcularTotales } from './totales'
import { ZONA, money } from './formato'

// Creación y cobro de ventas, tanto de la web como de la caja del local.
//
// Del navegador solo se acepta QUÉ producto y CUÁNTOS. Nunca el precio, ni el
// nombre, ni el total: todo eso lo lee el servidor de la base. Si el precio
// viniera del cliente, cualquiera podría comprar un flat white por ₡1 abriendo
// las herramientas del navegador. Vale igual para el POS: la pantalla del cajero
// también es un navegador.

export type ItemCarrito = {
  productoId: number
  cantidad: number
}

export type Canal = 'web' | 'mostrador'

export type MedioPago = 'efectivo' | 'tarjeta' | 'sinpe' | 'linea'

export type PagoEntrada = {
  medio: MedioPago
  monto: number
  referencia?: string
}

export type DatosCliente = {
  nombre: string
  telefono?: string
  email?: string
  notas?: string
  requiereFactura?: boolean
  facturaNombre?: string
  facturaCedula?: string
}

// Tope por línea: evita que un pedido accidental (o malicioso) pida 9.999 cafés.
const MAX_POR_LINEA = 30

const MEDIOS: MedioPago[] = ['efectivo', 'tarjeta', 'sinpe', 'linea']

export class ErrorCheckout extends Error {
  constructor(
    public codigo:
      | 'carrito-vacio'
      | 'cantidad-invalida'
      | 'producto-no-existe'
      | 'producto-agotado'
      | 'datos-cliente'
      | 'pedidos-cerrados'
      | 'pago-invalido'
      | 'pagos-insuficientes'
      | 'pedido-no-existe'
      | 'pedido-cobrado'
      | 'pedido-anulado'
      | 'mesa-invalida'
      | 'mesa-ocupada',
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorCheckout'
  }
}

// La zona vive en `lib/formato.ts`, que no importa nada y por eso también lo
// puede cargar el navegador. Se re-exporta porque este módulo ya la exponía.
export { ZONA }

/** Hora local del local, como "07:45". */
export function horaEnCostaRica(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * Convierte "07:30" en la fecha completa de hoy en Costa Rica.
 * El país no tiene horario de verano, así que el desfase es -06:00 siempre.
 */
export function retiroDeHoy(hhmm: string): string | undefined {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return undefined
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const d = new Date(`${hoy}T${hhmm}:00-06:00`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

type AjustesPedidos = {
  pedidosActivos?: boolean | null
  pedidosDesde?: string | null
  pedidosHasta?: string | null
}

/**
 * ¿Se puede pedir en este momento? Mira el interruptor y la ventana horaria.
 * Se usa en dos lados: para decidir si el menú muestra el botón, y otra vez
 * al enviar el pedido — porque entre que se carga la página y se paga, el
 * local pudo haber cerrado los pedidos.
 *
 * Ojo: esto es SOLO para la web. La caja del local vende cuando el local esté
 * abierto, sin importar esta ventana.
 */
export function pedidosAbiertos(ajustes: AjustesPedidos | null | undefined, ahora: Date = new Date()) {
  if (!ajustes?.pedidosActivos) return false

  const desde = (ajustes.pedidosDesde || '').trim()
  const hasta = (ajustes.pedidosHasta || '').trim()
  const valida = /^\d{2}:\d{2}$/
  // Sin ventana bien escrita, el interruptor manda y se acepta todo el día.
  if (!valida.test(desde) || !valida.test(hasta)) return true

  const ahoraHM = horaEnCostaRica(ahora)
  return ahoraHM >= desde && ahoraHM <= hasta
}

/**
 * Deja los pagos en un formato confiable: medios conocidos y montos enteros
 * positivos. Lo que llega raro se descarta o revienta, no se guarda a medias.
 */
export function limpiarPagos(pagos: PagoEntrada[] | undefined): PagoEntrada[] {
  if (!Array.isArray(pagos)) return []

  return pagos
    .map((p) => {
      const medio = String(p?.medio) as MedioPago
      if (!MEDIOS.includes(medio)) {
        throw new ErrorCheckout('pago-invalido', `Medio de pago desconocido: "${p?.medio}".`)
      }
      const monto = Math.round(Number(p?.monto))
      if (!Number.isFinite(monto) || monto <= 0) {
        throw new ErrorCheckout('pago-invalido', 'Hay un pago con monto inválido.')
      }
      return { medio, monto, referencia: p?.referencia?.trim() || undefined }
    })
    .filter(Boolean)
}

function sumaPagos(pagos: PagoEntrada[]) {
  return pagos.reduce((n, p) => n + p.monto, 0)
}


// ------------------------------------------------------------------ Mesas
//
// Una cuenta abierta no es una entidad aparte: es una venta que tiene `mesa` y
// todavía no se cobró. Se le van agregando líneas mientras el cliente pide y al
// pagar se bloquea como cualquier otra venta.

/** Una venta con mesa que sigue viva: ni cobrada, ni anulada, ni cancelada. */
function condicionesCuentaAbierta(): Where[] {
  return [
    { mesa: { exists: true } },
    { pagoEstado: { equals: 'pendiente' } },
    { estado: { not_in: ['anulado', 'cancelado'] } },
  ]
}

/** Comprueba que la mesa exista según los Ajustes. Devuelve undefined si no hay mesa. */
async function validarMesa(
  mesa: number | undefined | null,
  ajustes?: { cantidadMesas?: number | null } | null,
): Promise<number | undefined> {
  if (mesa === undefined || mesa === null || mesa === 0) return undefined

  const n = Number(mesa)
  const total = Number(
    ajustes?.cantidadMesas ??
      (await (await getPayloadClient()).findGlobal({ slug: 'ajustes' })).cantidadMesas ??
      0,
  )

  if (!Number.isInteger(n) || n < 1 || n > total) {
    throw new ErrorCheckout(
      'mesa-invalida',
      total > 0
        ? `La mesa ${mesa} no existe: hay ${total} mesas.`
        : 'No hay mesas configuradas. Se cambia en Ajustes → Cantidad de mesas.',
    )
  }
  return n
}

/** La cuenta abierta de una mesa, si la hay. */
export async function cuentaDeMesa(mesa: number) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pedidos',
    where: { and: [...condicionesCuentaAbierta(), { mesa: { equals: mesa } }] },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })
  return res.docs[0] ?? null
}

/** Todas las cuentas abiertas del salón, para pintar la pantalla de mesas. */
export async function cuentasAbiertas() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pedidos',
    where: { and: condicionesCuentaAbierta() },
    sort: 'mesa',
    pagination: false,
    depth: 0,
  })
  return res.docs
}

/**
 * Agrega una ronda a una cuenta abierta.
 *
 * Las líneas nuevas se funden con las que ya estaban SOLO si coinciden producto,
 * precio y tarifa. Si el precio cambió entre rondas, la nueva va en su propia
 * línea: dos cafés al precio de la mañana y uno al de la tarde son tres cosas
 * distintas en la factura, aunque se llamen igual.
 */
export async function agregarACuenta({
  pedidoId,
  items,
  usuarioId,
}: {
  pedidoId: number
  items: ItemCarrito[]
  usuarioId?: number
}) {
  const payload = await getPayloadClient()
  const pedido = await payload.findByID({ collection: 'pedidos', id: pedidoId, depth: 0 }).catch(() => null)

  if (!pedido) throw new ErrorCheckout('pedido-no-existe', 'Esa cuenta no existe.')
  if (pedido.bloqueado) throw new ErrorCheckout('pedido-cobrado', 'Esa cuenta ya se cobró.')
  if (pedido.estado === 'anulado') {
    throw new ErrorCheckout('pedido-anulado', 'Esa cuenta está anulada.')
  }

  const { lineas: nuevas } = await armarLineas(items)
  const existentes = [...(pedido.lineas || [])]

  for (const nueva of nuevas) {
    const igual = existentes.find(
      (l) =>
        String(l.nombre) === nueva.nombre &&
        Number(l.precioUnitario) === nueva.precioUnitario &&
        Number(l.tarifaIva) === nueva.tarifaIva,
    )
    if (igual) {
      igual.cantidad = Math.min((Number(igual.cantidad) || 0) + nueva.cantidad, MAX_POR_LINEA)
    } else {
      existentes.push(nueva as (typeof existentes)[number])
    }
  }

  return payload.update({
    collection: 'pedidos',
    id: pedidoId,
    data: {
      lineas: existentes,
      // Vuelve a la cola de la barra: hay algo nuevo que preparar. Si la mesa
      // ya estaba marcada como servida, esta ronda la devuelve a la lista de
      // pendientes, que es justo lo que tiene que pasar.
      estado: 'nuevo',
      // Quien agrega la última ronda queda como quien atendió la mesa.
      atendidoPor: usuarioId ?? pedido.atendidoPor,
    },
  })
}

export type LineaCongelada = {
  producto: number
  nombre: string
  cantidad: number
  precioUnitario: number
  tarifaIva: number
  cabys?: string
  /** Vacío si el producto no tenía costo puesto. Se distingue de cero a propósito. */
  costoUnitario?: number
}

/**
 * Traduce "ids y cantidades" a líneas con los datos del producto congelados.
 *
 * Es el único punto donde se leen precios, y siempre de la base. Lo usan tanto
 * la creación de una venta como el agregado de una ronda a una cuenta abierta:
 * cada ronda congela el precio que había en ese momento, así que si el precio
 * cambia a media tarde, lo pedido antes se respeta.
 */
async function armarLineas(items: ItemCarrito[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorCheckout('carrito-vacio', 'El carrito está vacío.')
  }

  // Junta cantidades si el mismo producto viene repetido.
  const pedidos = new Map<number, number>()
  for (const it of items) {
    const id = Number(it?.productoId)
    const cant = Number(it?.cantidad)
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErrorCheckout('producto-no-existe', 'Hay un producto inválido en el carrito.')
    }
    if (!Number.isInteger(cant) || cant < 1 || cant > MAX_POR_LINEA) {
      throw new ErrorCheckout(
        'cantidad-invalida',
        `La cantidad debe ser un número entero entre 1 y ${MAX_POR_LINEA}.`,
      )
    }
    pedidos.set(id, Math.min((pedidos.get(id) || 0) + cant, MAX_POR_LINEA))
  }

  const payload = await getPayloadClient()
  const ids = [...pedidos.keys()]

  const [productos, ajustes] = await Promise.all([
    payload.find({
      collection: 'productos',
      where: { id: { in: ids } },
      limit: ids.length,
      depth: 0,
    }),
    payload.findGlobal({ slug: 'ajustes' }),
  ])

  const tarifaGeneral = Number(ajustes?.tarifaIvaDefecto ?? 13)
  const porId = new Map(productos.docs.map((p) => [Number(p.id), p]))

  const lineas: LineaCongelada[] = ids.map((id) => {
    const p = porId.get(id)
    if (!p) {
      throw new ErrorCheckout('producto-no-existe', `El producto ${id} ya no está en el menú.`)
    }
    if (p.agotado) {
      throw new ErrorCheckout('producto-agotado', `"${p.nombre}" se agotó.`)
    }

    // Copias del momento de la compra. A partir de aquí el pedido es
    // independiente de lo que pase con el producto en el panel.
    return {
      producto: Number(p.id),
      nombre: String(p.nombre),
      cantidad: pedidos.get(id) as number,
      precioUnitario: Number(p.precio) || 0,
      tarifaIva: typeof p.tarifaIva === 'number' ? p.tarifaIva : tarifaGeneral,
      cabys: p.cabys || undefined,
      // `undefined` y no `0`: un producto sin costo puesto no es un producto
      // que salga gratis. El reporte de margen deja fuera lo que no tiene costo
      // en vez de contarlo como ganancia pura.
      costoUnitario: typeof p.costo === 'number' ? p.costo : undefined,
    }
  })

  return { lineas, ajustes, payload }
}

export async function crearPedido({
  items,
  cliente,
  horaRetiro,
  canal = 'web',
  mesa,
  descuentoPorcentaje = 0,
  descuentoMotivo,
  pagos,
  efectivoRecibido,
  cajaId,
  usuarioId,
}: {
  items: ItemCarrito[]
  cliente: DatosCliente
  horaRetiro?: string
  canal?: Canal
  /** Número de mesa. Sin pagos, esto abre una cuenta. */
  mesa?: number
  descuentoPorcentaje?: number
  descuentoMotivo?: string
  /** Si vienen pagos, la venta se cobra y se cierra en el mismo acto. */
  pagos?: PagoEntrada[]
  efectivoRecibido?: number
  cajaId?: number
  usuarioId?: number
}) {
  if (!cliente?.nombre?.trim()) {
    throw new ErrorCheckout('datos-cliente', 'Hace falta el nombre.')
  }
  // En la web el teléfono es obligatorio: es como se avisa que el pedido está
  // listo. En el mostrador el cliente está enfrente y no hace falta.
  if (canal === 'web' && !cliente?.telefono?.trim()) {
    throw new ErrorCheckout('datos-cliente', 'Hacen falta el nombre y el teléfono.')
  }

  const { lineas, ajustes, payload } = await armarLineas(items)

  // Se vuelve a comprobar aquí, no solo al pintar el menú: entre que el cliente
  // abrió la página y le dio a pagar, en el local pudieron apagar los pedidos.
  // El mostrador no pasa por acá: el cajero vende con el local abierto, y la
  // ventana de pedidos en línea no tiene nada que ver con su horario.
  if (canal === 'web' && !pedidosAbiertos(ajustes)) {
    throw new ErrorCheckout(
      'pedidos-cerrados',
      'Ahora mismo no estamos recibiendo pedidos en línea.',
    )
  }

  const numeroMesa = await validarMesa(mesa, ajustes)

  // Una mesa no puede tener dos cuentas abiertas: la segunda ronda iría a una y
  // el cobro a la otra.
  if (numeroMesa && (!pagos || pagos.length === 0)) {
    const abierta = await cuentaDeMesa(numeroMesa)
    if (abierta) {
      throw new ErrorCheckout(
        'mesa-ocupada',
        `La mesa ${numeroMesa} ya tiene una cuenta abierta. Agregale los productos a esa.`,
      )
    }
  }

  // Los montos definitivos los recalcula el hook de la colección. Este cálculo
  // es el mismo (`lib/totales.ts`) y sirve para validar los pagos antes de
  // escribir nada, y así poder dar un error entendible en vez de reventar dentro
  // del hook.
  const calculo = calcularTotales(lineas, descuentoPorcentaje)
  const limpios = limpiarPagos(pagos)
  const cobrada = limpios.length > 0

  if (cobrada && sumaPagos(limpios) < calculo.total) {
    throw new ErrorCheckout(
      'pagos-insuficientes',
      `Los pagos (${money(sumaPagos(limpios))}) no cubren el total (${money(calculo.total)}).`,
    )
  }

  // Se topan DESPUÉS de comprobar que alcanzan: al revés siempre alcanzarían,
  // porque topar es justamente igualarlos al total.
  const aplicados = aplicarPagos(limpios, calculo.total, efectivoRecibido)

  const ahora = new Date().toISOString()

  return conNumeroDeVenta(payload, (numero) =>
    payload.create({
      collection: 'pedidos',
      data: {
        numero,
        canal,
        mesa: numeroMesa,
        estado: 'nuevo',
        horaRetiro: horaRetiro || undefined,
        clienteNombre: cliente.nombre.trim(),
        clienteTelefono: cliente.telefono?.trim() || undefined,
        clienteEmail: cliente.email?.trim() || undefined,
        notas: cliente.notas?.trim() || undefined,
        requiereFactura: Boolean(cliente.requiereFactura),
        facturaNombre: cliente.requiereFactura ? cliente.facturaNombre?.trim() : undefined,
        facturaCedula: cliente.requiereFactura ? cliente.facturaCedula?.trim() : undefined,
        descuentoPorcentaje,
        descuentoMotivo: descuentoPorcentaje > 0 ? descuentoMotivo?.trim() : undefined,
        lineas,

        // Cobro inmediato (mostrador). En la web esto va vacío y el pedido
        // queda pendiente hasta que se retire.
        pagos: cobrada ? aplicados.pagos : undefined,
        efectivoRecibido: cobrada ? aplicados.efectivoRecibido : undefined,
        pagoEstado: cobrada ? 'pagado' : 'pendiente',
        pagoFecha: cobrada ? ahora : undefined,
        bloqueado: cobrada,
        caja: cobrada ? cajaId : undefined,
        atendidoPor: usuarioId,
      },
    }),
  )
}

/**
 * Cobra un pedido que ya existía — el caso típico es un pedido web que el
 * cliente viene a retirar. No toca las líneas ni los montos: la venta ya estaba
 * calculada, acá solo se registra con qué se pagó y en qué turno cayó.
 */
export async function cobrarPedido({
  pedidoId,
  pagos,
  efectivoRecibido,
  descuentoPorcentaje,
  descuentoMotivo,
  cajaId,
  usuarioId,
}: {
  pedidoId: number
  pagos: PagoEntrada[]
  efectivoRecibido?: number
  /** Descuento aplicado al cerrar la cuenta. Recalcula todo el pedido. */
  descuentoPorcentaje?: number
  descuentoMotivo?: string
  cajaId: number
  usuarioId: number
}) {
  const payload = await getPayloadClient()

  const pedido = await payload.findByID({ collection: 'pedidos', id: pedidoId, depth: 0 }).catch(() => null)
  if (!pedido) throw new ErrorCheckout('pedido-no-existe', 'Ese pedido no existe.')
  if (pedido.bloqueado) throw new ErrorCheckout('pedido-cobrado', 'Ese pedido ya estaba cobrado.')
  if (pedido.estado === 'anulado') {
    throw new ErrorCheckout('pedido-anulado', 'Ese pedido está anulado: no se puede cobrar.')
  }

  const limpios = limpiarPagos(pagos)
  if (limpios.length === 0) {
    throw new ErrorCheckout('pago-invalido', 'Hay que registrar al menos un medio de pago.')
  }

  // Si se aplica un descuento al cerrar, el total guardado ya no sirve para
  // validar: hay que recalcularlo con la misma fórmula que usará el hook.
  // Si no, el total del pedido es el bueno.
  const aplicaDescuento = descuentoPorcentaje !== undefined
  const total = aplicaDescuento
    ? calcularTotales(pedido.lineas || [], descuentoPorcentaje).total
    : Number(pedido.total) || 0

  if (sumaPagos(limpios) < total) {
    throw new ErrorCheckout(
      'pagos-insuficientes',
      `Los pagos (${money(sumaPagos(limpios))}) no cubren el total (${money(total)}).`,
    )
  }

  const aplicados = aplicarPagos(limpios, total, efectivoRecibido)

  return payload.update({
    collection: 'pedidos',
    id: pedidoId,
    data: {
      ...(aplicaDescuento
        ? {
            descuentoPorcentaje,
            descuentoMotivo: descuentoPorcentaje > 0 ? descuentoMotivo?.trim() : undefined,
          }
        : {}),
      pagos: aplicados.pagos,
      efectivoRecibido: aplicados.efectivoRecibido,
      pagoEstado: 'pagado',
      pagoFecha: new Date().toISOString(),
      bloqueado: true,
      caja: cajaId,
      atendidoPor: usuarioId,
    },
  })
}

/**
 * Anular, no borrar. Una venta borrada desaparece del arqueo y nadie puede
 * reconstruir qué pasó; una anulada queda con su motivo y su responsable.
 */
export async function anularPedido({
  pedidoId,
  motivo,
  usuarioId,
}: {
  pedidoId: number
  motivo: string
  usuarioId: number
}) {
  if (!motivo?.trim()) {
    throw new ErrorCheckout('datos-cliente', 'Hay que escribir el motivo de la anulación.')
  }

  const payload = await getPayloadClient()

  return payload.update({
    collection: 'pedidos',
    id: pedidoId,
    data: {
      estado: 'anulado',
      anulacionMotivo: motivo.trim(),
      anuladoPor: usuarioId,
      anuladoFecha: new Date().toISOString(),
    },
  })
}
