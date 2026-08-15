'use client'

/** Reimprimir a mano, por si el papel se atascó o el cliente quiere otra copia. */
export function BotonImprimir() {
  return (
    <button type="button" className="pos-btn pos-btn-vino" onClick={() => window.print()}>
      Imprimir
    </button>
  )
}
