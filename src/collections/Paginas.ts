import type { CollectionConfig } from 'payload'
import { publico, soloAdmin } from '@/lib/roles'

export const Paginas: CollectionConfig = {
  slug: 'paginas',

  labels: {
    singular: 'Página',
    plural: 'Páginas',
  },

  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'slug'],
    group: 'Contenido',
    description: 'Textos y SEO de cada página del sitio.',
  },

  access: {
    read: publico,
    create: soloAdmin,
    update: soloAdmin,
    delete: soloAdmin,
  },

  fields: [
    {
      name: 'titulo',
      label: 'Título interno',
      type: 'text',
      required: true,
      admin: { description: 'Solo para identificarla en el panel.' },
    },
    {
      name: 'slug',
      label: 'Identificador (URL)',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Ej: home, menu, visit.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenido',
          fields: [
            {
              name: 'contenido',
              label: 'Contenido',
              type: 'richText',
              localized: true,
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitulo',
              label: 'Meta título',
              type: 'text',
              localized: true,
              admin: { description: 'Máx. ~60 caracteres.' },
            },
            {
              name: 'metaDescripcion',
              label: 'Meta descripción',
              type: 'textarea',
              localized: true,
              admin: { description: 'Máx. ~155 caracteres.' },
            },
          ],
        },
      ],
    },
  ],
}
