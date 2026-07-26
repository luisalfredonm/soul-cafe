'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Lang } from '@/i18n/dictionaries'

// Cambia entre idiomas conservando la página actual.
// Inglés vive en la raíz (/menu), español bajo /es (/es/menu).
export function LangSwitch({ lang }: { lang: Lang }) {
  const pathname = usePathname() || '/'

  // Quita el prefijo /es si está, para obtener la ruta base
  const base = pathname.replace(/^\/es(?=\/|$)/, '') || '/'
  const toEn = base
  const toEs = base === '/' ? '/es' : `/es${base}`

  const style = (active: boolean): React.CSSProperties => ({
    minHeight: 44,
    padding: '0 .7rem',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '.68rem',
    fontWeight: 500,
    letterSpacing: '.14em',
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--wine)' : 'var(--on-wine-soft)',
    transition: 'background .2s, color .2s',
  })

  return (
    <div
      role="group"
      aria-label="Language / Idioma"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--hair-light)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <Link href={toEn} aria-current={lang === 'en'} style={style(lang === 'en')}>
        EN
      </Link>
      <Link href={toEs} aria-current={lang === 'es'} style={style(lang === 'es')}>
        ES
      </Link>
    </div>
  )
}
