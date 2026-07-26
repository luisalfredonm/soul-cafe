import type { CollectionConfig } from 'payload'

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
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },

  upload: {
    // Tamaños que Next.js sirve según el dispositivo
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 576, position: 'centre' },
      { name: 'hero', width: 1600, height: undefined, position: 'centre' },
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
