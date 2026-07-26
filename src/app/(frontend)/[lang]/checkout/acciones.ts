'use server'

import { crearPedido, ErrorCheckout, retiroDeHoy, type ItemCarrito } from '@/lib/pedidos'
import { getPasarela } from '@/lib/pagos'
import { getPayloadClient } from '@/lib/payload'

export type ResultadoPedido =
  | { ok: true; codigo: string; total: number; urlPago?: string }
  | { ok: false; codigo: string; mensaje: string }

// Recibe el pedido del navegador. Del carrito solo llegan ids y cantidades:
// los precios, el IVA y el total los pone el servidor (ver lib/pedidos.ts).
export async function enviarPedido(entrada: {
  items: ItemCarrito[]
  nombre: string
  telefono: string
  email?: string
  notas?: string
  horaRetiro?: string
  requiereFactura?: boolean
  facturaNombre?: string
  facturaCedula?: string
}): Promise<ResultadoPedido> {
  try {
    const pedido = await crearPedido({
      items: entrada.items,
      horaRetiro: entrada.horaRetiro ? retiroDeHoy(entrada.horaRetiro) : undefined,
      cliente: {
        nombre: entrada.nombre,
        telefono: entrada.telefono,
        email: entrada.email,
        notas: entrada.notas,
        requiereFactura: entrada.requiereFactura,
        facturaNombre: entrada.facturaNombre,
        facturaCedula: entrada.facturaCedula,
      },
    })

    // El cobro pasa por la pasarela configurada. Hoy es la simulada:
    // deja el pedido en "pendiente" sin mover plata. Cuando se defina el
    // banco, esto no cambia; cambia solo la implementación en lib/pagos.ts.
    const pasarela = getPasarela()
    const cobro = await pasarela.crearCobro({
      pedidoId: pedido.id,
      codigo: String(pedido.codigo),
      montoColones: Number(pedido.total) || 0,
      clienteNombre: entrada.nombre,
      clienteEmail: entrada.email,
    })

    const payload = await getPayloadClient()
    await payload.update({
      collection: 'pedidos',
      id: pedido.id,
      data: {
        pagoProveedor: cobro.proveedor,
        pagoReferencia: cobro.referencia,
        pagoEstado: cobro.estado === 'pagado' ? 'pagado' : 'pendiente',
      },
    })

    return {
      ok: true,
      codigo: String(pedido.codigo),
      total: Number(pedido.total) || 0,
      urlPago: cobro.urlPago,
    }
  } catch (e) {
    if (e instanceof ErrorCheckout) {
      return { ok: false, codigo: e.codigo, mensaje: e.message }
    }
    // Cualquier otra cosa es un fallo nuestro: se registra en el servidor
    // y al cliente se le da un mensaje genérico, sin detalles internos.
    console.error('[checkout] fallo inesperado:', e)
    return { ok: false, codigo: 'desconocido', mensaje: '' }
  }
}
