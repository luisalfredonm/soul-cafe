import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { cuentasAbiertas } from '@/lib/pedidos'
import { cajaAbierta } from '@/lib/caja'
import { hora, money } from '@/lib/formato'
import { Refrescar } from '@/components/pos/Refrescar'

// El salón.
//
// Una mesa libre lleva a la pantalla de venta con esa mesa puesta; una ocupada
// lleva a su cuenta, para agregarle otra ronda o cobrarla.
//
// No hay ninguna tabla de mesas: se dibujan del 1 al número que diga Ajustes, y
// "ocupada" significa que existe una venta con esa mesa todavía sin cobrar.

export default async function MesasPage() {
  const payload = await getPayloadClient()

  const [ajustes, cuentas, caja] = await Promise.all([
    payload.findGlobal({ slug: 'ajustes' }),
    cuentasAbiertas(),
    cajaAbierta(),
  ])

  const cantidad = Math.max(0, Number(ajustes?.cantidadMesas) || 0)
  const porMesa = new Map(cuentas.map((c) => [Number(c.mesa), c]))
  const mesas = Array.from({ length: cantidad }, (_, i) => i + 1)

  const totalAbierto = cuentas.reduce((n, c) => n + (Number(c.total) || 0), 0)

  if (cantidad === 0) {
    return (
      <div className="pos-hoja">
        <h1>Mesas</h1>
        <p style={{ color: 'var(--pos-suave)' }}>
          No hay mesas configuradas. Se ponen en <strong>Ajustes → Cantidad de mesas</strong>, en el
          panel.
        </p>
      </div>
    )
  }

  return (
    <div className="pos-hoja">
      <Refrescar />

      <h1>Mesas</h1>
      <p style={{ color: 'var(--pos-suave)', marginBottom: '1.25rem' }}>
        {cuentas.length === 0
          ? 'Todas libres.'
          : `${cuentas.length} con cuenta abierta · ${money(totalAbierto)} sin cobrar.`}
      </p>

      {!caja && (
        <p className="pos-aviso">
          La caja está cerrada. Se puede mirar el salón, pero para vender hay que abrir el turno en{' '}
          <Link href="/pos/caja" style={{ textDecoration: 'underline' }}>
            Caja
          </Link>
          .
        </p>
      )}

      <div className="pos-mesas">
        {mesas.map((n) => {
          const cuenta = porMesa.get(n)
          return (
            <Link
              key={n}
              href={cuenta ? `/pos?cuenta=${cuenta.id}` : `/pos?mesa=${n}`}
              className={`pos-mesa ${cuenta ? 'ocupada' : ''}`}
            >
              <span className="num">{n}</span>
              {cuenta ? (
                <>
                  <span className="imp">{money(cuenta.total)}</span>
                  <span className="desde">desde {hora(cuenta.createdAt)}</span>
                </>
              ) : (
                <span className="desde">Libre</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
