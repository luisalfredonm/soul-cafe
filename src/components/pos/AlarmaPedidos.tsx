'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

// La campana de los pedidos web.
//
// Vive en el layout, no en la pantalla de pedidos: si el cajero está cobrando en
// `/pos`, tiene que oírla igual.
//
// Qué la calla: que el pedido deje de estar en `nuevo`. Cualquier botón que ya
// existe sirve — Preparando, Listo, Entregado, Cobrar o Anular. No hay ningún
// "visto" aparte, y eso importa: como la verdad está en el servidor, atender el
// pedido desde la tablet también calla la PC de la caja. Con un "visto" guardado
// en cada navegador, cada aparato seguiría sonando por su cuenta.

const CADA_CUANTO_MIRA = 10_000
const CADA_CUANTO_INSISTE = 60_000

type Estado = { pendientes: number; ultimo: { codigo?: string | null } | null }

export function AlarmaPedidos() {
  const ruta = usePathname()
  const [estado, setEstado] = useState<Estado>({ pendientes: 0, ultimo: null })
  const [audioListo, setAudioListo] = useState(false)

  const audio = useRef<AudioContext | null>(null)
  const anterior = useRef(0)

  // El tiquete se abre en su propia ventanita para imprimir. Que esa ventana
  // consulte y pite no aporta nada.
  const activa = !ruta.startsWith('/pos/tiquete')

  /**
   * Los navegadores no dejan sonar nada hasta que la persona toca la página.
   * Esto engancha el primer toque —cualquiera— y deja el audio listo para el
   * resto de la sesión.
   */
  const despertarAudio = useCallback(() => {
    try {
      if (!audio.current) {
        const Constructor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Constructor) return
        audio.current = new Constructor()
      }
      const ctx = audio.current
      if (ctx.state === 'suspended') {
        void ctx.resume().then(() => setAudioListo(ctx.state === 'running'))
      } else {
        setAudioListo(ctx.state === 'running')
      }
    } catch {
      // Sin audio se sigue viendo la franja roja, que es lo que de verdad avisa.
    }
  }, [])

  useEffect(() => {
    if (!activa) return
    const alTocar = () => despertarAudio()
    document.addEventListener('pointerdown', alTocar)
    document.addEventListener('keydown', alTocar)
    return () => {
      document.removeEventListener('pointerdown', alTocar)
      document.removeEventListener('keydown', alTocar)
    }
  }, [activa, despertarAudio])

  /**
   * Tres notas subiendo, generadas al vuelo.
   *
   * Sin archivo de sonido a propósito: un mp3 es una cosa más que puede fallar
   * al cargar, y si falla la caja se queda muda sin que nadie se entere.
   */
  const sonar = useCallback(() => {
    const ctx = audio.current
    if (!ctx || ctx.state !== 'running') return

    const arranque = ctx.currentTime
    const notas = [880, 1108, 1318]

    notas.forEach((hz, i) => {
      const desde = arranque + i * 0.16
      const osc = ctx.createOscillator()
      const volumen = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.value = hz

      // Rampas en vez de cortes secos: un corte suena a chasquido.
      volumen.gain.setValueAtTime(0.0001, desde)
      volumen.gain.exponentialRampToValueAtTime(0.3, desde + 0.02)
      volumen.gain.exponentialRampToValueAtTime(0.0001, desde + 0.15)

      osc.connect(volumen)
      volumen.connect(ctx.destination)
      osc.start(desde)
      osc.stop(desde + 0.16)
    })
  }, [])

  // ---- Consulta periódica ----
  useEffect(() => {
    if (!activa) return
    let vivo = true

    async function mirar() {
      try {
        const r = await fetch('/pos/pendientes', { cache: 'no-store' })
        if (!r.ok || !vivo) return
        const datos = (await r.json()) as Estado
        if (vivo) setEstado(datos)
      } catch {
        // Un corte de red no tiene que romper nada: se reintenta en diez segundos.
      }
    }

    void mirar()
    const t = window.setInterval(mirar, CADA_CUANTO_MIRA)
    return () => {
      vivo = false
      window.clearInterval(t)
    }
  }, [activa])

  // ---- Sonar al aparecer, y después insistir ----
  useEffect(() => {
    if (!activa) return

    if (estado.pendientes === 0) {
      anterior.current = 0
      return
    }

    // Suena de entrada cuando aparece uno nuevo, no solo al minuto siguiente.
    if (estado.pendientes > anterior.current) sonar()
    anterior.current = estado.pendientes

    const t = window.setInterval(sonar, CADA_CUANTO_INSISTE)
    return () => window.clearInterval(t)
  }, [activa, estado.pendientes, sonar])

  /**
   * El botón de activar suena una vez al desbloquearse.
   *
   * Sin ese pitido, uno toca el botón, no pasa nada audible y queda sin saber si
   * funcionó. La confirmación es el propio sonido.
   */
  function activarDesdeBoton() {
    despertarAudio()
    window.setTimeout(sonar, 120)
  }

  if (!activa) return null

  const hay = estado.pendientes > 0

  return (
    <>
      {hay && (
        <div className="pos-alarma no-imprimir" role="status" aria-live="assertive">
          <span className="campana" aria-hidden>
            🔔
          </span>
          <span>
            {estado.pendientes === 1
              ? `Pedido web sin atender${estado.ultimo?.codigo ? ` · ${estado.ultimo.codigo}` : ''}`
              : `${estado.pendientes} pedidos web sin atender`}
          </span>
          <Link href="/pos/pedidos">Ver</Link>
        </div>
      )}

      {/* Mientras el navegador no deje sonar, se dice. Una alarma muda en la que
          se confía es peor que no tener alarma. */}
      {!audioListo && (
        <button type="button" className="pos-audio no-imprimir" onClick={activarDesdeBoton}>
          El sonido está apagado — tocá acá para activarlo
        </button>
      )}
    </>
  )
}
