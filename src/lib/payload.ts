import { getPayload } from 'payload'
import config from '@payload-config'
import type { Lang } from '@/i18n/dictionaries'

// Instancia única de Payload, reutilizada entre peticiones.
export async function getPayloadClient() {
  return getPayload({ config })
}

// El precio se guarda SIN IVA (es el neto que va a la factura), pero al cliente
// se le muestra el precio final. Redondea al colón: aquí no se usan céntimos.
export function conIva(neto: number, tarifa: number) {
  return Math.round(neto * (1 + tarifa / 100))
}

// Trae el menú agrupado por categoría, en el idioma pedido,
// omitiendo lo que está agotado. Ordena por el campo "orden".
export async function getMenu(lang: Lang) {
  const payload = await getPayloadClient()

  const [categorias, productos, ajustes] = await Promise.all([
    payload.find({
      collection: 'categorias',
      locale: lang,
      sort: 'orden',
      limit: 100,
    }),
    payload.find({
      collection: 'productos',
      locale: lang,
      where: { agotado: { equals: false } },
      sort: ['orden', 'nombre'],
      limit: 500,
      depth: 1,
    }),
    payload.findGlobal({ slug: 'ajustes' }),
  ])

  const tarifaGeneral = Number(ajustes?.tarifaIvaDefecto ?? 13)

  // Agrupa productos bajo su categoría
  return categorias.docs.map((cat) => ({
    id: cat.id,
    slug: cat.slug as string,
    nombre: cat.nombre as string,
    nota: (cat.nota as string) || '',
    productos: productos.docs
      .filter((p) => {
        const c = p.categoria
        const catId = typeof c === 'object' && c !== null ? c.id : c
        return catId === cat.id
      })
      .map((p) => {
        // Un producto puede llevar su propia tarifa si su CABYS lo pide.
        const tarifa = typeof p.tarifaIva === 'number' ? p.tarifaIva : tarifaGeneral
        return {
          ...p,
          tarifaIva: tarifa,
          // precio queda neto para la factura; precioFinal es el que se muestra.
          precioFinal: conIva(Number(p.precio) || 0, tarifa),
        }
      }),
  }))
}

export async function getAjustes(lang: Lang) {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'ajustes', locale: lang })
}

export type FotoDestacada = {
  url: string
  alt: string
  ancho: number
  alto: number
  titulo: string
  nota: string
  /** Precio con IVA, listo para mostrar. 0 si la foto no va con un producto. */
  precio: number
}

// Fotos de bebidas de la página principal. El nombre y el precio salen del
// producto relacionado, así no pueden contradecir al menú.
export async function getDestacados(lang: Lang) {
  const payload = await getPayloadClient()
  const [destacados, ajustes] = await Promise.all([
    payload.findGlobal({ slug: 'destacados', locale: lang, depth: 2 }),
    payload.findGlobal({ slug: 'ajustes' }),
  ])

  if (!destacados?.activo) return { titulo: '', fotos: [] as FotoDestacada[] }

  const tarifaGeneral = Number(ajustes?.tarifaIvaDefecto ?? 13)

  const fotos = (destacados.items || []).flatMap((it): FotoDestacada[] => {
    const img = it?.imagen
    // Sin imagen subida no hay nada que mostrar.
    if (!img || typeof img !== 'object') return []

    // Se prefiere el recorte vertical; si todavía no existe, la original.
    const retrato = img.sizes?.retrato
    const url = retrato?.url || img.url
    if (!url) return []

    const prod = typeof it.producto === 'object' && it.producto !== null ? it.producto : null
    const tarifa = typeof prod?.tarifaIva === 'number' ? prod.tarifaIva : tarifaGeneral

    return [
      {
        url,
        // El alt de la imagen manda; si está vacío, al menos el nombre del producto.
        alt: img.alt || prod?.nombre || '',
        ancho: retrato?.width || img.width || 800,
        alto: retrato?.height || img.height || 1200,
        titulo: prod?.nombre || it.titulo || '',
        nota: it.nota || '',
        precio: prod ? conIva(Number(prod.precio) || 0, tarifa) : 0,
      },
    ]
  })

  return { titulo: destacados.titulo || '', fotos }
}

export async function getPagina(slug: string, lang: Lang) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'paginas',
    locale: lang,
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return res.docs[0] ?? null
}
