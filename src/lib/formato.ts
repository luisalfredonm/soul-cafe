// Formato de plata y de horas, en un solo lugar.
//
// Todo se muestra en colones enteros: acá no se usan céntimos, y un tiquete con
// decimales solo confunde al que lo lee.
//
// Este archivo no importa nada a propósito: lo usan tanto componentes de cliente
// como el servidor, y arrastrar la configuración de Payload al navegador por una
// función de formateo sería absurdo.

// Costa Rica no tiene horario de verano, pero el servidor sí puede correr en UTC
// (Vercel lo hace). Sin fijar la zona, las horas se corren seis.
export const ZONA = 'America/Costa_Rica'

/**
 * Colones con punto de millar: ₡33.787.
 *
 * A mano y no con `toLocaleString('es-CR')` por dos razones. Una, que según la
 * versión de ICU esa función devuelve "33 787" con un espacio fino, que no es
 * como se escribe la plata en Costa Rica. Y dos, que el servidor y el navegador
 * pueden traer versiones distintas de ICU: si difieren, React se queja de que el
 * HTML no coincide. Formateado así, siempre da lo mismo en los dos lados.
 */
export function money(n: unknown): string {
  const v = Math.round(Number(n) || 0)
  const cuerpo = Math.abs(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (v < 0 ? '-' : '') + '₡' + cuerpo
}

/** Solo la hora, como "14:35". Siempre en hora de Costa Rica. */
export function hora(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/** Fecha y hora, como "31/07/2026 14:35". */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: ZONA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/** El día calendario en Costa Rica, como "2026-08-02". Sirve para comparar. */
export function diaEnCostaRica(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** ¿Esto es de hoy? "Hoy" es el día del local, no el del servidor. */
export function esDeHoy(iso?: string | null): boolean {
  return Boolean(iso) && diaEnCostaRica(iso) === diaEnCostaRica()
}

/**
 * Las 00:00 de un día de Costa Rica, en formato ISO, para filtrar en la base.
 * El país no tiene horario de verano, así que el desfase es -06:00 siempre.
 */
export function inicioDelDia(dia: string): string {
  return `${dia}T00:00:00.000-06:00`
}

/** El último instante de un día de Costa Rica. Para el extremo cerrado de un rango. */
export function finDelDia(dia: string): string {
  return `${dia}T23:59:59.999-06:00`
}

export function inicioDeHoyEnCostaRica(): string {
  return inicioDelDia(diaEnCostaRica())
}

/**
 * Suma (o resta) días a un "2026-08-03" y devuelve otro igual.
 *
 * Se ancla al mediodía UTC a propósito: desde ahí, sumar días nunca cruza a otra
 * fecha por el desfase horario. Anclando a medianoche, un `-06:00` se comería un
 * día en cuanto se formateara de vuelta.
 */
export function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return dia
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** El primer día del mes al que pertenece `dia`. */
export function inicioDeMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`
}

/** Fecha sola, como "03/08/2026". Para encabezados de reporte. */
export function fechaCorta(dia: string): string {
  const [a, m, d] = dia.split('-')
  return d && m && a ? `${d}/${m}/${a}` : dia
}

/** ¿Es un día bien escrito, tipo "2026-08-03"? */
export function esDiaValido(dia: unknown): dia is string {
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false
  const d = new Date(`${dia}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dia
}

export const NOMBRE_MEDIO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  sinpe: 'SINPE',
  linea: 'En línea',
}
