import type { Lang } from '@/i18n/dictionaries'

// Las preguntas que la gente hace de verdad antes de manejar hasta Huacas.
// Usa <details> nativo: funciona sin JavaScript y Google lo lee bien.
const PREGUNTAS: { es: [string, string]; en: [string, string] }[] = [
  {
    en: [
      'What time do you open?',
      '6:30 am, seven days a week, including Sunday. We close at 6 pm on weekdays and 4 pm on weekends.',
    ],
    es: [
      '¿A qué hora abren?',
      '6:30 am, todos los días, domingo incluido. Cerramos a las 6 pm entre semana y 4 pm los fines de semana.',
    ],
  },
  {
    en: [
      'Can I work here for a few hours?',
      'Yes. There is no time limit and no minimum spend. Fourteen tables have outlets. It is busiest between 8 and 11 in the morning, and quietest after 2 pm.',
    ],
    es: [
      '¿Puedo trabajar aquí unas horas?',
      'Sí. No hay límite de tiempo ni consumo mínimo. Catorce mesas tienen tomacorriente. Lo más lleno es de 8 a 11 de la mañana; lo más tranquilo después de las 2 pm.',
    ],
  },
  {
    en: [
      'Is there parking?',
      'Free parking on site. Coming from the beaches to run errands in Huacas, park once here and walk to the rest.',
    ],
    es: [
      '¿Hay parqueo?',
      'Parqueo gratis en el sitio. Si venís de la playa a hacer mandados en Huacas, parqueá una vez aquí y caminá al resto.',
    ],
  },
  {
    en: [
      'Do you serve breakfast or lunch?',
      'Pastries and baked goods, not full plates. If you want gallo pinto and a casado there are better places for that within a few minutes. We do coffee and the things that go with it.',
    ],
    es: [
      '¿Sirven desayuno o almuerzo?',
      'Repostería y horneados, no platos completos. Si querés gallo pinto o un casado, hay mejores opciones a pocos minutos. Nosotros hacemos café y lo que lo acompaña.',
    ],
  },
  {
    en: [
      "What if I don't drink coffee?",
      'Matcha, chai, hot chocolate and cold drinks. Nobody in the group has to sit there with a glass of water.',
    ],
    es: [
      '¿Y si no tomo café?',
      'Matcha, chai, chocolate caliente y bebidas frías. Nadie del grupo se queda con un vaso de agua.',
    ],
  },
  {
    en: [
      'Do you sell beans to take home?',
      'Yes, 340 g bags, whole bean or ground to your method. Same coffee we serve. Ask us to grind it for a V60, a Chemex or a moka pot and we will.',
    ],
    es: [
      '¿Venden café en grano?',
      'Sí, bolsas de 340 g, en grano o molido para tu método. Es el mismo café que servimos. Pedinos que lo molamos para V60, Chemex o greca y lo hacemos.',
    ],
  },
  {
    en: [
      'Do you speak English?',
      'Yes. The whole team works in English and Spanish, and the menu is in both.',
    ],
    es: [
      '¿Atienden en inglés?',
      'Sí. Todo el equipo atiende en español e inglés, y el menú está en los dos idiomas.',
    ],
  },
  {
    en: [
      'Are dogs allowed?',
      'On the covered patio, yes. There is a water bowl by the door. Inside we keep it dog free because of the bakery.',
    ],
    es: [
      '¿Puedo venir con mi perro?',
      'En la terraza techada, sí. Hay un bebedero junto a la puerta. Adentro no, por el área de horneado.',
    ],
  },
]

export function Faq({ lang }: { lang: Lang }) {
  return (
    <div className="faq">
      {PREGUNTAS.map((q, i) => {
        const [pregunta, respuesta] = q[lang]
        return (
          // La primera abierta, para que se entienda que se despliegan.
          <details key={i} open={i === 0}>
            <summary>{pregunta}</summary>
            <div className="faq-body">{respuesta}</div>
          </details>
        )
      })}
    </div>
  )
}
