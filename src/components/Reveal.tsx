'use client'

import { useEffect } from 'react'

// Hace aparecer los elementos con clase .rise cuando entran en pantalla.
// Se monta una sola vez por página; no envuelve nada, solo observa.
export function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.rise:not(.is-in)')

    // Navegador viejo o sin soporte: mostrar todo de una.
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px' },
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Si el visitante tiene JavaScript desactivado, .rise no debe ocultar nada.
  return (
    <noscript>
      <style>{`.rise{opacity:1;transform:none}`}</style>
    </noscript>
  )
}
