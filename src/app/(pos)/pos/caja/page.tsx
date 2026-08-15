import { cajaAbierta, movimientosDeCaja, totalesDeCaja } from '@/lib/caja'
import { getPayloadClient } from '@/lib/payload'
import { fechaHora, money } from '@/lib/formato'
import { AbrirCaja, CerrarCaja, Movimientos, type MovimientoLista } from '@/components/pos/PosCaja'
import { BotonTira } from '@/components/pos/BotonTira'

// Turno de caja: abrir, ver cómo va, cerrar con arqueo.

export default async function CajaPage() {
  const caja = await cajaAbierta()
  const payload = await getPayloadClient()

  const [totales, cerradas, movimientos] = await Promise.all([
    caja ? totalesDeCaja(Number(caja.id)) : null,
    payload.find({
      collection: 'cajas',
      where: { estado: { equals: 'cerrada' } },
      sort: '-cierreFecha',
      limit: 8,
      depth: 0,
    }),
    caja ? movimientosDeCaja(Number(caja.id)) : [],
  ])

  const lista: MovimientoLista[] = movimientos.map((m) => ({
    id: Number(m.id),
    tipo: String(m.tipo),
    monto: Number(m.monto) || 0,
    motivo: String(m.motivo || ''),
    fecha: String(m.fecha || m.createdAt),
    quien:
      typeof m.registradoPor === 'object' && m.registradoPor !== null
        ? m.registradoPor.nombre || m.registradoPor.email
        : '—',
  }))

  return (
    <div className="pos-hoja">
      <h1>Caja</h1>
      <p style={{ color: 'var(--pos-suave)', marginBottom: '1.5rem' }}>
        {caja
          ? `Turno abierto el ${fechaHora(caja.aperturaFecha)}.`
          : 'No hay ningún turno abierto.'}
      </p>

      {caja && totales ? (
        <>
          {/* Los movimientos van ANTES del cierre: son lo que hay que anotar
              durante el turno, y el cierre es lo último que se toca. */}
          <Movimientos movimientos={lista} />
          <CerrarCaja fondoInicial={Number(caja.fondoInicial) || 0} totales={totales} />
          <div className="pos-card">
            <h2 style={{ marginTop: 0 }}>Corte X</h2>
            <p style={{ color: 'var(--pos-suave)', marginTop: 0 }}>
              Cómo va el turno, impreso, sin cerrarlo. Se puede sacar las veces que haga falta:
              para revisar la gaveta a media mañana o para dejar constancia en un cambio de
              persona.
            </p>
            <BotonTira href={`/pos/cierre/${caja.id}?imprimir=1`}>Imprimir corte X</BotonTira>
          </div>
        </>
      ) : (
        <AbrirCaja />
      )}

      {cerradas.docs.length > 0 && (
        <div className="pos-card">
          <h2 style={{ marginTop: 0 }}>Cierres anteriores</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="pos-tabla">
              <thead>
                <tr>
                  <th>Cierre</th>
                  <th className="num">Ventas</th>
                  <th className="num">Vendido</th>
                  <th className="num">Diferencia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cerradas.docs.map((c) => {
                  const dif = Number(c.diferencia) || 0
                  return (
                    <tr key={c.id}>
                      <td>{fechaHora(c.cierreFecha)}</td>
                      <td className="num">{c.cantidadVentas ?? 0}</td>
                      <td className="num">{money(c.totalVentas)}</td>
                      <td
                        className="num"
                        style={{ color: dif === 0 ? 'var(--pos-ok)' : 'var(--pos-vino-claro)' }}
                      >
                        {dif === 0 ? 'Cuadró' : money(dif)}
                      </td>
                      <td className="num">
                        {/* Reimprimir el Z de un turno viejo: el papel se moja, se
                            pierde o hace falta otra copia para el contador. */}
                        <BotonTira href={`/pos/cierre/${c.id}?imprimir=1`}>Z</BotonTira>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
