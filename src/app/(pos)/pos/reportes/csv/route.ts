import { NextResponse } from 'next/server'
import { aCsv, cabecerasCsv } from '@/lib/csv'
import { fechaHora, NOMBRE_MEDIO } from '@/lib/formato'
import { esAdmin } from '@/lib/roles'
import { usuarioActual } from '@/lib/sesion'
import { MAX_VENTAS, resolverPeriodo, ventasDelPeriodo } from '@/lib/reportes'

// Bajar las ventas del período como CSV.
//
// Dos formatos, porque se usan para cosas distintas:
//
//   ?tipo=ventas — una fila por venta. Es lo que se cuadra contra el banco y el
//     arqueo: totales, medios de pago, quién atendió.
//   ?tipo=lineas — una fila por producto vendido, con su CABYS y su tarifa. Es lo
//     que pide el contador y con lo que se arma cualquier corte a mano en Excel.
//
// Los handlers de ruta NO pasan por el layout del POS, así que el guardia de
// sesión de ahí no los cubre: la comprobación va acá, explícita, igual que en
// `/pos/pendientes`. Y acá además hace falta ser admin — este archivo es el
// histórico de ventas entero.

export const dynamic = 'force-dynamic'

/** Los medios usados en una venta, como "Efectivo + Tarjeta". */
function mediosDe(pagos: { medio?: string | null }[] | null | undefined): string {
  const vistos = [...new Set((pagos || []).map((p) => String(p?.medio || '')))]
  return vistos.map((m) => NOMBRE_MEDIO[m] || m).join(' + ')
}

function montoDe(pagos: { medio?: string | null; monto?: number | null }[] | null | undefined, medio: string): number {
  return (pagos || [])
    .filter((p) => p?.medio === medio)
    .reduce((n, p) => n + (Number(p?.monto) || 0), 0)
}

export async function GET(req: Request) {
  const usuario = await usuarioActual()
  if (!usuario) return NextResponse.json({ error: 'sin-sesion' }, { status: 401 })
  if (!esAdmin(usuario)) return NextResponse.json({ error: 'sin-permiso' }, { status: 403 })

  const url = new URL(req.url)
  const periodo = resolverPeriodo({
    preset: url.searchParams.get('preset') || undefined,
    desde: url.searchParams.get('desde') || undefined,
    hasta: url.searchParams.get('hasta') || undefined,
  })
  const tipo = url.searchParams.get('tipo') === 'lineas' ? 'lineas' : 'ventas'

  const { docs, total } = await ventasDelPeriodo(periodo)

  if (!docs) {
    return NextResponse.json(
      {
        error: 'rango-muy-grande',
        mensaje: `Ese rango trae ${total} ventas y el tope es ${MAX_VENTAS}. Bajalo por partes.`,
      },
      { status: 413 },
    )
  }

  const nombre = `soulcafe-${tipo}-${periodo.desde}_${periodo.hasta}.csv`

  if (tipo === 'lineas') {
    const filas = docs.flatMap((v) =>
      (v.lineas || []).map((l) => [
        v.numero ?? v.id,
        fechaHora(v.pagoFecha),
        v.canal,
        v.mesa ?? '',
        l.nombre,
        l.cantidad,
        l.precioUnitario,
        l.cabys ?? '',
        l.tarifaIva,
        l.subtotal ?? 0,
        l.montoIva ?? 0,
        l.total ?? 0,
        // Vacío, no cero: el producto no tenía costo puesto al venderse. Un cero
        // acá se sumaría como margen del 100% en cualquier tabla dinámica.
        typeof l.costoUnitario === 'number' ? l.costoUnitario : '',
        typeof l.costoUnitario === 'number' ? l.costoUnitario * (Number(l.cantidad) || 0) : '',
        typeof l.costoUnitario === 'number'
          ? (Number(l.subtotal) || 0) - l.costoUnitario * (Number(l.cantidad) || 0)
          : '',
      ]),
    )

    return new NextResponse(
      aCsv(
        [
          'Venta',
          'Fecha de cobro',
          'Canal',
          'Mesa',
          'Producto',
          'Cantidad',
          'Precio unitario sin IVA',
          'CABYS',
          'Tarifa IVA',
          'Neto',
          'IVA',
          'Total linea',
          'Costo unitario',
          'Costo linea',
          'Margen linea',
        ],
        filas,
      ),
      { headers: cabecerasCsv(nombre) },
    )
  }

  const filas = docs.map((v) => [
    v.numero ?? v.id,
    fechaHora(v.pagoFecha),
    v.canal,
    v.mesa ?? '',
    v.clienteNombre,
    (v.subtotal ?? 0) + (v.descuentoMonto ?? 0),
    v.descuentoPorcentaje ?? 0,
    v.descuentoMonto ?? 0,
    v.subtotal ?? 0,
    v.totalIva ?? 0,
    v.total ?? 0,
    mediosDe(v.pagos),
    montoDe(v.pagos, 'efectivo'),
    montoDe(v.pagos, 'tarjeta'),
    montoDe(v.pagos, 'sinpe'),
    v.requiereFactura ? 'Sí' : 'No',
    v.facturaNombre ?? '',
    v.facturaCedula ?? '',
  ])

  return new NextResponse(
    aCsv(
      [
        'Venta',
        'Fecha de cobro',
        'Canal',
        'Mesa',
        'Cliente',
        'Neto antes de descuento',
        'Descuento %',
        'Descuento',
        'Neto',
        'IVA',
        'Total',
        'Medios',
        'Efectivo',
        'Tarjeta',
        'SINPE',
        'Pidio factura',
        'Factura a nombre de',
        'Cedula',
      ],
      filas,
    ),
    { headers: cabecerasCsv(nombre) },
  )
}
