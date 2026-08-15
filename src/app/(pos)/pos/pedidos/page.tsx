import { getPayloadClient } from '@/lib/payload'
import { cajaAbierta } from '@/lib/caja'
import { esDeHoy } from '@/lib/formato'
import { PosPedidos, type PedidoLista } from '@/components/pos/PosPedidos'

// La cola de trabajo: lo que falta preparar o entregar.
//
// Lo entregado, cancelado y anulado no sale acá; para revisar historia está el
// panel. Lo de días anteriores sí viene, pero marcado, porque la pantalla lo
// muestra aparte y plegado.

export default async function PedidosPage() {
  const payload = await getPayloadClient()

  const [pedidos, caja] = await Promise.all([
    payload.find({
      collection: 'pedidos',
      where: { estado: { in: ['nuevo', 'preparando', 'listo'] } },
      // Los más viejos primero: es el orden en que hay que atenderlos.
      sort: 'createdAt',
      limit: 60,
      depth: 0,
    }),
    cajaAbierta(),
  ])

  const lista: PedidoLista[] = pedidos.docs.map((p) => ({
    id: Number(p.id),
    numero: p.numero,
    codigo: p.codigo,
    canal: String(p.canal || 'web'),
    mesa: p.mesa,
    estado: String(p.estado),
    pagoEstado: String(p.pagoEstado),
    clienteNombre: String(p.clienteNombre || ''),
    clienteTelefono: p.clienteTelefono,
    notas: p.notas,
    horaRetiro: p.horaRetiro,
    createdAt: String(p.createdAt),
    // Se decide en el servidor, con la zona de Costa Rica. Si lo decidiera el
    // navegador, una tablet con la hora corrida partiría la lista donde no es.
    esDeHoy: esDeHoy(String(p.createdAt)),
    total: Number(p.total) || 0,
    lineas: (p.lineas || []).map((l) => ({ nombre: l.nombre, cantidad: l.cantidad })),
  }))

  return <PosPedidos pedidos={lista} hayCaja={Boolean(caja)} />
}
