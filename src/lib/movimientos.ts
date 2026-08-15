// Los movimientos de efectivo de la gaveta, y qué le hace cada uno al arqueo.
//
// Este archivo no importa nada, por la misma razón que `totales.ts`: lo cargan
// la colección `Movimientos` (que va dentro de la config de Payload) y
// `lib/caja.ts` (que carga la config). Si viviera en cualquiera de los dos, el
// otro no podría usarlo.
//
// Qué son: plata que entra o sale de la gaveta sin ser una venta. Sacar ₡40.000
// para pagarle al de la leche, meter cambio a media mañana, llevarse la
// recaudación a la caja fuerte antes de cerrar.
//
// Por qué existen: sin ellos, el arqueo calcula `fondo + ventas en efectivo` y
// cualquier plata que se movió aparece como faltante. Un arqueo que marca
// faltante todos los días deja de servir para detectar el faltante de verdad —
// la gente se acostumbra a que "siempre da rojo" y ya nadie lo mira.
//
// Solo efectivo, a propósito. Un movimiento existe para cuadrar la gaveta, y por
// la gaveta solo pasan billetes: la tarjeta va por el datáfono y el SINPE por el
// teléfono. Un "movimiento de tarjeta" no tendría nada que cuadrar.

export type TipoMovimiento = 'ingreso' | 'retiro' | 'gasto'

export const TIPOS_MOVIMIENTO: {
  valor: TipoMovimiento
  etiqueta: string
  /** +1 si entra plata a la gaveta, −1 si sale. */
  signo: 1 | -1
  ayuda: string
}[] = [
  {
    valor: 'ingreso',
    etiqueta: 'Entra plata',
    signo: 1,
    ayuda: 'Cambio que se mete a media mañana, fondo extra.',
  },
  {
    valor: 'retiro',
    etiqueta: 'Retiro',
    signo: -1,
    // Sigue siendo plata del negocio: cambió de lugar, no se gastó. Por eso no
    // es lo mismo que un gasto, aunque las dos bajen la gaveta igual.
    ayuda: 'Plata que se saca y se guarda: a la caja fuerte, al banco.',
  },
  {
    valor: 'gasto',
    signo: -1,
    etiqueta: 'Gasto',
    ayuda: 'Se pagó algo con la plata de la gaveta: proveedor, mandado, taxi.',
  },
]

const SIGNOS: Record<string, number> = Object.fromEntries(
  TIPOS_MOVIMIENTO.map((t) => [t.valor, t.signo]),
)

/** Lo que un movimiento le suma (o le resta) a la gaveta. Un tipo raro no mueve nada. */
export function efectoEnGaveta(tipo: unknown, monto: unknown): number {
  const signo = SIGNOS[String(tipo)] ?? 0
  return signo * Math.max(0, Math.round(Number(monto) || 0))
}

export const ETIQUETA_MOVIMIENTO: Record<string, string> = Object.fromEntries(
  TIPOS_MOVIMIENTO.map((t) => [t.valor, t.etiqueta]),
)
