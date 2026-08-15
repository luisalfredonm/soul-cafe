import type { Metadata, Viewport } from 'next'
import { redirect } from 'next/navigation'
import '@/components/pos/pos.css'
import { PosNav } from '@/components/pos/PosNav'
import { AlarmaPedidos } from '@/components/pos/AlarmaPedidos'
import { usuarioActual } from '@/lib/sesion'
import { esAdmin } from '@/lib/roles'
import { cajaAbierta } from '@/lib/caja'

// La caja es una app aparte dentro del mismo proyecto: mismo catálogo, misma
// base, misma sesión — pero otra pantalla. El panel de Payload sirve para
// administrar, no para cobrar con una mano mientras se hace un café.
//
// Vive fuera de `[lang]`: es interna y siempre en español.

export const metadata: Metadata = {
  title: 'Caja · Soul Cafe',
  // Es una pantalla interna: que no la indexe nadie.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin zoom por doble toque: en una tablet, tocar rápido dos productos no
  // debería agrandar la pantalla.
  maximumScale: 1,
  themeColor: '#16100F',
}

// Sesión y estado de caja se leen en cada visita; nada de esto se cachea.
export const dynamic = 'force-dynamic'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual()

  // No hay login propio: se reusa el de Payload, que ya deja la cookie puesta
  // para todo el dominio.
  if (!usuario) redirect('/admin/login')

  const caja = await cajaAbierta()

  return (
    <html lang="es">
      <body className="pos-body">
        <div className="pos-app">
          {/* La barra y la alarma se pegan juntas arriba. Envolverlas evita
              tener que adivinar en el CSS cuánto mide la barra para colgar la
              alarma justo debajo — un número que se rompe al cambiar cualquier
              cosa del encabezado. */}
          <div className="pos-superior no-imprimir">
            <header className="pos-barra">
            <span className="pos-marca">Soul Cafe</span>
            <PosNav admin={esAdmin(usuario)} />
            <div className="pos-usuario">
              <span className={`pos-chip ${caja ? 'listo' : 'pendiente'}`}>
                {caja ? 'Caja abierta' : 'Caja cerrada'}
              </span>
              <span>{usuario.nombre || usuario.email}</span>
            </div>
            </header>

            {/* Va acá, fuera de cualquier pantalla: un pedido web tiene que
                avisar aunque el cajero esté cobrando en otra sección. */}
            <AlarmaPedidos />
          </div>

          <main className="pos-main">{children}</main>
        </div>
      </body>
    </html>
  )
}
