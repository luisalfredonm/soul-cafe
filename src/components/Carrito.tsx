'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Carrito del navegador.
//
// Guarda SOLO el id del producto y la cantidad. Ni precios ni nombres: esos los
// resuelve el servidor al crear el pedido. Si guardara precios, quedarían viejos
// cuando el dueño los cambie, y además serían manipulables desde la consola.

export type LineaCarrito = { id: number; cantidad: number }

const CLAVE = 'soulcafe.carrito.v1'
const MAX_POR_LINEA = 30

type CarritoCtx = {
  /** false hasta que se leyó el navegador; evita parpadeos y desajustes de hidratación. */
  listo: boolean
  lineas: LineaCarrito[]
  unidades: number
  cantidadDe: (id: number) => number
  agregar: (id: number) => void
  quitar: (id: number) => void
  poner: (id: number, cantidad: number) => void
  vaciar: () => void
}

const Ctx = createContext<CarritoCtx | null>(null)

function leerDelNavegador(): LineaCarrito[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    if (!crudo) return []
    const datos = JSON.parse(crudo)
    if (!Array.isArray(datos)) return []
    return datos
      .map((l) => ({ id: Number(l?.id), cantidad: Number(l?.cantidad) }))
      .filter((l) => Number.isInteger(l.id) && l.id > 0 && Number.isInteger(l.cantidad) && l.cantidad > 0)
      .map((l) => ({ ...l, cantidad: Math.min(l.cantidad, MAX_POR_LINEA) }))
  } catch {
    return []
  }
}

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<LineaCarrito[]>([])
  const [listo, setListo] = useState(false)

  // El servidor no tiene localStorage: se lee después de montar.
  useEffect(() => {
    setLineas(leerDelNavegador())
    setListo(true)
  }, [])

  useEffect(() => {
    if (!listo) return
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(lineas))
    } catch {
      // Modo privado o almacenamiento lleno: el carrito sigue vivo en memoria.
    }
  }, [lineas, listo])

  const poner = useCallback((id: number, cantidad: number) => {
    setLineas((prev) => {
      const limpia = Math.max(0, Math.min(Math.trunc(cantidad), MAX_POR_LINEA))
      const resto = prev.filter((l) => l.id !== id)
      return limpia === 0 ? resto : [...resto, { id, cantidad: limpia }]
    })
  }, [])

  const agregar = useCallback((id: number) => {
    setLineas((prev) => {
      const actual = prev.find((l) => l.id === id)
      const cantidad = Math.min((actual?.cantidad || 0) + 1, MAX_POR_LINEA)
      return [...prev.filter((l) => l.id !== id), { id, cantidad }]
    })
  }, [])

  const quitar = useCallback((id: number) => {
    setLineas((prev) => {
      const actual = prev.find((l) => l.id === id)
      if (!actual) return prev
      const cantidad = actual.cantidad - 1
      const resto = prev.filter((l) => l.id !== id)
      return cantidad <= 0 ? resto : [...resto, { id, cantidad }]
    })
  }, [])

  const vaciar = useCallback(() => setLineas([]), [])

  const valor = useMemo<CarritoCtx>(() => {
    const mapa = new Map(lineas.map((l) => [l.id, l.cantidad]))
    return {
      listo,
      lineas,
      unidades: lineas.reduce((n, l) => n + l.cantidad, 0),
      cantidadDe: (id: number) => mapa.get(id) || 0,
      agregar,
      quitar,
      poner,
      vaciar,
    }
  }, [lineas, listo, agregar, quitar, poner, vaciar])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useCarrito() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCarrito necesita estar dentro de <CarritoProvider>')
  return ctx
}
