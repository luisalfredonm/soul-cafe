import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { Productos } from './collections/Productos'
import { Categorias } from './collections/Categorias'
import { Paginas } from './collections/Paginas'
import { Media } from './collections/Media'
import { Usuarios } from './collections/Usuarios'
import { Pedidos } from './collections/Pedidos'
import { Cajas } from './collections/Cajas'
import { Movimientos } from './collections/Movimientos'
import { Ajustes } from './globals/Ajustes'
import { Destacados } from './globals/Destacados'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // El panel del dueño vive en /admin
  admin: {
    user: Usuarios.slug,
    meta: {
      titleSuffix: '· Soul Cafe',
    },
  },

  // Español e inglés, con español como idioma por defecto del contenido
  localization: {
    locales: [
      { label: 'Español', code: 'es' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'es',
    fallback: true,
  },

  // Idioma del propio panel de administración
  i18n: {
    fallbackLanguage: 'es',
  },

  collections: [Productos, Categorias, Paginas, Media, Usuarios, Pedidos, Cajas, Movimientos],
  globals: [Ajustes, Destacados],

  // Nunca quedarse sin administrador.
  //
  // Cuando se agregó el campo `rol`, Postgres rellenó las filas que ya existían
  // con el valor por defecto ("cajero"). Es decir: al migrar, la cuenta del
  // dueño se degradó sola y se quedó sin poder tocar precios ni usuarios. Sin
  // esta comprobación no habría manera de arreglarlo desde el panel, porque
  // cambiar roles también es cosa de un admin.
  //
  // Se corre en cada arranque, cuesta una consulta y solo hace algo si de
  // verdad no queda ningún admin.
  onInit: async (payload) => {
    const admins = await payload.count({
      collection: 'usuarios',
      where: { rol: { equals: 'admin' } },
    })
    if (admins.totalDocs > 0) return

    const primero = await payload.find({ collection: 'usuarios', sort: 'createdAt', limit: 1 })
    const usuario = primero.docs[0]
    if (!usuario) return

    await payload.update({
      collection: 'usuarios',
      id: usuario.id,
      data: { rol: 'admin' },
      overrideAccess: true,
    })
    payload.logger.info(`No había ningún administrador: se le dio el rol a ${usuario.email}.`)
  },

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),

  sharp: (await import('sharp')).default,

  upload: {
    limits: {
      fileSize: 5_000_000, // 5 MB por archivo
    },
  },
})
