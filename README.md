# Soul Cafe

Sitio bilingüe (inglés en la raíz, español en `/es`) con menú administrable, pedidos en línea y **caja para cobrar en el local**. Todo en un solo proyecto, contra una sola base: el precio se cambia una vez y cambia en el menú de la web y en la caja a la vez.

Construido con Next.js 15 y Payload 3 sobre Postgres.

| Dónde | Qué es |
|---|---|
| `/` y `/es` | El sitio público: landing, menú, ubicación |
| `/admin` | Panel del dueño: menú, precios, contenido, ventas |
| `/pos` | La caja del local: vender, mesas, arqueo |
| `/pos/reportes` | Ventas, productos, IVA y anulaciones. Solo el dueño |

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

## La caja (`/pos`)

La caja del local es parte de este mismo proyecto: mismo catálogo, misma base de datos, misma sesión. No hay nada aparte que instalar ni sincronizar.

### Quién entra

Hay dos roles, en **Ajustes → Usuarios**:

| Rol | Puede |
|---|---|
| **Administrador** | Todo: precios, contenido, usuarios, borrar ventas |
| **Cajero** | Entrar a `/pos`, cobrar, anular con motivo, abrir y cerrar caja. **No** puede tocar precios ni borrar ventas |

Creá una cuenta de cajero por persona: cada venta queda firmada con quién la hizo.

> El sistema no se deja quedar sin administrador. Si por lo que sea no queda ninguno, al arrancar le devuelve el rol al usuario más antiguo y lo avisa en el log.

### El día a día

1. **Abrir caja** (`/pos/caja`) contando el fondo de la gaveta. Sin caja abierta no se puede vender: es lo que hace que las ventas caigan en un arqueo.
2. **Vender** (`/pos`): tocar productos, `Cobrar`, elegir el medio de pago.
   - **Efectivo:** el monto que se teclea es *el billete que entregó el cliente*. El vuelto lo calcula solo.
   - **Tarjeta:** el cobro se hace en el datáfono del banco, aparte. Acá solo se anota el monto y, si se quiere, el número de voucher.
   - **Pago dividido:** botón `Pago dividido` para partir entre efectivo y tarjeta.
3. **Pedidos** (`/pos/pedidos`): la cola de la barra. Lo que falta hacer arriba, lo que ya está listo esperando retiro abajo. Se refresca sola cada 20 segundos.
   - **Un toque cierra un pedido**: el botón verde `Entregado`. No hay que pasar por `Preparando` ni `Listo`.
   - Esos dos estados intermedios están para el **pedido web**, donde el cliente pregunta si ya puede venir. Para un café de mostrador que se hace en un minuto, sobran.
   - Los pedidos web llegan **sin cobrar**. Cuando el cliente llega con su código, se cobra ahí mismo.
   - Lo que quedó sin cerrar de días anteriores aparece aparte y plegado, al final. Ni estorba ni se esconde.

### La campana de los pedidos web

Cuando entra un pedido por la web, la caja **suena y muestra una franja roja arriba**, en cualquier pantalla del POS — vendiendo, en mesas o en caja. Insiste cada minuto hasta que alguien lo atienda.

Se calla sola en cuanto el pedido deja de estar en `nuevo`: sirve cualquier botón de los que ya hay (`Preparando`, `Listo`, `Entregado`, `Cobrar` o `Anular`). No hay un "visto" aparte que marcar.

Como la cuenta la lleva el servidor y no cada navegador, **atender el pedido desde la tablet también calla la PC de la caja**.

Qué **no** hace sonar la campana, a propósito:

- Las ventas de mostrador — las acaba de hacer el cajero.
- Las rondas de mesa — las pide alguien que está parado ahí.
- Los pedidos de días anteriores — si no, un pedido viejo sin cerrar sonaría para siempre y en dos días nadie le haría caso.

> **La primera vez hay que activar el sonido.** Los navegadores no dejan sonar nada hasta que la persona toca la pantalla. Mientras esté mudo aparece una franja ámbar que dice *"El sonido está apagado — tocá acá para activarlo"*, y al tocarla suena una vez para confirmar que quedó armada. Se prefiere avisar que está muda antes que dejar creer que funciona.
>
> En la PC de la caja conviene tocar esa franja apenas se abre el turno.
4. **Cerrar caja** contando el efectivo. La diferencia aparece *mientras se teclea*, antes de confirmar. Al cerrar **sale el cierre Z por la impresora**, solo.

### Movimientos de la gaveta

Plata que entra o sale sin ser una venta: pagarle al de la leche, meter cambio a media mañana, guardar la recaudación en la caja fuerte. Se anotan en `/pos/caja`, con el botón `Anotar movimiento`.

| Tipo | Qué es | Gaveta |
|---|---|---|
| **Entra plata** | Cambio, fondo extra | Sube |
| **Retiro** | Plata que se saca y se guarda: caja fuerte, banco | Baja |
| **Gasto** | Se pagó algo con la plata de la caja | Baja |

Con esto el esperado en gaveta pasa a ser **fondo + efectivo cobrado + lo que entró − lo que salió**. Sin ellos, sacar ₡40.000 para el proveedor hacía que el turno cerrara con ₡40.000 de faltante. Un arqueo que marca faltante todos los días deja de servir para detectar el faltante de verdad: la gente se acostumbra a que "siempre da rojo" y ya nadie lo mira.

El **motivo es obligatorio** — un retiro sin explicación no se distingue de un faltante, que es justo lo que este registro viene a evitar. Solo efectivo: por la gaveta solo pasan billetes.

> **Lo puede anotar cualquiera del personal, no solo el dueño.** Es a propósito: el proveedor llega a media mañana y le cobra a quien esté en la barra, y si hiciera falta el dueño para anotarlo, no se anotaría. La contrapartida es que **todo movimiento sale firmado con nombre en el cierre Z**, y editarlo o borrarlo después es solo del admin. Contra alguien que quiera llevarse plata inventando un retiro, la defensa no es prohibirlo —haría el sistema inusable— sino que quede a la vista de quien revisa el sobre.

### El cierre Z y el corte X

Dos papeles de 80 mm que salen por la misma térmica que el tiquete:

| Cuál | Cuándo | De dónde salen los números |
|---|---|---|
| **Cierre Z** | Al cerrar el turno. Sale solo | De los totales **congelados** en el turno |
| **Corte X** | Cuando se quiera, con el turno abierto | Recontando las ventas del momento |

El **Z** es el que se grapa al sobre del efectivo. Trae ventas, neto, descuentos, IVA, desglose por medio de pago, **el detalle de cada movimiento con quién lo hizo**, el bloque de la gaveta (fondo + efectivo + entradas − salidas = esperado, contra lo contado) y las anulaciones del turno. El detalle va impreso para que la cuenta se pueda seguir con el papel en la mano, sin abrir la computadora. Se reimprime cuando haga falta desde el botón `Z` de la lista de cierres anteriores.

Sale de datos congelados a propósito: un Z reimpreso dentro de un año tiene que decir lo mismo que el del día. Si recontara las ventas, una anulación posterior le cambiaría los totales a un turno ya cerrado y el papel dejaría de cuadrar con el sobre que se guardó.

El **X** es una foto provisional: para revisar la gaveta a media mañana o dejar constancia en un cambio de persona. Se saca las veces que haga falta y no cierra nada.

### Mesas

La caja atiende las dos formas de sentarse, y no hay que decidir de antemano cuál se usa:

**Pide, paga y se sienta.** En la pantalla de venta, el botón de arriba del ticket dice *Para llevar*; se toca y se elige la mesa. Se cobra normal. **La mesa sale impresa grande en el tiquete**, así que ese mismo papel le sirve a la barra de comanda para saber a dónde llevarlo.

**Cuenta abierta.** En `/pos/mesas` está el salón. Se toca una mesa libre, se cargan los productos y se le da a **Dejar cuenta abierta** en vez de cobrar. La mesa queda marcada en rojo con lo que lleva consumido y desde cuándo.

- Para otra ronda: se toca la mesa ocupada, se agregan los productos y `Agregar a la cuenta`. Lo que ya estaba se ve arriba, en gris.
- La ronda aparece en `/pos/pedidos` para que la barra la prepare. Al marcarla **`Servido`** sale de esa cola, pero **la mesa sigue debiendo** en el salón. Si piden otra ronda, vuelve sola a la cola.
- Para cobrar: `Cobrar toda la cuenta`. Si quedaron productos sin agregar en el ticket, se suman solos antes de cobrar.
- El descuento en una cuenta se aplica a **todo lo consumido**, no solo a la última ronda.

La cantidad de mesas se cambia en **Ajustes → Cantidad de mesas** (arranca en 10). Se numeran del 1 en adelante.

Tres cosas que el sistema no deja hacer, a propósito:

- Abrir **dos cuentas en la misma mesa** — la segunda ronda iría a una y el cobro a la otra.
- **Cerrar la caja con mesas debiendo.** Avisa cuáles son. Una cuenta sin cobrar al cerrar el turno es plata que después cae en el turno siguiente y deja el arqueo de hoy corto sin explicación.
- Agregarle rondas a una cuenta **ya cobrada**.

Una cuenta abierta no entra al arqueo hasta que se paga, y entra en el turno en que se **cobró**, no en el que se abrió. Si una mesa se queda desde el mediodía hasta la tarde, la venta cuenta cuando pagó.

> Bajo el capó no hay ninguna tabla de mesas ni estado de mesa: una cuenta abierta es simplemente una venta con número de mesa que todavía no se cobró. Un segundo dato diciendo lo mismo tarde o temprano se desincroniza del pedido de verdad.

### Reglas que el sistema hace cumplir

- Una venta cobrada **no se puede editar**: ni líneas, ni descuento. Si hay un error, se **anula** con motivo y se hace una venta nueva. Así el arqueo de ayer no cambia solo.
- Anular no borra: queda el registro, con el motivo y quién lo hizo.
- Los precios y totales los calcula **siempre el servidor**. Del navegador solo viajan ids, cantidades y montos de pago.
- **Un pago nunca puede ser mayor que la venta que paga.** Si se teclea un billete de ₡20.000 para una venta de ₡8.900, se guardan ₡8.900 de venta y ₡11.100 de vuelto. Lo topa el servidor, no la pantalla: si se guardara el billete entero como cobrado, el efectivo del turno se inflaría y la caja cerraría con un faltante que nunca existió.
- **Una venta pagada siempre tiene fecha de pago.** Los reportes cortan por ahí, así que una venta sin esa fecha no aparecería en ninguno — ni en el del día, ni en el CSV del contador. Si se marca como pagada a mano en el panel y no se pone, la pone el sistema.
- El descuento se aplica al neto **antes** del IVA, para que cada línea siga sirviendo para facturar.
- Las ventas anuladas no cuentan en el arqueo, pero sí se cuentan aparte.

---

## Reportes (`/pos/reportes`)

Solo para administradores. Un cajero no ve el enlace y, si escribe la dirección a mano, tampoco entra: el guardia está en el servidor.

Se elige el período arriba —hoy, ayer, 7 días, 30 días, este mes, mes pasado, o un rango a mano— y **el rango queda en la dirección**, así que un reporte se guarda en favoritos o se manda por WhatsApp y llega igual al otro lado.

Qué trae:

- **De un vistazo:** total vendido, número de ventas, ticket promedio y neto sin IVA.
- **Cómo pagaron:** efectivo, tarjeta, SINPE. Una venta partida cuenta un cobro en cada fila.
- **De dónde vino:** mostrador contra pedido web.
- **Qué se vendió:** el ranking de productos por unidades, con su neto, su total y —si tienen costo puesto— su costo y su margen. Es el que decide qué se queda en el menú.
- **Margen bruto:** cuánto quedó después del costo, con **su cobertura al lado**.
- **A qué hora:** los picos del día, para saber cuánta gente poner.
- **IVA por tarifa:** base gravada e impuesto separados por porcentaje, que es como los pide la declaración.
- **Quién atendió**, **descuentos** (con motivo y responsable) y **anulaciones**.

Arriba hay dos exportaciones y un botón de imprimir:

| CSV | Qué trae | Para qué |
|---|---|---|
| **Ventas** | Una fila por venta | Cuadrar contra el banco y el arqueo |
| **Líneas** | Una fila por producto vendido, con CABYS y tarifa | Lo que pide el contador |

Los CSV salen con punto y coma y con BOM de UTF-8: es lo que necesita un Excel en español para no meter la fila entera en la primera columna ni comerse los acentos.

**Impreso sale en carta**, no en la tira de la térmica. El tiquete y el cierre Z siguen saliendo en 80 mm; son hojas de estilo distintas y cada una viaja solo con las páginas que la usan.

### El margen y su cobertura

Cada producto tiene un campo **Costo** en `Menú → Productos`: lo que le cuesta al negocio (grano, leche, vaso, tapa), sin IVA. Nunca se le muestra al cliente; solo alimenta el reporte.

Llenarlo es opcional, y ahí está la trampa que el reporte evita: **un producto sin costo no cuenta como margen del 100%**. Se aparta, sale con una raya en vez de un número, y el reporte dice qué porcentaje de lo vendido está mirando el margen. Si dijera "margen 78%" cuando solo la mitad del menú tiene costo, el número estaría inventado y las decisiones que salgan de él también.

El margen se mide contra el neto **después** del descuento: un 2x1 no cuesta la mitad de hacerlo, y eso tiene que verse.

> **El costo se congela al vender**, igual que el precio. Poner el costo hoy no recupera el margen de lo vendido ayer, y subir el precio del grano en marzo no cambia el margen de enero. Es la misma regla que hace que los pedidos viejos sigan cuadrando con sus facturas.

### Dos cosas que conviene saber

**Una venta cuenta el día que se cobró**, no el día que se abrió. Una mesa que se sienta al mediodía y paga a las cinco es plata de las cinco. Es el mismo criterio del arqueo; si fuera otro, los dos números discreparían y no habría manera de saber cuál creer. La única excepción es el reporte por hora, que usa la hora del pedido: ahí lo que interesa es cuándo entró la demanda.

**Las anulaciones se cuentan por el día en que se anularon**, no por el de la venta. Es un registro de lo que hizo el personal: si hoy alguien anula una venta de ayer, eso pasó hoy.

> Los reportes se arman sumando los pedidos en memoria, porque Payload no agrega. A 150 ventas diarias, un mes son unos 4.500 documentos y va sobrado. Por encima de 8.000 el reporte se planta y lo dice, en vez de dejar la caja pegada. Si algún día ese tope estorba de verdad, lo que toca es bajar a SQL por `payload.db.drizzle`, no subir el número.

### Probarla desde una tablet o un celular

La caja está pensada para usarse desde varios aparatos a la vez. Para abrirla desde otro dispositivo de la misma red wifi:

```bash
npm run dev:red
```

Arranca el sitio y, cuando ya sabe en qué puerto quedó, imprime la dirección buena:

```
  Desde una tablet o un celular en la misma red:

     http://192.168.5.248:3002/pos      (Wi-Fi)

  Ojo: este proyecto quedó en el puerto 3002, no en el 3000.
  El 3000 lo tiene otro proyecto y te va a mostrar un 404 suyo.
```

Existe porque hay dos formas de perder media hora acá:

- **La IP que Next.js imprime como `Network` puede ser mentira.** En una máquina con WSL, Docker o Hyper-V toma la dirección de la placa virtual (`172.x`, `192.168.56.x`), que no se ve desde el wifi.
- **El puerto no es siempre el 3000.** Si otro proyecto ya lo tiene, Next se corre al 3001 o al 3002. Y entrar al 3000 no da "no encontrado": muestra **el otro proyecto**, casi siempre con un 404 propio que parece un error de este. Si ves una URL con `/en/` o `/es/` metido donde no va, es eso.

Si querés un puerto fijo para que la tablet tenga siempre el mismo marcador, poné `next dev -p 3005` en el script `dev` del `package.json`.

Si aun con la dirección buena no carga, es el firewall de Windows: la primera vez que se arranca `node` sale un cartel preguntando si se le permite el acceso a la red, y hay que decir que sí. Si se le dijo que no, se arregla en *Firewall de Windows → Permitir una aplicación* marcando **Node.js JavaScript Runtime**. Ayuda que la red esté marcada como **privada** y no pública.

El login es el mismo: se entra una vez por aparato y la sesión queda.

> **La tablet no puede imprimir.** El tiquete sale por el driver de Windows de la máquina donde está abierto el navegador, así que solo imprime la PC que tiene la térmica conectada. El reparto natural es: **la PC de la caja cobra e imprime**, y **la tablet sirve para tomar pedidos de mesa y abrir cuentas**. Ambas ven lo mismo y se refrescan solas.

### La impresora térmica

El tiquete es HTML de 80 mm que se imprime con el driver normal de Windows. No hay que instalar nada más.

1. Instalá la impresora en Windows como cualquier otra y ponela **como predeterminada**.
2. Para que salga sin diálogo de impresión, arrancá Chrome así:

   ```
   chrome.exe --kiosk-printing http://localhost:3000/pos
   ```

   Conviene dejar un acceso directo con ese comando en el escritorio de la PC de la caja.

Sin `--kiosk-printing` funciona igual, solo que aparece el diálogo de Chrome y hay que darle a Imprimir.

> El tiquete dice *"Comprobante interno. No es factura electrónica."* y así tiene que quedar hasta que se conecte Hacienda 4.4.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (frontend)/          El sitio que ve el visitante
│   │   ├── [lang]/          Páginas bilingües: home, menu, visit
│   │   ├── sitemap.ts       Sitemap con hreflang
│   │   └── robots.ts
│   ├── (pos)/               La caja: vender, pedidos, arqueo, tiquete
│   └── (payload)/           Panel /admin y API (autogenerado)
├── collections/             Modelos de datos: Productos, Pedidos, Cajas…
├── globals/                 Ajustes del negocio
├── components/
│   ├── pos/                 Pantallas de la caja
│   └── …                    Nav, Hero, Footer, MenuClient…
├── i18n/                    Textos de interfaz fijos
├── lib/
│   ├── totales.ts           La aritmética de una venta (sin dependencias)
│   ├── movimientos.ts       Qué le hace cada movimiento a la gaveta (sin dependencias)
│   ├── pedidos.ts           Crear, cobrar y anular ventas
│   ├── caja.ts              Turnos, arqueo y movimientos
│   ├── reportes.ts          Toda la agregación de los reportes
│   ├── csv.ts               Exportación a CSV
│   ├── roles.ts             Quién puede qué
│   └── payload.ts           Acceso a Payload
├── middleware.ts            Sirve inglés en la raíz, español en /es
├── payload.config.ts        Configuración central de Payload
└── seed.ts                  Carga el contenido de ejemplo
```

**Un detalle que importa:** `lib/totales.ts` no importa nada, a propósito. Lo usan el hook de la colección `Pedidos`, la creación de ventas y la pantalla del cajero. Que la fórmula viva en un solo lugar es lo que garantiza que el número que ve el cajero sea el mismo que se guarda.

**Y otro:** toda la agregación de los reportes vive en `lib/reportes.ts`. La pantalla solo pinta y el CSV exporta lo mismo que se ve. Si el reporte de pantalla y el que se le manda al contador salieran de dos consultas distintas, tarde o temprano dirían cosas distintas.

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

Y para la caja:

- [ ] Poner la **cantidad de mesas** real en Ajustes
- [ ] Llenar **Ajustes → Tiquete de caja**: razón social y cédula jurídica (salen impresas)
- [ ] Crear una cuenta de **cajero** por persona, y dejar `admin` solo para el dueño
- [ ] Instalar la térmica en Windows como impresora predeterminada y probar un tiquete real
- [ ] Dejar el acceso directo de Chrome con `--kiosk-printing` en la PC de la caja
- [ ] Llenar el **CABYS** de cada producto antes de conectar Hacienda
- [ ] Llenar el **Costo** de cada producto, si se quiere ver margen. Se puede hacer de a poco: empezá por los diez que más se venden

---

## Lo que la caja todavía NO hace

Decisiones tomadas a conciencia, no olvidos:

- **No funciona sin internet.** Si se cae la conexión, no se vende por el POS. Hacer una cola local que aguante offline cuesta dos o tres veces lo que costó todo esto; se puede agregar después si hace falta de verdad.
- **No habla con el banco.** El cobro con tarjeta se hace en el datáfono, aparte, y en el POS se anota el monto.
- **No emite factura electrónica.** El tiquete es un comprobante interno. Los datos ya están todos guardados (CABYS y tarifa congelados por línea), así que conectar Hacienda 4.4 es agregar el emisor, no rehacer el modelo.
- **No tiene modificadores** (tamaño, leche de almendra, extra shot) ni inventario que se descuente solo.
- **No parte la cuenta entre varias personas.** Una mesa paga junta, aunque puede pagar mitad efectivo y mitad tarjeta. Dividir por producto es la parte más enredada de cualquier POS y se dejó afuera.
- **No mueve una cuenta de mesa a otra** ni junta dos mesas.
- **No abre el cajón de dinero** automáticamente: eso necesita hablar ESC/POS con la impresora, y acá se imprime por el driver de Windows.
- **No descuenta inventario.** El costo por producto es un número fijo que se escribe a mano, no una receta con insumos que se van gastando. Para un café está bien; para saber cuánta leche queda, no.
- **No maneja propinas.** Si alguien deja propina en efectivo dentro de la gaveta, descuadra el arqueo. Se puede anotar como movimiento, pero no hay un reporte de propinas por persona.

Lo que sigue, en orden de utilidad: modificadores (tamaño, leche de almendra, extra shot), pantalla de barra (KDS) con impresión automática de comanda, facturación electrónica, propinas.
