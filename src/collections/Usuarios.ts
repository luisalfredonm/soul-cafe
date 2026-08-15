import type { CollectionConfig } from 'payload'
import { esAdmin, soloAdmin } from '@/lib/roles'

export const Usuarios: CollectionConfig = {
  slug: 'usuarios',

  labels: {
    singular: 'Usuario',
    plural: 'Usuarios',
  },

  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'nombre', 'rol'],
    group: 'Ajustes',
    description: 'Personas que pueden entrar al panel y a la caja.',
  },

  auth: true, // habilita login, contraseñas, recuperación

  access: {
    // Cada quien se ve a sí mismo; el resto de la lista es cosa del admin.
    // Sin esto un cajero no podría ni cargar su propia sesión.
    read: ({ req }) => {
      if (esAdmin(req.user)) return true
      if (!req.user) return false
      return { id: { equals: req.user.id } }
    },
    create: soloAdmin,
    update: soloAdmin,
    delete: soloAdmin,
  },

  fields: [
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
    },
    {
      name: 'rol',
      label: 'Rol',
      type: 'select',
      required: true,
      defaultValue: 'cajero',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Cajero', value: 'cajero' },
      ],
      // Un cajero que pudiera editar este campo se ascendería a admin solo.
      access: { update: ({ req }) => esAdmin(req.user) },
      admin: {
        position: 'sidebar',
        description:
          'El cajero entra a la caja (/pos) y maneja pedidos, pero no puede tocar precios, contenido ni usuarios. El administrador puede todo.',
      },
    },
  ],
}
