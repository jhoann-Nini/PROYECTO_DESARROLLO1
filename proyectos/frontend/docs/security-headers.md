# Cabeceras de seguridad del frontend

## Alcance

`next.config.ts` aplica las cabeceras generadas por
`src/lib/securityHeaders.ts` a todas las rutas mediante la función `headers()`
de Next.js. La lógica está cubierta por
`src/lib/securityHeaders.test.ts`.

Cabeceras incluidas:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` sin cámara, geolocalización, micrófono, pagos ni USB
- `Strict-Transport-Security` solo en producción

`poweredByHeader: false` ya evita anunciar `X-Powered-By`.

## Decisión sobre CSP

La aplicación se sirve de forma estática y no usa nonces. Aplicar nonces
obligaría a renderizar dinámicamente todas las páginas y a perder el caché de
CDN, por lo que se siguió la guía incluida en Next.js para CSP sin nonces:

- `script-src 'self' 'unsafe-inline'` y `style-src 'self' 'unsafe-inline'`.
  Next.js inyecta scripts y estilos inline durante la hidratación.
- `script-src` añade `'unsafe-eval'` únicamente en desarrollo porque React lo
  necesita para la depuración.
- `connect-src` incluye `ws:` en desarrollo para el HMR de Next.js.

Esta política reduce el riesgo de inyección externa, pero no es una CSP
estricta: `'unsafe-inline'` permite scripts inline. Endurecerla requeriría
nonces o SRI experimental y un cambio de estrategia de renderizado que no se
justifica en esta tarea.

## Orígenes externos

Los orígenes configurables se toman de `NEXT_PUBLIC_API_URL` y
`NEXT_PUBLIC_SUPABASE_URL` al construir la aplicación:

- `connect-src` limita las peticiones a `'self'`, la API y Supabase, incluidos
  sus equivalentes `ws://`/`wss://` para Realtime.
- Si alguna variable no está disponible durante el build, se usa el fallback
  `https:`/`wss:` para no romper el despliegue. En ese caso la política es más
  amplia de lo deseable y conviene configurar las variables en Vercel.
- `img-src` permite `'self'`, `blob:`, `data:` y cualquier origen `https:`
  porque las imágenes de producto pueden alojarse en tiendas o CDN externos.
  Los orígenes HTTP configurados se añaden para el desarrollo local.
- `font-src` se limita a `'self'` y `data:`: `next/font/google` descarga y
  sirve las fuentes desde el propio dominio en tiempo de build.
- `frame-ancestors 'none'` y `X-Frame-Options: DENY` bloquean el embebido en
  iframes. No hay iframes propios ni integraciones que los necesiten.

## Limitaciones de despliegue

- Las cabeceras de `next.config.ts` las aplica el servidor de Next.js. Vercel
  las respeta sin necesidad de `vercel.json`; si se despliega detrás de otro
  proxy o CDN, ese proveedor debe conservarlas.
- Los archivos servidos directamente por un CDN externo (por ejemplo, objetos
  públicos de Supabase Storage) no heredan estas cabeceras. Su configuración
  corresponde al proveedor de almacenamiento.
- `upgrade-insecure-requests` solo se emite en producción. Cualquier imagen o
  API servida por HTTP en producción será bloqueada o actualizada a HTTPS, así
  que los orígenes deben ser HTTPS.
- La CSP no sustituye la validación en backend ni la sanitización de datos.
  Tampoco protege contra XSS almacenado que se renderice como texto por React.
- HSTS se anuncia con `includeSubDomains` y `preload`. Si el dominio se usa
  también para servicios HTTP ajenos al frontend, revisar esa decisión antes
  de publicarlo.
- Al cambiar de dominio de API o de proyecto de Supabase hay que reconstruir la
  aplicación: las variables `NEXT_PUBLIC_*` se fijan en tiempo de build.

## Verificación

```bash
npx vitest run src/lib/securityHeaders.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

Con el servidor levantado:

```bash
curl -I http://localhost:3000/
```

En producción, comprobar que la respuesta incluye `Content-Security-Policy`,
`Strict-Transport-Security` y que la consola del navegador no muestra errores
de CSP al cargar fuentes, imágenes de producto, Supabase ni la API.
