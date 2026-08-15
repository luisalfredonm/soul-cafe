import { fechaHora, money, NOMBRE_MEDIO } from '@/lib/formato'

// Tiquete de 80 mm.
//
// Es HTML normal: el ancho y los márgenes los pone `@page` en `pos.css`, y
// Chrome lo manda a la térmica por el driver de Windows. Sin agente, sin
// ESC/POS, sin nada que instalar.
//
// Fuente monoespaciada a propósito: con 32 caracteres de ancho, las columnas de
// montos solo quedan derechas si todos los caracteres miden lo mismo.

export type LineaTiquete = {
  nombre?: string | null
  cantidad?: number | null
  total?: number | null
}

export type PagoTiquete = {
  medio?: string | null
  monto?: number | null
  referencia?: string | null
}

export type DatosTiquete = {
  numero?: number | null
  codigo?: string | null
  mesa?: number | null
  fecha?: string | null
  cajero?: string | null
  lineas?: LineaTiquete[] | null
  descuentoPorcentaje?: number | null
  descuentoMonto?: number | null
  subtotal?: number | null
  totalIva?: number | null
  total?: number | null
  pagos?: PagoTiquete[] | null
  vuelto?: number | null
  requiereFactura?: boolean | null
  facturaNombre?: string | null
  facturaCedula?: string | null
}

export type Negocio = {
  nombre: string
  cedulaJuridica?: string | null
  direccion?: string | null
  whatsapp?: string | null
  pie?: string | null
}

export function Tiquete80({ pedido, negocio }: { pedido: DatosTiquete; negocio: Negocio }) {
  const lineas = pedido.lineas || []
  const pagos = pedido.pagos || []
  const descuento = Number(pedido.descuentoMonto) || 0

  return (
    <article className="tiquete">
      <h1>{negocio.nombre}</h1>
      {negocio.cedulaJuridica && <p className="centro" style={{ margin: 0 }}>Céd. {negocio.cedulaJuridica}</p>}
      {negocio.direccion && <p className="centro" style={{ margin: 0 }}>{negocio.direccion}</p>}
      {negocio.whatsapp && <p className="centro" style={{ margin: 0 }}>{negocio.whatsapp}</p>}

      <hr className="sep" />

      {/* La mesa va arriba y grande: este papel también es la comanda, y quien
          lo lee tiene que saber a dónde llevar el café de un vistazo. */}
      {pedido.mesa ? <p className="codigo">MESA {pedido.mesa}</p> : null}

      <table>
        <tbody>
          <tr>
            <td>Tiquete</td>
            <td className="num">#{pedido.numero ?? '—'}</td>
          </tr>
          <tr>
            <td>Fecha</td>
            <td className="num">{fechaHora(pedido.fecha)}</td>
          </tr>
          {pedido.cajero && (
            <tr>
              <td>Atendió</td>
              <td className="num">{pedido.cajero}</td>
            </tr>
          )}
        </tbody>
      </table>

      <hr className="sep" />

      <table>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i}>
              <td>
                {l.cantidad}× {l.nombre}
              </td>
              <td className="num">{money(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="sep" />

      <table>
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td className="num">{money(pedido.subtotal)}</td>
          </tr>
          {descuento > 0 && (
            <tr>
              <td>Descuento {pedido.descuentoPorcentaje}%</td>
              <td className="num">−{money(descuento)}</td>
            </tr>
          )}
          <tr>
            <td>IVA</td>
            <td className="num">{money(pedido.totalIva)}</td>
          </tr>
          <tr className="grande">
            <td>TOTAL</td>
            <td className="num">{money(pedido.total)}</td>
          </tr>
        </tbody>
      </table>

      {pagos.length > 0 && (
        <>
          <hr className="sep" />
          <table>
            <tbody>
              {pagos.map((p, i) => (
                <tr key={i}>
                  <td>
                    {NOMBRE_MEDIO[String(p.medio)] || p.medio}
                    {p.referencia ? ` ${p.referencia}` : ''}
                  </td>
                  <td className="num">{money(p.monto)}</td>
                </tr>
              ))}
              {Number(pedido.vuelto) > 0 && (
                <tr className="grande">
                  <td>Vuelto</td>
                  <td className="num">{money(pedido.vuelto)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {pedido.requiereFactura && (
        <>
          <hr className="sep" />
          <p style={{ margin: 0 }}>Factura a nombre de:</p>
          <p style={{ margin: 0 }}>{pedido.facturaNombre}</p>
          {pedido.facturaCedula && <p style={{ margin: 0 }}>Céd. {pedido.facturaCedula}</p>}
        </>
      )}

      {pedido.codigo && (
        <>
          <hr className="sep" />
          <p className="centro" style={{ margin: 0 }}>Su pedido</p>
          <p className="codigo">{pedido.codigo}</p>
        </>
      )}

      <hr className="sep" />
      {negocio.pie && <p className="centro" style={{ margin: 0, whiteSpace: 'pre-line' }}>{negocio.pie}</p>}
      {/* Sin certificado de Hacienda todavía: esto no es un comprobante fiscal y
          más vale que lo diga el propio papel. */}
      <p className="centro" style={{ margin: '4px 0 0', fontSize: 9 }}>
        Comprobante interno. No es factura electrónica.
      </p>
    </article>
  )
}
