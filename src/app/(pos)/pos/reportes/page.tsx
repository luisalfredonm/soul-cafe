import { fechaCorta, fechaHora, money, NOMBRE_MEDIO } from '@/lib/formato'
import { esAdmin } from '@/lib/roles'
import { usuarioActual } from '@/lib/sesion'
import { MAX_VENTAS, reporteDeVentas, resolverPeriodo } from '@/lib/reportes'
import '@/components/pos/reporte.css'
import { BotonImprimir } from '@/components/pos/BotonImprimir'
import { RangoReporte } from '@/components/pos/RangoReporte'

// Los reportes de ventas.
//
// Es la única pantalla del POS que no es para el cajero: acá se ve el histórico
// completo, con nombres y montos de todo el mundo. El guardia es explícito y va
// del lado del servidor, no escondiendo el enlace en la barra.
//
// Toda la agregación vive en `lib/reportes.ts`. Esta página solo pinta.

export const dynamic = 'force-dynamic'

const NOMBRE_CANAL: Record<string, string> = {
  web: 'Pedido web',
  mostrador: 'Mostrador',
}

/** Una celda con barra proporcional. Lo que se compara de un vistazo. */
function Barra({ valor, maximo }: { valor: number; maximo: number }) {
  const pct = maximo > 0 ? Math.max(2, Math.round((valor / maximo) * 100)) : 0
  return (
    <span className="rep-barra" aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </span>
  )
}

function Tarjeta({ rot, val, pie }: { rot: string; val: string; pie?: string }) {
  return (
    <div className="rep-tarjeta">
      <span className="rot">{rot}</span>
      <span className="val">{val}</span>
      {pie && <span className="pie">{pie}</span>}
    </div>
  )
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; desde?: string; hasta?: string }>
}) {
  const usuario = await usuarioActual()

  // El layout ya exigió sesión; acá se exige el rol. Un cajero que escriba la
  // dirección a mano llega hasta este mensaje y no más.
  if (!esAdmin(usuario)) {
    return (
      <div className="pos-hoja">
        <h1>Reportes</h1>
        <p className="pos-aviso">
          Esta sección es solo para administradores. Si necesitás ver las ventas, pedile al dueño
          que te cambie el rol en <strong>Ajustes → Usuarios</strong>.
        </p>
      </div>
    )
  }

  const sp = await searchParams
  const periodo = resolverPeriodo(sp)
  const r = await reporteDeVentas(periodo)

  const qs = `preset=${sp.preset || 'hoy'}&desde=${periodo.desde}&hasta=${periodo.hasta}`
  const rotuloPeriodo =
    periodo.desde === periodo.hasta
      ? fechaCorta(periodo.desde)
      : `${fechaCorta(periodo.desde)} — ${fechaCorta(periodo.hasta)}`

  // Las columnas de costo y margen solo aparecen si hay algún costo cargado. En
  // un menú sin costos serían dos columnas de rayas ocupando media pantalla.
  const hayCostos = r.margen.netoConCosto > 0
  const maxProducto = r.productos[0]?.unidades || 0
  const maxHora = Math.max(0, ...r.porHora.map((h) => h.total))
  const maxMedio = Math.max(0, ...r.porMedio.map((m) => m.monto))

  return (
    <div className="rep-hoja">
      <div className="rep-cabecera">
        <div>
          <h1>Reportes</h1>
          <p style={{ color: 'var(--pos-suave)', margin: 0 }}>
            {periodo.etiqueta} · {rotuloPeriodo}
          </p>
        </div>
        <div className="rep-acciones no-imprimir">
          <a className="pos-btn pos-btn-fino" href={`/pos/reportes/csv?tipo=ventas&${qs}`}>
            CSV ventas
          </a>
          <a className="pos-btn pos-btn-fino" href={`/pos/reportes/csv?tipo=lineas&${qs}`}>
            CSV líneas
          </a>
          <BotonImprimir />
        </div>
      </div>

      <RangoReporte
        preset={sp.preset || 'hoy'}
        desde={periodo.desde}
        hasta={periodo.hasta}
      />

      {r.excedido ? (
        <p className="pos-error">
          Ese rango trae {r.excedido.ventas.toLocaleString('es-CR')} ventas y el reporte se arma
          sumándolas en memoria: por encima de {MAX_VENTAS.toLocaleString('es-CR')} no se calcula
          para no dejar la caja pegada. Acortá el rango, o bajá el CSV y hacé el corte en Excel.
        </p>
      ) : (
        <>
          <div className="rep-tarjetas">
            <Tarjeta
              rot="Total vendido"
              val={money(r.resumen.total)}
              pie={`IVA incluido: ${money(r.resumen.iva)}`}
            />
            <Tarjeta
              rot="Ventas"
              val={String(r.resumen.cantidad)}
              pie={`${r.resumen.unidades} productos`}
            />
            <Tarjeta rot="Ticket promedio" val={money(r.resumen.ticketPromedio)} />
            <Tarjeta
              rot="Neto sin IVA"
              val={money(r.resumen.neto)}
              pie={
                r.resumen.descuentos > 0
                  ? `Descuentos: ${money(r.resumen.descuentos)}`
                  : 'Sin descuentos'
              }
            />
            {/* El margen solo aparece si hay algún costo puesto. Una tarjeta en
                cero permanente enseña a ignorarla. */}
            {r.margen.netoConCosto > 0 && (
              <Tarjeta
                rot="Margen bruto"
                val={money(r.margen.margen)}
                pie={`${r.margen.porcentaje}% · costo ${money(r.margen.costo)}`}
              />
            )}
          </div>

          {/* La cobertura al lado del margen, siempre. Un margen calculado sobre
              la mitad del menú se lee como si fuera el de todo si nadie avisa. */}
          {r.margen.netoConCosto > 0 && r.margen.cobertura < 100 && (
            <p className="pos-aviso">
              El margen mira el <strong>{r.margen.cobertura}%</strong> de lo vendido. Quedan{' '}
              {money(r.margen.netoSinCosto)} en productos sin costo puesto, que no cuentan ni como
              ganancia ni como gasto. Se llena en <strong>Menú → Productos → Costo</strong>.
            </p>
          )}

          {r.margen.netoConCosto === 0 && r.resumen.neto > 0 && (
            <p className="pos-aviso">
              Todavía no hay margen porque ningún producto tiene costo puesto. Se llena en{' '}
              <strong>Menú → Productos → Costo</strong> y a partir de ahí lo que se venda queda
              con su costo congelado. Lo vendido antes no se puede recuperar: el costo se copia al
              momento de la venta, no se lee después.
            </p>
          )}

          {/* ---------------------------------------------- Medios y canal */}
          <div className="pos-card">
            <h2 style={{ marginTop: 0 }}>Cómo pagaron</h2>
            {r.porMedio.length === 0 ? (
              <p className="rep-vacio">No hubo cobros en este período.</p>
            ) : (
              <table className="pos-tabla">
                <thead>
                  <tr>
                    <th>Medio</th>
                    <th className="num">Cobros</th>
                    <th className="num">Monto</th>
                    <th style={{ width: '35%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {r.porMedio.map((m) => (
                    <tr key={m.medio}>
                      <td>{NOMBRE_MEDIO[m.medio] || m.medio}</td>
                      <td className="num">{m.cantidad}</td>
                      <td className="num">{money(m.monto)}</td>
                      <td>
                        <Barra valor={m.monto} maximo={maxMedio} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ color: 'var(--pos-suave)', fontSize: '.85rem', margin: '.75rem 0 0' }}>
              Una venta partida entre efectivo y tarjeta cuenta un cobro en cada fila, por eso la
              suma de cobros puede pasar del número de ventas.
            </p>
          </div>

          {r.porCanal.length > 0 && (
            <div className="pos-card">
              <h2 style={{ marginTop: 0 }}>De dónde vino</h2>
              <table className="pos-tabla">
                <thead>
                  <tr>
                    <th>Canal</th>
                    <th className="num">Ventas</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {r.porCanal.map((c) => (
                    <tr key={c.canal}>
                      <td>{NOMBRE_CANAL[c.canal] || c.canal}</td>
                      <td className="num">{c.cantidad}</td>
                      <td className="num">{money(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------------------------------------- Productos */}
          <div className="pos-card">
            <h2 style={{ marginTop: 0 }}>Qué se vendió</h2>
            {r.productos.length === 0 ? (
              <p className="rep-vacio">Nada todavía.</p>
            ) : (
              <div className="rep-scroll">
                <table className="pos-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="num">Unidades</th>
                      <th className="num">Neto</th>
                      <th className="num">Total</th>
                      {hayCostos && (
                        <>
                          <th className="num">Costo</th>
                          <th className="num">Margen</th>
                        </>
                      )}
                      <th style={{ width: '20%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.productos.map((p) => (
                      <tr key={p.clave}>
                        <td>{p.nombre}</td>
                        <td className="num">{p.unidades}</td>
                        <td className="num">{money(p.neto)}</td>
                        <td className="num">{money(p.total)}</td>
                        {hayCostos && (
                          <>
                            <td className="num">{p.margen === null ? '—' : money(p.costo)}</td>
                            <td className="num">
                              {p.margen === null ? (
                                // Una raya y no un cero: no tener costo puesto no
                                // es vender sin ganancia.
                                <span style={{ color: 'var(--pos-suave)' }} title="Sin costo puesto">
                                  —
                                </span>
                              ) : (
                                <>
                                  {money(p.margen)}
                                  <span style={{ color: 'var(--pos-suave)' }}>
                                    {' '}
                                    {p.netoConCosto > 0
                                      ? `${Math.round((p.margen / p.netoConCosto) * 100)}%`
                                      : ''}
                                  </span>
                                </>
                              )}
                            </td>
                          </>
                        )}
                        <td>
                          <Barra valor={p.unidades} maximo={maxProducto} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---------------------------------------------- Horas */}
          {r.porHora.length > 0 && (
            <div className="pos-card">
              <h2 style={{ marginTop: 0 }}>A qué hora</h2>
              <p style={{ color: 'var(--pos-suave)', fontSize: '.85rem', marginTop: 0 }}>
                Por la hora en que se hizo el pedido, no la del cobro: una mesa que se sienta a la
                una y paga a las cinco fue trabajo de la una.
              </p>
              <table className="pos-tabla">
                <tbody>
                  {r.porHora.map((h) => (
                    <tr key={h.hora}>
                      <td style={{ width: 70 }}>{String(h.hora).padStart(2, '0')}:00</td>
                      <td className="num" style={{ width: 60 }}>
                        {h.cantidad}
                      </td>
                      <td className="num" style={{ width: 100 }}>
                        {money(h.total)}
                      </td>
                      <td>
                        <Barra valor={h.total} maximo={maxHora} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------------------------------------- IVA */}
          {r.iva.length > 0 && (
            <div className="pos-card">
              <h2 style={{ marginTop: 0 }}>IVA por tarifa</h2>
              <p style={{ color: 'var(--pos-suave)', fontSize: '.85rem', marginTop: 0 }}>
                La base y el impuesto separados por porcentaje, que es como los pide la
                declaración. Sale de la tarifa congelada en cada línea al momento de vender.
              </p>
              <table className="pos-tabla">
                <thead>
                  <tr>
                    <th>Tarifa</th>
                    <th className="num">Base gravada</th>
                    <th className="num">IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {r.iva.map((t) => (
                    <tr key={t.tarifa}>
                      <td>{t.tarifa}%</td>
                      <td className="num">{money(t.base)}</td>
                      <td className="num">{money(t.iva)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td>Total</td>
                    <td className="num">{money(r.resumen.neto)}</td>
                    <td className="num">{money(r.resumen.iva)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------------------------------------- Cajeros */}
          {r.porCajero.length > 0 && (
            <div className="pos-card">
              <h2 style={{ marginTop: 0 }}>Quién atendió</h2>
              <table className="pos-tabla">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th className="num">Ventas</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {r.porCajero.map((c) => (
                    <tr key={String(c.id)}>
                      <td>{c.nombre}</td>
                      <td className="num">{c.cantidad}</td>
                      <td className="num">{money(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------------------------------------- Descuentos */}
          {r.descuentos.length > 0 && (
            <div className="pos-card">
              <h2 style={{ marginTop: 0 }}>Descuentos</h2>
              <div className="rep-scroll">
                <table className="pos-tabla">
                  <thead>
                    <tr>
                      <th>Venta</th>
                      <th>Cuándo</th>
                      <th>Quién</th>
                      <th>Motivo</th>
                      <th className="num">%</th>
                      <th className="num">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.descuentos.map((d) => (
                      <tr key={d.id}>
                        <td>#{d.numero ?? d.id}</td>
                        <td>{fechaHora(d.cuando)}</td>
                        <td>{d.quien}</td>
                        <td>{d.motivo}</td>
                        <td className="num">{d.porcentaje}%</td>
                        <td className="num">{money(d.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------- Anulaciones
          Va fuera del bloque de arriba a propósito: aunque el rango sea
          demasiado grande para agregar las ventas, las anulaciones vienen
          limitadas y siempre se pueden mostrar. Es lo que más rápido quiere
          mirar el dueño cuando algo no cuadra. */}
      <div className="pos-card">
        <h2 style={{ marginTop: 0 }}>Anulaciones</h2>
        {r.anulaciones.length === 0 ? (
          <p className="rep-vacio">Ninguna en este período.</p>
        ) : (
          <>
            <p style={{ color: 'var(--pos-suave)', fontSize: '.85rem', marginTop: 0 }}>
              {r.anulaciones.length} por {money(r.totalAnulado)}. Se cuentan por el día en que se
              anularon, no por el día de la venta. No están incluidas en el total vendido.
            </p>
            <div className="rep-scroll">
              <table className="pos-tabla">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Cuándo</th>
                    <th>Quién</th>
                    <th>Motivo</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {r.anulaciones.map((a) => (
                    <tr key={a.id}>
                      <td>#{a.numero ?? a.id}</td>
                      <td>{fechaHora(a.cuando)}</td>
                      <td>{a.quien}</td>
                      <td>{a.motivo}</td>
                      <td className="num">{money(a.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p style={{ color: 'var(--pos-suave)', fontSize: '.82rem' }}>
        Una venta cuenta el día que se cobró. Generado el {fechaHora(new Date().toISOString())}.
      </p>
    </div>
  )
}
