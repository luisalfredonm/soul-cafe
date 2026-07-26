# Soul Cafe — Fase 1

Sitio bilingüe (inglés en la raíz, español en `/es`) con menú administrable desde un panel. Construido con Next.js 15 y Payload 3 sobre Postgres.

Esta fase 1 incluye: landing, menú con buscador y filtros, página de ubicación, panel de administración en `/admin` y SEO bilingüe con `hreflang` y sitemap. **No incluye** checkout ni pagos: eso es la fase 2.

---

## Qué necesitás antes de empezar

- Node.js 20.9 o superior
- Una base de datos Postgres. Para desarrollo, lo más fácil es Docker (incluido acá). Para producción, Neon o Supabase (ambos tienen plan gratis).

---

## Arranque en local, paso a paso

```bash
# 1. Instalá las dependencias
npm install

# 2. Levantá Postgres con Docker (o usá tu propia base)
docker compose up -d

# 3. Configurá las variables de entorno
cp .env.example .env
#   Abrí .env y generá la clave secreta:
#   openssl rand -base64 32
#   Pegala en PAYLOAD_SECRET.

# 4. Cargá el menú y los textos de ejemplo
npm run seed

# 5. Arrancá el sitio
npm run dev
```

Listo. Abrí:

- **Sitio en inglés:** http://localhost:3000
- **Sitio en español:** http://localhost:3000/es
- **Panel de administración:** http://localhost:3000/admin

El seed crea un usuario inicial:

```
correo:      admin@soulcafe.cr
contraseña:  cambiar-esta-clave
```

**Cambiá esa contraseña apenas entrés al panel.**

---

## Cómo edita el dueño el contenido

Todo lo editable vive en `/admin`, sin tocar código:

- **Menú → Productos:** agregar bebidas, cambiar precios, marcar "agotado hoy", subir fotos. Cada producto tiene pestaña de idioma (ES / EN).
- **Menú → Categorías:** las secciones del menú y su orden.
- **Contenido → Páginas:** textos y SEO de cada página.
- **Ajustes → Datos del negocio:** horarios, WhatsApp, dirección. Cambiarlos acá los actualiza en todo el sitio.

Cuando se marca un producto como agotado, desaparece del sitio en pocos minutos (el menú se regenera cada 5).

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (frontend)/          El sitio que ve el visitante
│   │   ├── [lang]/          Páginas bilingües: home, menu, visit
│   │   ├── sitemap.ts       Sitemap con hreflang
│   │   └── robots.ts
│   └── (payload)/           Panel /admin y API (autogenerado)
├── collections/             Modelos de datos: Productos, Categorias, etc.
├── globals/                 Ajustes del negocio
├── components/              Nav, Hero, Footer, MenuClient…
├── i18n/                    Textos de interfaz fijos
├── lib/                     Acceso a Payload
├── middleware.ts            Sirve inglés en la raíz, español en /es
├── payload.config.ts        Configuración central de Payload
└── seed.ts                  Carga el contenido de ejemplo
```

---

## Cómo se maneja el bilingüe

- El contenido (menú, textos, horarios) usa la localización de Payload: un solo registro con pestaña de idioma.
- Los rótulos fijos de interfaz están en `src/i18n/dictionaries.ts`.
- El `middleware.ts` hace que el inglés viva en la raíz (`/menu`) y el español bajo `/es` (`/es/menu`), generando el `hreflang` correcto para Google.

Si algún día querés invertirlo (español en la raíz), se cambia `DEFAULT_LANG` en el diccionario y la lógica del middleware.

---

## Publicar en producción

**Opción recomendada: Vercel + Neon.**

1. Creá una base en [neon.tech](https://neon.tech) y copiá su cadena de conexión.
2. Subí el repo a GitHub e importalo en [vercel.com](https://vercel.com).
3. En Vercel, configurá las variables de entorno: `DATABASE_URI`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL` (tu dominio final).
4. Desplegá. La primera vez, corré el seed una sola vez contra la base de producción, o cargá el contenido a mano desde `/admin`.

**Alternativa más barata:** un VPS de ~$6 con [Coolify](https://coolify.io), que incluye Postgres. Mismo proyecto, mismas variables.

---

## Antes de salir al público

- [ ] Reemplazar los datos de ejemplo por los reales (precios, horarios de verdad, WhatsApp)
  - **Los precios se escriben SIN IVA.** El sitio le suma la tarifa de Ajustes (13% por
    defecto) y muestra el precio final al cliente. Si querés que en el menú salga un número
    redondo, calculá el neto hacia atrás: para mostrar ₡1.600, escribí ₡1.416.
- [ ] Cambiar la contraseña del admin
- [ ] Subir fotos reales del local y los productos
- [ ] Confirmar los horarios definitivos (el copy asume apertura 6:30 y domingo abierto)
- [ ] Conectar el dominio y actualizar `NEXT_PUBLIC_SERVER_URL`
- [ ] Configurar el Google Business Profile (vale más que la web para el ranking local)

---

## Qué viene en la fase 2

El modelo de datos ya deja preparado el terreno: el campo `disponibleDelivery` en los productos y el `cabys` para facturación existen pero no se usan todavía. La fase 2 agrega el checkout con retiro en el local, pagos con ONVO (SINPE destacado) y facturación electrónica 4.4, que se construye primero contra un facturador simulado y se activa cuando el certificado de Hacienda esté listo.
