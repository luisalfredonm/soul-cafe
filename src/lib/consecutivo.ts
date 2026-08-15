import type { Payload } from 'payload'

// Numeración del libro de ventas.
//
// El `codigo` de 4 letras sirve para cantar un pedido en voz alta, pero se
// repite y no ordena nada. Para cuadrar caja hace falta un consecutivo de
// verdad, y este es el que lo da.
//
// No se usa una secuencia de Postgres a propósito: quedaría por fuera de Payload
// y habría que mantenerla a mano en cada despliegue. En su lugar se lee el último
// número y se reintenta si dos ventas simultáneas piden el mismo. El campo
// `numero` es UNIQUE, así que la base es la que arbitra: nunca se cuelan dos
// ventas con el mismo número, en el peor caso una reintenta.

const INTENTOS = 5

/**
 * El número que sigue. Puede quedar viejo si hay otra venta en curso.
 *
 * El `exists` no sobra: los pedidos anteriores a que existiera este campo tienen
 * `numero` en null, y Postgres ordena los nulls PRIMERO cuando se ordena
 * descendente. Sin filtrarlos, esta función devuelve siempre 1 y cada venta
 * choca contra el número de la primera.
 */
export async function siguienteNumero(payload: Payload): Promise<number> {
  const ultimo = await payload.find({
    collection: 'pedidos',
    where: { numero: { exists: true } },
    sort: '-numero',
    limit: 1,
    depth: 0,
  })
  return (Number(ultimo.docs[0]?.numero) || 0) + 1
}

/**
 * ¿Falló porque el número ya estaba tomado?
 *
 * Se mira la forma del error, no su texto: Payload traduce el choque del índice
 * a un error de validación cuyo mensaje depende del idioma del panel, así que
 * buscar palabras sueltas ahí dentro es frágil.
 */
function esChoqueDeNumero(e: unknown, profundidad = 0): boolean {
  if (!e || typeof e !== 'object' || profundidad > 3) return false

  const err = e as {
    code?: string
    cause?: unknown
    data?: { errors?: { path?: string }[] }
  }

  // Postgres crudo.
  if (err.code === '23505') return true

  // ValidationError de Payload sobre el campo único.
  if (Array.isArray(err.data?.errors) && err.data.errors.some((x) => x?.path === 'numero')) {
    return true
  }

  // A veces viene envuelto en otro error.
  return err.cause !== e ? esChoqueDeNumero(err.cause, profundidad + 1) : false
}

/**
 * Crea algo asignándole el consecutivo, reintentando si alguien se le adelantó.
 * Cualquier otro error se deja pasar sin tocar: solo se reintenta la colisión.
 */
export async function conNumeroDeVenta<T>(
  payload: Payload,
  crear: (numero: number) => Promise<T>,
): Promise<T> {
  let ultimoError: unknown

  for (let intento = 0; intento < INTENTOS; intento++) {
    const numero = (await siguienteNumero(payload)) + intento
    try {
      return await crear(numero)
    } catch (e) {
      if (!esChoqueDeNumero(e)) throw e
      ultimoError = e
    }
  }

  throw ultimoError instanceof Error
    ? ultimoError
    : new Error('No se pudo asignar el número de venta.')
}
