import { getPayloadClient } from './payload'

// Creación de pedidos.
//
// Del navegador solo se acepta QUÉ producto y CUÁNTOS. Nunca el precio, ni el
// nombre, ni el total: todo eso lo lee el servidor de la base. Si el precio
// viniera del cliente, cualquiera podría comprar un flat white por ₡1 abriendo
// las herramientas del navegador.

export type ItemCarrito = {
  productoId: number
  cantidad: number
}

export type DatosCliente = {
  nombre: string
  telefono: string
  email?: string
  notas?: string
  requiereFactura?: boolean
  facturaNombre?: string
  facturaCedula?: string
}

// Tope por línea: evita que un pedido accidental (o malicioso) pida 9.999 cafés.
const MAX_POR_LINEA = 30

export class ErrorCheckout extends Error {
  constructor(
    public codigo:
      | 'carrito-vacio'
      | 'cantidad-invalida'
      | 'producto-no-existe'
      | 'producto-agotado'
      | 'datos-cliente'
      | 'pedidos-cerrados',
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorCheckout'
  }
}

// Costa Rica no tiene horario de verano, pero el servidor sí puede correr en UTC
// (Vercel lo hace). Sin fijar la zona, la ventana horaria se corre seis horas.
export const ZONA = 'America/Costa_Rica'

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

export async function crearPedido({
  items,
  cliente,
  horaRetiro,
}: {
  items: ItemCarrito[]
  cliente: DatosCliente
  horaRetiro?: string
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorCheckout('carrito-vacio', 'El carrito está vacío.')
  }
  if (!cliente?.nombre?.trim() || !cliente?.telefono?.trim()) {
    throw new ErrorCheckout('datos-cliente', 'Hacen falta el nombre y el teléfono.')
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

  // Se vuelve a comprobar aquí, no solo al pintar el menú: entre que el cliente
  // abrió la página y le dio a pagar, en el local pudieron apagar los pedidos.
  if (!pedidosAbiertos(ajustes)) {
    throw new ErrorCheckout(
      'pedidos-cerrados',
      'Ahora mismo no estamos recibiendo pedidos en línea.',
    )
  }

  const tarifaGeneral = Number(ajustes?.tarifaIvaDefecto ?? 13)
  const porId = new Map(productos.docs.map((p) => [Number(p.id), p]))

  const lineas = ids.map((id) => {
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
    }
  })

  // Los totales los calcula el hook de la colección, no esta función.
  return payload.create({
    collection: 'pedidos',
    data: {
      estado: 'nuevo',
      pagoEstado: 'pendiente',
      horaRetiro: horaRetiro || undefined,
      clienteNombre: cliente.nombre.trim(),
      clienteTelefono: cliente.telefono.trim(),
      clienteEmail: cliente.email?.trim() || undefined,
      notas: cliente.notas?.trim() || undefined,
      requiereFactura: Boolean(cliente.requiereFactura),
      facturaNombre: cliente.requiereFactura ? cliente.facturaNombre?.trim() : undefined,
      facturaCedula: cliente.requiereFactura ? cliente.facturaCedula?.trim() : undefined,
      lineas,
    },
  })
}
