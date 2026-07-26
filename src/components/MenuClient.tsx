'use client'

import { useMemo, useState } from 'react'
import type { Lang } from '@/i18n/dictionaries'
import { getDict } from '@/i18n/dictionaries'

export type MenuItem = {
  id: string | number
  nombre: string
  descripcion?: string
  precio: number
  etiquetas?: string[]
}
export type MenuGroup = {
  id: string | number
  slug: string
  nombre: string
  nota?: string
  productos: MenuItem[]
}

type Diet = 'vegan' | 'gf' | 'nocoffee'

function norm(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function money(n: number) {
  return '₡' + n.toLocaleString('es-CR')
}

export function MenuClient({ lang, groups }: { lang: Lang; groups: MenuGroup[] }) {
  const t = getDict(lang)
  const [query, setQuery] = useState('')
  const [diets, setDiets] = useState<Diet[]>([])

  const total = useMemo(
    () => groups.reduce((n, g) => n + g.productos.length, 0),
    [groups],
  )

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    return groups
      .map((g) => ({
        ...g,
        productos: g.productos.filter((it) => {
          for (const d of diets) if (!(it.etiquetas || []).includes(d)) return false
          if (!q) return true
          const hay = norm(`${it.nombre} ${it.descripcion || ''}`)
          return hay.includes(q)
        }),
      }))
      .filter((g) => g.productos.length > 0)
  }, [groups, query, diets])

  const shown = filtered.reduce((n, g) => n + g.productos.length, 0)

  function toggleDiet(d: Diet) {
    setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }
  function reset() {
    setQuery('')
    setDiets([])
  }

  function highlight(text: string) {
    const q = query.trim()
    if (!q) return text
    const i = norm(text).indexOf(norm(q))
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <mark style={{ background: 'rgba(154,14,27,.16)', color: 'inherit', borderRadius: 3, padding: '0 2px' }}>
          {text.slice(i, i + q.length)}
        </mark>
        {text.slice(i + q.length)}
      </>
    )
  }

  const DIETS: Diet[] = ['vegan', 'gf', 'nocoffee']

  return (
    <>
      {/* Barra pegajosa: búsqueda + filtros + chips */}
      <div style={{ position: 'sticky', top: 58, zIndex: 60, background: 'var(--wine-deep)', boxShadow: '0 6px 20px rgba(44,10,14,.18)' }} className="on-wine">
        <div className="wrap" style={{ paddingTop: '.75rem' }}>
          <div style={{ position: 'relative' }}>
            <label htmlFor="q" style={srOnly}>{t.menu.searchLabel}</label>
            <span aria-hidden style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-wine-soft)' }}>⌕</span>
            <input
              id="q"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.menu.searchPlaceholder}
              style={{
                width: '100%',
                minHeight: 44,
                padding: '.75rem 46px',
                background: 'rgba(255,255,255,.12)',
                border: '1px solid var(--hair-light)',
                borderRadius: 999,
                color: '#fff',
                fontSize: 16,
                fontWeight: 300,
                fontFamily: 'var(--sans)',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label={t.menu.clear}
                style={{ position: 'absolute', right: 3, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 0, borderRadius: '50%', cursor: 'pointer', color: 'var(--on-wine-soft)', fontSize: 20 }}
              >
                ×
              </button>
            )}
          </div>

          <div role="group" aria-label="Filtros" style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
            {DIETS.map((d) => {
              const on = diets.includes(d)
              return (
                <button
                  key={d}
                  onClick={() => toggleDiet(d)}
                  aria-pressed={on}
                  style={{
                    minHeight: 36,
                    padding: '0 1rem',
                    background: on ? '#fff' : 'transparent',
                    border: `1px solid ${on ? '#fff' : 'var(--hair-light)'}`,
                    borderRadius: 999,
                    color: on ? 'var(--wine)' : 'var(--on-wine-soft)',
                    fontWeight: on ? 500 : 300,
                    fontSize: 12,
                    letterSpacing: '.08em',
                    cursor: 'pointer',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  {t.menu.filters[d]}
                </button>
              )
            })}
          </div>

          <nav aria-label="Secciones" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginTop: '.75rem', paddingBottom: '.75rem' }}>
            {filtered.map((g) => (
              <a
                key={g.id}
                href={`#${g.slug}`}
                style={{
                  flex: '0 0 auto',
                  minHeight: 36,
                  padding: '0 1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: '1px solid var(--hair-light)',
                  borderRadius: 999,
                  color: 'var(--on-wine-soft)',
                  fontSize: 12.5,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.nombre}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="wrap">
        <p role="status" aria-live="polite" style={{ padding: '1rem 0 0', fontSize: 13, color: 'var(--muted)', letterSpacing: '.06em', minHeight: 20 }}>
          {shown > 0 ? (shown === total ? t.menu.countAll(shown) : t.menu.countSome(shown, total)) : ''}
        </p>

        {filtered.map((g) => (
          <section key={g.id} id={g.slug} style={{ paddingTop: '3rem', scrollMarginTop: 180 }}>
            <div style={{ borderBottom: '1px solid var(--hair)', paddingBottom: '.75rem', marginBottom: '1.5rem' }}>
              <span className="eyebrow" style={{ marginBottom: '.5rem' }}>{g.nombre}</span>
              <h2 style={{ fontSize: 'clamp(1.5rem,1.3rem + 1.1vw,2rem)' }}>{g.nombre}</h2>
              {g.nota && <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: '.5rem' }}>{g.nota}</p>}
            </div>

            {g.productos.map((it) => (
              <article key={it.id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--hair)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '.75rem' }}>
                  <h3 style={{ fontSize: 17, flex: '0 1 auto' }}>{highlight(it.nombre)}</h3>
                  <span aria-hidden style={{ flex: '1 1 auto', borderBottom: '1px dotted var(--hair)', transform: 'translateY(-4px)', minWidth: 16 }} />
                  <span style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--wine)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(it.precio)}</span>
                </div>
                {it.descripcion && <p style={{ fontSize: 14.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.55, maxWidth: '56ch' }}>{highlight(it.descripcion)}</p>}
                {it.etiquetas && it.etiquetas.length > 0 && (
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
                    {it.etiquetas.map((tg) => (
                      <span key={tg} style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--wine)', border: '1px solid var(--wine)', borderRadius: 999, padding: '2px .5rem' }}>
                        {t.menu.tags[tg as Diet] || tg}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        ))}

        {shown === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem 3rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '.5rem' }}>{t.menu.emptyTitle}</h2>
            <button className="btn btn-wine" onClick={reset} style={{ marginTop: '1.5rem' }}>
              {t.menu.emptyBtn}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
}
