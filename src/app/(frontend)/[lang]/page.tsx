import type { Metadata } from 'next'
import Link from 'next/link'
import type { Lang } from '@/i18n/dictionaries'
import { LANGS, getDict } from '@/i18n/dictionaries'
import { Hero } from '@/components/Hero'
import { Faq } from '@/components/Faq'
import { Reveal } from '@/components/Reveal'
import { getAjustes } from '@/lib/payload'

export const revalidate = 3600 // regenera la página cada hora

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const es = lang === 'es'
  return {
    title: es
      ? 'Soul Cafe — Cafetería de especialidad en Huacas, Guanacaste'
      : 'Soul Cafe — Specialty Coffee in Huacas, Guanacaste',
    description: es
      ? 'Café de especialidad y repostería casera en el cruce de Huacas, cerca de Tamarindo, Flamingo y Conchal. Abrimos temprano, todos los días.'
      : 'Specialty coffee and fresh homemade pastries at the Huacas crossroads, minutes from Tamarindo, Flamingo and Conchal. Open early, seven days a week.',
    alternates: {
      canonical: es ? '/es' : '/',
      languages: { en: '/', es: '/es' },
    },
  }
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l = (LANGS.includes(lang as Lang) ? lang : 'en') as Lang
  const es = l === 'es'
  const t = getDict(l)
  const a = await getAjustes(l)
  const p = (path: string) => (es ? `/es${path}` : path) || '/'

  // Datos estructurados para Google. Lo editable sale del panel;
  // las coordenadas y los horarios se confirman antes de salir al público.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: 'Soul Cafe',
    slogan: t.hero.slogan,
    description: es
      ? 'Cafetería de especialidad y repostería en el cruce de Huacas, Guanacaste, Costa Rica.'
      : 'Specialty coffee shop and bakery at the Huacas crossroads in Guanacaste, Costa Rica.',
    url: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}${es ? '/es' : ''}`,
    telephone: (a?.whatsapp as string) || undefined,
    hasMap: (a?.mapsUrl as string) || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: (a?.direccion as string) || 'Cruce de Huacas',
      addressLocality: 'Huacas',
      addressRegion: 'Guanacaste',
      postalCode: '50304',
      addressCountry: 'CR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 10.3792, longitude: -85.7861 },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '06:30',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday', 'Sunday'],
        opens: '06:30',
        closes: '16:00',
      },
    ],
    priceRange: '$$',
    servesCuisine: 'Coffee',
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: es ? 'Wifi gratis' : 'Free Wi-Fi', value: true },
      { '@type': 'LocationFeatureSpecification', name: es ? 'Parqueo gratis' : 'Free parking', value: true },
      { '@type': 'LocationFeatureSpecification', name: es ? 'Aire acondicionado' : 'Air conditioning', value: true },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Reveal />

      <Hero lang={l} />

      {/* ===================== EL CAFÉ ===================== */}
      <section className="sec sec-cream" id="coffee">
        <div className="wrap split">
          <div className="split-head">
            <span className="eyebrow">{es ? 'El café' : 'The coffee'}</span>
            <h2 className="rise">
              {es
                ? 'Café de especialidad, sin la complicación.'
                : 'Coffee we take seriously. Not coffee we lecture you about.'}
            </h2>
          </div>
          <div>
            <p className="lede rise">
              {es
                ? 'Compramos a productores pequeños de Costa Rica y sabemos de dónde viene cada bolsa. Si te gusta hablar de origen, altura y tueste, aquí tenés con quién. Y si lo que querés es un buen capuchino sin explicaciones, también. La taza es la misma para los dos.'
                : 'We buy from small Costa Rican producers and we know where every bag comes from. If you want to talk about origin, altitude and roast profile, we can do that all morning. And if you just want a really good flat white without a conversation about it, that works too. Both people get the same cup.'}
            </p>

            <div className="subs">
              <div>
                <h3>{es ? 'Un menú corto, a propósito' : 'A short menu, on purpose'}</h3>
                <p>
                  {es
                    ? 'Espresso, bebidas con leche y dos métodos filtrados. Pocas cosas, bien hechas, iguales todos los días. Siempre hay leche de avena y de almendra.'
                    : 'Espresso, milk drinks, and two filter options. Fewer things, made properly, the same way every day. Oat and almond milk always available.'}
                </p>
              </div>
              <div>
                <h3>{es ? 'De dónde viene el grano' : 'Where the beans come from'}</h3>
                <p>
                  {es
                    ? 'Un origen único que rota y una mezcla de la casa. El origen cambia con la cosecha y está escrito en la pizarra de la caja.'
                    : 'One rotating single origin plus a house blend. The origin changes with the harvest, and it is written on the board by the register.'}
                </p>
              </div>
              <div>
                <h3>{es ? 'Si no tomás café' : "If you don't drink coffee"}</h3>
                <p>
                  {es
                    ? 'Matcha, chai y un chocolate caliente de verdad. Nadie de tu grupo se queda con un vaso de agua.'
                    : 'Matcha, chai and a proper hot chocolate. Nobody in your group has to sit there with a glass of water.'}
                </p>
              </div>
            </div>

            <p style={{ marginTop: '2.4rem' }}>
              <Link className="btn btn-wine" href={p('/menu')}>
                {t.hero.ctaMenu} <span className="arw" aria-hidden>→</span>
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ===================== REPOSTERÍA ===================== */}
      <section className="sec sec-tint" id="pastries">
        <div className="wrap split">
          <div className="split-head">
            <span className="eyebrow">{es ? 'La repostería' : 'The pastries'}</span>
            <h2 className="rise">{es ? 'Horneado aquí, esta mañana.' : 'Baked here, this morning.'}</h2>
            <div className="shot rise" style={{ marginTop: '2rem' }}>
              {es ? 'Foto — la vitrina a las 7 am' : 'Photo — the pastry case at 7 am'}
            </div>
          </div>
          <div>
            <p className="lede rise">
              {es
                ? 'Croissants, galletas y lo que haya salido del horno ese día. Hacemos poca cantidad, así que cuando se acaba, se acabó. Si querés croissant, venite temprano.'
                : "Croissants, cookies, and whatever else came out of the oven that day. Small batches, so when they're gone they're gone. Come early if you want the croissants."}
            </p>

            <div className="subs">
              <div>
                <h3>{es ? 'No somos restaurante' : 'Not a restaurant'}</h3>
                <p>
                  {es
                    ? 'No tenemos cocina completa ni pensamos tenerla. Pocas cosas, bien hechas, pensadas para acompañar el café.'
                    : "We don't run a full kitchen and we're not planning to. A few things, done well, meant to go with the coffee."}
                </p>
              </div>
              <div>
                <h3>{es ? 'Se acaba a media mañana' : 'Usually out by mid-morning'}</h3>
                <p>
                  {es
                    ? 'Los croissants se van primero, casi siempre antes de las 10. No es marketing: es lo que cabe en el horno.'
                    : 'The croissants go first, most days before 10. That is not a marketing line, it is just how much the oven holds.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== EL ESPACIO ===================== */}
      <section className="sec sec-wine on-wine" id="room">
        <div className="wrap split">
          <div className="split-head">
            <span className="eyebrow eyebrow-light">{es ? 'El espacio' : 'The room'}</span>
            <h2 className="rise">{es ? 'Un lugar para quedarse.' : 'Somewhere to actually stay.'}</h2>
          </div>
          <div>
            <p className="lede lede-light rise">
              {es
                ? 'Wifi rápido, tomacorrientes en casi todas las mesas y aire acondicionado que sí enfría. Mesas donde cabe la computadora y sillas en las que se puede estar dos horas. Quedate el tiempo que necesités. Nadie te va a estar viendo la mesa.'
                : "Fast wifi, real outlets at most tables, and air conditioning that works. Tables you can spread out on and chairs you can sit in for two hours without regretting it. You're welcome to stay. Nobody is going to hover over your table."}
            </p>

            <div className="metrics">
              <div className="metric">
                <b>
                  120<span> Mbps</span>
                </b>
                <small>{es ? 'Medido, no prometido' : 'Measured, not promised'}</small>
              </div>
              <div className="metric">
                <b>14</b>
                <small>{es ? 'Mesas con toma' : 'Tables with outlets'}</small>
              </div>
              <div className="metric">
                <b>0</b>
                <small>{es ? 'Límite de tiempo' : 'Minute limit'}</small>
              </div>
              <div className="metric">
                <b>2 – 5</b>
                <small>{es ? 'Horas tranquilas, pm' : 'Quietest hours, pm'}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROMESA DE MARCA ===================== */}
      <section className="sec-cream">
        <div className="wrap pledge">
          <p className="script">{t.hero.slogan}</p>
          <p className="rise">
            {es
              ? 'Es un eslogan, pero también es el plan completo. Buen café, algo tibio del horno y un lugar donde nadie te apura. Ese es todo el negocio.'
              : 'It is a slogan, but it is also the whole plan. Good coffee, something warm from the oven, and a room where nobody rushes you. That is the entire business.'}
          </p>
        </div>
      </section>

      {/* ===================== GRANO PARA LLEVAR ===================== */}
      <section className="sec sec-tint" id="beans">
        <div className="wrap split">
          <div className="split-head">
            <span className="eyebrow">{es ? 'Para llevar' : 'Take it home'}</span>
            <h2 className="rise">{es ? 'Llevate una bolsa.' : 'Take a bag home.'}</h2>
          </div>
          <div>
            <p className="lede rise">
              {es
                ? 'El mismo café que servimos, en grano o molido, en bolsas de 340 g. Viaja bien y le gana a lo que venden en el aeropuerto.'
                : 'The same beans we pour, whole or ground, in 340 g bags. It travels well and it beats whatever they sell at the airport.'}
            </p>
            <p className="rise" style={{ marginTop: '1.9rem' }}>
              <Link className="btn btn-wine" href={p('/visit')}>
                {es ? 'Pasá por una bolsa' : 'Come pick some up'} <span className="arw" aria-hidden>→</span>
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ===================== PREGUNTAS FRECUENTES ===================== */}
      <section className="sec sec-cream" id="faq">
        <div className="wrap">
          <span className="eyebrow">{es ? 'Antes de venir' : 'Before you drive over'}</span>
          <h2 className="rise">
            {es ? 'Lo que la gente pregunta de verdad' : 'Questions people actually ask'}
          </h2>
          <Faq lang={l} />
        </div>
      </section>
    </>
  )
}
