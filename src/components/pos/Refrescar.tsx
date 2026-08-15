'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Vuelve a pedir los datos del servidor cada tanto.
 *
 * Existe porque el salón se atiende desde más de un aparato: si alguien abre la
 * mesa 4 desde la tablet, la pantalla de la caja tiene que enterarse sin que
 * nadie recargue nada.
 */
export function Refrescar({ cada = 20_000 }: { cada?: number }) {
  const router = useRouter()

  useEffect(() => {
    const t = window.setInterval(() => router.refresh(), cada)
    return () => window.clearInterval(t)
  }, [router, cada])

  return null
}
