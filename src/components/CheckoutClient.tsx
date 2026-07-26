'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Lang } from '@/i18n/dictionaries'
import { getDict } from '@/i18n/dictionaries'
import { useCarrito } from './Carrito'
import { enviarPedido } from '@/app/(frontend)/[lang]/checkout/acciones'

export type ItemCatalogo = {
  id: number
  nombre: string
  /** Neto, sin IVA. */
  precio: number
  /** Con IVA, que es lo que se le muestra al cliente. */
  precioFinal: number
  tarifaIva: number
}

function money(n: number) {
  return '₡' + Math.round(n).toLocaleString('es-CR')
}

export function CheckoutClient({
  lang,
  catalogo,
  abierto,
  anticipacionMin,
}: {
  lang: Lang
  catalogo: ItemCatalogo[]
  abierto: boolean
  anticipacionMin: number
}) {
  const t = getDict(lang)
  const carrito = useCarrito()
  const p = (path: string) => (lang === 'es' ? `/es${path}` : path) || '/'

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [hora, setHora] = useState('')
  const [notas, setNotas] = useState('')
  const [factura, setFactura] = useState(false)
  const [facturaNombre, setFacturaNombre] = useState('')
  const [facturaCedula, setFacturaCedula] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState<{ codigo: string; total: number } | null>(null)

  const porId = useMemo(() => new Map(catalogo.map((c) => [c.id, c])), [catalogo])

  // Estos totales son SOLO para mostrar. El servidor los vuelve a calcular
  // desde la base al crear el pedido, y esos son los que valen.
  const resumen = useMemo(() => {
    const lineas = carrito.lineas
      .map((l) => {
        const item = porId.get(l.id)
        if (!item) return null
        const neto = item.precio * l.cantidad
        const iva = Math.round((neto * item.tarifaIva) / 100)
        return { ...item, cantidad: l.cantidad, neto, iva, total: neto + iva }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, lang))

    return {
      lineas,
      subtotal: lineas.reduce((n, l) => n + l.neto, 0),
      iva: lineas.reduce((n, l) => n + l.iva, 0),
      total: lineas.reduce((n, l) => n + l.total, 0),
    }
  }, [carrito.lineas, porId, lang])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const r = await enviarPedido({
        items: carrito.lineas.map((l) => ({ productoId: l.id, cantidad: l.cantidad })),
        nombre,
        telefono,
        email: email || undefined,
        notas: notas || undefined,
        horaRetiro: hora || undefined,
        requiereFactura: factura,
        facturaNombre: factura ? facturaNombre : undefined,
        facturaCedula: factura ? facturaCedula : undefined,
      })
      if (r.ok) {
        carrito.vaciar()
        setExito({ codigo: r.codigo, total: r.total })
      } else {
        setError(r.mensaje || t.pedido.errorGenerico)
      }
    } catch {
      setError(t.pedido.errorGenerico)
    } finally {
      setEnviando(false)
    }
  }

  // ---------- Pedido enviado ----------
  if (exito) {
    return (
      <Envoltorio>
        <span className="eyebrow">{t.pedido.listoTitulo}</span>
        <h1 style={{ fontSize: 'clamp(1.9rem,1.5rem + 2vw,2.6rem)' }}>{t.pedido.listoCodigo}</h1>
        <p
          className="script"
          style={{ fontSize: 'clamp(3.4rem,2.5rem + 5vw,6rem)', color: 'var(--wine)', margin: '1.5rem 0', letterSpacing: '.08em' }}
        >
          {exito.codigo}
        </p>
        <p className="lede" style={{ maxWidth: '40ch' }}>{t.pedido.listoTexto}</p>
        <p style={{ marginTop: '1rem', fontWeight: 500 }}>{t.pedido.total}: {money(exito.total)}</p>
        <p style={{ marginTop: '2rem' }}>
          <Link className="btn btn-wine" href={p('/menu')}>
            {t.pedido.otroPedido} <span className="arw" aria-hidden>→</span>
          </Link>
        </p>
      </Envoltorio>
    )
  }

  // ---------- Pedidos apagados ----------
  if (!abierto) {
    return (
      <Envoltorio>
        <h1 style={{ fontSize: 'clamp(1.7rem,1.4rem + 1.6vw,2.3rem)', maxWidth: '20ch' }}>{t.pedido.cerrado}</h1>
        <p style={{ marginTop: '2rem' }}>
          <Link className="btn btn-wine" href={p('/menu')}>{t.pedido.volverMenu}</Link>
        </p>
      </Envoltorio>
    )
  }

  // ---------- Carrito vacío ----------
  // carrito.listo evita mostrar "vacío" durante el instante en que
  // todavía no se leyó el almacenamiento del navegador.
  if (carrito.listo && resumen.lineas.length === 0) {
    return (
      <Envoltorio>
        <h1 style={{ fontSize: 'clamp(1.7rem,1.4rem + 1.6vw,2.3rem)' }}>{t.pedido.vacio}</h1>
        <p style={{ marginTop: '2rem' }}>
          <Link className="btn btn-wine" href={p('/menu')}>{t.pedido.volverMenu}</Link>
        </p>
      </Envoltorio>
    )
  }

  if (!carrito.listo) {
    return <Envoltorio><p className="lede">…</p></Envoltorio>
  }

  return (
    <Envoltorio>
      <span className="eyebrow">{t.nav.menu}</span>
      <h1 style={{ fontSize: 'clamp(1.9rem,1.5rem + 2vw,2.6rem)' }}>{t.pedido.titulo}</h1>

      {/* Resumen */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '2rem 0 0', borderTop: '1px solid var(--hair)' }}>
        {resumen.lineas.map((l) => (
          <li key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.85rem 0', borderBottom: '1px solid var(--hair)' }}>
            <button
              type="button"
              onClick={() => carrito.quitar(l.id)}
              aria-label={t.pedido.quitar(l.nombre)}
              style={mini}
            >
              −
            </button>
            <span style={{ minWidth: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{l.cantidad}</span>
            <button type="button" onClick={() => carrito.agregar(l.id)} aria-label={t.pedido.agregar(l.nombre)} style={mini}>
              +
            </button>
            <span style={{ flex: 1 }}>{l.nombre}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(l.total)}</span>
          </li>
        ))}
      </ul>

      <dl style={{ margin: '1.25rem 0 0', fontSize: 14.5 }}>
        <Fila k={t.pedido.subtotal} v={money(resumen.subtotal)} />
        <Fila k={t.pedido.iva} v={money(resumen.iva)} />
        <Fila k={t.pedido.total} v={money(resumen.total)} fuerte />
      </dl>

      {/* Datos */}
      <form onSubmit={onSubmit} style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{t.pedido.datos}</h2>

        <Campo id="nombre" label={t.pedido.nombre}>
          <input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} style={input} autoComplete="name" />
        </Campo>

        <Campo id="tel" label={t.pedido.telefono}>
          <input id="tel" required type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={input} autoComplete="tel" />
        </Campo>

        <Campo id="email" label={t.pedido.email} ayuda={t.pedido.emailAyuda}>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} autoComplete="email" />
        </Campo>

        <Campo
          id="hora"
          label={t.pedido.hora}
          ayuda={anticipacionMin > 0 ? `+${anticipacionMin} min` : undefined}
        >
          <input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={input} />
        </Campo>

        <Campo id="notas" label={t.pedido.notas} ayuda={t.pedido.notasAyuda}>
          <textarea id="notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} style={{ ...input, resize: 'vertical' }} />
        </Campo>

        <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', margin: '1.25rem 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={factura} onChange={(e) => setFactura(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span>{t.pedido.quiereFactura}</span>
        </label>

        {factura && (
          <>
            <Campo id="fnombre" label={t.pedido.facturaNombre}>
              <input id="fnombre" required value={facturaNombre} onChange={(e) => setFacturaNombre(e.target.value)} style={input} />
            </Campo>
            <Campo id="fcedula" label={t.pedido.facturaCedula}>
              <input id="fcedula" required value={facturaCedula} onChange={(e) => setFacturaCedula(e.target.value)} style={input} />
            </Campo>
          </>
        )}

        {error && (
          <p role="alert" style={{ color: 'var(--wine)', fontWeight: 500, margin: '1rem 0', border: '1px solid var(--wine)', borderRadius: 8, padding: '.85rem 1rem' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-wine" disabled={enviando} style={{ marginTop: '.5rem', opacity: enviando ? 0.6 : 1 }}>
          {enviando ? t.pedido.enviando : `${t.pedido.enviar} · ${money(resumen.total)}`}
        </button>
      </form>
    </Envoltorio>
  )
}

function Envoltorio({ children }: { children: React.ReactNode }) {
  return (
    <section className="sec sec-cream">
      <div className="wrap" style={{ maxWidth: 680 }}>{children}</div>
    </section>
  )
}

function Fila({ k, v, fuerte }: { k: string; v: string; fuerte?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.35rem 0', fontWeight: fuerte ? 500 : 300, fontSize: fuerte ? 18 : undefined, borderTop: fuerte ? '1px solid var(--hair)' : undefined, marginTop: fuerte ? '.5rem' : undefined, paddingTop: fuerte ? '.75rem' : undefined }}>
      <dt style={{ color: fuerte ? 'inherit' : 'var(--muted)' }}>{k}</dt>
      <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{v}</dd>
    </div>
  )
}

function Campo({ id, label, ayuda, children }: { id: string; label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 1.1rem' }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.4rem' }}>
        {label}
        {ayuda && <span style={{ textTransform: 'none', letterSpacing: 0, marginLeft: '.5rem', opacity: .8 }}>{ayuda}</span>}
      </label>
      {children}
    </p>
  )
}

const input: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: '.7rem .9rem',
  background: 'var(--surface)',
  border: '1px solid var(--hair)',
  borderRadius: 8,
  fontSize: 16, // menos de 16 hace que iOS haga zoom al enfocar
  fontFamily: 'var(--sans)',
  fontWeight: 300,
  color: 'var(--ink)',
}

const mini: React.CSSProperties = {
  width: 34,
  height: 34,
  minWidth: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '1px solid var(--hair)',
  borderRadius: '50%',
  color: 'var(--wine)',
  fontSize: 17,
  lineHeight: 1,
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
}
