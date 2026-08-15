'use client'

import { useEffect } from 'react'

// Manda el tiquete a la impresora en cuanto la ventana carga y la cierra cuando
// termina.
//
// La ventana la abre el POS con `window.open`, así que cerrarla no molesta a
// nadie. Si el navegador bloquea el cierre (pasa cuando la abrió el usuario a
// mano), simplemente queda abierta: no se pierde nada.

export function AutoImprimir({ activo }: { activo: boolean }) {
  useEffect(() => {
    if (!activo) return

    const alTerminar = () => window.close()
    window.addEventListener('afterprint', alTerminar)

    // Un tick para que el navegador termine de pintar antes de capturar la
    // página. Sin esto, algunas impresiones salen a medio renderizar.
    const t = window.setTimeout(() => window.print(), 250)

    return () => {
      window.clearTimeout(t)
      window.removeEventListener('afterprint', alTerminar)
    }
  }, [activo])

  return null
}
