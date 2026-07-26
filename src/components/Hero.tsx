import Link from 'next/link'
import Image from 'next/image'
import type { Lang } from '@/i18n/dictionaries'
import { getDict } from '@/i18n/dictionaries'

const DESTINOS = [
  { dir: '↓', dest: 'Tamarindo', mins: '15 min' },
  { dir: '←', dest: 'Brasilito & Conchal', mins: '10 min' },
  { dir: '↑', dest: 'Flamingo & Potrero', mins: '15 min' },
  { dir: '↗', destKey: 'airport', mins: '55 min' },
]

export function Hero({ lang }: { lang: Lang }) {
  const t = getDict(lang)
  const p = (path: string) => (lang === 'es' ? `/es${path}` : path) || '/'

  return (
    <>
      <section
        className="on-wine"
        style={{
          position: 'relative',
          background: 'var(--wine)',
          color: '#fff',
          overflow: 'hidden',
          padding: 'clamp(3rem,7vw,5rem) 0 clamp(3rem,6vw,4.5rem)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(75% 55% at 50% 8%,rgba(255,255,255,.10),transparent 62%)',
          }}
        />

        {/* Circunferencia abierta del logo, girando muy despacio */}
        <svg className="ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="47" />
        </svg>

        <div className="wrap" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Image
            src="/logo.png"
            alt="Soul Cafe"
            width={238}
            height={280}
            priority
            className="hero-rise d1"
            style={{ width: 'clamp(150px,26vw,238px)', height: 'auto', margin: '0 auto clamp(1.5rem,3vw,2.25rem)' }}
          />

          <p className="script hero-rise d2" style={{ fontSize: 'clamp(1.9rem,1.3rem + 2.4vw,3.1rem)', color: 'rgba(255,255,255,.9)', margin: '0 0 1.1rem' }}>
            {t.hero.slogan}
          </p>

          <h1 className="hero-rise d3" style={{ maxWidth: '16ch', margin: '0 auto' }}>
            {lang === 'es' ? 'Buen café en el cruce de Huacas.' : 'Good coffee at the Huacas crossroads.'}
          </h1>

          <p className="lede lede-light hero-rise d4" style={{ maxWidth: '47ch', margin: '1.6rem auto 0' }}>
            {lang === 'es'
              ? 'Café de especialidad, repostería hecha aquí mismo y un lugar donde da gusto sentarse. Abrimos a las 6:30, todos los días.'
              : 'Specialty coffee, pastries baked in our kitchen, and a room worth sitting in. Open at 6:30, seven days a week.'}
          </p>

          <div className="hero-rise d5" style={{ display: 'flex', flexWrap: 'wrap', gap: '.85rem', justifyContent: 'center', marginTop: '2.5rem' }}>
            <Link className="btn btn-light" href={p('/menu')}>
              {t.hero.ctaMenu} <span className="arw" aria-hidden>→</span>
            </Link>
            <Link className="btn btn-outline" href={p('/visit')}>
              {t.hero.ctaVisit}
            </Link>
          </div>

          <div className="board" style={{ maxWidth: 660, margin: 'clamp(3.5rem,7vw,5.25rem) auto 0', textAlign: 'left' }}>
            <p style={{ fontSize: '.66rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,.52)', margin: '0 0 1.1rem', textAlign: 'center' }}>
              {t.board.label}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--hair-light)' }}>
              {DESTINOS.map((d, i) => (
                <li key={i} style={{ display: 'grid', gridTemplateColumns: '1.4rem 1fr auto', alignItems: 'center', gap: '1.1rem', padding: '.85rem .25rem', borderBottom: '1px solid var(--hair-light)' }}>
                  <span aria-hidden style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.72)' }}>{d.dir}</span>
                  <span style={{ fontSize: 'clamp(.82rem,.78rem + .28vw,.95rem)', letterSpacing: '.19em', textTransform: 'uppercase' }}>
                    {d.destKey ? t.board.airport : d.dest}
                  </span>
                  <span style={{ fontSize: 'clamp(.8rem,.76rem + .22vw,.92rem)', letterSpacing: '.13em', color: 'rgba(255,255,255,.62)', whiteSpace: 'nowrap' }}>{d.mins}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div style={{ background: 'var(--wine-deep)', color: '#fff' }}>
        <ul
          style={{
            listStyle: 'none',
            margin: '0 auto',
            maxWidth: 'var(--maxw)',
            padding: '1.15rem var(--pad)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '.4rem 2.75rem',
            justifyContent: 'center',
          }}
        >
          {[t.facts.open, t.facts.week, t.facts.parking, t.facts.wifi].map((f, i) => (
            <li key={i} style={{ fontSize: '.7rem', letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.88)' }}>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* La voluta de vapor del logo: cierra el bloque vino contra la crema */}
      <svg
        className="steam flip"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        aria-hidden
        style={{ color: 'var(--wine-deep)', marginBottom: -1 }}
      >
        <path
          d="M0,60 L0,34 C120,10 240,10 360,26 C480,42 600,42 720,26 C840,10 960,10 1080,26 L1200,34 L1200,60 Z"
          fill="currentColor"
        />
      </svg>
    </>
  )
}
