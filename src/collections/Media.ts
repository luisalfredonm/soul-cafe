import type { CollectionConfig } from 'payload'
import { publico, soloAdmin } from '@/lib/roles'

export const Media: CollectionConfig = {
  slug: 'media',

  labels: {
    singular: 'Imagen',
    plural: 'Imágenes',
  },

  admin: {
    group: 'Contenido',
  },

  access: {
    read: publico,
    create: soloAdmin,
    update: soloAdmin,
    delete: soloAdmin,
  },

  upload: {
    // Tamaños que Next.js sirve según el dispositivo
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 576, position: 'centre' },
      { name: 'hero', width: 1600, height: undefined, position: 'centre' },
      // Vertical, para las fotos de bebidas. Los tamaños de arriba son 4:3 y
      // recortan al centro: a una foto de taza en vertical le cortarían la taza.
      { name: 'retrato', width: 800, height: 1200, position: 'centre' },
    ],
    focalPoint: true,
    mimeTypes: ['image/*'],
  },

  fields: [
    {
      name: 'alt',
      label: 'Texto alternativo',
      type: 'text',
      localized: true,
      admin: {
        description: 'Describe la imagen para accesibilidad y SEO.',
      },
    },
  ],
}
