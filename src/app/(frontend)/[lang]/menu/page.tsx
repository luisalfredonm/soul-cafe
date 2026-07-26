import type { Metadata } from 'next'
import type { Lang } from '@/i18n/dictionaries'
import { LANGS, getDict } from '@/i18n/dictionaries'
import { getMenu } from '@/lib/payload'
import { MenuClient, type MenuGroup } from '@/components/MenuClient'

export const revalidate = 300 // el menú cambia más seguido: cada 5 min

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const es = lang === 'es'
  return {
    title: es ? 'Menú — Soul Cafe, Huacas' : 'Menu — Soul Cafe, Huacas Guanacaste',
    description: es
      ? 'Espresso, métodos filtrados, fríos, repostería del día y grano para llevar. Precios en colones.'
      : 'Espresso, filter coffee, cold drinks, pastries baked daily and beans to take home.',
    alternates: {
      canonical: es ? '/es/menu' : '/menu',
      languages: { en: '/menu', es: '/es/menu' },
    },
  }
}

export default async function MenuPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l = (LANGS.includes(lang as Lang) ? lang : 'en') as Lang
  const t = getDict(l)

  const menu = (await getMenu(l)) as unknown as MenuGroup[]

  return (
    <>
      <header className="on-wine" style={{ background: 'var(--wine)', color: '#fff', padding: '2rem 0 2.5rem', textAlign: 'center' }}>
        <div className="wrap">
          <h1 style={{ fontSize: 'clamp(2rem,1.5rem + 2.4vw,2.9rem)' }}>{t.menu.title}</h1>
          <p className="script" style={{ fontSize: 'clamp(1.4rem,1.2rem + 1vw,1.8rem)', color: 'var(--on-wine-soft)', marginTop: '.5rem' }}>
            {t.hero.slogan}
          </p>
          <p style={{ fontSize: 13, color: 'var(--on-wine-soft)', marginTop: '1rem' }}>{t.menu.milkNote}</p>
        </div>
      </header>

      <MenuClient lang={l} groups={menu} />
    </>
  )
}
