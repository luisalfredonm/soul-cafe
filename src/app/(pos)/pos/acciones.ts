'use server'

import { revalidatePath } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { exigirPersonal, ErrorSesion } from '@/lib/sesion'
import { abrirCaja, cajaAbierta, cerrarCaja, ErrorCaja, registrarMovimiento } from '@/lib/caja'
import type { TipoMovimiento } from '@/lib/movimientos'
import {
  agregarACuenta,
  anularPedido,
  cobrarPedido,
  crearPedido,
  ErrorCheckout,
  type ItemCarrito,
  type PagoEntrada,
} from '@/lib/pedidos'

// Acciones de la caja.
//
// TODAS empiezan verificando la sesión. Proteger la pantalla no alcanza: una
// server action es un endpoint público que cualquiera puede llamar conociendo su
// identificador. La puerta va acá, del lado del servidor.
//
// Y como en el checkout web, del navegador solo llegan ids, cantidades y montos
// de pago. Los precios y los totales los pone el servidor.

export type Fallo = { ok: false; mensaje: string }
export type Resultado<T = unknown> = ({ ok: true } & T) | Fallo

/** Traduce cualquier fallo a un mensaje que el cajero pueda leer. */
function comoError(e: unknown): Fallo {
  if (e instanceof ErrorSesion || e instanceof ErrorCaja || e instanceof ErrorCheckout) {
    return { ok: false, mensaje: e.message }
  }
  // El hook de la colección también lanza errores con mensajes escritos para
  // que los lea una persona (pagos que no cubren, pedido ya cobrado).
  if (e instanceof Error && e.message && e.message.length < 300) {
    return { ok: false, mensaje: e.message }
  }
  console.error('[pos] fallo inesperado:', e)
  return { ok: false, mensaje: 'Algo falló al guardar. Intentá de nuevo.' }
}

function refrescar() {
  revalidatePath('/pos')
  revalidatePath('/pos/caja')
  revalidatePath('/pos/pedidos')
  revalidatePath('/pos/mesas')
}

// ---------------------------------------------------------------- Caja

export async function abrirCajaAccion(fondoInicial: number): Promise<Resultado<{ cajaId: number }>> {
  try {
    const usuario = await exigirPersonal()
    const caja = await abrirCaja({ fondoInicial, usuarioId: usuario.id })
    refrescar()
    return { ok: true, cajaId: Number(caja.id) }
  } catch (e) {
    return comoError(e)
  }
}

export async function cerrarCajaAccion(entrada: {
  efectivoContado: number
  notas?: string
}): Promise<Resultado<{ cajaId: number }>> {
  try {
    const usuario = await exigirPersonal()
    const abierta = await cajaAbierta()
    if (!abierta) return { ok: false, mensaje: 'No hay ninguna caja abierta.' }

    const caja = await cerrarCaja({
      cajaId: Number(abierta.id),
      efectivoContado: entrada.efectivoContado,
      notas: entrada.notas,
      usuarioId: usuario.id,
    })
    refrescar()
    return { ok: true, cajaId: Number(caja.id) }
  } catch (e) {
    return comoError(e)
  }
}

/**
 * Anota que entró o salió plata de la gaveta.
 *
 * Lo puede hacer cualquiera del personal: el proveedor de la leche le cobra a
 * quien esté en la barra, y si hiciera falta el dueño para anotarlo, no se
 * anotaría. Queda firmado con quién lo hizo y sale en el cierre Z.
 */
export async function registrarMovimientoAccion(entrada: {
  tipo: TipoMovimiento
  monto: number
  motivo: string
}): Promise<Resultado<{ movimientoId: number }>> {
  try {
    const usuario = await exigirPersonal()
    const m = await registrarMovimiento({
      tipo: entrada.tipo,
      monto: entrada.monto,
      motivo: entrada.motivo,
      usuarioId: usuario.id,
    })
    refrescar()
    return { ok: true, movimientoId: Number(m.id) }
  } catch (e) {
    return comoError(e)
  }
}

// ---------------------------------------------------------------- Venta

export async function venderAccion(entrada: {
  items: ItemCarrito[]
  /** Vacío cobra en el acto; con pagos vacíos y mesa, abre una cuenta. */
  pagos: PagoEntrada[]
  efectivoRecibido?: number
  mesa?: number
  descuentoPorcentaje?: number
  descuentoMotivo?: string
  clienteNombre?: string
  notas?: string
  requiereFactura?: boolean
  facturaNombre?: string
  facturaCedula?: string
}): Promise<
  Resultado<{ pedidoId: number; codigo: string; total: number; vuelto: number; cobrado: boolean }>
> {
  try {
    const usuario = await exigirPersonal()

    const caja = await cajaAbierta()
    if (!caja) {
      return { ok: false, mensaje: 'Hay que abrir la caja antes de vender.' }
    }

    const abreCuenta = !entrada.pagos || entrada.pagos.length === 0
    if (abreCuenta && !entrada.mesa) {
      return { ok: false, mensaje: 'Una venta sin cobrar tiene que ir a una mesa.' }
    }

    const pedido = await crearPedido({
      items: entrada.items,
      canal: 'mostrador',
      mesa: entrada.mesa,
      descuentoPorcentaje: entrada.descuentoPorcentaje || 0,
      descuentoMotivo: entrada.descuentoMotivo,
      pagos: entrada.pagos,
      efectivoRecibido: entrada.efectivoRecibido,
      // Una cuenta abierta todavía no entra a ningún turno: se le asigna el
      // turno que esté abierto cuando se cobre, que puede no ser este.
      cajaId: abreCuenta ? undefined : Number(caja.id),
      usuarioId: usuario.id,
      cliente: {
        // En el mostrador casi nunca se pide el nombre: el cliente está enfrente.
        nombre: entrada.clienteNombre?.trim() || (entrada.mesa ? `Mesa ${entrada.mesa}` : 'Mostrador'),
        notas: entrada.notas,
        requiereFactura: entrada.requiereFactura,
        facturaNombre: entrada.facturaNombre,
        facturaCedula: entrada.facturaCedula,
      },
    })

    refrescar()
    return {
      ok: true,
      pedidoId: Number(pedido.id),
      codigo: String(pedido.codigo),
      total: Number(pedido.total) || 0,
      vuelto: Number(pedido.vuelto) || 0,
      cobrado: !abreCuenta,
    }
  } catch (e) {
    return comoError(e)
  }
}

/** Agrega una ronda a una cuenta de mesa que ya está abierta. */
export async function agregarACuentaAccion(entrada: {
  pedidoId: number
  items: ItemCarrito[]
}): Promise<Resultado<{ pedidoId: number; total: number }>> {
  try {
    const usuario = await exigirPersonal()
    const pedido = await agregarACuenta({
      pedidoId: entrada.pedidoId,
      items: entrada.items,
      usuarioId: usuario.id,
    })
    refrescar()
    return { ok: true, pedidoId: Number(pedido.id), total: Number(pedido.total) || 0 }
  } catch (e) {
    return comoError(e)
  }
}

/** Cobra algo que ya existía: un pedido web al retirarlo, o la cuenta de una mesa. */
export async function cobrarPedidoAccion(entrada: {
  pedidoId: number
  pagos: PagoEntrada[]
  efectivoRecibido?: number
  descuentoPorcentaje?: number
  descuentoMotivo?: string
}): Promise<Resultado<{ pedidoId: number; vuelto: number }>> {
  try {
    const usuario = await exigirPersonal()

    const caja = await cajaAbierta()
    if (!caja) {
      return { ok: false, mensaje: 'Hay que abrir la caja antes de cobrar.' }
    }

    const pedido = await cobrarPedido({
      pedidoId: entrada.pedidoId,
      pagos: entrada.pagos,
      efectivoRecibido: entrada.efectivoRecibido,
      descuentoPorcentaje: entrada.descuentoPorcentaje,
      descuentoMotivo: entrada.descuentoMotivo,
      cajaId: Number(caja.id),
      usuarioId: usuario.id,
    })

    refrescar()
    return { ok: true, pedidoId: Number(pedido.id), vuelto: Number(pedido.vuelto) || 0 }
  } catch (e) {
    return comoError(e)
  }
}

// ---------------------------------------------------------------- Pedidos

const ESTADOS = ['nuevo', 'preparando', 'listo', 'entregado', 'cancelado'] as const
type EstadoPedido = (typeof ESTADOS)[number]

export async function cambiarEstadoAccion(entrada: {
  pedidoId: number
  estado: EstadoPedido
}): Promise<Resultado> {
  try {
    await exigirPersonal()

    if (!ESTADOS.includes(entrada.estado)) {
      return { ok: false, mensaje: 'Ese estado no existe.' }
    }

    const payload = await getPayloadClient()
    await payload.update({
      collection: 'pedidos',
      id: entrada.pedidoId,
      data: { estado: entrada.estado },
    })

    refrescar()
    return { ok: true }
  } catch (e) {
    return comoError(e)
  }
}

/**
 * Anular deja el rastro; borrar lo destruye. Por eso el cajero puede anular
 * (se equivoca a diario) pero no puede borrar: el `delete` de la colección es
 * solo del admin.
 */
export async function anularPedidoAccion(entrada: {
  pedidoId: number
  motivo: string
}): Promise<Resultado> {
  try {
    const usuario = await exigirPersonal()
    await anularPedido({
      pedidoId: entrada.pedidoId,
      motivo: entrada.motivo,
      usuarioId: usuario.id,
    })
    refrescar()
    return { ok: true }
  } catch (e) {
    return comoError(e)
  }
}
