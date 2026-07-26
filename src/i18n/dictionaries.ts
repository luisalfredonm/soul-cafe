// Textos de interfaz fijos (botones, etiquetas de navegación, etc.).
// El contenido editable —menú, horarios, textos de página— viene de Payload.
// Estos son solo los rótulos que no cambian.

export type Lang = 'es' | 'en'

export const LANGS: Lang[] = ['es', 'en']
export const DEFAULT_LANG: Lang = 'en' // inglés en la raíz, como definimos para Huacas

export const dict = {
  en: {
    nav: { menu: 'Menu', visit: 'Visit', home: 'Home' },
    hero: {
      slogan: 'Coffee that feeds the soul',
      ctaMenu: 'See the menu',
      ctaVisit: 'Find us',
    },
    facts: {
      open: 'Open 6:30 am',
      week: 'Seven days a week',
      parking: 'Free parking',
      wifi: 'Fast wifi',
    },
    board: {
      label: 'From our door',
      airport: 'Liberia airport',
    },
    menu: {
      title: 'Menu',
      searchPlaceholder: 'Search drinks, pastries…',
      searchLabel: 'Search the menu',
      clear: 'Clear search',
      milkNote: 'Oat and almond milk, +₡500. Prices in colones.',
      emptyTitle: 'Nothing matches that',
      emptyBtn: 'Show the full menu',
      filters: { vegan: 'Vegan', gf: 'Gluten free', nocoffee: 'No coffee' },
      tags: { vegan: 'Vegan', gf: 'Gluten free', nocoffee: 'No coffee' },
      countAll: (n: number) => `${n} items`,
      countSome: (n: number, t: number) => `${n} of ${t} items`,
      soldOut: 'Sold out',
    },
    visit: {
      title: 'On the way to almost everywhere.',
      intro:
        'Huacas is the junction. If you are driving in from Liberia airport, you pass right by us.',
      hours: 'Hours',
      weekend: 'Weekends',
      address: 'Address',
      parking: 'Parking',
      parkingValue: 'Free, on site',
    },
    foot: {
      tagline: 'Coffee that feeds the soul',
      prototype: 'Soul Cafe · Huacas, Guanacaste',
    },
  },
  es: {
    nav: { menu: 'Menú', visit: 'Cómo llegar', home: 'Inicio' },
    hero: {
      slogan: 'Café que alimenta el alma',
      ctaMenu: 'Ver el menú',
      ctaVisit: 'Cómo llegar',
    },
    facts: {
      open: 'Abrimos 6:30 am',
      week: 'Todos los días',
      parking: 'Parqueo gratis',
      wifi: 'Wifi rápido',
    },
    board: {
      label: 'Desde nuestra puerta',
      airport: 'Aeropuerto Liberia',
    },
    menu: {
      title: 'Menú',
      searchPlaceholder: 'Buscar bebidas, repostería…',
      searchLabel: 'Buscar en el menú',
      clear: 'Limpiar búsqueda',
      milkNote: 'Leche de avena y almendra, +₡500. Precios en colones.',
      emptyTitle: 'No encontramos eso',
      emptyBtn: 'Ver el menú completo',
      filters: { vegan: 'Vegano', gf: 'Sin gluten', nocoffee: 'Sin café' },
      tags: { vegan: 'Vegano', gf: 'Sin gluten', nocoffee: 'Sin café' },
      countAll: (n: number) => `${n} productos`,
      countSome: (n: number, t: number) => `${n} de ${t} productos`,
      soldOut: 'Agotado',
    },
    visit: {
      title: 'En el cruce, de paso para todo.',
      intro:
        'Huacas es el cruce. Si venís del aeropuerto de Liberia, pasás por aquí.',
      hours: 'Horario',
      weekend: 'Fines de semana',
      address: 'Dirección',
      parking: 'Parqueo',
      parkingValue: 'Gratis, en el sitio',
    },
    foot: {
      tagline: 'Café que alimenta el alma',
      prototype: 'Soul Cafe · Huacas, Guanacaste',
    },
  },
} as const

export function getDict(lang: Lang) {
  return dict[lang] ?? dict[DEFAULT_LANG]
}
