import type { CollectionConfig } from 'payload'

export const Usuarios: CollectionConfig = {
  slug: 'usuarios',

  labels: {
    singular: 'Usuario',
    plural: 'Usuarios',
  },

  admin: {
    useAsTitle: 'email',
    group: 'Ajustes',
    description: 'Personas que pueden entrar al panel de administración.',
  },

  auth: true, // habilita login, contraseñas, recuperación

  access: {
    // Solo usuarios autenticados gestionan otros usuarios
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },

  fields: [
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
    },
  ],
}
