import type { Metadata } from 'next'
import type { Lang } from '@/i18n/dictionaries'
import { LANGS } from '@/i18n/dictionaries'
import { getAjustes, getMenu } from '@/lib/payload'
import { pedidosAbiertos } from '@/lib/pedidos'
import type { MenuGroup, MenuItem } from '@/components/MenuClient'
import { CheckoutClient, type ItemCatalogo } from '@/components/CheckoutClient'

// Nada de caché: aquí sí importa saber al segundo si los pedidos están abiertos.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const es = lang === 'es'
  return {
    title: es ? 'Tu pedido — Soul Cafe' : 'Your order — Soul Cafe',
    // Una página de carrito no aporta nada en Google y no debe indexarse.
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l = (LANGS.includes(lang as Lang) ? lang : 'en') as Lang

  const [menu, ajustes] = await Promise.all([
    getMenu(l) as unknown as Promise<MenuGroup[]>,
    getAjustes(l),
  ])

  // Catálogo plano: el carrito solo guarda ids, así que aquí se les pone
  // nombre y precio para poder mostrar el resumen.
  const catalogo: ItemCatalogo[] = menu.flatMap((g) =>
    g.productos.map((p: MenuItem) => ({
      id: Number(p.id),
      nombre: p.nombre,
      precio: Number(p.precio) || 0,
      precioFinal: Number(p.precioFinal) || 0,
      tarifaIva: Number(p.tarifaIva) || 0,
    })),
  )

  return (
    <CheckoutClient
      lang={l}
      catalogo={catalogo}
      abierto={pedidosAbiertos(ajustes)}
      anticipacionMin={Number(ajustes?.pedidosAnticipacionMin ?? 15)}
    />
  )
}
