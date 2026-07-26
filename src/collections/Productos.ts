import type { CollectionConfig } from 'payload'

export const Productos: CollectionConfig = {
  slug: 'productos',

  labels: {
    singular: 'Producto',
    plural: 'Productos',
  },

  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'categoria', 'precio', 'agotado'],
    group: 'Menú',
    description: 'Bebidas y repostería que aparecen en el menú del sitio.',
  },

  // Cualquiera puede leer el menú (es un sitio público);
  // solo usuarios del panel pueden crear, editar o borrar.
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
      localized: true, // Payload muestra una pestaña ES / EN
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      localized: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'precio',
          label: 'Precio (colones)',
          type: 'number',
          required: true,
          min: 0,
          admin: { width: '50%' },
        },
        {
          name: 'categoria',
          label: 'Categoría',
          type: 'relationship',
          relationTo: 'categorias',
          required: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'etiquetas',
      label: 'Etiquetas dietéticas',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Vegano', value: 'vegan' },
        { label: 'Sin gluten', value: 'gf' },
        { label: 'Sin café', value: 'nocoffee' },
      ],
      admin: {
        description: 'Se muestran como filtros en el menú.',
      },
    },
    {
      name: 'foto',
      label: 'Foto',
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'agotado',
          label: 'Agotado hoy',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '50%',
            description: 'Si se marca, desaparece del sitio.',
          },
        },
        {
          name: 'destacado',
          label: 'Destacado',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '50%',
            description: 'Aparece primero dentro de su categoría.',
          },
        },
      ],
    },
    {
      name: 'orden',
      label: 'Orden dentro de la categoría',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Número más bajo aparece primero. Empatan por nombre.',
        position: 'sidebar',
      },
    },
    {
      name: 'cabys',
      label: 'Código CABYS',
      type: 'text',
      admin: {
        position: 'sidebar',
        description:
          'Código de Hacienda (13 dígitos). Necesario para facturar en la fase 2; se puede dejar vacío por ahora.',
      },
    },
    {
      name: 'tarifaIva',
      label: 'Tarifa de IVA propia (%)',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        position: 'sidebar',
        description:
          'Dejar vacío para usar la tarifa general de Ajustes. Llenar solo si el CABYS de este producto tiene otra tarifa (por ejemplo, algo de canasta básica).',
      },
    },
    {
      // Preparado para la fase de delivery. Sin uso en fase 1.
      name: 'disponibleDelivery',
      label: 'Se puede enviar a domicilio',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Reservado para el futuro. Marcar solo lo que viaja bien: grano, cold brew, repostería.',
      },
    },
  ],
}
