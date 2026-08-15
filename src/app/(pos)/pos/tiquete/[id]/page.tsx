import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import '@/components/pos/tira80.css'
import { Tiquete80 } from '@/components/pos/Tiquete80'
import { AutoImprimir } from '@/components/pos/AutoImprimir'
import { BotonImprimir } from '@/components/pos/BotonImprimir'

// El tiquete de una venta. Se abre en una ventana angosta desde la caja y, si
// viene `?imprimir=1`, sale solo a la impresora.

export default async function TiquetePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ imprimir?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])

  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) notFound()

  const payload = await getPayloadClient()

  const [pedido, ajustes] = await Promise.all([
    payload.findByID({ collection: 'pedidos', id: numero, depth: 1 }).catch(() => null),
    payload.findGlobal({ slug: 'ajustes', locale: 'es' }),
  ])

  if (!pedido) notFound()

  const cajero =
    typeof pedido.atendidoPor === 'object' && pedido.atendidoPor !== null
      ? pedido.atendidoPor.nombre || pedido.atendidoPor.email
      : undefined

  return (
    <>
      <AutoImprimir activo={sp.imprimir === '1'} />

      <Tiquete80
        pedido={{
          numero: pedido.numero,
          codigo: pedido.codigo,
          mesa: pedido.mesa,
          // La fecha del tiquete es la del cobro; si todavía no se cobró, la de
          // creación. Un tiquete sin fecha no sirve para un reclamo.
          fecha: pedido.pagoFecha || pedido.createdAt,
          cajero,
          lineas: pedido.lineas,
          descuentoPorcentaje: pedido.descuentoPorcentaje,
          descuentoMonto: pedido.descuentoMonto,
          subtotal: pedido.subtotal,
          totalIva: pedido.totalIva,
          total: pedido.total,
          pagos: pedido.pagos,
          vuelto: pedido.vuelto,
          requiereFactura: pedido.requiereFactura,
          facturaNombre: pedido.facturaNombre,
          facturaCedula: pedido.facturaCedula,
        }}
        negocio={{
          nombre: ajustes?.negocioNombreLegal || 'Soul Cafe',
          cedulaJuridica: ajustes?.cedulaJuridica,
          direccion: ajustes?.direccion,
          whatsapp: ajustes?.whatsapp,
          pie: ajustes?.tiquetePie,
        }}
      />

      <div className="no-imprimir" style={{ textAlign: 'center', paddingBottom: '2rem' }}>
        <BotonImprimir />
      </div>
    </>
  )
}
