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
import { Ajustes } from './globals/Ajustes'

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

  collections: [Productos, Categorias, Paginas, Media, Usuarios, Pedidos],
  globals: [Ajustes],

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
