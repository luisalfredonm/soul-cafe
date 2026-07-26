import { notFound } from 'next/navigation'
import type { Lang } from '@/i18n/dictionaries'
import { LANGS } from '@/i18n/dictionaries'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'

// Genera las dos variantes de idioma en build.
// Nota: con inglés en la raíz, este segmento [lang] captura "es";
// el inglés se sirve desde las rutas sin prefijo (ver más abajo).
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!LANGS.includes(lang as Lang)) notFound()
  const l = lang as Lang

  // <html> y <body> viven aquí y no en el layout de (frontend) porque este es
  // el primer punto del árbol donde se conoce el idioma: así lang="es" / lang="en"
  // sale correcto en cada versión, que es lo que leen Google y los lectores de pantalla.
  // suppressHydrationWarning: las extensiones del navegador (ColorZilla, el opt-out
  // de Google Analytics, gestores de contraseñas) cuelgan atributos de <html> y <body>
  // antes de que React hidrate. Solo silencia estos dos nodos, no el árbol de adentro,
  // así que un desajuste real en el contenido se sigue reportando.
  return (
    <html lang={l} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Nav lang={l} />
        <main>{children}</main>
        <Footer lang={l} />
      </body>
    </html>
  )
}
