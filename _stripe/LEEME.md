# Pagos con Stripe: puesta en marcha

La web está en GitHub Pages, que solo sirve archivos estáticos, y la clave secreta de Stripe **nunca** puede estar en el navegador. Por eso el pago pasa por un pequeño **Cloudflare Worker** (el plan gratuito sobra). Este Worker:

1. Recibe la cesta (solo los ids de las obras) y el país de envío.
2. Lee los precios reales de `https://perelluisleon.art/catalog.json`, que genera `node build.js`, y calcula el envío (España 30 €, UE y Reino Unido 200 €, resto del mundo 400 €).
3. Crea una sesión de **Stripe Checkout** y devuelve la URL de pago. El cliente paga en la página segura de Stripe con tarjeta, Apple Pay o Google Pay, e introduce allí su dirección y teléfono.
4. Cuando el pago se completa, Stripe avisa al Worker (webhook) y la obra queda marcada como **vendida**. Así nadie más puede comprarla, aunque la web aún no se haya regenerado.

Mientras `endpoint` esté vacío en `app.js`, la web sigue funcionando como hasta ahora: el pedido se envía por correo.

---

## 1. Claves de Stripe

En <https://dashboard.stripe.com>:

- **Desarrolladores → Claves de API**: copia la **clave secreta** (`sk_test_…` para pruebas y `sk_live_…` para cobrar de verdad). No la pegues nunca en ningún archivo del repositorio.
- **Configuración → Pagos → Métodos de pago**: activa tarjeta, Apple Pay, Google Pay, Bizum (si está disponible), etc.
- **Configuración → Datos públicos de la empresa**: el nombre y el logo que verá el cliente en la página de pago.
- **Configuración → Correos electrónicos de clientes**: activa los recibos de pago automáticos.

## 2. Publicar el Worker

Necesitas una cuenta gratuita en <https://dash.cloudflare.com> y Node.js en tu ordenador.

```bash
cd _stripe
npx wrangler login
```

```bash
npx wrangler kv namespace create SOLD
```

Pega el `id` que devuelve este último comando en `wrangler.toml` (quita los `#` de las tres líneas `[[kv_namespaces]]`).

```bash
npx wrangler secret put STRIPE_SECRET_KEY
```

(pega la clave `sk_test_…` cuando te la pida)

```bash
npx wrangler deploy
```

Al terminar te dará una URL del estilo `https://pll-stripe.TU-SUBDOMINIO.workers.dev`.

## 3. Webhook (marcar obras como vendidas)

En Stripe, **Desarrolladores → Webhooks → Añadir destino**:

- URL: `https://pll-stripe.TU-SUBDOMINIO.workers.dev/webhook`
- Eventos: `checkout.session.completed` y `checkout.session.async_payment_succeeded`

Copia el **secreto de firma** (`whsec_…`) y guárdalo en el Worker:

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

## 4. Activar el pago en la web

En `app.js`, línea de configuración:

```js
const C={price:3000,email:'ilust.medical@gmail.com',endpoint:'https://pll-stripe.TU-SUBDOMINIO.workers.dev/checkout'};
```

Después ejecuta `node build.js` (así la FAQ explica el pago con tarjeta) y publica los cambios.

## 5. Probar y pasar a real

1. Con la clave `sk_test_…`, compra cualquier obra usando la tarjeta de prueba `4242 4242 4242 4242` (cualquier fecha futura y cualquier CVC).
2. Comprueba que llegas a la página de «Gracias», que el pago aparece en Stripe y que la obra sale como vendida en la web.
3. Borra la marca de vendida de la prueba: Cloudflare → Workers → KV → SOLD → elimina la clave de esa obra.
4. Para cobrar de verdad: `npx wrangler secret put STRIPE_SECRET_KEY` con la clave `sk_live_…` y crea el webhook también en **modo real** (con su propio `whsec_…`).

## Después de cada venta

Stripe te envía un correo con el pedido, la dirección de envío y el teléfono del cliente. Para que la obra salga como vendida de forma permanente (también en Google):

1. En `data.js`, pon `"s":true` en esa obra.
2. Ejecuta `node build.js` y publica.
3. Opcional: borra su clave en el KV `SOLD`.

## Seguridad

- El navegador solo envía ids: el precio y el envío se calculan siempre en el Worker a partir de `catalog.json`.
- Solo se aceptan peticiones desde `perelluisleon.art` (`ALLOWED_ORIGINS` en `wrangler.toml`).
- Los avisos de Stripe se verifican con la firma HMAC del webhook.
- Cada sesión de pago caduca a los 30 minutos y solo admite la dirección de envío del país elegido, de modo que el envío cobrado siempre corresponde al destino.
