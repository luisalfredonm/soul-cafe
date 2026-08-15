import type { CollectionConfig } from 'payload'
import { conSesion, soloAdmin } from '@/lib/roles'
import { TIPOS_MOVIMIENTO } from '@/lib/movimientos'

// Plata que entra o sale de la gaveta sin ser una venta.
//
// Cada movimiento queda pegado al turno en que se hizo y entra en su arqueo. El
// motivo es obligatorio: un retiro sin explicación es indistinguible de un
// faltante, que es precisamente lo que este registro viene a evitar.
//
// Lo puede registrar cualquiera del personal, no solo el admin. Es a propósito:
// el proveedor de la leche llega a media mañana y le cobra a quien esté en la
// barra. Si hiciera falta el dueño para anotarlo, no se anotaría y volveríamos
// al faltante inexplicable.
//
// Eso sí: todo movimiento sale con nombre y apellido en el cierre Z y en los
// reportes. La defensa contra el que se quiera llevar plata inventando un retiro
// no es prohibirlo —haría el sistema inusable— sino que quede a la vista.
//
// Editar y borrar son solo del admin: si un cajero pudiera corregir su propio
// retiro después, el registro no probaría nada.

export const Movimientos: CollectionConfig = {
  slug: 'movimientos',

  labels: {
    singular: 'Movimiento de caja',
    plural: 'Movimientos de caja',
  },

  admin: {
    useAsTitle: 'motivo',
    defaultColumns: ['fecha', 'tipo', 'monto', 'motivo', 'registradoPor'],
    group: 'Pedidos',
    description: 'Efectivo que entra o sale de la gaveta sin ser una venta.',
  },

  access: {
    read: conSesion,
    create: conSesion,
    update: soloAdmin,
    delete: soloAdmin,
  },

  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create') {
          data.fecha = data.fecha || new Date().toISOString()
        }
        // El signo lo pone el tipo, no el número. Guardar montos negativos
        // dejaría dos formas de escribir la misma salida de plata y cualquier
        // suma tendría que adivinar cuál está usando cada fila.
        data.monto = Math.max(0, Math.round(Number(data.monto) || 0))
        return data
      },
    ],
  },

  fields: [
    {
      name: 'caja',
      label: 'Turno de caja',
      type: 'relationship',
      relationTo: 'cajas',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'En qué turno se movió la plata. Es lo que lo mete en el arqueo.',
      },
    },
    {
      name: 'registradoPor',
      label: 'Registrado por',
      type: 'relationship',
      relationTo: 'usuarios',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'fecha',
      label: 'Fecha',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
      },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          defaultValue: 'gasto',
          options: TIPOS_MOVIMIENTO.map((t) => ({ label: t.etiqueta, value: t.valor })),
          admin: { width: '50%' },
        },
        {
          name: 'monto',
          label: 'Monto',
          type: 'number',
          required: true,
          min: 1,
          admin: {
            width: '50%',
            description: 'Siempre en positivo. Si entra o sale lo decide el tipo.',
          },
        },
      ],
    },
    {
      name: 'motivo',
      label: 'Motivo',
      type: 'text',
      required: true,
      admin: {
        description:
          'Obligatorio. Un retiro sin explicación es indistinguible de un faltante. Ej: "pago leche Dos Pinos", "cambio para la gaveta".',
      },
    },
  ],
}
