import type { Lang } from '@/i18n/dictionaries'
import { getDict } from '@/i18n/dictionaries'

export function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang)

  return (
    <footer style={{ background: 'var(--wine-dark)', color: 'rgba(255,255,255,.6)', marginTop: '4rem' }}>
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '3rem var(--pad)',
          textAlign: 'center',
        }}
      >
        <p className="script" style={{ fontSize: '1.6rem', color: 'rgba(255,255,255,.9)', marginBottom: '1rem' }}>
          {t.foot.tagline}
        </p>
        <p style={{ fontSize: '.82rem', letterSpacing: '.06em' }}>{t.foot.prototype}</p>
      </div>
    </footer>
  )
}
