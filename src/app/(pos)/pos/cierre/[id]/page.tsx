import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { movimientosDeCaja, totalesDeCaja } from '@/lib/caja'
import '@/components/pos/tira80.css'
import { CierreZ, type DatosCierre } from '@/components/pos/CierreZ'
import { AutoImprimir } from '@/components/pos/AutoImprimir'
import { BotonImprimir } from '@/components/pos/BotonImprimir'

// El papel del arqueo de un turno. Se abre en ventana angosta desde la pantalla
// de caja y, con `?imprimir=1`, sale solo por la térmica.
//
// De dónde salen los números:
//
//   Turno CERRADO → de los campos congelados en el propio turno. Un Z es un
//     documento de auditoría: reimprimirlo el mes que viene tiene que dar el
//     mismo papel. Si recontara las ventas, una anulación posterior le cambiaría
//     los totales a un turno ya cerrado y el papel dejaría de cuadrar con el
//     sobre de efectivo que se guardó ese día.
//
//   Turno ABIERTO → recontando, porque no hay nada congelado todavía. Sale un
//     corte X, que es provisional por definición.
//
// El caso raro del medio: turnos cerrados ANTES de que existieran los campos de
// descuentos, IVA y anuladas. Ahí esos vienen en null y sí se recalculan — es
// preferible a imprimir ceros que parecen datos.

export default async function CierrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ imprimir?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])

  const cajaId = Number(id)
  if (!Number.isInteger(cajaId) || cajaId <= 0) notFound()

  const payload = await getPayloadClient()

  const [caja, ajustes, movimientos] = await Promise.all([
    payload.findByID({ collection: 'cajas', id: cajaId, depth: 1 }).catch(() => null),
    payload.findGlobal({ slug: 'ajustes', locale: 'es' }),
    // El detalle siempre se lee de la colección, también en un turno cerrado: los
    // movimientos son documentos propios y no se pueden reescribir por detrás
    // como sí podría pasar con un total suelto.
    movimientosDeCaja(cajaId),
  ])

  if (!caja) notFound()

  const cerrado = caja.estado === 'cerrada'
  // Un turno cerrado antes de que existieran estos campos los trae en null.
  const congeladoCompleto = cerrado && caja.totalBruto !== null && caja.totalBruto !== undefined

  const totales = congeladoCompleto ? null : await totalesDeCaja(cajaId)

  const nombre = (rel: unknown): string | null => {
    if (rel && typeof rel === 'object' && 'email' in rel) {
      const u = rel as { nombre?: string | null; email?: string }
      return u.nombre || u.email || null
    }
    return null
  }

  const fondoInicial = Number(caja.fondoInicial) || 0

  const datos: DatosCierre = {
    turno: cajaId,
    cerrado,
    apertura: caja.aperturaFecha,
    cierre: caja.cierreFecha,
    abiertaPor: nombre(caja.abiertaPor),
    cerradaPor: nombre(caja.cerradaPor),
    fondoInicial,

    // El dinero: congelado si el turno cerró, recontado si sigue abierto.
    cantidadVentas: cerrado ? Number(caja.cantidadVentas) || 0 : totales!.cantidadVentas,
    totalVentas: cerrado ? Number(caja.totalVentas) || 0 : totales!.totalVentas,
    totalEfectivo: cerrado ? Number(caja.totalEfectivo) || 0 : totales!.totalEfectivo,
    totalTarjeta: cerrado ? Number(caja.totalTarjeta) || 0 : totales!.totalTarjeta,
    totalSinpe: cerrado ? Number(caja.totalSinpe) || 0 : totales!.totalSinpe,
    totalLinea: cerrado ? Number(caja.totalLinea) || 0 : totales!.totalLinea,

    // El desglose analítico: del turno si quedó guardado, recalculado si es de
    // los viejos o si el turno sigue abierto.
    totalBruto: congeladoCompleto ? Number(caja.totalBruto) || 0 : totales!.totalBruto,
    totalDescuentos: congeladoCompleto ? Number(caja.totalDescuentos) || 0 : totales!.totalDescuentos,
    totalIva: congeladoCompleto ? Number(caja.totalIva) || 0 : totales!.totalIva,
    cantidadAnuladas: congeladoCompleto ? Number(caja.cantidadAnuladas) || 0 : totales!.cantidadAnuladas,
    totalAnulado: congeladoCompleto ? Number(caja.totalAnulado) || 0 : totales!.totalAnulado,

    esperadoEfectivo: cerrado
      ? Number(caja.esperadoEfectivo) || 0
      : totales!.esperadoEfectivo,
    efectivoContado: caja.efectivoContado,
    diferencia: caja.diferencia,

    // Los turnos cerrados antes de que existieran los movimientos traen estos
    // dos en null, que es lo correcto: en esos turnos no se movió nada.
    totalIngresos: cerrado ? Number(caja.totalIngresos) || 0 : totales!.totalIngresos,
    totalSalidas: cerrado ? Number(caja.totalSalidas) || 0 : totales!.totalSalidas,
    movimientos: movimientos.map((m) => ({
      tipo: String(m.tipo),
      monto: Number(m.monto) || 0,
      motivo: String(m.motivo || ''),
      quien:
        typeof m.registradoPor === 'object' && m.registradoPor !== null
          ? m.registradoPor.nombre || m.registradoPor.email
          : '—',
    })),

    notas: caja.notas,
  }

  return (
    <>
      <AutoImprimir activo={sp.imprimir === '1'} />

      <CierreZ
        cierre={datos}
        negocio={{
          nombre: ajustes?.negocioNombreLegal || 'Soul Cafe',
          cedulaJuridica: ajustes?.cedulaJuridica,
        }}
      />

      <div className="no-imprimir" style={{ textAlign: 'center', paddingBottom: '2rem' }}>
        <BotonImprimir />
      </div>
    </>
  )
}
