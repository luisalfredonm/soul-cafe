'use client'

// Abre un papel de 80 mm (tiquete o cierre) en su propia ventana angosta y le
// dice que se imprima solo.
//
// Ventana aparte y no la misma pestaña por dos razones: el cajero no pierde
// donde estaba, y la página del papel carga su propio `@page` de 80 mm sin
// contaminar el documento del POS.

export function BotonTira({
  href,
  children,
  clase = 'pos-btn pos-btn-fino',
}: {
  href: string
  children: React.ReactNode
  clase?: string
}) {
  return (
    <button
      type="button"
      className={clase}
      onClick={() => window.open(href, '_blank', 'width=380,height=720')}
    >
      {children}
    </button>
  )
}
