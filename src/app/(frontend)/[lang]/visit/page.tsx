import type { Metadata } from 'next'
import type { Lang } from '@/i18n/dictionaries'
import { LANGS, getDict } from '@/i18n/dictionaries'
import { getAjustes } from '@/lib/payload'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const es = lang === 'es'
  return {
    title: es ? 'Cómo llegar — Soul Cafe, Huacas' : 'Visit — Soul Cafe, Huacas Guanacaste',
    description: es
      ? 'Horario, dirección y cómo llegar desde Tamarindo, Flamingo, Brasilito y el aeropuerto de Liberia.'
      : 'Hours, address and directions from Tamarindo, Flamingo, Brasilito, Conchal and Liberia airport.',
    alternates: {
      canonical: es ? '/es/visit' : '/visit',
      languages: { en: '/visit', es: '/es/visit' },
    },
  }
}

export default async function VisitPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l = (LANGS.includes(lang as Lang) ? lang : 'en') as Lang
  const t = getDict(l)
  const a = await getAjustes(l)

  const rows: [string, string][] = [
    [t.visit.hours, (a?.horarioSemana as string) || ''],
    [t.visit.weekend, (a?.horarioFinde as string) || ''],
    [t.visit.address, (a?.direccion as string) || ''],
    ['WhatsApp', (a?.whatsapp as string) || ''],
    [t.visit.parking, t.visit.parkingValue],
  ]

  return (
    <section className="on-wine" style={{ background: 'var(--wine)', color: '#fff', padding: 'clamp(4rem,8.5vw,6.75rem) 0', minHeight: '60vh' }}>
      <div className="wrap">
        <span className="eyebrow eyebrow-light">{t.nav.visit}</span>
        <h2>{t.visit.title}</h2>
        <p className="lede lede-light" style={{ maxWidth: '52ch', marginTop: '1.5rem' }}>{t.visit.intro}</p>

        <ul style={{ listStyle: 'none', margin: '2.75rem 0 0', padding: 0, borderTop: '1px solid var(--hair-light)', maxWidth: 620 }}>
          {rows.map(([k, v], i) => (
            <li key={i} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '.3rem 1.5rem', padding: '1.05rem .1rem', borderBottom: '1px solid var(--hair-light)' }}>
              <span style={{ fontSize: '.66rem', letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>{k}</span>
              <span style={{ fontWeight: 400 }}>{v}</span>
            </li>
          ))}
        </ul>

        {a?.mapsUrl && (
          <a className="btn btn-outline" href={a.mapsUrl as string} target="_blank" rel="noopener" style={{ marginTop: '2rem' }}>
            {l === 'es' ? 'Abrir en Google Maps' : 'Open in Google Maps'} <span className="arw" aria-hidden>→</span>
          </a>
        )}
      </div>
    </section>
  )
}
