import type { CollectionConfig } from 'payload'
import { conSesion, soloAdmin } from '@/lib/roles'

// Un turno de caja: se abre con un fondo, se cobra durante el día, se cierra
// contando la plata.
//
// El arqueo es lo que convierte una lista de ventas en un POS. Al cerrar se
// congelan los totales del turno (efectivo, tarjeta, SINPE) y se compara lo
// contado contra lo esperado. La diferencia queda guardada: si falta plata, se
// ve, y si sobra también.
//
// Los totales los calcula `lib/caja.ts` sumando los pedidos del turno. Acá solo
// se guardan y se saca la diferencia.

export const Cajas: CollectionConfig = {
  slug: 'cajas',

  labels: {
    singular: 'Turno de caja',
    plural: 'Cajas',
  },

  admin: {
    useAsTitle: 'aperturaFecha',
    defaultColumns: ['aperturaFecha', 'estado', 'abiertaPor', 'totalVentas', 'diferencia'],
    group: 'Pedidos',
    description: 'Turnos de caja del local: apertura, cierre y arqueo.',
  },

  access: {
    read: conSesion,
    create: conSesion,
    update: conSesion,
    // Borrar un turno borraría el rastro del arqueo.
    delete: soloAdmin,
  },

  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          // Dos cajas abiertas a la vez harían que las ventas cayeran en
          // cualquiera de las dos y ningún arqueo cerraría.
          const abiertas = await req.payload.count({
            collection: 'cajas',
            where: { estado: { equals: 'abierta' } },
          })
          if (abiertas.totalDocs > 0) {
            throw new Error('Ya hay una caja abierta. Hay que cerrarla antes de abrir otra.')
          }
          data.aperturaFecha = data.aperturaFecha || new Date().toISOString()
        }

        if (data.estado === 'cerrada') {
          data.cierreFecha = data.cierreFecha || new Date().toISOString()
          // Lo esperado en la gaveta: el fondo, más lo que entró en efectivo,
          // más lo que se metió a mano, menos lo que se sacó. Tarjeta y SINPE no
          // pasan por ahí, así que no cuentan.
          const esperado =
            (Number(data.fondoInicial) || 0) +
            (Number(data.totalEfectivo) || 0) +
            (Number(data.totalIngresos) || 0) -
            (Number(data.totalSalidas) || 0)
          data.esperadoEfectivo = esperado
          data.diferencia = (Number(data.efectivoContado) || 0) - esperado
        }

        return data
      },
    ],
  },

  fields: [
    {
      name: 'estado',
      label: 'Estado',
      type: 'select',
      required: true,
      defaultValue: 'abierta',
      options: [
        { label: 'Abierta', value: 'abierta' },
        { label: 'Cerrada', value: 'cerrada' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'abiertaPor',
      label: 'Abierta por',
      type: 'relationship',
      relationTo: 'usuarios',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'cerradaPor',
      label: 'Cerrada por',
      type: 'relationship',
      relationTo: 'usuarios',
      admin: { position: 'sidebar', readOnly: true },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'aperturaFecha',
          label: 'Apertura',
          type: 'date',
          admin: {
            width: '50%',
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
          },
        },
        {
          name: 'cierreFecha',
          label: 'Cierre',
          type: 'date',
          admin: {
            width: '50%',
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
          },
        },
      ],
    },

    {
      type: 'row',
      fields: [
        {
          name: 'fondoInicial',
          label: 'Fondo inicial',
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 0,
          admin: { width: '50%', description: 'La plata con la que arranca la gaveta.' },
        },
        {
          name: 'efectivoContado',
          label: 'Efectivo contado al cerrar',
          type: 'number',
          min: 0,
          admin: { width: '50%', description: 'Lo que de verdad había en la gaveta.' },
        },
      ],
    },

    // ---------------- Arqueo (se llena al cerrar) ----------------
    {
      type: 'collapsible',
      label: 'Arqueo',
      admin: { description: 'Se calcula solo al cerrar el turno, sumando los pedidos cobrados en él.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'totalEfectivo', label: 'Efectivo', type: 'number', admin: { width: '25%', readOnly: true } },
            { name: 'totalTarjeta', label: 'Tarjeta', type: 'number', admin: { width: '25%', readOnly: true } },
            { name: 'totalSinpe', label: 'SINPE', type: 'number', admin: { width: '25%', readOnly: true } },
            { name: 'totalLinea', label: 'En línea', type: 'number', admin: { width: '25%', readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'cantidadVentas', label: 'Ventas', type: 'number', admin: { width: '33%', readOnly: true } },
            { name: 'totalVentas', label: 'Total vendido', type: 'number', admin: { width: '33%', readOnly: true } },
            {
              name: 'esperadoEfectivo',
              label: 'Esperado en gaveta',
              type: 'number',
              admin: {
                width: '34%',
                readOnly: true,
                description: 'Fondo + efectivo cobrado + lo que entró − lo que salió.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'totalIngresos',
              label: 'Entró a la gaveta',
              type: 'number',
              admin: {
                width: '50%',
                readOnly: true,
                description: 'Cambio o fondo extra que se metió durante el turno.',
              },
            },
            {
              name: 'totalSalidas',
              label: 'Salió de la gaveta',
              type: 'number',
              admin: {
                width: '50%',
                readOnly: true,
                description: 'Retiros y gastos pagados con la plata de la caja.',
              },
            },
          ],
        },

        // Se congelan al cerrar por la misma razón que los de arriba: el cierre Z
        // es un documento de auditoría y tiene que decir lo mismo hoy que dentro
        // de un año. Si se recalcularan al reimprimirlo, una venta anulada la
        // semana que viene cambiaría el papel de un turno ya cerrado.
        {
          type: 'row',
          fields: [
            { name: 'totalBruto', label: 'Neto antes de descuento', type: 'number', admin: { width: '33%', readOnly: true } },
            { name: 'totalDescuentos', label: 'Descuentos', type: 'number', admin: { width: '33%', readOnly: true } },
            { name: 'totalIva', label: 'IVA cobrado', type: 'number', admin: { width: '34%', readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'cantidadAnuladas',
              label: 'Anuladas',
              type: 'number',
              admin: { width: '50%', readOnly: true, description: 'Cuántas se anularon durante el turno.' },
            },
            {
              name: 'totalAnulado',
              label: 'Monto anulado',
              type: 'number',
              admin: { width: '50%', readOnly: true, description: 'No sale del total vendido: nunca entró.' },
            },
          ],
        },
        {
          name: 'diferencia',
          label: 'Diferencia',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Contado menos esperado. Negativo es faltante; positivo, sobrante.',
          },
        },
      ],
    },

    {
      name: 'notas',
      label: 'Notas del cierre',
      type: 'textarea',
      admin: { description: 'Por qué hubo diferencia, incidencias del turno, lo que sea.' },
    },
  ],
}
