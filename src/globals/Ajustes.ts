import type { GlobalConfig } from 'payload'

// Un "global" es un único registro editable (no una lista).
// Aquí viven los datos del negocio que aparecen en varias páginas:
// cambiar el horario acá lo cambia en todo el sitio a la vez.
export const Ajustes: GlobalConfig = {
  slug: 'ajustes',
  label: 'Datos del negocio',

  admin: {
    group: 'Ajustes',
    description: 'Horarios, contacto y ubicación. Se usan en todo el sitio.',
  },

  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },

  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'horaApertura',
          label: 'Hora de apertura',
          type: 'text',
          defaultValue: '6:30',
          admin: { width: '50%' },
        },
        {
          name: 'whatsapp',
          label: 'WhatsApp',
          type: 'text',
          defaultValue: '+506 0000 0000',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'horarioSemana',
      label: 'Horario entre semana',
      type: 'text',
      localized: true,
      defaultValue: 'Lun–Vie 6:30 – 18:00',
    },
    {
      name: 'horarioFinde',
      label: 'Horario de fin de semana',
      type: 'text',
      localized: true,
      defaultValue: 'Sáb–Dom 6:30 – 16:00',
    },
    {
      name: 'direccion',
      label: 'Dirección',
      type: 'text',
      localized: true,
      defaultValue: '200 m norte del semáforo de Huacas',
    },
    {
      name: 'mapsUrl',
      label: 'Enlace de Google Maps',
      type: 'text',
      defaultValue: 'https://maps.google.com/?q=Huacas+Guanacaste',
    },
    {
      name: 'instagram',
      label: 'Instagram (usuario)',
      type: 'text',
      admin: { description: 'Sin la arroba. Ej: soulcafe.cr' },
    },
  ],
}
