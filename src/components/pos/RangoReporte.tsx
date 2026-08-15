'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// El selector de período.
//
// Los presets son ENLACES, no botones con estado: así el rango queda en la URL.
// Un reporte con la URL puesta se guarda en favoritos, se manda por WhatsApp y
// se recarga sin perder lo que se estaba mirando. Con estado en el cliente, la
// pantalla se olvidaría de todo al refrescar — y el POS refresca solo.

const PRESETS = [
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'ayer', texto: 'Ayer' },
  { clave: '7', texto: '7 días' },
  { clave: '30', texto: '30 días' },
  { clave: 'mes', texto: 'Este mes' },
  { clave: 'mesPasado', texto: 'Mes pasado' },
]

export function RangoReporte({
  preset,
  desde,
  hasta,
}: {
  preset: string
  desde: string
  hasta: string
}) {
  const router = useRouter()
  const [a, setA] = useState(desde)
  const [b, setB] = useState(hasta)

  return (
    <div className="no-imprimir">
      <div className="rep-presets">
        {PRESETS.map((p) => (
          <Link
            key={p.clave}
            href={`/pos/reportes?preset=${p.clave}`}
            aria-current={preset === p.clave ? 'page' : undefined}
          >
            {p.texto}
          </Link>
        ))}
      </div>

      <div className="rep-rango">
        <label className="pos-campo">
          <span>Desde</span>
          <input type="date" value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="pos-campo">
          <span>Hasta</span>
          <input type="date" value={b} onChange={(e) => setB(e.target.value)} />
        </label>
        <button
          type="button"
          className="pos-btn pos-btn-fino"
          style={{ flex: '0 0 auto' }}
          onClick={() =>
            router.push(`/pos/reportes?preset=rango&desde=${a}&hasta=${b}`)
          }
        >
          Ver
        </button>
      </div>
    </div>
  )
}
