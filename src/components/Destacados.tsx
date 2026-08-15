import Image from 'next/image'
import type { Lang } from '@/i18n/dictionaries'
import { getDict } from '@/i18n/dictionaries'
import type { FotoDestacada } from '@/lib/payload'

function money(n: number) {
  return '₡' + Math.round(n).toLocaleString('es-CR')
}

export function Destacados({
  lang,
  titulo,
  fotos,
}: {
  lang: Lang
  titulo: string
  fotos: FotoDestacada[]
}) {
  // Sin fotos no se dibuja nada: mejor ausencia que marcos vacíos.
  if (fotos.length === 0) return null

  const t = getDict(lang)

  return (
    <div className="destacados">
      <p className="destacados-titulo">{titulo || t.destacados.titulo}</p>

      <ul className="galeria">
        {fotos.map((f, i) => (
          <li key={i}>
            <figure>
              <div className="galeria-marco">
                <Image
                  src={f.url}
                  alt={f.alt}
                  width={f.ancho}
                  height={f.alto}
                  // Está bajo el pliegue: carga diferida y sin prioridad, para no
                  // competir con el logo del hero por el ancho de banda inicial.
                  loading="lazy"
                  sizes="(min-width: 880px) 33vw, 74vw"
                  className="galeria-img"
                />
              </div>
              {(f.titulo || f.nota) && (
                <figcaption>
                  {f.titulo && (
                    <span className="galeria-nombre">
                      {f.titulo}
                      {f.precio > 0 && <span className="galeria-precio">{money(f.precio)}</span>}
                    </span>
                  )}
                  {f.nota && <span className="galeria-nota">{f.nota}</span>}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </div>
  )
}
