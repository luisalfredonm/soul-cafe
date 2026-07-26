import { NextResponse, type NextRequest } from 'next/server'

// Estrategia de idioma:
//   - Inglés en la raíz:   /            /menu       /visit
//   - Español con prefijo: /es          /es/menu    /es/visit
//
// Internamente las páginas viven bajo [lang], así que reescribimos:
//   /        -> /en          (el usuario sigue viendo "/")
//   /menu    -> /en/menu
//   /es      -> /es          (sin cambio)
//
// Esto no redirige: la URL visible no cambia, solo la ruta interna.

const PUBLIC_FILE = /\.(.*)$/

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // No tocar Payload, la API, assets ni archivos con extensión
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/es') ||
    pathname === '/logo.png' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Reescribe la raíz inglesa al segmento interno /en
  const url = req.nextUrl.clone()
  url.pathname = `/en${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
