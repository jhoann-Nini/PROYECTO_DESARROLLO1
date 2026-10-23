# Pruebas de integración del backend

Este documento describe las pruebas automatizadas disponibles actualmente en el backend de TecReview y cómo ejecutarlas.

## Requisitos

- Java JDK 21, según la versión declarada en `proyectos/backend/pom.xml`.
- No es necesario instalar Maven por separado: el repositorio incluye Maven Wrapper (`mvnw.cmd`).

## Ejecutar las pruebas

Abre PowerShell en la carpeta raíz del repositorio y ejecuta:

```powershell
cd proyectos\backend
.\mvnw.cmd test
```

Para ejecutar únicamente la prueba del endpoint de salud:

```powershell
.\mvnw.cmd -Dtest=HealthControllerTest test
```

Para ejecutar únicamente la prueba de carga del contexto:

```powershell
.\mvnw.cmd -Dtest=BackendApplicationTests test
```

Para ejecutar únicamente la prueba de los datos de productos con H2:

```powershell
.\mvnw.cmd -Dtest=ProductoFixtureIntegrationTest test
```

Una ejecución correcta termina con `BUILD SUCCESS`. Maven también guarda los resultados de cada prueba en `target/surefire-reports/`, dentro de `proyectos/backend`.

### Resultado de la última ejecución

Ejecución realizada el 6 de octubre de 2026:

```text
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Pruebas disponibles

### `HealthControllerTest`

Ubicación: `src/test/java/com/example/backend/controller/HealthControllerTest.java`.

Usa `@WebMvcTest(HealthController.class)` y `MockMvc` para probar la capa web sin iniciar un servidor HTTP externo. Envía una solicitud `GET /api/health` y comprueba que:

- la respuesta tenga estado HTTP `200`;
- el JSON contenga `{"status":"UP"}`.

El controlador también devuelve `"service":"backend"`; la prueba actual no valida ese campo.

### `ProductoControllerTest`

Ubicación: `src/test/java/com/example/backend/controller/ProductoControllerTest.java`.

Prueba con `MockMvc` el listado y la creación de un producto usando un servicio simulado. Comprueba respuestas HTTP y el JSON; no escribe en la base de datos.

### `BackendApplicationTests`

Ubicación: `src/test/java/com/example/backend/BackendApplicationTests.java`.

Usa `@SpringBootTest` para cargar el contexto completo de Spring Boot. La prueba `contextLoads` verifica que la aplicación pueda iniciar su contexto; no envía solicitudes HTTP ni valida operaciones de persistencia.

### `ProductoFixtureIntegrationTest`

Ubicación: `src/test/java/com/example/backend/ProductoFixtureIntegrationTest.java`.

Lee los seis registros de `src/test/resources/fixtures/productos-prueba.json`, crea sus categorías y marcas en H2, envía cada producto por `POST /api/productos` con `MockMvc` y comprueba que queden seis productos activos persistidos. Usa el controlador y servicio reales. La transacción de prueba se revierte al terminar.

## Base de datos de pruebas

`src/test/resources/application.properties` configura una base H2 en memoria (`jdbc:h2:mem:testdb`) y `spring.jpa.hibernate.ddl-auto=create-drop`. La base se crea para la ejecución de pruebas y se descarta al terminar. `ProductoFixtureIntegrationTest` verifica el endpoint `POST /api/productos`, la persistencia y las referencias a categorías y marcas en H2. Ninguna prueba se conecta a Supabase/PostgreSQL.

## Alcance actual y siguiente cobertura

Las pruebas cubren salud, solicitudes al controlador y persistencia local en H2. Aún no son pruebas de extremo a extremo entre frontend, API y Supabase/PostgreSQL.

---

## Pruebas de integración del frontend

### `CP-05`: Consumir endpoint desde el frontend

- **Responsable:** Adrian Caicedo (AC)
- **Tareas vinculadas:** `TEC-22` (S1-13) y `TEC-44` (CP-05).
- **Componentes involucrados:**
  - `proyectos/frontend/src/services/api.ts` (función `obtenerProductos`).
  - `proyectos/frontend/src/app/page.tsx` (consumo reactivo y renderizado).
  - `proyectos/frontend/src/app/productos/page.tsx` (inspector de respuesta JSON).
- **Procedimiento de ejecución:**
  1. Configurar la URL base en `proyectos/frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8080`.
  2. Iniciar el frontend con `npm run dev` en `http://localhost:3000`.
  3. Navegar a la página principal y verificar la llamada HTTP asíncrona hacia `/api/productos`.
- **Criterios de aceptación y resultados verificados:**
  - **Solicitud HTTP correcta:** El cliente dispara la petición `GET` al endpoint configurado sin errores de sintaxis ni bloqueos.
  - **Manejo de estado de carga:** Muestra indicadores esqueléticos / mensajes de carga mientras espera la respuesta.
  - **Tolerancia a fallos y manejo de errores:** Si el backend está inactivo o responde con error HTTP, se captura mediante `ApiError` y se presenta un mensaje amigable o activación de datos de respaldo sin que la aplicación se caiga.
  - **Calidad de código:** Pasa `npm test` (9/9 pruebas con Vitest), `npm run lint` con código de salida 0 y `npm run build` con código de salida 0.

### Matriz de validación CP-S1-09 (Integración Frontend–Backend)

| Escenario | Tipo | Pasos ejecutados | Resultado esperado | Resultado observado | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Carga del frontend en el navegador** | Automatizado + Manual | Iniciar `npm run dev` y abrir `http://localhost:3000` en el navegador. | Interfaz renderizada sin fallos de compilación ni errores de JavaScript. | El frontend carga en el navegador correctamente sin errores. | **APROBADO** |
| **2. Petición GET a `/api/productos`** | Automatizado + Manual | Inspección de red en navegador hacia `http://localhost:8080/api/productos` con backend activo. | Petición recibida por Spring Boot; respuesta HTTP 200 con JSON. | `GET http://localhost:8080/api/productos` responde HTTP 200 con JSON de productos. | **APROBADO** |
| **3. Validación de cabeceras CORS** | Automatizado + Manual | Verificación de cabeceras HTTP y consola del navegador (F12). | `Access-Control-Allow-Origin: http://localhost:3000` presente; consola limpia de bloqueos CORS. | La cabecera CORS permite `http://localhost:3000` y no se generan errores de origen cruzado. | **APROBADO** |
| **4. Visualización de productos en el catálogo** | Automatizado + Manual | Carga de catálogo con backend conectado en `/` y `/productos`. | Renderizado dinámico de tarjetas con nombre, descripción y precio de productos. | Los productos recibidos aparecen correctamente en el catálogo. | **APROBADO** |
| **5. Backend apagado / Desconexión del servidor** | Automatizado + Manual | Cargar frontend con el servicio Spring Boot apagado. | Captura de `ApiError`, activación de modo local y mensaje amigable de desconexión. | El frontend muestra mensaje de desconexión del servidor y activa modo local sin caerse. | **APROBADO** |
| **6. Respuesta de API con lista vacía (`[]`)** | Automatizado + Manual | Simular respuesta HTTP 200 con `[]` en `http://localhost:8080/api/productos` con frontend activo en `http://localhost:3000`. | En `/` activa fallback `PRODUCTOS_MOCK` e indicador "Modo local"; en `/productos` indica "0 productos registrados". | En `/` activa modo local con catálogo de respaldo; en `/productos` muestra "0 productos registrados" sin tarjetas. | **APROBADO** |

**Estado general de CP-S1-09:** **APROBADO**. Se completó la validación de los 6 escenarios de integración entre el frontend y el endpoint `/api/productos` (carga, comunicación HTTP, CORS, renderizado, tolerancia a desconexión y respuesta con lista vacía).

---

### `CP-S1-10`: Manejo de estados vacíos y errores del frontend

- **Componentes involucrados:**
  - `proyectos/frontend/src/services/api.ts` (cliente HTTP y manejo de excepciones `ApiError`).
  - `proyectos/frontend/src/services/api.test.ts` (suite unitaria de 9 pruebas en entorno `node` con Vitest).
  - `proyectos/frontend/src/app/productos/page.tsx` (vista de catálogo con diagnóstico e informe visual de errores).
  - `proyectos/frontend/src/app/productos/page.test.tsx` (suite de 7 pruebas de componentes en entorno `happy-dom` con Testing Library).
  - `proyectos/frontend/src/app/page.tsx` (página principal con consumo reactivo, degradación suave con fallback `PRODUCTOS_MOCK` e insignia "Modo local").
  - `proyectos/frontend/src/app/page.test.tsx` (suite de 7 pruebas de componentes en entorno `happy-dom` con Testing Library).
- **Criterios de calidad verificados:**
  - **Pruebas unitarias y de componentes (`npm test`):** **23 pruebas aprobadas** en 3 archivos (`api.test.ts` [9], `productos/page.test.tsx` [7], `page.test.tsx` [7]).
  - **Análisis estático (`npm run lint`):** Código de salida 0 (ejecución de ESLint finalizada exitosamente sin incidencias reportadas).
  - **Compilación de producción (`npm run build`):** Código de salida 0 (Next.js Turbopack y comprobación TypeScript finalizados exitosamente en 5 rutas estáticas).
  - **Aislamiento:** Las pruebas simulan respuestas de la API mediante mocks (`vi.mock("@/services/api")`) sin llamadas de red ni dependencias de Supabase o backend real.

#### Matriz de validación CP-S1-10 (Cliente API, Vista `/productos` y Vista `/`)

| Escenario | Capa / Tipo | Prueba existente | Evidencia de ejecución | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **1. Respuesta HTTP 200 con lista vacía (`[]`)** | Servicio API + Vistas (`/` y `/productos`) | `api.test.ts` (retorno `[]`), `productos/page.test.tsx` (muestra "0 productos", sin tarjetas) y `page.test.tsx` (activa `PRODUCTOS_MOCK` y "Modo local"). | `npm test` aprobado (23/23 pruebas). | **APROBADO** |
| **2. Backend no disponible / Error de red** | Servicio API + Vistas (`/` y `/productos`) | `api.test.ts` (captura `fetch` reject), `productos/page.test.tsx` (banner de error de conexión) y `page.test.tsx` (fallback a mock y "Modo local"). | Vitest aprobado + Verificado manualmente en navegador. | **APROBADO** |
| **3. Respuesta HTTP 500 del backend** | Servicio API + Vistas (`/` y `/productos`) | `api.test.ts` (status 500), `productos/page.test.tsx` (banner con mensaje de error 500) y `page.test.tsx` (fallback a mock y "Modo local"). | Vitest aprobado en todas las suites. | **APROBADO** |
| **4. Respuesta JSON malformado** | Servicio API + Vistas (`/` y `/productos`) | `api.test.ts` (SyntaxError), `productos/page.test.tsx` (banner con mensaje de JSON no válido) y `page.test.tsx` (fallback a mock y "Modo local"). | Vitest aprobado en todas las suites. | **APROBADO** |
| **5. Estructura inesperada (no array)** | Servicio API + Vistas (`/` y `/productos`) | `api.test.ts` (objeto no array), `productos/page.test.tsx` (banner de formato no esperado) y `page.test.tsx` (fallback a mock y "Modo local"). | Vitest aprobado en todas las suites. | **APROBADO** |
| **6. Estado de carga inicial** | Vistas (`/` y `/productos`) | `productos/page.test.tsx` (muestra "Consultando catálogo...") y `page.test.tsx` (muestra "Cargando catálogo de dispositivos..." e insignia inicial "Modo local"). | Vitest aprobado + Verificado visualmente en navegador. | **APROBADO** |
| **7. Respuesta exitosa con productos** | Servicio API + Vistas (`/` y `/productos`) | `api.test.ts` (retorno tipado), `productos/page.test.tsx` (contador y tarjetas) y `page.test.tsx` (insignia "Servidor conectado" y productos recibidos). | Vitest aprobado en todas las suites. | **APROBADO** |
| **8. Diferencias de resiliencia entre `/` y `/productos`** | Arquitectura / Interfaz | Validado mediante suites automatizadas independientes (`page.test.tsx` confirma resiliencia y fallback en Home; `productos/page.test.tsx` confirma diagnóstico explícito sin mock). | Vitest aprobado en ambas suites de componentes. | **APROBADO** |

**Estado general de CP-S1-10:** **COMPLETADO — PRUEBAS AUTOMATIZADAS**. Se validaron satisfactoriamente los 23 casos de prueba automatizados distribuidos en 3 suites (9 en `api.test.ts`, 7 en `productos/page.test.tsx` y 7 en `page.test.tsx`) simulando respuestas mediante mocks sin dependencias externas de red ni Supabase. No se reclama una cobertura total del código, sino la aprobación y verificación estricta de los 23 escenarios reportados.
