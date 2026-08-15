import type { CollectionConfig } from 'payload'
import { conSesion, soloAdmin } from '@/lib/roles'
import { money } from '@/lib/formato'
import { aplicarPagos, calcularTotales, type LineaCalculable } from '@/lib/totales'

// Una venta. Da igual si entró por la web o por la caja del local: es la misma
// tabla, con el campo `canal` para distinguirlas. Un solo libro de ventas.
//
// Regla de oro: cada línea GUARDA una copia del nombre, el precio neto, el CABYS
// y la tarifa que tenía el producto en el momento de la compra. No los lee por
// relación. Si los leyera, el día que se suba el precio del capuchino en el panel
// cambiarían de monto todos los pedidos viejos y dejarían de cuadrar con las
// facturas ya emitidas. Eso no se puede deshacer.
//
// Los totales NUNCA vienen del navegador: se recalculan en el servidor (ver hooks).
//
// Una vez cobrada, la venta queda BLOQUEADA: ni las líneas ni el descuento se
// pueden tocar. Si hay que corregir algo, se anula y se hace una venta nueva.
//
// Las mesas no tienen colección propia ni estado aparte: una cuenta abierta es
// simplemente una venta con `mesa` puesta y todavía sin cobrar. Se le agregan
// líneas mientras el cliente pide, y al pagar se bloquea como cualquier otra.
// Guardar además un "estado de la mesa" sería un segundo dato que dice lo mismo
// y que tarde o temprano se desincroniza del pedido de verdad.

// Sin I, O, 0 ni 1: el código se dicta en voz alta y esos se confunden.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function codigoRetiro() {
  let out = ''
  for (let i = 0; i < 4; i++) out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  return out
}

type Linea = LineaCalculable & {
  subtotal?: number | null
  montoIva?: number | null
  total?: number | null
}

type Pago = {
  medio?: string | null
  monto?: number | null
}

/**
 * Resume lo que económicamente define una venta. Se usa para detectar si alguien
 * intentó cambiarle las líneas o el descuento a un pedido ya cobrado. Solo mira
 * lo que mueve plata: reordenar el array o tocar una nota no cuenta como cambio.
 */
function firmaEconomica(lineas: unknown, descuento: unknown): string {
  const filas = (Array.isArray(lineas) ? lineas : []) as Record<string, unknown>[]
  const partes = filas
    .map((l) => [l.nombre, l.cantidad, l.precioUnitario, l.tarifaIva].join('|'))
    .sort()
  return `${Number(descuento) || 0}::${partes.join('//')}`
}

export const Pedidos: CollectionConfig = {
  slug: 'pedidos',

  labels: {
    singular: 'Pedido',
    plural: 'Pedidos',
  },

  admin: {
    useAsTitle: 'codigo',
    defaultColumns: ['numero', 'codigo', 'canal', 'estado', 'total', 'pagoEstado'],
    group: 'Pedidos',
    description: 'Todas las ventas: las de la web y las de la caja del local.',
  },

  // Un pedido tiene datos personales del cliente: no es público.
  // El checkout los crea desde el servidor con la API local de Payload,
  // que pasa por encima de este control. Así el navegador nunca puede
  // inventar precios ni crear pedidos a mano.
  //
  // Borrar es solo del admin: un cajero que se equivoca ANULA, no borra.
  // Una venta borrada desaparece del arqueo sin dejar rastro.
  access: {
    read: conSesion,
    create: conSesion,
    update: conSesion,
    delete: soloAdmin,
  },

  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create' && !data.codigo) {
          data.codigo = codigoRetiro()
        }

        // ---- Una venta cobrada no se toca ----
        if (operation === 'update' && originalDoc?.bloqueado) {
          const antes = firmaEconomica(originalDoc.lineas, originalDoc.descuentoPorcentaje)
          const despues = firmaEconomica(
            data.lineas ?? originalDoc.lineas,
            data.descuentoPorcentaje ?? originalDoc.descuentoPorcentaje,
          )
          if (antes !== despues) {
            throw new Error(
              'Este pedido ya se cobró: no se le pueden cambiar las líneas ni el descuento. ' +
                'Si hay que corregirlo, anulalo y hacé una venta nueva.',
            )
          }
          // Cambiar el estado o anotar la factura sí se permite; los montos
          // quedan como estaban.
          return data
        }

        // Un guardado parcial (mover el estado, por ejemplo) no trae las líneas.
        // Sin este respaldo el recálculo las tomaría como vacías y pondría los
        // totales en cero.
        const lineas = (Array.isArray(data.lineas) ? data.lineas : originalDoc?.lineas) as
          | Linea[]
          | undefined

        if (Array.isArray(lineas)) {
          const calculo = calcularTotales(
            lineas,
            data.descuentoPorcentaje ?? originalDoc?.descuentoPorcentaje,
          )

          lineas.forEach((l, i) => {
            l.subtotal = calculo.lineas[i].subtotal
            l.montoIva = calculo.lineas[i].montoIva
            l.total = calculo.lineas[i].total
          })

          data.lineas = lineas
          data.descuentoPorcentaje = calculo.descuentoPorcentaje
          data.descuentoMonto = calculo.descuentoMonto
          data.subtotal = calculo.subtotal
          data.totalIva = calculo.totalIva
          data.total = calculo.total
        }

        // ---- Pagos ----
        //
        // Se topan al total antes de guardarlos: un pago no puede ser mayor que
        // la venta que paga. Lo que sobra del billete es vuelto, no ingreso.
        // `lib/pedidos.ts` ya los topa antes de llegar acá, así que esto es el
        // segundo cinturón — el que cubre lo que se edite a mano en el panel.
        const crudos = (Array.isArray(data.pagos) ? data.pagos : originalDoc?.pagos ?? []) as Pago[]
        const aplicados = aplicarPagos(
          crudos,
          Number(data.total ?? originalDoc?.total) || 0,
          data.efectivoRecibido ?? originalDoc?.efectivoRecibido,
        )

        const pagos = aplicados.pagos
        const totalPagado = pagos.reduce((n, p) => n + (Number(p.monto) || 0), 0)
        const enEfectivo = pagos
          .filter((p) => p.medio === 'efectivo')
          .reduce((n, p) => n + (Number(p.monto) || 0), 0)

        data.pagos = pagos
        data.efectivoRecibido = aplicados.efectivoRecibido
        data.totalPagado = totalPagado
        // Lo que el cliente entregó menos lo que se aplicó en efectivo. Si pagó
        // partido, la parte de tarjeta no genera vuelto.
        data.vuelto = Math.max(0, aplicados.efectivoRecibido - enEfectivo)

        // Una venta pagada SIEMPRE tiene fecha de pago.
        //
        // Los reportes cortan por `pagoFecha`, así que un pedido marcado como
        // pagado sin ella no aparece en ninguno: ni en el del día, ni en el del
        // mes, ni en el CSV del contador. Desaparece en silencio, que es la peor
        // forma de perder una venta. `lib/pedidos.ts` siempre la pone; esto
        // cubre lo que se marque a mano desde el panel.
        const pagado = (data.pagoEstado ?? originalDoc?.pagoEstado) === 'pagado'
        if (pagado && !data.pagoFecha && !originalDoc?.pagoFecha) {
          data.pagoFecha = new Date().toISOString()
        }

        // Red de seguridad: nada se bloquea como cobrado si los pagos no alcanzan.
        if (data.bloqueado && !originalDoc?.bloqueado) {
          const total = Number(data.total ?? originalDoc?.total) || 0
          if (totalPagado < total) {
            // Con `money` y no con `toLocaleString`: según la versión de ICU esa
            // función devuelve "10 001" con un espacio fino, que no es como se
            // escribe la plata acá. Este mensaje lo lee el cajero.
            throw new Error(
              `Los pagos registrados (${money(totalPagado)}) no cubren el total (${money(total)}).`,
            )
          }
        }

        return data
      },
    ],
  },

  fields: [
    {
      name: 'numero',
      label: 'N.º de venta',
      type: 'number',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Consecutivo del libro de ventas. Se asigna solo.',
      },
    },
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
      name: 'canal',
      label: 'Canal',
      type: 'select',
      required: true,
      defaultValue: 'web',
      index: true,
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Mostrador', value: 'mostrador' },
      ],
      admin: { position: 'sidebar', description: 'De dónde entró la venta.' },
    },
    {
      name: 'mesa',
      label: 'Mesa',
      type: 'number',
      min: 1,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Vacío si es para llevar. Una venta con mesa y sin cobrar es una cuenta abierta: aparece en la pantalla de mesas hasta que se paga.',
        condition: (data) => data?.canal !== 'web',
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
        { label: 'Anulado', value: 'anulado' },
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
        condition: (data) => data?.canal !== 'mostrador',
      },
    },
    {
      name: 'caja',
      label: 'Turno de caja',
      type: 'relationship',
      relationTo: 'cajas',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'En qué turno se cobró. Es lo que la mete en el arqueo.',
      },
    },
    {
      name: 'atendidoPor',
      label: 'Atendido por',
      type: 'relationship',
      relationTo: 'usuarios',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'bloqueado',
      label: 'Cobrado y cerrado',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Cuando está marcado, las líneas y el descuento ya no se pueden cambiar.',
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
            { name: 'clienteTelefono', label: 'Teléfono / WhatsApp', type: 'text', admin: { width: '50%' } },
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
          name: 'costoUnitario',
          label: 'Costo unitario en el momento',
          type: 'number',
          min: 0,
          admin: {
            description:
              'Copia del costo que tenía el producto al venderlo. Congelado como el precio y por lo mismo: si se leyera del producto, subir el costo del grano en marzo cambiaría el margen de todo lo vendido en enero. Vacío significa que el producto no tenía costo puesto.',
          },
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

    // ---------------- Descuento ----------------
    {
      type: 'row',
      fields: [
        {
          name: 'descuentoPorcentaje',
          label: 'Descuento (%)',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
          admin: {
            width: '33%',
            description: 'Se aplica a cada línea antes del IVA, para que siga siendo facturable.',
          },
        },
        {
          name: 'descuentoMotivo',
          label: 'Motivo del descuento',
          type: 'text',
          admin: { width: '33%', condition: (data) => Number(data?.descuentoPorcentaje) > 0 },
        },
        {
          name: 'descuentoMonto',
          label: 'Descuento en colones',
          type: 'number',
          admin: { width: '34%', readOnly: true },
        },
      ],
    },

    // ---------------- Totales ----------------
    {
      type: 'row',
      fields: [
        { name: 'subtotal', label: 'Subtotal sin IVA', type: 'number', admin: { width: '33%', readOnly: true } },
        { name: 'totalIva', label: 'IVA', type: 'number', admin: { width: '33%', readOnly: true } },
        { name: 'total', label: 'Total', type: 'number', admin: { width: '34%', readOnly: true } },
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
          name: 'pagos',
          label: 'Medios de pago',
          type: 'array',
          labels: { singular: 'Pago', plural: 'Pagos' },
          admin: {
            description:
              'Una fila por medio usado. Si el cliente paga mitad efectivo y mitad tarjeta, van dos filas.',
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'medio',
                  label: 'Medio',
                  type: 'select',
                  required: true,
                  defaultValue: 'efectivo',
                  options: [
                    { label: 'Efectivo', value: 'efectivo' },
                    { label: 'Tarjeta (datáfono)', value: 'tarjeta' },
                    { label: 'SINPE Móvil', value: 'sinpe' },
                    { label: 'Pagado en línea', value: 'linea' },
                  ],
                  admin: { width: '34%' },
                },
                { name: 'monto', label: 'Monto', type: 'number', required: true, min: 0, admin: { width: '33%' } },
                {
                  name: 'referencia',
                  label: 'Referencia',
                  type: 'text',
                  admin: { width: '33%', description: 'Voucher del datáfono o comprobante del SINPE.' },
                },
              ],
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'efectivoRecibido',
              label: 'Efectivo recibido',
              type: 'number',
              min: 0,
              admin: { width: '33%', description: 'El billete que entregó el cliente.' },
            },
            { name: 'vuelto', label: 'Vuelto', type: 'number', admin: { width: '33%', readOnly: true } },
            { name: 'totalPagado', label: 'Total pagado', type: 'number', admin: { width: '34%', readOnly: true } },
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

    // ---------------- Anulación ----------------
    {
      type: 'collapsible',
      label: 'Anulación',
      admin: {
        description: 'Una venta equivocada se anula, no se borra: así queda el rastro en el arqueo.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'anulacionMotivo',
          label: 'Motivo',
          type: 'text',
          admin: { condition: (data) => data?.estado === 'anulado' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'anuladoPor',
              label: 'Anulado por',
              type: 'relationship',
              relationTo: 'usuarios',
              admin: { width: '50%', readOnly: true },
            },
            {
              name: 'anuladoFecha',
              label: 'Fecha de anulación',
              type: 'date',
              admin: {
                width: '50%',
                readOnly: true,
                date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm' },
              },
            },
          ],
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
        initCollapsed: true,
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
