# Pruebas de integración del backend

Este documento describe las pruebas automatizadas disponibles actualmente en el backend de TecnoReview y cómo ejecutarlas.

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
  - **Calidad de código:** Pasa `npm run lint` con 0 errores y `npm run build` con código de salida 0.

