import { getMenu, getPayloadClient } from '@/lib/payload'
import { cajaAbierta } from '@/lib/caja'
import { cuentasAbiertas } from '@/lib/pedidos'
import { PosVenta, type CuentaAbierta, type GrupoPos } from '@/components/pos/PosVenta'

// El catálogo del POS es el MISMO que el del sitio público: `getMenu()`. Un solo
// lugar donde cambiar un precio, y no hay forma de que la caja y el menú digan
// cosas distintas. Se pide en español porque la caja es interna.
//
// Dos parámetros opcionales en la URL, que vienen de la pantalla de mesas:
//   ?mesa=4     → arranca una venta ya asignada a la mesa 4
//   ?cuenta=12  → abre la cuenta abierta 12, para agregarle o cobrarla

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string; cuenta?: string }>
}) {
  const sp = await searchParams
  const payload = await getPayloadClient()

  const [grupos, caja, ajustes, abiertas] = await Promise.all([
    getMenu('es'),
    cajaAbierta(),
    payload.findGlobal({ slug: 'ajustes' }),
    cuentasAbiertas(),
  ])

  const catalogo: GrupoPos[] = grupos
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      productos: g.productos.map((p) => ({
        id: Number(p.id),
        nombre: String(p.nombre),
        precio: Number(p.precio) || 0,
        precioFinal: Number(p.precioFinal) || 0,
        tarifaIva: Number(p.tarifaIva) || 0,
      })),
    }))
    // Una categoría sin productos disponibles solo estorba en la barra.
    .filter((g) => g.productos.length > 0)

  // Se buscan las líneas de la cuenta con precio y tarifa, no solo el total: así
  // la pantalla del cajero puede recalcular el descuento sobre toda la cuenta y
  // dar el mismo número que dará el servidor.
  const idCuenta = Number(sp.cuenta)
  const doc = Number.isInteger(idCuenta) && idCuenta > 0 ? abiertas.find((c) => Number(c.id) === idCuenta) : undefined

  const cuenta: CuentaAbierta | null = doc
    ? {
        id: Number(doc.id),
        mesa: Number(doc.mesa),
        codigo: String(doc.codigo || ''),
        total: Number(doc.total) || 0,
        lineas: (doc.lineas || []).map((l) => ({
          nombre: String(l.nombre || ''),
          cantidad: Number(l.cantidad) || 0,
          precioUnitario: Number(l.precioUnitario) || 0,
          tarifaIva: Number(l.tarifaIva) || 0,
          total: Number(l.total) || 0,
        })),
      }
    : null

  const mesaInicial = Number(sp.mesa)

  return (
    <PosVenta
      grupos={catalogo}
      hayCaja={Boolean(caja)}
      mesasTotal={Math.max(0, Number(ajustes?.cantidadMesas) || 0)}
      mesasOcupadas={abiertas.map((c) => Number(c.mesa))}
      mesaInicial={Number.isInteger(mesaInicial) && mesaInicial > 0 ? mesaInicial : null}
      cuenta={cuenta}
    />
  )
}
