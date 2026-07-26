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
