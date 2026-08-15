'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fechaHora, hora, money } from '@/lib/formato'
import type { PagoEntrada } from '@/lib/pedidos'
import { ModalCobro } from './ModalCobro'
import { anularPedidoAccion, cambiarEstadoAccion, cobrarPedidoAccion } from '@/app/(pos)/pos/acciones'

// La cola de la barra: qué falta hacer y qué falta entregar. Nada más.
//
// Dos reglas aprendidas a los golpes:
//
// 1. **Un toque cierra un pedido.** `Preparando` y `Listo` están para el pedido
//    web, donde importa saber si ya se puede venir a recoger. Pero un café de
//    mostrador se hace y se entrega en un minuto: obligar a pasar por los tres
//    estados hace que nadie marque nada y que la lista crezca sin fin.
//
// 2. **Lo de días anteriores no se mezcla con lo de hoy.** Se muestra aparte y
//    plegado. Esconderlo sería mentir; dejarlo arriba, estorbar.

const REFRESCO_MS = 20_000

export type PedidoLista = {
  id: number
  numero?: number | null
  codigo?: string | null
  canal: string
  mesa?: number | null
  estado: string
  pagoEstado: string
  clienteNombre: string
  clienteTelefono?: string | null
  notas?: string | null
  horaRetiro?: string | null
  createdAt: string
  esDeHoy: boolean
  total: number
  lineas: { nombre?: string | null; cantidad?: number | null }[]
}

export function PosPedidos({ pedidos, hayCaja }: { pedidos: PedidoLista[]; hayCaja: boolean }) {
  const router = useRouter()
  const [cobrando, setCobrando] = useState<PedidoLista | null>(null)
  const [anulando, setAnulando] = useState<PedidoLista | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [verViejos, setVerViejos] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => router.refresh(), REFRESCO_MS)
    return () => window.clearInterval(t)
  }, [router])

  const deHoy = pedidos.filter((p) => p.esDeHoy)
  const viejos = pedidos.filter((p) => !p.esDeHoy)
  const porPreparar = deHoy.filter((p) => p.estado === 'nuevo' || p.estado === 'preparando')
  const listos = deHoy.filter((p) => p.estado === 'listo')

  async function cambiar(p: PedidoLista, estado: 'preparando' | 'listo' | 'entregado') {
    setError('')
    setOcupado(p.id)
    const r = await cambiarEstadoAccion({ pedidoId: p.id, estado })
    setOcupado(null)
    if (!r.ok) return setError(r.mensaje)
    router.refresh()
  }

  async function cobrar(pagos: PagoEntrada[], efectivoRecibido: number) {
    if (!cobrando) return { ok: false as const, mensaje: 'No hay pedido seleccionado.' }

    const r = await cobrarPedidoAccion({ pedidoId: cobrando.id, pagos, efectivoRecibido })
    if (!r.ok) return { ok: false as const, mensaje: r.mensaje }

    setCobrando(null)
    router.refresh()
    if (r.vuelto > 0) {
      // El vuelto se avisa fuerte: es lo único de este flujo que se puede
      // olvidar y sale del bolsillo del local.
      window.alert(`Vuelto: ${money(r.vuelto)}`)
    }
    return { ok: true as const }
  }

  async function anular() {
    if (!anulando) return
    setError('')
    setOcupado(anulando.id)
    const r = await anularPedidoAccion({ pedidoId: anulando.id, motivo })
    setOcupado(null)
    if (!r.ok) return setError(r.mensaje)
    setAnulando(null)
    setMotivo('')
    router.refresh()
  }

  function Tarjeta({ p }: { p: PedidoLista }) {
    const porCobrar = p.pagoEstado !== 'pagado'
    const esCuenta = Boolean(p.mesa) && porCobrar
    const trabajando = ocupado === p.id

    return (
      <div className="pos-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1.4rem', letterSpacing: '.14em' }}>{p.codigo}</strong>
          {p.mesa ? (
            <span className="pos-chip listo">Mesa {p.mesa}</span>
          ) : (
            <span className="pos-chip">{p.canal}</span>
          )}
          {p.estado === 'preparando' && <span className="pos-chip nuevo">En preparación</span>}
          {p.estado === 'listo' && <span className="pos-chip listo">Listo</span>}
          {porCobrar && (
            <span className="pos-chip pendiente">{esCuenta ? 'Cuenta abierta' : 'Sin cobrar'}</span>
          )}
          <span style={{ marginLeft: 'auto', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {money(p.total)}
          </span>
        </div>

        <p style={{ margin: '.6rem 0 .2rem', color: 'var(--pos-suave)', fontSize: '.9rem' }}>
          {p.clienteNombre}
          {p.clienteTelefono ? ` · ${p.clienteTelefono}` : ''}
          {p.horaRetiro ? ` · retira ${hora(p.horaRetiro)}` : ''}
          {' · '}
          {p.esDeHoy ? hora(p.createdAt) : fechaHora(p.createdAt)}
        </p>

        <ul style={{ margin: '.4rem 0 0', paddingLeft: '1.1rem' }}>
          {p.lineas.map((l, i) => (
            <li key={i}>
              {l.cantidad}× {l.nombre}
            </li>
          ))}
        </ul>

        {p.notas && (
          <p style={{ margin: '.6rem 0 0', color: 'var(--pos-alerta)', fontSize: '.92rem' }}>
            Nota: {p.notas}
          </p>
        )}

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {/* Cerrar el pedido es UN toque, desde donde sea que esté. */}
          <button
            type="button"
            className="pos-btn pos-btn-cobrar"
            style={{ marginTop: 0, minHeight: 52, flex: '1 1 160px' }}
            onClick={() => cambiar(p, 'entregado')}
            disabled={trabajando}
          >
            {esCuenta ? 'Servido' : 'Entregado'}
          </button>

          {porCobrar && (
            <button
              type="button"
              className="pos-btn pos-btn-vino"
              onClick={() => setCobrando(p)}
              disabled={!hayCaja || trabajando}
              title={hayCaja ? undefined : 'Hay que abrir la caja primero'}
            >
              Cobrar {money(p.total)}
            </button>
          )}

          {/* Los estados intermedios son opcionales: sirven sobre todo para el
              pedido web, donde el cliente pregunta si ya puede venir. */}
          {p.estado === 'nuevo' && (
            <button
              type="button"
              className="pos-btn pos-btn-fino"
              onClick={() => cambiar(p, 'preparando')}
              disabled={trabajando}
            >
              Preparando
            </button>
          )}
          {p.estado !== 'listo' && (
            <button
              type="button"
              className="pos-btn pos-btn-fino"
              onClick={() => cambiar(p, 'listo')}
              disabled={trabajando}
            >
              Listo
            </button>
          )}

          <button
            type="button"
            className="pos-btn pos-btn-fino"
            onClick={() => window.open(`/pos/tiquete/${p.id}?imprimir=1`, '_blank', 'width=380,height=720')}
          >
            Tiquete
          </button>
          <button
            type="button"
            className="pos-btn pos-btn-fino"
            onClick={() => {
              setAnulando(p)
              setMotivo('')
            }}
            disabled={trabajando}
          >
            Anular
          </button>
        </div>

        {esCuenta && (
          <p style={{ margin: '.75rem 0 0', color: 'var(--pos-suave)', fontSize: '.84rem' }}>
            Marcarlo servido lo saca de esta lista, pero la mesa {p.mesa} sigue debiendo hasta que
            se cobre.
          </p>
        )}
      </div>
    )
  }

  const nadaHoy = porPreparar.length === 0 && listos.length === 0

  return (
    <div className="pos-hoja">
      <h1>Pedidos</h1>
      <p style={{ color: 'var(--pos-suave)', marginBottom: '1.5rem' }}>
        {nadaHoy
          ? 'Nada pendiente. Todo al día.'
          : [
              porPreparar.length > 0 ? `${porPreparar.length} por preparar` : '',
              listos.length > 0 ? `${listos.length} esperando retiro` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
      </p>

      {error && (
        <p className="pos-error" role="alert">
          {error}
        </p>
      )}

      {porPreparar.length > 0 && (
        <>
          <h2 className="pos-seccion">Por preparar</h2>
          {porPreparar.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </>
      )}

      {listos.length > 0 && (
        <>
          <h2 className="pos-seccion">Listos, esperando retiro</h2>
          {listos.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </>
      )}

      {/* Lo que quedó abierto de otros días. Aparte y plegado: casi siempre es
          algo que nadie marcó como entregado, no trabajo de verdad. */}
      {viejos.length > 0 && (
        <>
          <h2 className="pos-seccion" style={{ marginTop: '2.5rem' }}>
            Sin cerrar de días anteriores ({viejos.length})
          </h2>
          {verViejos ? (
            <>
              {viejos.map((p) => (
                <Tarjeta key={p.id} p={p} />
              ))}
              <button type="button" className="pos-btn pos-btn-fino" onClick={() => setVerViejos(false)}>
                Ocultar
              </button>
            </>
          ) : (
            <button type="button" className="pos-btn pos-btn-fino" onClick={() => setVerViejos(true)}>
              Ver los {viejos.length} pendientes viejos
            </button>
          )}
        </>
      )}

      {cobrando && (
        <ModalCobro
          total={cobrando.total}
          titulo={
            cobrando.mesa ? `Cobrar la mesa ${cobrando.mesa}` : `Cobrar pedido ${cobrando.codigo}`
          }
          onCancelar={() => setCobrando(null)}
          onConfirmar={cobrar}
        />
      )}

      {anulando && (
        <div className="pos-fondo" role="dialog" aria-modal="true" aria-label="Anular pedido">
          <div className="pos-modal">
            <h2>Anular {anulando.codigo}</h2>
            <p style={{ color: 'var(--pos-suave)' }}>
              El pedido no se borra: queda registrado como anulado, con el motivo y quién lo hizo.
            </p>

            <label className="pos-campo">
              <span>Motivo</span>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Se equivocó el cajero, el cliente se arrepintió…"
                autoFocus
              />
            </label>

            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="pos-btn pos-btn-fino" onClick={() => setAnulando(null)}>
                Volver
              </button>
              <button
                type="button"
                className="pos-btn pos-btn-vino"
                onClick={anular}
                disabled={!motivo.trim() || ocupado === anulando.id}
              >
                Anular pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
