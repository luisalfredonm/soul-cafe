'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { money } from '@/lib/formato'
import { calcularTotales, type LineaCalculable } from '@/lib/totales'
import type { PagoEntrada } from '@/lib/pedidos'
import { ModalCobro } from './ModalCobro'
import { agregarACuentaAccion, cobrarPedidoAccion, venderAccion } from '@/app/(pos)/pos/acciones'

// Pantalla de venta. Sirve para las tres formas de vender que hay en el local:
//
//   1. Para llevar          → productos, Cobrar, listo.
//   2. Se sienta y ya pagó  → se elige mesa, se cobra igual. La mesa sale en el
//                             tiquete para que sepan a dónde llevárselo.
//   3. Cuenta abierta       → se elige mesa y se deja sin cobrar. Después se le
//                             agregan rondas y se cobra todo junto al final.
//
// El precio que se muestra es el FINAL, con IVA: es el que el cajero canta y el
// que el cliente paga. El neto vive por debajo y solo aparece en el desglose,
// porque es el que va a la factura.
//
// El carrito guarda ids y cantidades, nada más. Los montos que se ven acá son
// una vista previa; los que valen los recalcula el servidor con la misma función
// (`lib/totales.ts`), así que no pueden discrepar.

export type ProductoPos = {
  id: number
  nombre: string
  /** Neto, sin IVA. */
  precio: number
  /** Con IVA. Es el que se pinta. */
  precioFinal: number
  tarifaIva: number
}

export type GrupoPos = {
  id: number | string
  nombre: string
  productos: ProductoPos[]
}

export type LineaCuenta = {
  nombre: string
  cantidad: number
  precioUnitario: number
  tarifaIva: number
  total: number
}

export type CuentaAbierta = {
  id: number
  mesa: number
  codigo: string
  lineas: LineaCuenta[]
  total: number
}

type Linea = { id: number; cantidad: number }

/** Minúsculas y sin tildes, para que "cafe" encuentre "Café". */
function norm(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

const SOLO_LECTORES: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
}

export function PosVenta({
  grupos,
  hayCaja,
  mesasTotal,
  mesasOcupadas,
  mesaInicial,
  cuenta,
}: {
  grupos: GrupoPos[]
  hayCaja: boolean
  mesasTotal: number
  mesasOcupadas: number[]
  mesaInicial?: number | null
  cuenta?: CuentaAbierta | null
}) {
  const router = useRouter()

  const [lineas, setLineas] = useState<Linea[]>([])
  const [categoria, setCategoria] = useState<string>('todas')
  const [query, setQuery] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [descuentoMotivo, setDescuentoMotivo] = useState('')
  const [verDescuento, setVerDescuento] = useState(false)
  const [mesa, setMesa] = useState<number | null>(cuenta?.mesa ?? mesaInicial ?? null)
  const [eligiendoMesa, setEligiendoMesa] = useState(false)
  const [cobrando, setCobrando] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [hecho, setHecho] = useState<{
    pedidoId: number
    codigo: string
    total: number
    vuelto: number
  } | null>(null)

  const porId = useMemo(() => {
    const m = new Map<number, ProductoPos>()
    for (const g of grupos) for (const p of g.productos) m.set(p.id, p)
    return m
  }, [grupos])

  const visibles = useMemo(() => {
    const q = norm(query.trim())
    const base =
      categoria === 'todas'
        ? grupos.flatMap((g) => g.productos)
        : (grupos.find((g) => String(g.id) === categoria)?.productos ?? [])
    if (!q) return base
    return base.filter((p) => norm(p.nombre).includes(q))
  }, [grupos, categoria, query])

  const detalle = useMemo(
    () =>
      lineas.flatMap((l) => {
        const p = porId.get(l.id)
        return p ? [{ ...p, cantidad: l.cantidad }] : []
      }),
    [lineas, porId],
  )

  // Lo nuevo que hay en el ticket ahora mismo.
  const calculoNuevo = useMemo(
    () =>
      calcularTotales(
        detalle.map((d) => ({
          cantidad: d.cantidad,
          precioUnitario: d.precio,
          tarifaIva: d.tarifaIva,
        })),
        descuento,
      ),
    [detalle, descuento],
  )

  // Lo que ya estaba en la cuenta de la mesa, si venimos de una.
  const calculoCuenta = useMemo(
    () => calcularTotales((cuenta?.lineas ?? []) as LineaCalculable[], descuento),
    [cuenta, descuento],
  )

  // El descuento se aplica línea por línea, así que sumar los dos cálculos da
  // exactamente lo mismo que calcularlos juntos.
  const totalACobrar = calculoCuenta.total + calculoNuevo.total
  const hayNuevos = detalle.length > 0
  const mesaOcupada = mesa !== null && mesasOcupadas.includes(mesa) && !cuenta

  function agregar(id: number) {
    setLineas((prev) => {
      const actual = prev.find((l) => l.id === id)
      if (!actual) return [...prev, { id, cantidad: 1 }]
      return prev.map((l) => (l.id === id ? { ...l, cantidad: Math.min(l.cantidad + 1, 30) } : l))
    })
  }

  function quitar(id: number) {
    setLineas((prev) =>
      prev.flatMap((l) =>
        l.id !== id ? [l] : l.cantidad <= 1 ? [] : [{ ...l, cantidad: l.cantidad - 1 }],
      ),
    )
  }

  function vaciar() {
    setLineas([])
    setDescuento(0)
    setDescuentoMotivo('')
    setVerDescuento(false)
    setError('')
  }

  const items = () => lineas.map((l) => ({ productoId: l.id, cantidad: l.cantidad }))

  // ---- Cobrar en el acto (para llevar o mesa ya pagada) ----
  async function confirmarCobroDirecto(pagos: PagoEntrada[], efectivoRecibido: number) {
    const r = await venderAccion({
      items: items(),
      pagos,
      efectivoRecibido,
      mesa: mesa ?? undefined,
      descuentoPorcentaje: descuento,
      descuentoMotivo,
    })
    if (!r.ok) return { ok: false as const, mensaje: r.mensaje }

    setCobrando(false)
    setHecho({ pedidoId: r.pedidoId, codigo: r.codigo, total: r.total, vuelto: r.vuelto })
    return { ok: true as const }
  }

  // ---- Cobrar la cuenta de una mesa ----
  async function confirmarCobroCuenta(pagos: PagoEntrada[], efectivoRecibido: number) {
    if (!cuenta) return { ok: false as const, mensaje: 'No hay cuenta.' }

    // Primero se pega la última ronda a la cuenta y después se cobra. En ese
    // orden: si el cobro falla, lo pedido ya quedó anotado y se puede reintentar.
    // Al revés se perdería.
    if (hayNuevos) {
      const suma = await agregarACuentaAccion({ pedidoId: cuenta.id, items: items() })
      if (!suma.ok) return { ok: false as const, mensaje: suma.mensaje }
    }

    const r = await cobrarPedidoAccion({
      pedidoId: cuenta.id,
      pagos,
      efectivoRecibido,
      descuentoPorcentaje: descuento,
      descuentoMotivo,
    })
    if (!r.ok) return { ok: false as const, mensaje: r.mensaje }

    setCobrando(false)
    setHecho({
      pedidoId: cuenta.id,
      codigo: cuenta.codigo,
      total: totalACobrar,
      vuelto: r.vuelto,
    })
    return { ok: true as const }
  }

  // ---- Dejar la cuenta abierta ----
  async function abrirCuenta() {
    setError('')
    setOcupado(true)
    const r = await venderAccion({ items: items(), pagos: [], mesa: mesa ?? undefined })
    setOcupado(false)
    if (!r.ok) return setError(r.mensaje)
    router.push('/pos/mesas')
  }

  // ---- Agregar una ronda a la cuenta ----
  async function agregarRonda() {
    if (!cuenta) return
    setError('')
    setOcupado(true)
    const r = await agregarACuentaAccion({ pedidoId: cuenta.id, items: items() })
    setOcupado(false)
    if (!r.ok) return setError(r.mensaje)
    router.push('/pos/mesas')
  }

  function imprimir(pedidoId: number) {
    // Ventana angosta con el tiquete, que se manda a imprimir sola y se cierra.
    // Con Chrome en modo kiosk-printing sale directo a la térmica, sin diálogo.
    window.open(`/pos/tiquete/${pedidoId}?imprimir=1`, '_blank', 'width=380,height=720')
  }

  // ---------------------------------------------------------- Venta cobrada
  if (hecho) {
    return (
      <div className="pos-hoja" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <p className="pos-chip listo">Cobrado</p>
        <h1 style={{ fontSize: '2rem', margin: '1rem 0 .25rem' }}>{money(hecho.total)}</h1>

        {hecho.vuelto > 0 ? (
          <div className="pos-card" style={{ marginTop: '1.5rem' }}>
            <p style={{ margin: 0, color: 'var(--pos-suave)' }}>Vuelto</p>
            <p style={{ margin: '.25rem 0 0', fontSize: '2.6rem', fontWeight: 700 }}>
              {money(hecho.vuelto)}
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--pos-suave)' }}>Sin vuelto.</p>
        )}

        <p style={{ color: 'var(--pos-suave)', marginTop: '1.5rem' }}>
          Código para cantar el pedido:{' '}
          <strong style={{ letterSpacing: '.2em' }}>{hecho.codigo}</strong>
          {mesa ? ` · Mesa ${mesa}` : ''}
        </p>

        <div
          style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}
        >
          <button type="button" className="pos-btn" onClick={() => imprimir(hecho.pedidoId)}>
            Imprimir tiquete
          </button>
          <Link className="pos-btn pos-btn-vino" href={cuenta ? '/pos/mesas' : '/pos'}>
            {cuenta ? 'Volver a mesas' : 'Nueva venta'}
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------- Caja cerrada
  if (!hayCaja) {
    return (
      <div className="pos-hoja" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <h1>La caja está cerrada</h1>
        <p style={{ color: 'var(--pos-suave)' }}>
          Hay que abrir el turno antes de vender, para que las ventas caigan en un arqueo.
        </p>
        <p style={{ marginTop: '2rem' }}>
          <Link className="pos-btn pos-btn-vino" href="/pos/caja">
            Abrir caja
          </Link>
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------- Venta
  return (
    <div className="pos-venta">
      <section className="pos-catalogo" aria-label="Productos">
        <div className="pos-categorias">
          <button type="button" aria-pressed={categoria === 'todas'} onClick={() => setCategoria('todas')}>
            Todo
          </button>
          {grupos.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={categoria === String(g.id)}
              onClick={() => setCategoria(String(g.id))}
            >
              {g.nombre}
            </button>
          ))}
        </div>

        <div className="pos-buscador">
          <label htmlFor="pos-q" style={SOLO_LECTORES}>
            Buscar producto
          </label>
          <input
            id="pos-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            autoComplete="off"
          />
        </div>

        <div className="pos-productos">
          {visibles.map((p) => (
            <button key={p.id} type="button" className="pos-producto" onClick={() => agregar(p.id)}>
              <span className="nom">{p.nombre}</span>
              <span className="precio">{money(p.precioFinal)}</span>
            </button>
          ))}
          {visibles.length === 0 && (
            <p style={{ color: 'var(--pos-suave)', gridColumn: '1 / -1' }}>Nada con ese nombre.</p>
          )}
        </div>
      </section>

      <aside className="pos-ticket" aria-label="Venta en curso">
        {cuenta && (
          <div className="pos-cinta">
            <span>Cuenta de la mesa {cuenta.mesa}</span>
            <Link href="/pos">Salir</Link>
          </div>
        )}

        <div className="pos-ticket-cab">
          <h2>{cuenta ? 'Otra ronda' : 'Venta'}</h2>
          {hayNuevos && (
            <button
              type="button"
              className="pos-btn pos-btn-fino"
              style={{ marginLeft: 'auto' }}
              onClick={vaciar}
            >
              Vaciar
            </button>
          )}
        </div>

        {/* A dónde va: para llevar o a una mesa. En una cuenta ya está decidido. */}
        {!cuenta && (
          <div style={{ padding: '.6rem 1rem', borderBottom: '1px solid var(--pos-borde)' }}>
            <button
              type="button"
              className="pos-btn pos-btn-fino"
              style={{ width: '100%' }}
              onClick={() => setEligiendoMesa((v) => !v)}
              aria-expanded={eligiendoMesa}
            >
              {mesa ? `Mesa ${mesa}` : 'Para llevar'} · cambiar
            </button>

            {eligiendoMesa && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
                  gap: '.35rem',
                  marginTop: '.5rem',
                }}
              >
                <button
                  type="button"
                  className="pos-btn pos-btn-fino"
                  style={{ gridColumn: '1 / -1' }}
                  aria-pressed={mesa === null}
                  onClick={() => {
                    setMesa(null)
                    setEligiendoMesa(false)
                  }}
                >
                  Para llevar
                </button>
                {Array.from({ length: mesasTotal }, (_, i) => i + 1).map((n) => {
                  const ocupadaN = mesasOcupadas.includes(n)
                  return (
                    <button
                      key={n}
                      type="button"
                      className="pos-btn pos-btn-fino"
                      style={{
                        minHeight: 48,
                        padding: 0,
                        borderColor: ocupadaN ? 'var(--pos-vino)' : undefined,
                        background: mesa === n ? 'var(--pos-vino)' : undefined,
                        color: mesa === n ? '#fff' : undefined,
                      }}
                      onClick={() => {
                        setMesa(n)
                        setEligiendoMesa(false)
                      }}
                      title={ocupadaN ? 'Ya tiene una cuenta abierta' : undefined}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Lo que ya estaba en la cuenta, para que el cajero lo tenga a la vista. */}
        {cuenta && cuenta.lineas.length > 0 && (
          <div className="pos-yaenla">
            <h3>Ya en la cuenta</h3>
            <ul>
              {cuenta.lineas.map((l, i) => (
                <li key={i}>
                  <span>
                    {l.cantidad}× {l.nombre}
                  </span>
                  <span>{money(calculoCuenta.lineas[i]?.total ?? l.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detalle.length === 0 ? (
          <p className="pos-vacio">
            {cuenta ? 'Tocá lo que pidieron de más.' : 'Tocá un producto para empezar.'}
          </p>
        ) : (
          <ul className="pos-lineas">
            {detalle.map((d, i) => (
              <li key={d.id} className="pos-linea">
                <span className="nom">{d.nombre}</span>
                <span className="imp">{money(calculoNuevo.lineas[i].total)}</span>
                <div className="pos-cant">
                  <button
                    type="button"
                    className="pos-redondo"
                    onClick={() => quitar(d.id)}
                    aria-label={`Quitar un ${d.nombre}`}
                  >
                    −
                  </button>
                  <span className="n">{d.cantidad}</span>
                  <button
                    type="button"
                    className="pos-redondo"
                    onClick={() => agregar(d.id)}
                    aria-label={`Agregar un ${d.nombre}`}
                  >
                    +
                  </button>
                  <span style={{ marginLeft: 'auto', color: 'var(--pos-suave)', fontSize: '.85rem' }}>
                    {money(d.precioFinal)} c/u
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="pos-totales">
          {error && (
            <p className="pos-error" role="alert">
              {error}
            </p>
          )}

          {verDescuento ? (
            <div style={{ marginBottom: '.75rem' }}>
              <label className="pos-campo" style={{ marginBottom: '.5rem' }}>
                <span>{cuenta ? 'Descuento sobre toda la cuenta (%)' : 'Descuento (%)'}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={descuento || ''}
                  onChange={(e) =>
                    setDescuento(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                  }
                />
              </label>
              <label className="pos-campo" style={{ marginBottom: '.5rem' }}>
                <span>Motivo</span>
                <input
                  value={descuentoMotivo}
                  onChange={(e) => setDescuentoMotivo(e.target.value)}
                  placeholder="Personal, cortesía…"
                />
              </label>
              <button
                type="button"
                className="pos-btn pos-btn-fino"
                onClick={() => {
                  setDescuento(0)
                  setDescuentoMotivo('')
                  setVerDescuento(false)
                }}
              >
                Quitar descuento
              </button>
            </div>
          ) : (
            (hayNuevos || cuenta) && (
              <button
                type="button"
                className="pos-btn pos-btn-fino"
                style={{ marginBottom: '.5rem' }}
                onClick={() => setVerDescuento(true)}
              >
                Aplicar descuento
              </button>
            )
          )}

          <div className="pos-fila">
            <span>Subtotal</span>
            <span className="imp">{money(calculoCuenta.subtotal + calculoNuevo.subtotal)}</span>
          </div>
          {calculoCuenta.descuentoMonto + calculoNuevo.descuentoMonto > 0 && (
            <div className="pos-fila">
              <span>Descuento {descuento}%</span>
              <span className="imp">
                −{money(calculoCuenta.descuentoMonto + calculoNuevo.descuentoMonto)}
              </span>
            </div>
          )}
          <div className="pos-fila">
            <span>IVA</span>
            <span className="imp">{money(calculoCuenta.totalIva + calculoNuevo.totalIva)}</span>
          </div>
          <div className="pos-fila total">
            <span>Total</span>
            <span className="imp">{money(totalACobrar)}</span>
          </div>

          {/* --- Botones según el caso --- */}
          {cuenta ? (
            <>
              <button
                type="button"
                className="pos-btn"
                style={{ width: '100%', marginTop: '.75rem' }}
                disabled={!hayNuevos || ocupado}
                onClick={agregarRonda}
              >
                {ocupado ? 'Guardando…' : 'Agregar a la cuenta'}
              </button>
              <button
                type="button"
                className="pos-btn pos-btn-cobrar"
                disabled={totalACobrar <= 0 || ocupado}
                onClick={() => setCobrando(true)}
              >
                Cobrar toda la cuenta
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="pos-btn pos-btn-cobrar"
                disabled={totalACobrar <= 0}
                onClick={() => setCobrando(true)}
              >
                Cobrar {mesa ? `· Mesa ${mesa}` : ''}
              </button>

              {mesa !== null && (
                <button
                  type="button"
                  className="pos-btn"
                  style={{ width: '100%', marginTop: '.5rem' }}
                  disabled={!hayNuevos || ocupado || mesaOcupada}
                  onClick={abrirCuenta}
                  title={
                    mesaOcupada
                      ? 'Esa mesa ya tiene una cuenta abierta: entrá desde Mesas para agregarle.'
                      : undefined
                  }
                >
                  {mesaOcupada
                    ? `La mesa ${mesa} ya tiene cuenta`
                    : ocupado
                      ? 'Abriendo…'
                      : 'Dejar cuenta abierta'}
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      {cobrando && (
        <ModalCobro
          total={totalACobrar}
          titulo={cuenta ? `Cobrar la mesa ${cuenta.mesa}` : mesa ? `Cobrar · Mesa ${mesa}` : 'Cobrar'}
          onCancelar={() => setCobrando(false)}
          onConfirmar={cuenta ? confirmarCobroCuenta : confirmarCobroDirecto}
        />
      )}
    </div>
  )
}
