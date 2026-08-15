import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { usuarioActual } from '@/lib/sesion'
import { inicioDeHoyEnCostaRica } from '@/lib/formato'

// Cuántos pedidos web quedan sin atender. Lo consulta la alarma de la caja cada
// diez segundos, así que devuelve lo mínimo: un número y el último código.
//
// Vive fuera de `/api` a propósito: ahí manda el comodín de Payload
// (`api/[...slug]`) y meterse en ese espacio es pedir un choque de rutas.
//
// Los handlers de ruta NO pasan por el layout, así que el guardia de sesión del
// POS no los cubre. La comprobación va acá, explícita.

export const dynamic = 'force-dynamic'

export async function GET() {
  const usuario = await usuarioActual()
  if (!usuario) {
    return NextResponse.json({ error: 'sin-sesion' }, { status: 401 })
  }

  const payload = await getPayloadClient()

  const res = await payload.find({
    collection: 'pedidos',
    where: {
      and: [
        // Solo la web. Lo de mostrador lo acaba de hacer el cajero y lo de las
        // mesas lo pide alguien que está parado ahí: nada de eso necesita campana.
        { canal: { equals: 'web' } },
        { estado: { equals: 'nuevo' } },
        // Solo lo de hoy. Sin este corte, un pedido viejo que nadie cerró haría
        // sonar la campana para siempre y en dos días nadie le haría caso.
        { createdAt: { greater_than_equal: inicioDeHoyEnCostaRica() } },
      ],
    },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
  })

  const ultimo = res.docs[0]

  return NextResponse.json(
    {
      pendientes: res.totalDocs,
      ultimo: ultimo ? { codigo: ultimo.codigo, creado: ultimo.createdAt } : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
