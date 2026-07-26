// Hueco para la pasarela de pago.
//
// Todavía no está decidido el proveedor (depende del banco). Este archivo define
// lo mínimo que cualquiera de ellos necesita, para que el resto del sitio no sepa
// cuál es. El día que se elija, se agrega una implementación aquí y no se toca
// nada del checkout ni de los pedidos.
//
// Lo que piden todas las pasarelas es lo mismo: se les manda un monto y una
// referencia del pedido, devuelven un identificador y una URL a donde mandar al
// cliente, y después avisan por webhook si el cobro salió o no.

export type EstadoCobro = 'pendiente' | 'pagado' | 'fallido'

export type Cobro = {
  /** Nombre del proveedor. Se guarda en el pedido para poder rastrearlo después. */
  proveedor: string
  /** Identificador del cobro del lado del proveedor. */
  referencia: string
  /** A dónde mandar al cliente para que pague. Vacío si el cobro es incrustado. */
  urlPago?: string
  estado: EstadoCobro
}

export type DatosCobro = {
  pedidoId: string | number
  codigo: string
  /** Monto total en colones, entero. Es el que calculó el servidor. */
  montoColones: number
  clienteNombre: string
  clienteEmail?: string
}

export interface Pasarela {
  nombre: string
  crearCobro(datos: DatosCobro): Promise<Cobro>
  /**
   * Traduce el aviso del proveedor a un estado nuestro.
   * Cada pasarela manda un formato distinto; esto lo normaliza.
   */
  leerAviso(cuerpo: unknown): Promise<{ referencia: string; estado: EstadoCobro }>
}

// Pasarela de mentira: deja el pedido pendiente y no cobra nada.
// Sirve para probar carrito, checkout y panel de punta a punta sin proveedor.
export const pasarelaSimulada: Pasarela = {
  nombre: 'simulado',

  async crearCobro(datos) {
    return {
      proveedor: 'simulado',
      referencia: `SIM-${datos.codigo}-${Date.now()}`,
      estado: 'pendiente',
    }
  },

  async leerAviso(cuerpo) {
    const c = (cuerpo ?? {}) as { referencia?: string; estado?: EstadoCobro }
    return {
      referencia: String(c.referencia ?? ''),
      estado: c.estado === 'pagado' ? 'pagado' : 'pendiente',
    }
  },
}

// Cuando se defina el banco, se registra la pasarela real aquí
// y se elige con la variable de entorno PASARELA_PAGO.
const PASARELAS: Record<string, Pasarela> = {
  simulado: pasarelaSimulada,
}

export function getPasarela(): Pasarela {
  const elegida = process.env.PASARELA_PAGO || 'simulado'
  const p = PASARELAS[elegida]
  if (!p) {
    throw new Error(
      `PASARELA_PAGO="${elegida}" no está registrada. Opciones: ${Object.keys(PASARELAS).join(', ')}`,
    )
  }
  return p
}
