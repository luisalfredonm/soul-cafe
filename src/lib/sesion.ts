import { headers as nextHeaders } from 'next/headers'
import { getPayloadClient } from './payload'
import { esAdmin } from './roles'

// Lee el usuario de la sesión de Payload desde el lado servidor.
//
// El POS no tiene login propio: reusa la cookie que pone `/admin`. Es el mismo
// dominio y el mismo sistema de usuarios, así que un cajero entra una sola vez.

export type UsuarioSesion = {
  id: number
  email: string
  nombre?: string | null
  rol?: string | null
}

export async function usuarioActual(): Promise<UsuarioSesion | null> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user || user.collection !== 'usuarios') return null
  return user as unknown as UsuarioSesion
}

export class ErrorSesion extends Error {
  constructor(public codigo: 'sin-sesion' | 'sin-permiso', mensaje: string) {
    super(mensaje)
    this.name = 'ErrorSesion'
  }
}

/**
 * Para usar al principio de CADA server action del POS.
 *
 * Proteger la pantalla no alcanza: una server action es un endpoint público que
 * cualquiera puede llamar con el id de la acción. La verificación va acá, del
 * lado servidor, no en el componente que la invoca.
 */
export async function exigirPersonal(): Promise<UsuarioSesion> {
  const user = await usuarioActual()
  if (!user) throw new ErrorSesion('sin-sesion', 'Hay que iniciar sesión.')
  return user
}

export async function exigirAdmin(): Promise<UsuarioSesion> {
  const user = await exigirPersonal()
  if (!esAdmin(user)) {
    throw new ErrorSesion('sin-permiso', 'Esta acción es solo para administradores.')
  }
  return user
}
