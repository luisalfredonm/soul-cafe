'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hora, money } from '@/lib/formato'
import type { TotalesCaja } from '@/lib/caja'
import { TIPOS_MOVIMIENTO, type TipoMovimiento } from '@/lib/movimientos'
import {
  abrirCajaAccion,
  cerrarCajaAccion,
  registrarMovimientoAccion,
} from '@/app/(pos)/pos/acciones'

// Apertura y cierre del turno.
//
// La diferencia se muestra ANTES de cerrar, mientras el cajero teclea lo que
// contó. Que la vea en el momento —con la plata todavía en la mano— es la única
// forma de que se pueda corregir un error de conteo; si aparece después de
// cerrar, ya no hay nada que hacer.

export function AbrirCaja() {
  const router = useRouter()
  const [fondo, setFondo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function abrir() {
    setError('')
    setEnviando(true)
    const r = await abrirCajaAccion(Number(fondo) || 0)
    setEnviando(false)
    if (!r.ok) return setError(r.mensaje)
    router.refresh()
  }

  return (
    <div className="pos-card">
      <h2 style={{ marginTop: 0 }}>Abrir caja</h2>
      <p style={{ color: 'var(--pos-suave)' }}>
        El fondo inicial es la plata con la que arranca la gaveta. Se resta al cerrar, así que
        conviene contarla bien.
      </p>

      {error && <p className="pos-error" role="alert">{error}</p>}

      <label className="pos-campo">
        <span>Fondo inicial</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={fondo}
          onChange={(e) => setFondo(e.target.value)}
          placeholder="0"
        />
      </label>

      <button type="button" className="pos-btn pos-btn-vino" onClick={abrir} disabled={enviando}>
        {enviando ? 'Abriendo…' : 'Abrir caja'}
      </button>
    </div>
  )
}

export type MovimientoLista = {
  id: number
  tipo: string
  monto: number
  motivo: string
  fecha: string
  quien: string
}

/**
 * Anotar que entró o salió plata de la gaveta.
 *
 * Está en la pantalla de caja y no escondido en el panel porque el momento de
 * anotarlo es cuando pasa —con el proveedor todavía enfrente—, no al final del
 * día tratando de acordarse.
 */
export function Movimientos({ movimientos }: { movimientos: MovimientoLista[] }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoMovimiento>('gasto')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const ayuda = TIPOS_MOVIMIENTO.find((t) => t.valor === tipo)?.ayuda

  async function registrar() {
    setError('')
    setEnviando(true)
    const r = await registrarMovimientoAccion({
      tipo,
      monto: Number(monto) || 0,
      motivo,
    })
    setEnviando(false)
    if (!r.ok) return setError(r.mensaje)

    setMonto('')
    setMotivo('')
    setAbierto(false)
    router.refresh()
  }

  return (
    <div className="pos-card">
      <h2 style={{ marginTop: 0 }}>Movimientos de la gaveta</h2>

      {movimientos.length === 0 ? (
        <p style={{ color: 'var(--pos-suave)', marginTop: 0 }}>
          No se ha movido plata en este turno. Acá se anota lo que entra o sale de la gaveta sin
          ser una venta: pagarle al de la leche, meter cambio, guardar la recaudación.
        </p>
      ) : (
        <table className="pos-tabla" style={{ marginBottom: '1rem' }}>
          <tbody>
            {movimientos.map((m) => {
              const sale = m.tipo !== 'ingreso'
              return (
                <tr key={m.id}>
                  <td style={{ width: 58 }}>{hora(m.fecha)}</td>
                  <td>
                    {m.motivo}
                    <span style={{ display: 'block', fontSize: '.8rem', color: 'var(--pos-suave)' }}>
                      {m.quien}
                    </span>
                  </td>
                  <td
                    className="num"
                    style={{ color: sale ? 'var(--pos-vino-claro)' : 'var(--pos-ok)' }}
                  >
                    {sale ? '−' : '+'}
                    {money(m.monto)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {error && (
        <p className="pos-error" role="alert">
          {error}
        </p>
      )}

      {abierto ? (
        <>
          <div className="pos-medios">
            {TIPOS_MOVIMIENTO.map((t) => (
              <button
                key={t.valor}
                type="button"
                aria-pressed={tipo === t.valor}
                onClick={() => {
                  setTipo(t.valor)
                  setError('')
                }}
              >
                {t.etiqueta}
              </button>
            ))}
          </div>
          {ayuda && (
            <p style={{ color: 'var(--pos-suave)', fontSize: '.85rem', margin: '.5rem 0 1rem' }}>
              {ayuda}
            </p>
          )}

          <label className="pos-campo">
            <span>Monto</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
            />
          </label>

          <label className="pos-campo">
            <span>Motivo</span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: pago leche Dos Pinos"
            />
          </label>

          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pos-btn pos-btn-fino"
              onClick={() => {
                setAbierto(false)
                setError('')
              }}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="pos-btn pos-btn-vino"
              style={{ flex: 1, minWidth: 160 }}
              onClick={registrar}
              disabled={enviando}
            >
              {enviando ? 'Anotando…' : 'Anotar movimiento'}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="pos-btn pos-btn-fino" onClick={() => setAbierto(true)}>
          Anotar movimiento
        </button>
      )}
    </div>
  )
}

export function CerrarCaja({
  fondoInicial,
  totales,
}: {
  fondoInicial: number
  totales: TotalesCaja
}) {
  const router = useRouter()
  const [contado, setContado] = useState('')
  const [notas, setNotas] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const hayConteo = contado.trim() !== ''
  const diferencia = (Number(contado) || 0) - totales.esperadoEfectivo

  async function cerrar() {
    setError('')
    setEnviando(true)
    const r = await cerrarCajaAccion({ efectivoContado: Number(contado) || 0, notas })
    setEnviando(false)
    if (!r.ok) return setError(r.mensaje)
    setConfirmar(false)

    // El Z sale solo al cerrar. Es el papel que se grapa al sobre del efectivo, y
    // si hubiera que acordarse de ir a buscarlo a otra pantalla, la mitad de los
    // días no se imprimiría. Si el navegador bloquea la ventana, el turno igual
    // quedó cerrado y el Z se reimprime desde la lista de cierres.
    window.open(`/pos/cierre/${r.cajaId}?imprimir=1`, '_blank', 'width=380,height=720')

    router.refresh()
  }

  return (
    <>
      <div className="pos-card">
        <h2 style={{ marginTop: 0 }}>Movimiento del turno</h2>
        <table className="pos-tabla">
          <tbody>
            <tr>
              <td>Ventas</td>
              <td className="num">{totales.cantidadVentas}</td>
            </tr>
            <tr>
              <td>Total vendido</td>
              <td className="num">{money(totales.totalVentas)}</td>
            </tr>
            <tr>
              <td>Efectivo</td>
              <td className="num">{money(totales.totalEfectivo)}</td>
            </tr>
            <tr>
              <td>Tarjeta</td>
              <td className="num">{money(totales.totalTarjeta)}</td>
            </tr>
            <tr>
              <td>SINPE</td>
              <td className="num">{money(totales.totalSinpe)}</td>
            </tr>
            <tr>
              <td>Fondo inicial</td>
              <td className="num">{money(fondoInicial)}</td>
            </tr>
            {/* Solo si hubo. Dos filas en cero todos los días son ruido que se
                deja de leer, y el día que traigan un número nadie lo va a ver. */}
            {totales.totalIngresos > 0 && (
              <tr>
                <td>Entró a la gaveta</td>
                <td className="num" style={{ color: 'var(--pos-ok)' }}>
                  +{money(totales.totalIngresos)}
                </td>
              </tr>
            )}
            {totales.totalSalidas > 0 && (
              <tr>
                <td>Salió de la gaveta</td>
                <td className="num" style={{ color: 'var(--pos-vino-claro)' }}>
                  −{money(totales.totalSalidas)}
                </td>
              </tr>
            )}
            <tr style={{ fontWeight: 700 }}>
              <td>Esperado en gaveta</td>
              <td className="num">{money(totales.esperadoEfectivo)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="pos-card">
        <h2 style={{ marginTop: 0 }}>Cerrar caja</h2>

        {error && <p className="pos-error" role="alert">{error}</p>}

        <label className="pos-campo">
          <span>Efectivo contado</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={contado}
            onChange={(e) => setContado(e.target.value)}
            placeholder="Lo que hay de verdad en la gaveta"
          />
        </label>

        {hayConteo && (
          <p
            className={diferencia === 0 ? 'pos-aviso' : 'pos-error'}
            style={{ fontSize: '1.05rem', fontWeight: 600 }}
          >
            {diferencia === 0
              ? 'Cuadra exacto.'
              : diferencia > 0
                ? `Sobran ${money(diferencia)}.`
                : `Faltan ${money(Math.abs(diferencia))}.`}
          </p>
        )}

        <label className="pos-campo">
          <span>Notas</span>
          <textarea
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Por qué hubo diferencia, incidencias del turno…"
          />
        </label>

        {confirmar ? (
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <p style={{ width: '100%', margin: '0 0 .5rem', color: 'var(--pos-suave)' }}>
              Una vez cerrado, el turno no se reabre. ¿Seguro?
            </p>
            <button type="button" className="pos-btn pos-btn-fino" onClick={() => setConfirmar(false)}>
              Volver
            </button>
            <button type="button" className="pos-btn pos-btn-vino" onClick={cerrar} disabled={enviando}>
              {enviando ? 'Cerrando…' : 'Sí, cerrar el turno'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pos-btn pos-btn-vino"
            onClick={() => setConfirmar(true)}
            disabled={!hayConteo}
          >
            Cerrar caja
          </button>
        )}
      </div>
    </>
  )
}
