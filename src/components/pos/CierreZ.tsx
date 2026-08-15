import { fechaHora, money } from '@/lib/formato'
import type { Negocio } from './Tiquete80'

// El papel del cierre de caja, en 80 mm.
//
// Es el que se grapa al sobre del efectivo al terminar el turno. Reusa las
// clases del tiquete (`.tiquete`) a propósito: sale por la misma térmica, con el
// mismo ancho y la misma fuente monoespaciada, y tener dos juegos de estilos
// para el mismo papel es garantía de que uno de los dos se quede viejo.
//
// Hay dos versiones y la diferencia importa:
//
//   X — el turno sigue abierto. Es una foto de cómo va, para mirar a media
//       mañana. Se puede sacar las veces que se quiera y no cierra nada.
//   Z — el turno ya se cerró. Sale de los totales CONGELADOS en el turno, no de
//       recontar las ventas: un Z reimpreso dentro de un año tiene que decir lo
//       mismo que el del día, aunque después se haya anulado alguna venta.

export type DatosCierre = {
  turno: number
  cerrado: boolean
  apertura?: string | null
  cierre?: string | null
  abiertaPor?: string | null
  cerradaPor?: string | null
  fondoInicial: number

  cantidadVentas: number
  totalBruto: number
  totalDescuentos: number
  totalIva: number
  totalVentas: number

  totalEfectivo: number
  totalTarjeta: number
  totalSinpe: number
  totalLinea: number

  esperadoEfectivo: number
  /** Solo en el Z: lo que se contó de verdad en la gaveta. */
  efectivoContado?: number | null
  diferencia?: number | null

  cantidadAnuladas: number
  totalAnulado: number

  totalIngresos: number
  totalSalidas: number
  /** El detalle, para poder auditar el esperado sin abrir la computadora. */
  movimientos: { tipo: string; monto: number; motivo: string; quien: string }[]

  notas?: string | null
}

function Fila({ rot, val, fuerte }: { rot: string; val: string; fuerte?: boolean }) {
  return (
    <tr className={fuerte ? 'grande' : undefined}>
      <td>{rot}</td>
      <td className="num">{val}</td>
    </tr>
  )
}

export function CierreZ({ cierre, negocio }: { cierre: DatosCierre; negocio: Negocio }) {
  const dif = Number(cierre.diferencia) || 0

  return (
    <article className="tiquete">
      <h1>{negocio.nombre}</h1>
      {negocio.cedulaJuridica && (
        <p className="centro" style={{ margin: 0 }}>Céd. {negocio.cedulaJuridica}</p>
      )}

      <hr className="sep" />

      {/* Grande y arriba: quien agarra el papel del sobre tiene que saber de un
          vistazo si es el cierre definitivo o una foto de media mañana. */}
      <p className="codigo">{cierre.cerrado ? 'CIERRE Z' : 'CORTE X'}</p>
      {!cierre.cerrado && (
        <p className="centro" style={{ margin: 0 }}>Turno todavía abierto</p>
      )}

      <table>
        <tbody>
          <Fila rot="Turno" val={`#${cierre.turno}`} />
          <Fila rot="Apertura" val={fechaHora(cierre.apertura)} />
          {cierre.cerrado && <Fila rot="Cierre" val={fechaHora(cierre.cierre)} />}
          {cierre.abiertaPor && <Fila rot="Abrió" val={cierre.abiertaPor} />}
          {cierre.cerrado && cierre.cerradaPor && <Fila rot="Cerró" val={cierre.cerradaPor} />}
        </tbody>
      </table>

      <hr className="sep" />

      <table>
        <tbody>
          <Fila rot="Ventas" val={String(cierre.cantidadVentas)} />
          <Fila rot="Neto" val={money(cierre.totalBruto)} />
          {cierre.totalDescuentos > 0 && (
            <Fila rot="Descuentos" val={`−${money(cierre.totalDescuentos)}`} />
          )}
          <Fila rot="IVA" val={money(cierre.totalIva)} />
          <Fila rot="TOTAL VENDIDO" val={money(cierre.totalVentas)} fuerte />
        </tbody>
      </table>

      <hr className="sep" />

      <table>
        <tbody>
          <Fila rot="Efectivo" val={money(cierre.totalEfectivo)} />
          <Fila rot="Tarjeta" val={money(cierre.totalTarjeta)} />
          <Fila rot="SINPE" val={money(cierre.totalSinpe)} />
          {cierre.totalLinea > 0 && <Fila rot="En línea" val={money(cierre.totalLinea)} />}
        </tbody>
      </table>

      <hr className="sep" />

      {/* El detalle de lo que se movió. Va ANTES del bloque de la gaveta porque
          es lo que explica por qué el esperado no es simplemente fondo más
          ventas. Quien revisa el sobre tiene que poder seguir la cuenta con el
          papel en la mano, sin abrir la computadora. */}
      {cierre.movimientos.length > 0 && (
        <>
          <table>
            <tbody>
              <tr className="grande">
                <td colSpan={2}>MOVIMIENTOS</td>
              </tr>
              {cierre.movimientos.map((m, i) => (
                <tr key={i}>
                  <td>
                    {m.motivo}
                    <br />
                    <span style={{ fontSize: 9 }}>{m.quien}</span>
                  </td>
                  <td className="num">
                    {m.tipo === 'ingreso' ? '+' : '−'}
                    {money(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="sep" />
        </>
      )}

      {/* El bloque de la gaveta: es el motivo por el que existe este papel. */}
      <table>
        <tbody>
          <Fila rot="Fondo inicial" val={money(cierre.fondoInicial)} />
          <Fila rot="+ Efectivo cobrado" val={money(cierre.totalEfectivo)} />
          {cierre.totalIngresos > 0 && (
            <Fila rot="+ Entró a la gaveta" val={money(cierre.totalIngresos)} />
          )}
          {cierre.totalSalidas > 0 && (
            <Fila rot="− Salió de la gaveta" val={money(cierre.totalSalidas)} />
          )}
          <Fila rot="= Esperado" val={money(cierre.esperadoEfectivo)} fuerte />
          {cierre.cerrado && (
            <>
              <Fila rot="Contado" val={money(cierre.efectivoContado)} />
              <Fila
                rot={dif === 0 ? 'Cuadró' : dif > 0 ? 'SOBRANTE' : 'FALTANTE'}
                val={dif === 0 ? '—' : money(Math.abs(dif))}
                fuerte
              />
            </>
          )}
        </tbody>
      </table>

      {cierre.cantidadAnuladas > 0 && (
        <>
          <hr className="sep" />
          <table>
            <tbody>
              <Fila rot="Anuladas" val={String(cierre.cantidadAnuladas)} />
              <Fila rot="Monto anulado" val={money(cierre.totalAnulado)} />
            </tbody>
          </table>
          <p style={{ margin: '4px 0 0', fontSize: 9 }}>
            Lo anulado no está incluido en el total vendido.
          </p>
        </>
      )}

      {cierre.notas && (
        <>
          <hr className="sep" />
          <p style={{ margin: 0 }}>Notas:</p>
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{cierre.notas}</p>
        </>
      )}

      <hr className="sep" />
      <p className="centro" style={{ margin: 0, fontSize: 9 }}>
        Documento interno de arqueo.
      </p>
      {!cierre.cerrado && (
        <p className="centro" style={{ margin: 0, fontSize: 9 }}>
          Provisional: el turno no ha cerrado.
        </p>
      )}

      <hr className="sep" />
      <p style={{ margin: '10px 0 0' }}>Firma: ____________________</p>
    </article>
  )
}
