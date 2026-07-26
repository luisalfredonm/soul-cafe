import { getPayload } from 'payload'
import config from './payload.config'

// Carga el contenido de ejemplo (el mismo menú del prototipo) en ES e EN.
// Correr con: npm run seed
// Es idempotente en lo posible: si ya existe un admin, no lo duplica.

const CATEGORIAS = [
  { slug: 'espresso', orden: 1, es: 'Barra de espresso', en: 'Espresso bar',
    notaEs: 'Se preparan con la mezcla de la casa, salvo que pidás el origen único.',
    notaEn: 'Pulled on the house blend unless you ask for the single origin.' },
  { slug: 'filter', orden: 2, es: 'Métodos filtrados', en: 'Filter & brew',
    notaEs: 'Se preparan al momento. Dennos unos cinco minutos y vale la pena.',
    notaEn: 'Brewed to order. Give us about five minutes and it is worth it.' },
  { slug: 'cold', orden: 3, es: 'Fríos', en: 'Cold', notaEs: '', notaEn: '' },
  { slug: 'nocoffee', orden: 4, es: 'Sin café', en: 'Without coffee',
    notaEs: 'Para que nadie del grupo se quede con un vaso de agua.',
    notaEn: 'So nobody in the group sits there with a glass of water.' },
  { slug: 'bakery', orden: 5, es: 'Del horno', en: 'From the oven',
    notaEs: 'Horneado aquí cada mañana en tandas pequeñas. Cuando se acaba, se acabó.',
    notaEn: 'Baked here each morning in small batches. When they are gone, they are gone.' },
  { slug: 'beans', orden: 6, es: 'Para llevar', en: 'Take home',
    notaEs: 'Pedinos que lo molamos para tu método y lo hacemos.',
    notaEn: 'Ask us to grind it for your method and we will.' },
]

const PRODUCTOS: Array<{
  cat: string; precio: number; es: string; en: string
  desEs?: string; desEn?: string; tags?: ('vegan' | 'gf' | 'nocoffee')[]
}> = [
  { cat: 'espresso', precio: 1400, es: 'Espresso', en: 'Espresso', desEs: 'Un shot; doble por ₡400 más.', desEn: 'One shot, or a double for ₡400 more.' },
  { cat: 'espresso', precio: 1900, es: 'Cortado', en: 'Cortado', desEs: 'Espresso cortado con un poco de leche caliente.', desEn: 'Espresso cut with a little warm milk.' },
  { cat: 'espresso', precio: 2300, es: 'Capuchino', en: 'Cappuccino', desEs: 'Partes iguales de espresso, leche y espuma.', desEn: 'Equal parts espresso, milk and foam.' },
  { cat: 'espresso', precio: 2500, es: 'Flat white', en: 'Flat white', desEs: 'Doble shot y microespuma fina. La bebida que más pedimos.', desEn: 'Double shot, thin microfoam. Our most ordered drink.' },
  { cat: 'espresso', precio: 2500, es: 'Latte', en: 'Latte', desEs: 'Más largo y suave. Vainilla o canela sin costo.', desEn: 'Longer and milder. Add vanilla or cinnamon at no charge.' },
  { cat: 'espresso', precio: 1900, es: 'Americano', en: 'Americano', desEs: 'Espresso y agua caliente. Recarga gratis antes de las 9 am.', desEn: 'Espresso and hot water. Free refill before 9 am.' },
  { cat: 'espresso', precio: 2900, es: 'Mocha', en: 'Mocha', desEs: 'Con chocolate negro hecho en Costa Rica.', desEn: 'With dark chocolate made in Costa Rica.' },

  { cat: 'filter', precio: 3200, es: 'V60', en: 'V60 pour over', desEs: 'Origen único, molido y vertido a mano. Preguntá cuál hay hoy.', desEn: 'Single origin, ground and poured by hand. Ask what is on today.' },
  { cat: 'filter', precio: 5400, es: 'Chemex, para dos', en: 'Chemex, for two', desEs: '600 ml, servido en jarra con dos tazas.', desEn: '600 ml, served in a carafe with two cups.' },
  { cat: 'filter', precio: 1700, es: 'Café de filtro del día', en: 'Batch brew', desEs: 'Listo cuando llegás. Recarga ₡800.', desEn: 'Ready when you are. Refill ₡800.' },

  { cat: 'cold', precio: 2800, es: 'Cold brew', en: 'Cold brew', desEs: 'Reposado 18 horas. Poca acidez, mucha paciencia.', desEn: 'Steeped 18 hours. Low acidity, high patience.', tags: ['vegan'] },
  { cat: 'cold', precio: 2700, es: 'Latte frío', en: 'Iced latte', desEs: 'Doble shot sobre hielo y leche fría.', desEn: 'Double shot over ice and cold milk.' },
  { cat: 'cold', precio: 3200, es: 'Espresso tonic', en: 'Espresso tonic', desEs: 'Tónica, hielo, cáscara de naranja y un shot encima.', desEn: 'Tonic, ice, orange peel and a shot on top.', tags: ['vegan'] },
  { cat: 'cold', precio: 3400, es: 'Affogato', en: 'Affogato', desEs: 'Helado de vainilla ahogado en espresso caliente.', desEn: 'Vanilla ice cream drowned in hot espresso.' },

  { cat: 'nocoffee', precio: 3100, es: 'Matcha latte', en: 'Matcha latte', desEs: 'Grado ceremonial, caliente o frío.', desEn: 'Ceremonial grade, hot or iced.', tags: ['nocoffee', 'vegan'] },
  { cat: 'nocoffee', precio: 2900, es: 'Chai latte', en: 'Chai latte', desEs: 'Especias preparadas por nosotros, no de jarabe.', desEn: 'Spiced from scratch, not from syrup.', tags: ['nocoffee'] },
  { cat: 'nocoffee', precio: 2600, es: 'Chocolate caliente', en: 'Hot chocolate', desEs: 'Chocolate negro tico, derretido como se debe.', desEn: 'Costa Rican dark chocolate, melted properly.', tags: ['nocoffee'] },
  { cat: 'nocoffee', precio: 2400, es: 'Jugo de naranja', en: 'Orange juice', desEs: 'Exprimido al momento.', desEn: 'Squeezed when you order it.', tags: ['nocoffee', 'vegan', 'gf'] },
  { cat: 'nocoffee', precio: 2200, es: 'Agua de sapo', en: 'Agua de sapo', desEs: 'Tapa de dulce, jengibre y limón. Fría y de aquí.', desEn: 'Tapa dulce, ginger and lime. Cold and local.', tags: ['nocoffee', 'vegan', 'gf'] },

  { cat: 'bakery', precio: 2200, es: 'Croissant de mantequilla', en: 'Butter croissant', desEs: 'Tres días de laminado. Casi siempre se acaba antes de las 10.', desEn: 'Three days of folding. Usually gone before 10.' },
  { cat: 'bakery', precio: 2900, es: 'Croissant de almendra', en: 'Almond croissant', desEs: 'El croissant de ayer, relleno y horneado otra vez.', desEn: 'Yesterday\u2019s croissant, filled and baked again.' },
  { cat: 'bakery', precio: 2700, es: 'Rollo de canela', en: 'Cinnamon roll', desEs: 'Sale del horno a las 7:30 y a las 11.', desEn: 'Out of the oven at 7:30 and at 11.' },
  { cat: 'bakery', precio: 1800, es: 'Galleta de chocolate', en: 'Chocolate chip cookie', desEs: 'Suave por dentro. Pedila tibia.', desEn: 'Soft in the middle. Ask for it warm.' },
  { cat: 'bakery', precio: 2100, es: 'Pan de banano', en: 'Banana bread', desEs: 'Con nueces. Va bien con el café de filtro.', desEn: 'With walnuts. Good with the batch brew.' },
  { cat: 'bakery', precio: 2600, es: 'Brownie sin harina', en: 'Flourless brownie', desEs: 'Denso, oscuro y realmente sin gluten.', desEn: 'Dense, dark, and genuinely gluten free.', tags: ['gf'] },
  { cat: 'bakery', precio: 3300, es: 'Bowl de fruta y chía', en: 'Fruit and chia bowl', desEs: 'Fruta de estación, yogurt de coco y semillas tostadas.', desEn: 'Seasonal fruit, coconut yoghurt, toasted seeds.', tags: ['vegan', 'gf', 'nocoffee'] },

  { cat: 'beans', precio: 9500, es: 'Mezcla de la casa, 340 g', en: 'House blend, 340 g', desEs: 'Chocolate y dulce de tapa. Perdona en cualquier método.', desEn: 'Chocolate and brown sugar. Forgiving in any brewer.', tags: ['vegan', 'gf'] },
  { cat: 'beans', precio: 12500, es: 'Origen único, 340 g', en: 'Single origin, 340 g', desEs: 'Rota con la cosecha. Tostado en la semana.', desEn: 'Rotates with the harvest. Roasted within the week.', tags: ['vegan', 'gf'] },
  { cat: 'beans', precio: 7900, es: 'Botella de cold brew, 1 L', en: 'Cold brew bottle, 1 L', desEs: 'Dura cinco días en la refrigeradora.', desEn: 'Keeps five days in the fridge.', tags: ['vegan', 'gf'] },
]

async function seed() {
  const payload = await getPayload({ config })

  console.log('→ Creando usuario admin…')
  const existing = await payload.find({ collection: 'usuarios', limit: 1 })
  if (existing.docs.length === 0) {
    await payload.create({
      collection: 'usuarios',
      data: {
        email: 'admin@soulcafe.cr',
        password: 'cambiar-esta-clave',
        nombre: 'Administrador',
      },
    })
    console.log('  admin@soulcafe.cr / cambiar-esta-clave  (cambiala al entrar)')
  } else {
    console.log('  ya existe un usuario, se omite')
  }

  console.log('→ Cargando categorías…')
  const catIds: Record<string, number> = {}
  for (const c of CATEGORIAS) {
    const created = await payload.create({
      collection: 'categorias',
      locale: 'es',
      data: { slug: c.slug, orden: c.orden, nombre: c.es, nota: c.notaEs },
    })
    await payload.update({
      collection: 'categorias',
      id: created.id,
      locale: 'en',
      data: { nombre: c.en, nota: c.notaEn },
    })
    catIds[c.slug] = created.id
  }

  console.log('→ Cargando productos…')
  let orden = 0
  for (const p of PRODUCTOS) {
    orden += 1
    const created = await payload.create({
      collection: 'productos',
      locale: 'es',
      data: {
        nombre: p.es,
        descripcion: p.desEs || '',
        precio: p.precio,
        categoria: catIds[p.cat],
        etiquetas: p.tags || [],
        orden,
        agotado: false,
      },
    })
    await payload.update({
      collection: 'productos',
      id: created.id,
      locale: 'en',
      data: { nombre: p.en, descripcion: p.desEn || '' },
    })
  }

  console.log('→ Guardando datos del negocio…')
  await payload.updateGlobal({
    slug: 'ajustes',
    locale: 'es',
    data: {
      horaApertura: '6:30',
      whatsapp: '+506 0000 0000',
      horarioSemana: 'Lun–Vie 6:30 – 18:00',
      horarioFinde: 'Sáb–Dom 6:30 – 16:00',
      direccion: '200 m norte del semáforo de Huacas',
      mapsUrl: 'https://maps.google.com/?q=Huacas+Guanacaste',
    },
  })
  await payload.updateGlobal({
    slug: 'ajustes',
    locale: 'en',
    data: {
      horarioSemana: 'Mon–Fri 6:30 – 18:00',
      horarioFinde: 'Sat–Sun 6:30 – 16:00',
      direccion: '200 m north of the Huacas light',
    },
  })

  console.log('\n✓ Listo. Entrá a http://localhost:3000/admin y cambiá la clave.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
