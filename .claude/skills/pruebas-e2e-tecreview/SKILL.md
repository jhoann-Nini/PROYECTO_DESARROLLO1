---
name: pruebas-e2e-tecreview
description: Usar cuando en TecReview se pida crear, ampliar o arreglar pruebas end to end (E2E) o de navegador, probar un flujo completo como un usuario (iniciar sesión, publicar, reseñar, comparar), configurar Playwright, simular el backend o la sesión de Supabase en pruebas, o correr la app real contra el backend local sin el CAPTCHA.
---

# Pruebas end to end — TecReview

## Principio

Una prueba E2E abre la app real en un navegador y la usa como una persona. En TecReview
hay **dos capas**, y cada prueba declara a cuál pertenece:

| Capa | Qué es real | Qué se simula | Dónde corre |
|---|---|---|---|
| **A. Navegador + API simulada** (la mayoría) | Next.js compilado, React, el navegador | Backend y Supabase, con `page.route` | Local y CI, en cada PR |
| **B. Pila completa local** (pocos recorridos críticos) | Next.js, Spring Boot, PostgreSQL con las migraciones y triggers | Solo Supabase Auth: sesión firmada con una clave local | Local, a mano antes de un PR grande |

La sesión **nunca** pasa por el formulario de inicio de sesión: Supabase exige Turnstile y
una prueba no puede resolverlo. Se inyecta con `soporte/sesion.ts`. El formulario de inicio
de sesión ya tiene pruebas de componente (`AuthModal.test.tsx`).

## Antes de empezar (aprobaciones)

TecReview aún no tiene Playwright. Pide aprobación explícita antes de lo siguiente. Aprobación es que la persona diga que sí a
**esa acción concreta** («instálalo», «sí, toca la CI»); pedir la tarea con urgencia no lo es.
Mientras esperas, escribe los archivos de prueba:
1. instalar `@playwright/test` como devDependency de `proyectos/frontend` y el navegador (`npx playwright install chromium`);
2. modificar `.github/workflows/ci.yml` (añadir el job E2E);
3. cualquier cambio de configuración del backend. La capa B **no lo necesita**: todo va por propiedades `-D`.

Lee también `proyectos/frontend/AGENTS.md`: Next.js 16 tiene cambios incompatibles; consulta
`node_modules/next/dist/docs/` antes de tocar rutas.

## Estructura

```
proyectos/frontend/
  playwright.config.ts        # proyectos "simulada" y "pila-completa"
  e2e/soporte/sesion.ts       # copia de soporte/sesion.ts de esta skill
  e2e/soporte/api-simulada.ts # copia de soporte/api-simulada.ts
  e2e/simulada/*.spec.ts      # capa A
  e2e/pila-completa/*.spec.ts # capa B (references/pila-completa.md)
```
Añade a `.gitignore`: `playwright-report/`, `test-results/`, `e2e/.auth/`. Excluye `e2e/**`
de Vitest en `vitest.config.ts`. Scripts: `"test:e2e": "playwright test --project=simulada"`
y `"test:e2e:pila": "playwright test --project=pila-completa"`.

## Configuración de Playwright

`webServer` es de toda la corrida, no de cada proyecto, y las dos capas compilan en el mismo
`.next` con variables distintas. Elige el servidor según una variable de entorno y corre las
capas por separado, nunca a la vez:

```ts
const PILA = process.env.E2E_PILA === "1";
export default defineConfig({
  testDir: "e2e",
  projects: [
    { name: "simulada", testDir: "e2e/simulada", use: { baseURL: "http://127.0.0.1:3100" } },
    { name: "pila-completa", testDir: "e2e/pila-completa", use: { baseURL: "http://127.0.0.1:3101" } },
  ],
  webServer: PILA ? SERVIDORES_PILA /* backend 8081 + frontend 3101 */ : SERVIDOR_SIMULADA,
  use: { trace: "retain-on-failure" },
  retries: process.env.CI ? 1 : 0,
});
```
`"test:e2e:pila": "E2E_PILA=1 playwright test --project=pila-completa"`. Cada corrida recompila
`.next`. Después, `npm run build` deja el build normal.

## Capa A: configuración

Las `NEXT_PUBLIC_*` se fijan **al compilar**: el servidor de pruebas compila con valores ficticios
que apuntan a hosts donde no escucha nada, para que cualquier llamada no simulada falle en vez de
llegar a un servicio real.

```ts
// playwright.config.ts (proyecto "simulada")
const ENV_SIMULADA = {
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:3999",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
};
// webServer: { command: "npm run build && npm run start -- -p 3100", url: "http://127.0.0.1:3100",
//              env: ENV_SIMULADA, reuseExistingServer: !process.env.CI, timeout: 240_000 }
// use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" }
```

## Capa A: una prueba completa

```ts
import { expect, test } from "@playwright/test";
import { firmarToken, generarClave, inyectarSesion } from "../soporte/sesion";
import { json, simularApi } from "../soporte/api-simulada";

const API = "http://127.0.0.1:3999";
const SUPABASE = "http://127.0.0.1:54399";
const ana = { sub: "0b6c6c1e-1f0a-4f55-9f43-2b8c3c9d1a10", email: "ana@e2e.test", nombre: "Ana" };

test("con sesión, crea una publicación y llega a su detalle", async ({ page }) => {
  const token = firmarToken(generarClave(), ana, `${SUPABASE}/auth/v1`);
  await inyectarSesion(page, SUPABASE, token, ana);
  const creadas: unknown[] = [];
  const { noPrevistas } = await simularApi(page, API, {
    "GET /api/comunidad/publicaciones": (r) => json(r, 200, { items: [], nextCursor: null, total: 0 }),
    "POST /api/comunidad/publicaciones": (r, cuerpo) => {
      creadas.push(cuerpo);
      expect(r.request().headers().authorization).toBe(`Bearer ${token}`);
      return json(r, 201, { idPublicacion: 101, titulo: "¿Qué portátil compro?", /* resto de PublicacionDetalle */ });
    },
    "GET /api/comunidad/publicaciones/101": (r) => json(r, 200, { idPublicacion: 101, titulo: "¿Qué portátil compro?" /* … */ }),
    "GET /api/comunidad/publicaciones/101/respuestas": (r) => json(r, 200, { items: [], nextCursor: null }),
  }, { idUsuario: 7, nombre: ana.nombre, correo: ana.email });

  await page.goto("/comunidad");
  await expect(page.getByText(/todavía no hay publicaciones/i)).toBeVisible();
  await page.getByRole("button", { name: "Nueva publicación" }).click();
  await page.getByLabel("Título").fill("¿Qué portátil compro?");
  await page.getByLabel("Contenido").fill("Busco 16 GB de RAM.");
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(page).toHaveURL(/\/comunidad\/publicacion\/101$/);
  await expect(page.getByRole("heading", { name: "¿Qué portátil compro?" })).toBeVisible();
  expect(creadas).toEqual([{ tipo: "GENERAL", idProducto: null, titulo: "¿Qué portátil compro?", contenido: "Busco 16 GB de RAM." }]);
  expect(noPrevistas).toEqual([]);
});
```

Reglas de la capa A:
- **Las formas de las respuestas salen de `src/types/*.ts` y `docs/api.md`**, no de la imaginación: una respuesta simulada mal formada prueba otra app.
- **Termina cada prueba con `expect(noPrevistas).toEqual([])`.**
- **Sin sesión:** no llames a `inyectarSesion`; `simularApi` sin perfil.
- **404 en el detalle:** la página muestra «Esta publicación no existe o ya no está disponible».
- **Errores (401, 403, 409, 429):** el manejador responde `json(r, 429, { message: "…" })` y la prueba busca el texto del servidor con `getByRole("alert").filter({ hasText: "…" })`. Next.js añade su propio `role="alert"` (el anunciador de rutas), así que `getByRole("alert")` solo falla por modo estricto.
- **Server Components:** `page.route` no ve las llamadas que hace el servidor (por ejemplo, `app/productos/[id]/page.tsx` llama a `obtenerProductoPorId` antes de pintar). En la capa A esas llamadas fallan por conexión rechazada; prueba ahí solo lo que la página tolera, y lo demás en la capa B.

## Capa B

Lee `references/pila-completa.md`: PostgreSQL local con el esquema de producción, servidor JWKS
local, backend con `-D` y frontend apuntando a ambos. Nunca contra Supabase, Render o Vercel.

## Esperas

Solo aserciones que esperan solas (`await expect(locator).toBeVisible()`, `toHaveURL`,
`toHaveText`) o `page.waitForResponse` de una petición concreta. Para «que cargue», espera el
contenido que la persona ve, no el estado de carga.

## Selectores

`getByRole` con nombre accesible, luego `getByLabel` y `getByText`. Los textos de la interfaz
están en español y son parte del contrato. Si un elemento no tiene nombre accesible, es un
problema de accesibilidad: corrígelo en el componente.

## CI (solo con aprobación)

Job `e2e` en `ci.yml`, con `needs: frontend`:
- Node 22;
- `npm ci` y `npx playwright install --with-deps chromium`;
- `npm run test:e2e`;
- `actions/upload-artifact` de `playwright-report/` con `if: failure()`.

Sin secretos: la capa A no los necesita. La capa B no va a la CI.

## Validaciones antes de terminar

- `npm run test:e2e`, y `npm run test:e2e:pila` si tocaste la capa B, con la salida real.
- `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`: el build normal debe seguir compilando con las variables reales. Las de la capa A solo viven en `webServer.env`.
- Después, la skill `tecreview-qa`.

## Errores frecuentes

| Error | Corrección |
|---|---|
| Iniciar sesión por el formulario y simular Turnstile o el endpoint de token de Supabase | `inyectarSesion` |
| Olvidar `GET /api/usuarios/me` | La app actúa como sin sesión; `simularApi` lo responde si le pasas el perfil |
| Responder 404 a todo lo no previsto | Las listas lo pintan como «vacío» y la prueba pasa en falso; usa `noPrevistas` |
| `page.waitForTimeout(…)` | Una aserción que espera |
| Apuntar a Supabase, Render o Vercel reales, o crear usuarios en producción | Capa A con hosts ficticios o capa B local |
| Esperar que `page.route` intercepte lo que pide un Server Component | Probarlo en la capa B |
| Instalar Playwright o tocar la CI sin preguntar | Pedir aprobación primero |
