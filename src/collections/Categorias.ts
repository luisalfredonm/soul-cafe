import type { CollectionConfig } from 'payload'

export const Categorias: CollectionConfig = {
  slug: 'categorias',

  labels: {
    singular: 'Categoría',
    plural: 'Categorías',
  },

  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'orden'],
    group: 'Menú',
    description: 'Secciones del menú: barra de espresso, del horno, etc.',
  },

  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },

  fields: [
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      label: 'Identificador (URL)',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Sin espacios ni tildes. Ej: espresso, del-horno.',
      },
    },
    {
      name: 'nota',
      label: 'Nota de la sección',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Texto corto bajo el título de la sección. Opcional.',
      },
    },
    {
      name: 'orden',
      label: 'Orden',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Número más bajo aparece primero.',
      },
    },
  ],
}
