'use client'

import { useMemo, useState } from 'react'
import { money, NOMBRE_MEDIO } from '@/lib/formato'
import type { MedioPago, PagoEntrada } from '@/lib/pedidos'

// El cobro.
//
// Dos reglas que salen de ver cobrar en una barra:
//
// 1. El caso normal es un solo pago en efectivo. Ese tiene que salir en dos
//    toques: un botón de billete y "Cobrar". Todo lo demás (dividir, referencia
//    del datáfono) está disponible pero no estorba.
//
// 2. Para efectivo, el monto que se teclea es lo que el cliente ENTREGÓ, no lo
//    que se aplica a la venta. Por eso el vuelto sale solo. Para tarjeta y SINPE
//    no hay vuelto: lo tecleado es lo que se cobra.

const MEDIOS: MedioPago[] = ['efectivo', 'tarjeta', 'sinpe']
const BILLETES = [1000, 2000, 5000, 10000, 20000]

export type ResultadoCobro = { ok: true } | { ok: false; mensaje: string }

export function ModalCobro({
  total,
  titulo = 'Cobrar',
  onCancelar,
  onConfirmar,
}: {
  total: number
  titulo?: string
  onCancelar: () => void
  onConfirmar: (pagos: PagoEntrada[], efectivoRecibido: number) => Promise<ResultadoCobro>
}) {
  const [pagos, setPagos] = useState<PagoEntrada[]>([])
  const [recibidoAcumulado, setRecibidoAcumulado] = useState(0)
  const [medio, setMedio] = useState<MedioPago>('efectivo')
  const [monto, setMonto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const aplicado = useMemo(() => pagos.reduce((n, p) => n + p.monto, 0), [pagos])
  const falta = Math.max(0, total - aplicado)
  const tecleado = Number(monto) || 0

  // Lo que quedaría cubierto si se agrega lo que hay tecleado ahora mismo.
  const cubiertoSiAgrego = aplicado + Math.min(tecleado || falta, falta)
  const puedeCobrar = cubiertoSiAgrego >= total

  const enEfectivo = useMemo(
    () => pagos.filter((p) => p.medio === 'efectivo').reduce((n, p) => n + p.monto, 0),
    [pagos],
  )
  const vuelto = Math.max(0, recibidoAcumulado - enEfectivo)

  function tecla(t: string) {
    setError('')
    if (t === 'borrar') return setMonto((m) => m.slice(0, -1))
    if (t === 'limpiar') return setMonto('')
    setMonto((m) => {
      const siguiente = (m + t).replace(/^0+/, '')
      // Un tope sano: nadie paga un café con diez millones, pero un dedo
      // apoyado en el 9 sí puede escribirlos.
      return siguiente.length > 8 ? m : siguiente
    })
  }

  /**
   * Convierte lo tecleado en un pago, sin tocar el estado: la usan tanto
   * "Pago dividido" como "Cobrar", y una que además guardara sumaría el billete
   * dos veces.
   *
   * `recibido` es lo que entregó el cliente; `monto` es lo que se le aplica a la
   * venta. Solo difieren cuando paga en efectivo con un billete más grande.
   */
  function armarPago(): { pago: PagoEntrada; recibido: number } | null {
    const valor = tecleado || falta
    if (valor <= 0 || falta <= 0) return null

    return {
      pago: {
        medio,
        monto: Math.min(valor, falta),
        referencia: referencia.trim() || undefined,
      },
      recibido: medio === 'efectivo' ? valor : 0,
    }
  }

  function agregarPago() {
    const armado = armarPago()
    if (!armado) {
      setError('Escribí un monto.')
      return
    }
    setPagos((p) => [...p, armado.pago])
    setRecibidoAcumulado((r) => r + armado.recibido)
    setMonto('')
    setReferencia('')
    setError('')
  }

  function quitarPago(i: number) {
    setPagos((p) => p.filter((_, j) => j !== i))
    // El recibido se recalcula desde cero: si se quita un pago en efectivo,
    // el billete que lo acompañaba ya no cuenta.
    setRecibidoAcumulado(0)
  }

  async function confirmar() {
    setError('')

    // Si quedó algo tecleado sin agregar, cuenta como el último pago. Obligar a
    // tocar "Agregar" antes de "Cobrar" sería un paso de más en el caso normal.
    let finales = pagos
    let recibido = recibidoAcumulado
    const pendiente = armarPago()
    if (pendiente) {
      finales = [...pagos, pendiente.pago]
      recibido += pendiente.recibido
    }

    const suma = finales.reduce((n, p) => n + p.monto, 0)
    if (suma < total) {
      setError(`Faltan ${money(total - suma)}.`)
      return
    }

    setEnviando(true)
    const r = await onConfirmar(finales, recibido)
    setEnviando(false)
    if (!r.ok) setError(r.mensaje)
  }

  const vueltoPrevisto =
    medio === 'efectivo' && tecleado > falta ? tecleado - falta + vuelto : vuelto

  return (
    <div className="pos-fondo" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="pos-modal">
        <h2>{titulo}</h2>

        <div className="pos-fila total" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          <span>Total</span>
          <span className="imp">{money(total)}</span>
        </div>

        {aplicado > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '.75rem 0 0' }}>
            {pagos.map((p, i) => (
              <li key={i} className="pos-fila" style={{ alignItems: 'center' }}>
                <span>
                  {NOMBRE_MEDIO[p.medio]}
                  {p.referencia ? ` · ${p.referencia}` : ''}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span className="imp">{money(p.monto)}</span>
                  <button
                    type="button"
                    className="pos-redondo"
                    style={{ width: 32, height: 32, minWidth: 32, fontSize: '1rem' }}
                    onClick={() => quitarPago(i)}
                    aria-label={`Quitar el pago de ${money(p.monto)}`}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
            <li className="pos-fila" style={{ fontWeight: 600 }}>
              <span>Falta</span>
              <span className="imp">{money(falta)}</span>
            </li>
          </ul>
        )}

        {error && (
          <p className="pos-error" role="alert" style={{ marginTop: '1rem' }}>
            {error}
          </p>
        )}

        {falta > 0 && (
          <>
            <div className="pos-medios" style={{ marginTop: '1rem' }}>
              {MEDIOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={medio === m}
                  onClick={() => {
                    setMedio(m)
                    setMonto('')
                    setError('')
                  }}
                >
                  {NOMBRE_MEDIO[m]}
                </button>
              ))}
            </div>

            <input
              className="pos-monto"
              inputMode="numeric"
              value={monto ? money(Number(monto)) : ''}
              placeholder={money(falta)}
              readOnly
              aria-label={medio === 'efectivo' ? 'Efectivo recibido' : 'Monto'}
            />

            {medio === 'efectivo' && (
              <div className="pos-rapidos">
                <button type="button" onClick={() => setMonto(String(falta))}>
                  Justo
                </button>
                {BILLETES.filter((b) => b >= falta).slice(0, 4).map((b) => (
                  <button key={b} type="button" onClick={() => setMonto(String(b))}>
                    {money(b)}
                  </button>
                ))}
              </div>
            )}

            {medio !== 'efectivo' && (
              <label className="pos-campo">
                <span>{medio === 'tarjeta' ? 'Voucher del datáfono' : 'Comprobante SINPE'}</span>
                <input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Opcional"
                />
              </label>
            )}

            <div className="pos-teclado">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} type="button" onClick={() => tecla(d)}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => tecla('00')}>
                00
              </button>
              <button type="button" onClick={() => tecla('0')}>
                0
              </button>
              <button type="button" onClick={() => tecla('borrar')} aria-label="Borrar un dígito">
                ⌫
              </button>
            </div>
          </>
        )}

        {vueltoPrevisto > 0 && (
          <div className="pos-fila total">
            <span>Vuelto</span>
            <span className="imp">{money(vueltoPrevisto)}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="pos-btn pos-btn-fino" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
          {falta > 0 && (
            <button type="button" className="pos-btn" onClick={agregarPago} disabled={enviando}>
              Pago dividido
            </button>
          )}
          <button
            type="button"
            className="pos-btn pos-btn-cobrar"
            style={{ flex: 1, marginTop: 0, minWidth: 160 }}
            onClick={confirmar}
            disabled={enviando || !puedeCobrar}
          >
            {enviando ? 'Cobrando…' : `Cobrar ${money(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
