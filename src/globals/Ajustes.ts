import type { GlobalConfig } from 'payload'
import { publico, soloAdmin } from '@/lib/roles'

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
    read: publico,
    update: soloAdmin,
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
    {
      name: 'pedidosActivos',
      label: 'Aceptar pedidos en línea',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Apagar esto quita el botón de pedir del menú y rechaza cualquier pedido nuevo. Útil en hora pico, con poco personal o cuando se acabó el horno.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'pedidosDesde',
          label: 'Se aceptan pedidos desde',
          type: 'text',
          defaultValue: '06:00',
          admin: { width: '33%', description: 'Hora de Costa Rica, formato 24h (06:00).' },
        },
        {
          name: 'pedidosHasta',
          label: 'Hasta',
          type: 'text',
          defaultValue: '17:00',
          admin: { width: '33%', description: 'Fuera de esta ventana no se puede pedir.' },
        },
        {
          name: 'pedidosAnticipacionMin',
          label: 'Anticipación mínima (minutos)',
          type: 'number',
          defaultValue: 15,
          min: 0,
          admin: { width: '34%', description: 'Cuánto tiempo necesitan en barra antes del retiro.' },
        },
      ],
    },
    {
      name: 'tarifaIvaDefecto',
      label: 'Tarifa de IVA general (%)',
      type: 'number',
      required: true,
      defaultValue: 13,
      min: 0,
      max: 100,
      admin: {
        description:
          'Los precios de los productos se guardan SIN IVA. Esta tarifa es la que se les suma para mostrar el precio final en el menú. Un producto puede llevar otra tarifa si su código CABYS lo indica.',
      },
    },

    {
      name: 'cantidadMesas',
      label: 'Cantidad de mesas',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 0,
      max: 60,
      admin: {
        description:
          'Cuántas mesas tiene el salón. La caja las numera del 1 en adelante. Poner 0 si no se atienden mesas.',
      },
    },

    // ---------------- Tiquete de caja ----------------
    {
      type: 'collapsible',
      label: 'Tiquete de caja',
      admin: {
        description: 'Lo que sale impreso en el tiquete que se le entrega al cliente en el local.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'negocioNombreLegal',
              label: 'Nombre o razón social',
              type: 'text',
              defaultValue: 'Soul Cafe',
              admin: { width: '50%', description: 'Va en el encabezado del tiquete.' },
            },
            {
              name: 'cedulaJuridica',
              label: 'Cédula jurídica o física',
              type: 'text',
              admin: { width: '50%', description: 'Ej: 3-101-123456.' },
            },
          ],
        },
        {
          name: 'tiquetePie',
          label: 'Mensaje al pie',
          type: 'textarea',
          defaultValue: '¡Gracias por su visita!',
          admin: { description: 'Dos o tres líneas como mucho: el papel es angosto.' },
        },
      ],
    },
  ],
}
