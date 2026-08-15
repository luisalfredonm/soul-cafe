import type { GlobalConfig } from 'payload'

// Las fotos de bebidas que salen en la página principal.
//
// Cada foto se ata a un producto del menú en vez de escribirle el nombre y el
// precio a mano. Así no hay dos verdades: si el precio cambia en el menú, la
// foto lo refleja sola. Escribir el precio aquí garantizaría que algún día
// quede viejo y contradiga la carta.
export const Destacados: GlobalConfig = {
  slug: 'destacados',
  label: 'Cafés destacados',

  admin: {
    group: 'Contenido',
    description: 'Las fotos de bebidas que aparecen en la página principal.',
  },

  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },

  fields: [
    {
      name: 'activo',
      label: 'Mostrar la sección en la página principal',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Apagalo si todavía no hay fotos buenas. Sin fotos la sección no aparece igual.',
      },
    },
    {
      name: 'titulo',
      label: 'Título de la sección',
      type: 'text',
      localized: true,
      admin: { description: 'Ej: "Lo que más pedimos".' },
    },
    {
      name: 'items',
      label: 'Fotos',
      type: 'array',
      maxRows: 4,
      labels: { singular: 'Foto', plural: 'Fotos' },
      admin: {
        description:
          'Tres funciona mejor que cuatro: llena la fila en pantalla grande sin obligar a bajar. Usá fotos verticales.',
      },
      fields: [
        {
          name: 'imagen',
          label: 'Foto',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: { description: 'Vertical. Acordate de escribirle el texto alternativo a la imagen.' },
        },
        {
          name: 'producto',
          label: 'Producto del menú',
          type: 'relationship',
          relationTo: 'productos',
          admin: {
            description: 'De aquí salen el nombre y el precio. Así nunca contradicen a la carta.',
          },
        },
        {
          name: 'titulo',
          label: 'Nombre a mano',
          type: 'text',
          localized: true,
          admin: { description: 'Solo si la foto no corresponde a un producto del menú.' },
        },
        {
          name: 'nota',
          label: 'Una línea',
          type: 'text',
          localized: true,
          admin: { description: 'Corta y honesta. Ej: "Doble shot y microespuma fina."' },
        },
      ],
    },
  ],
}
