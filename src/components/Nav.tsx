import Link from 'next/link'
import Image from 'next/image'
import type { Lang } from '@/i18n/dictionaries'
import { getDict } from '@/i18n/dictionaries'
import { LangSwitch } from './LangSwitch'

export function Nav({ lang }: { lang: Lang }) {
  const t = getDict(lang)
  const p = (path: string) => (lang === 'es' ? `/es${path}` : path) || '/'

  return (
    <header
      className="on-wine"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 120,
        background: 'rgba(154,14,27,.95)',
        backdropFilter: 'saturate(150%) blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,.14)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '.6rem var(--pad)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <Link href={p('/')} style={{ marginRight: 'auto', display: 'flex', alignItems: 'center' }}>
          <Image src="/logo.png" alt="Soul Cafe" width={92} height={54} style={{ height: 46, width: 'auto' }} priority />
        </Link>

        <nav aria-label="Main" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href={p('/menu')} style={navLink}>{t.nav.menu}</Link>
          <Link href={p('/visit')} style={navLink}>{t.nav.visit}</Link>
        </nav>

        <LangSwitch lang={lang} />
      </div>
    </header>
  )
}

const navLink: React.CSSProperties = {
  color: 'rgba(255,255,255,.8)',
  fontSize: '.8rem',
  fontWeight: 400,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
}
