'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ENLACES = [
  { href: '/pos', texto: 'Vender' },
  { href: '/pos/mesas', texto: 'Mesas' },
  { href: '/pos/pedidos', texto: 'Pedidos' },
  { href: '/pos/caja', texto: 'Caja' },
]

// Reportes solo lo ve el dueño. Esconder el enlace es cortesía, no seguridad: el
// guardia de verdad está en la propia página y en la ruta del CSV, del lado del
// servidor. Un cajero que escriba la dirección a mano no entra igual.
const SOLO_ADMIN = { href: '/pos/reportes', texto: 'Reportes' }

export function PosNav({ admin }: { admin: boolean }) {
  const ruta = usePathname()
  const enlaces = admin ? [...ENLACES, SOLO_ADMIN] : ENLACES

  return (
    <nav className="pos-nav" aria-label="Secciones de la caja">
      {enlaces.map((e) => {
        // "/pos" solo se marca en la pantalla de venta; si no, quedaría activo
        // en todas, porque todas las rutas empiezan igual.
        const activo = e.href === '/pos' ? ruta === '/pos' : ruta.startsWith(e.href)
        return (
          <Link key={e.href} href={e.href} aria-current={activo ? 'page' : undefined}>
            {e.texto}
          </Link>
        )
      })}
    </nav>
  )
}
