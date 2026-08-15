import type { Access } from 'payload'

// Quién puede hacer qué en el panel y en el POS.
//
// Este archivo lo importan las colecciones, así que no puede tocar `next/headers`
// ni nada atado a una petición: la configuración de Payload se carga fuera de ese
// contexto. Para leer el usuario de la sesión está `lib/sesion.ts`.

export type Rol = 'admin' | 'cajero'

// Payload tipa `req.user` de forma amplia; acá solo interesa el rol.
type ConRol = { rol?: string | null } | null | undefined

/**
 * Un usuario SIN rol cuenta como admin: red de seguridad para filas viejas que
 * quedaran con la columna en null. Quedarse fuera del propio panel es peor que
 * un permiso de más en una cuenta que ya tenía acceso total.
 *
 * Que no falte nunca un administrador lo garantiza el `onInit` de
 * `payload.config.ts`; esto es el segundo cinturón.
 */
export function esAdmin(user: ConRol): boolean {
  if (!user) return false
  return !user.rol || user.rol === 'admin'
}

/** Cualquiera con sesión en el panel: admin o cajero. */
export function esPersonal(user: unknown): boolean {
  return Boolean(user)
}

// ---- Atajos para el campo `access` de las colecciones ----

/** Lo lee cualquiera, incluso sin sesión. Para el contenido del sitio público. */
export const publico: Access = () => true

/** Requiere sesión, sin importar el rol. */
export const conSesion: Access = ({ req }) => esPersonal(req.user)

/** Solo admin. Para precios, contenido, usuarios y borrados. */
export const soloAdmin: Access = ({ req }) => esAdmin(req.user as ConRol)
