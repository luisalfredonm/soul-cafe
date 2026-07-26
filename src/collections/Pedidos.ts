import type { CollectionConfig } from 'payload'

// Un pedido pagado en línea y retirado en el local.
//
// Regla de oro: cada línea GUARDA una copia del nombre, el precio neto, el CABYS
// y la tarifa que tenía el producto en el momento de la compra. No los lee por
// relación. Si los leyera, el día que se suba el precio del capuchino en el panel
// cambiarían de monto todos los pedidos viejos y dejarían de cuadrar con las
// facturas ya emitidas. Eso no se puede deshacer.
//
// Los totales NUNCA vienen del navegador: se recalculan en el servidor (ver hooks).

// Sin I, O, 0 ni 1: el código se dicta en voz alta y esos se confunden.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codigoRetiro() {
  let out = ''
  for (let i = 0; i < 4; i++) out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  return out
}

type Linea = {
  cantidad?: number | null
  precioUnitario?: number | null
  tarifaIva?: number | null
  subtotal?: number | null
  montoIva?: number | null
  total?: number | null
}

export const Pedidos: CollectionConfig = {
  slug: 'pedidos',

  labels: {
    singular: 'Pedido',
    plural: 'Pedidos',
  },

  admin: {
    useAsTitle: 'codigo',
    defaultColumns: ['codigo', 'estado', 'total', 'horaRetiro', 'facturaEmitida'],
    group: 'Pedidos',
    description: 'Pedidos pagados en línea para retirar en el local.',
  },

  // Un pedido tiene datos personales del cliente: no es público.
  // El checkout los crea desde el servidor con la API local de Payload,
  // que pasa por encima de este control. Así el navegador nunca puede
  // inventar precios ni crear pedidos a mano.
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },

  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data.codigo) {
          data.codigo = codigoRetiro()
        }

        // Recalcula todo desde las copias guardadas en cada línea.
        // El IVA se redondea por línea, como en una factura.
        const lineas = (Array.isArray(data.lineas) ? data.lineas : []) as Linea[]
        let subtotal = 0
        let totalIva = 0

        for (const l of lineas) {
          const cantidad = Number(l.cantidad) || 0
          const unitario = Number(l.precioUnitario) || 0
          const tarifa = Number(l.tarifaIva) || 0

          const neto = cantidad * unitario
          const iva = Math.round((neto * tarifa) / 100)

          l.subtotal = neto
          l.montoIva = iva
          l.total = neto + iva

          subtotal += neto
          totalIva += iva
        }

        data.subtotal = subtotal
        data.totalIva = totalIva
        data.total = subtotal + totalIva

        return data
      },
    ],
  },

  fields: [
    {
      name: 'codigo',
      label: 'Código de retiro',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Se genera solo. Es el que se le canta al cliente.',
      },
    },
    {
      name: 'estado',
      label: 'Estado',
      type: 'select',
      required: true,
      defaultValue: 'nuevo',
      options: [
        { label: 'Nuevo', value: 'nuevo' },
        { label: 'En preparación', value: 'preparando' },
        { label: 'Listo para retirar', value: 'listo' },
        { label: 'Entregado', value: 'entregado' },
        { label: 'Cancelado', value: 'cancelado' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'horaRetiro',
      label: 'Hora de retiro',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
      },
    },

    // ---------------- Cliente ----------------
    {
      type: 'collapsible',
      label: 'Cliente',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'clienteNombre', label: 'Nombre', type: 'text', required: true, admin: { width: '50%' } },
            { name: 'clienteTelefono', label: 'Teléfono / WhatsApp', type: 'text', required: true, admin: { width: '50%' } },
          ],
        },
        {
          name: 'clienteEmail',
          label: 'Correo',
          type: 'email',
          admin: { description: 'A donde se le manda la confirmación y, si la pidió, la factura.' },
        },
        {
          name: 'notas',
          label: 'Notas del cliente',
          type: 'textarea',
          admin: { description: 'Lo que haya escrito al hacer el pedido. Ej: sin azúcar, para llevar.' },
        },
      ],
    },

    // ---------------- Líneas ----------------
    {
      name: 'lineas',
      label: 'Líneas del pedido',
      type: 'array',
      minRows: 1,
      required: true,
      labels: { singular: 'Línea', plural: 'Líneas' },
      admin: {
        description:
          'Los montos se recalculan solos al guardar. Los datos del producto quedan congelados al momento de la compra.',
      },
      fields: [
        {
          name: 'producto',
          label: 'Producto',
          type: 'relationship',
          relationTo: 'productos',
          admin: { description: 'Solo de referencia. Los montos salen de los campos de abajo.' },
        },
        {
          type: 'row',
          fields: [
            { name: 'nombre', label: 'Nombre en el momento', type: 'text', required: true, admin: { width: '60%' } },
            { name: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: 1, defaultValue: 1, admin: { width: '40%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'precioUnitario',
              label: 'Precio unitario sin IVA',
              type: 'number',
              required: true,
              min: 0,
              admin: { width: '34%' },
            },
            { name: 'tarifaIva', label: 'Tarifa IVA (%)', type: 'number', required: true, min: 0, max: 100, admin: { width: '33%' } },
            { name: 'cabys', label: 'CABYS', type: 'text', admin: { width: '33%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'subtotal', label: 'Neto', type: 'number', admin: { width: '33%', readOnly: true } },
            { name: 'montoIva', label: 'IVA', type: 'number', admin: { width: '33%', readOnly: true } },
            { name: 'total', label: 'Total línea', type: 'number', admin: { width: '34%', readOnly: true } },
          ],
        },
      ],
    },

    // ---------------- Totales ----------------
    {
      type: 'row',
      fields: [
        { name: 'subtotal', label: 'Subtotal sin IVA', type: 'number', admin: { width: '33%', readOnly: true } },
        { name: 'totalIva', label: 'IVA', type: 'number', admin: { width: '33%', readOnly: true } },
        { name: 'total', label: 'Total pagado', type: 'number', admin: { width: '34%', readOnly: true } },
      ],
    },

    // ---------------- Pago ----------------
    {
      type: 'collapsible',
      label: 'Pago',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'pagoEstado',
              label: 'Estado del pago',
              type: 'select',
              required: true,
              defaultValue: 'pendiente',
              options: [
                { label: 'Pendiente', value: 'pendiente' },
                { label: 'Pagado', value: 'pagado' },
                { label: 'Fallido', value: 'fallido' },
                { label: 'Reembolsado', value: 'reembolsado' },
              ],
              admin: { width: '50%' },
            },
            { name: 'pagoFecha', label: 'Fecha del pago', type: 'date', admin: { width: '50%' } },
          ],
        },
        {
          name: 'pagoProveedor',
          label: 'Procesador usado',
          type: 'text',
          admin: {
            description:
              'Qué pasarela cobró este pedido. Queda guardado por pedido: si mañana se cambia de proveedor, los pedidos viejos siguen siendo rastreables contra el sistema que los cobró.',
          },
        },
        {
          name: 'pagoReferencia',
          label: 'Referencia de la pasarela',
          type: 'text',
          admin: { description: 'El identificador que devuelve el procesador. Sirve para reclamos y reembolsos.' },
        },
      ],
    },

    // ---------------- Facturación (manual, por fuera) ----------------
    {
      type: 'collapsible',
      label: 'Facturación',
      admin: {
        description:
          'La factura se emite por fuera, en otro sistema. Aquí solo queda el registro de que ya se hizo.',
      },
      fields: [
        {
          name: 'requiereFactura',
          label: 'El cliente pidió factura a su nombre',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Si no, va tiquete.' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'facturaNombre',
              label: 'Nombre o razón social',
              type: 'text',
              admin: { width: '50%', condition: (data) => Boolean(data?.requiereFactura) },
            },
            {
              name: 'facturaCedula',
              label: 'Cédula',
              type: 'text',
              admin: { width: '50%', condition: (data) => Boolean(data?.requiereFactura) },
            },
          ],
        },
        {
          name: 'facturaEmitida',
          label: 'Ya se emitió en el otro sistema',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'facturaConsecutivo',
          label: 'Consecutivo del comprobante',
          type: 'text',
          admin: {
            description: 'El número que dio el otro sistema. Deja rastro para cuadrar contra este pedido.',
            condition: (data) => Boolean(data?.facturaEmitida),
          },
        },
      ],
    },
  ],
}
