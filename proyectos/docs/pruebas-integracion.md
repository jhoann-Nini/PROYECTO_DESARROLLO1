# Pruebas de integración del backend

Este documento describe las pruebas automatizadas disponibles actualmente en el backend de TecReview y cómo ejecutarlas.

Para los escenarios funcionales y textos visibles del flujo de reseñas/valoraciones, consulta [Casos de prueba y textos de la interfaz](./casos-prueba-textos-interfaz-resenas.md).

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


---

## S2-20: Pruebas de permisos de edición y eliminación de reseñas

### 1. Alcance y objetivo
Validar de forma automatizada e integral el control de acceso, propiedad y roles para las operaciones de modificación (PUT /api/resenas/{id}) y eliminación (DELETE /api/resenas/{id}):
- **Autor legítimo:** Puede modificar el comentario de su reseña (200 OK) y desactivarla mediante borrado lógico (204 No Content).
- **Usuario no autor (impostor):** Es rechazado con HTTP 403 Forbidden tanto al intentar modificar como al intentar eliminar la reseña de otro usuario.
- **Administrador:** Cuenta con permisos de moderación para eliminar reseñas ajenas (204 No Content), pero tiene estrictamente restringida la edición del contenido de una reseña ajena (403 Forbidden) para preservar la autenticidad e integridad del texto emitido por el autor original.
- **Usuario inactivo / suspendido:** Sus peticiones son rechazadas con HTTP 403 Forbidden.
- **Peticiones anónimas o sin credenciales válidas:** Rechazadas con HTTP 401 Unauthorized y cabecera WWW-Authenticate.
- **Reseñas eliminadas:** Intentar editar o volver a eliminar una reseña previamente desactivada (estado = false) resulta en HTTP 404 Not Found.
- **Frontend resiliente:** Los componentes de interfaz (EditarResena.tsx) capturan fallos del backend (403, errores de red o servidor) mostrando mensajes de error controlados al usuario sin provocar caídas de la aplicación ni estados inconsistentes.

### 2. Matriz de pruebas y resultados (Backend & Frontend)

| ID | Operación / Endpoint | Rol / Sujeto | Condición previa | Resultado esperado | Resultado obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **S2-20-01** | PUT /api/resenas/{id} | Autor legítimo | Reseña activa (estado = true) | HTTP 200 OK, comentario actualizado | HTTP 200 OK, campo modificado | **APROBADO** |
| **S2-20-02** | DELETE /api/resenas/{id} | Autor legítimo | Reseña activa | HTTP 204 No Content, estado = false | HTTP 204 No Content | **APROBADO** |
| **S2-20-03** | PUT /api/resenas/{id} | Usuario no autor (impostor) | Reseña pertenece a otro usuario | HTTP 403 Forbidden, contenido intacto | HTTP 403 Forbidden | **APROBADO** |
| **S2-20-04** | DELETE /api/resenas/{id} | Usuario no autor (impostor) | Reseña pertenece a otro usuario | HTTP 403 Forbidden, reseña no eliminada | HTTP 403 Forbidden | **APROBADO** |
| **S2-20-05** | DELETE /api/resenas/{id} | Administrador | Reseña activa de usuario estándar | HTTP 204 No Content (moderación permitida) | HTTP 204 No Content | **APROBADO** |
| **S2-20-06** | PUT /api/resenas/{id} | Administrador | Reseña pertenece a usuario estándar | HTTP 403 Forbidden (edición denegada a admin) | HTTP 403 Forbidden | **APROBADO** |
| **S2-20-07** | PUT /api/resenas/{id} | Autor legítimo | Reseña previamente eliminada (estado = false) | HTTP 404 Not Found | HTTP 404 Not Found | **APROBADO** |
| **S2-20-08** | DELETE /api/resenas/{id} | Autor legítimo | Reseña previamente eliminada (estado = false) | HTTP 404 Not Found | HTTP 404 Not Found | **APROBADO** |
| **S2-20-09** | PUT /api/resenas/{id} | Sin token / Anónimo | Token ausente | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **APROBADO** |
| **S2-20-10** | DELETE /api/resenas/{id} | Sin token / Anónimo | Token ausente | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **APROBADO** |
| **S2-20-11** | PUT /api/resenas/{id} | Token inválido / malformado | Token corrupto | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **APROBADO** |
| **S2-20-12** | DELETE /api/resenas/{id} | Token inválido / malformado | Token corrupto | HTTP 401 Unauthorized | HTTP 401 Unauthorized | **APROBADO** |
| **S2-20-13** | UI Modal Editar | Frontend (EditarResena.tsx) | Backend rechaza con 403 o error | Mensaje de error controlado en diálogo, interfaz funcional | Alerta visible, botón reactivado | **APROBADO** |
| **S2-20-14** | UI Modal Eliminar | Frontend (EditarResena.tsx) | Backend rechaza con 403 o error | Mensaje de error controlado en diálogo, interfaz funcional | Alerta visible, botón reactivado | **APROBADO** |

### 3. Cobertura en suites de prueba
- **Backend:** com.example.backend.controller.ResenaPropiedadIntegrationTest (20 pruebas aprobadas con MockMvc y H2 en memoria).
- **Frontend:** proyectos/frontend/src/app/resenas/EditarResena.test.tsx (cobertura de respuestas y captura de errores controlados).

---

## S2-39: Pruebas del endpoint para reportar reseñas

### 1. Alcance y objetivo
Validar de forma automatizada e integral los endpoints para reportar reseñas (`POST /api/resenas/{idResena}/reportes`, `POST /api/reportes/resenas/{idResena}` y `POST /api/reportes`):
- **Registro exitoso:** Usuario autenticado registra reporte con estado inicial `PENDIENTE` (`201 Created`).
- **Autenticación obligatoria:** Solicitudes sin token reciben `401 Unauthorized`.
- **Prevención de autorreporte:** Un usuario no puede reportar su propia reseña (`403 Forbidden`).
- **Integridad de reseñas:** No se pueden reportar reseñas inexistentes o eliminadas lógicamente (`404 Not Found`).
- **Validación de motivos y descripción:** Motivos válidos (`spam`, `lenguaje-ofensivo`, `falso`, `otro`). Si el motivo es `otro`, se exige descripción no vacía (`400 Bad Request`).
- **Prevención de reportes duplicados:** Un usuario no puede emitir múltiples reportes sobre la misma reseña (`409 Conflict`).
- **Múltiples reportantes:** Distintos usuarios pueden reportar una misma reseña de forma independiente.
- **Consulta privada:** El endpoint `/api/reportes/mis-reportes` solo expone los reportes propios del usuario autenticado.
- **Principio Zero-Trust:** El backend ignora campos de identidad o estado inyectados en el cuerpo de la petición.
- **Compatibilidad de rutas y cuerpo:** Validación de las tres rutas soportadas (`POST /api/resenas/{idResena}/reportes`, alias `/api/reportes/resenas/{idResena}`, y ruta plana `/api/reportes` con validación de `idResena` obligatorio).

### 2. Matriz de pruebas y resultados

| ID | Operación / Endpoint | Condición / Escenario | Resultado esperado | Resultado obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **S2-39-01** | `POST /api/resenas/{id}/reportes` | Usuario autenticado, datos válidos | `201 Created`, estado `PENDIENTE` | `201 Created` | **APROBADO** |
| **S2-39-02** | `POST /api/resenas/{id}/reportes` | Sin autenticación (anónimo) | `401 Unauthorized` | `401 Unauthorized` | **APROBADO** |
| **S2-39-03** | `POST /api/resenas/{id}/reportes` | Intento de autorreporte | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-39-04** | `POST /api/resenas/{id}/reportes` | Reseña inexistente (id no existe) | `404 Not Found` | `404 Not Found` | **APROBADO** |
| **S2-39-05** | `POST /api/resenas/{id}/reportes` | Reseña eliminada lógicamente | `404 Not Found` | `404 Not Found` | **APROBADO** |
| **S2-39-06** | `POST /api/resenas/{id}/reportes` | Motivo 'otro' sin descripción | `400 Bad Request` | `400 Bad Request` | **APROBADO** |
| **S2-39-07** | `POST /api/resenas/{id}/reportes` | Motivo inválido no permitido | `400 Bad Request` | `400 Bad Request` | **APROBADO** |
| **S2-39-08** | `POST /api/resenas/{id}/reportes` | Segundo reporte del mismo usuario | `409 Conflict` | `409 Conflict` | **APROBADO** |
| **S2-39-09** | `POST /api/resenas/{id}/reportes` | Dos usuarios diferentes reportan | `201 Created` para ambos | `201 Created` | **APROBADO** |
| **S2-39-10** | `GET /api/reportes/mis-reportes` | Usuario consulta sus reportes | `200 OK`, solo reportes propios | `200 OK` | **APROBADO** |
| **S2-39-11** | `POST /api/resenas/{id}/reportes` | Verificación de estado inicial | Estado estrictamente `PENDIENTE` | `PENDIENTE` | **APROBADO** |
| **S2-39-12** | `POST /api/resenas/{id}/reportes` | Intento de inyectar idUsuario/estado | Campos ignorados por backend | Ignorados | **APROBADO** |
| **S2-39-13** | `POST /api/reportes/resenas/{id}` | Creación mediante alias de ruta | `201 Created`, reporte persistido | `201 Created` | **APROBADO** |
| **S2-39-14** | `POST /api/reportes` | `idResena` en cuerpo JSON | `201 Created`, reporte persistido | `201 Created` | **APROBADO** |
| **S2-39-15** | `POST /api/reportes` | Ausencia de `idResena` en cuerpo | `400 Bad Request` | `400 Bad Request` | **APROBADO** |

### 3. Cobertura en suites de prueba
- **Backend:** `com.example.backend.controller.ReporteResenaIntegrationTest` (15 pruebas aprobadas al 100% con MockMvc y H2 en memoria).

---

## S2-42: Pruebas del endpoint para listar reseñas pendientes y reportadas

### 1. Alcance y objetivo
Validar de forma automatizada e integral los endpoints de moderación para consultar reseñas reportadas y pendientes (`GET /api/moderacion/resenas/reportadas`, `GET /api/moderacion/resenas/pendientes` y `GET /api/moderacion/reportes`):
- **Moderador y Administrador:** Acceso autorizado (`200 OK`) con agrupación de reseñas, métricas de reportes (`totalReportes`, `reportesPendientes`) y detalle individual de cada reporte.
- **Usuario registrado / Tienda:** Rechazo inmediato con `403 Forbidden`.
- **Usuario inactivo / suspendido:** Rechazo con `403 Forbidden`.
- **Sin autenticación:** Rechazo con `401 Unauthorized`.
- **Filtros funcionales:** Filtrado por `estado` del reporte, `oculta` (filtrando exclusivamente por `ocultaPorReportes` sin mezclar con `ocultaPorModeracion`) e `idProducto`.
- **Aislamiento:** Reseñas sin reportes no aparecen en la cola de moderación.
- **Autorización multirrol estricta:** Un usuario con rol moderador revocado en la tabla multirrol (`usuario_rol.estado = false`) recibe `403 Forbidden`, sin recurrir al campo legado `usuario.id_rol`.
- **Inmutabilidad en lectura:** Las consultas no modifican estados de reseñas, estados de reportes ni insertan registros en las tablas de auditoría.

### 2. Matriz de pruebas y resultados

| ID | Endpoint / Operación | Rol / Condición | Resultado esperado | Resultado obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **S2-42-01** | `GET /api/moderacion/resenas/reportadas` | Administrador activo | `200 OK` con reseñas reportadas | `200 OK` | **APROBADO** |
| **S2-42-02** | `GET /api/moderacion/resenas/reportadas` | Moderador activo | `200 OK` con reseñas reportadas | `200 OK` | **APROBADO** |
| **S2-42-03** | `GET /api/moderacion/resenas/reportadas` | Usuario regular | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-42-04** | `GET /api/moderacion/resenas/reportadas` | Representante tienda (sin mod) | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-42-05** | `GET /api/moderacion/resenas/reportadas` | Moderador suspendido (`estado=false`) | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-42-06** | `GET /api/moderacion/resenas/reportadas` | Sin autenticación | `401 Unauthorized` | `401 Unauthorized` | **APROBADO** |
| **S2-42-07** | `GET /api/moderacion/resenas/reportadas?estado=PENDIENTE` | Moderador activo | `200 OK` solo reportes con estado PENDIENTE | `200 OK` | **APROBADO** |
| **S2-42-08** | `GET /api/moderacion/resenas/reportadas?idProducto=X` | Moderador activo | `200 OK` filtrado por producto específico | `200 OK` | **APROBADO** |
| **S2-42-09** | `GET /api/moderacion/resenas/reportadas?oculta=true` | Moderador activo | `200 OK` solo reseñas con `ocultaPorReportes=true` | `200 OK` | **APROBADO** |
| **S2-42-10** | `GET /api/moderacion/resenas/reportadas` | Reseñas limpias (sin reportes) | Excluidas de la respuesta | Excluidas | **APROBADO** |
| **S2-42-11** | `GET /api/moderacion/resenas/reportadas` | Moderador activo | Agrupación correcta con datos de producto y autor | Datos correctos | **APROBADO** |
| **S2-42-12** | `GET /api/moderacion/resenas/reportadas` | Moderador activo | Conteos `totalReportes` y `reportesPendientes` | Conteos exactos | **APROBADO** |
| **S2-42-13** | `GET /api/moderacion/resenas/reportadas` | Moderador revocado (`usuario_rol.estado=false`) | `403 Forbidden` (no usa rol legado) | `403 Forbidden` | **APROBADO** |
| **S2-42-14** | `GET /api/moderacion/resenas/reportadas` | Moderador activo | Inmutabilidad: sin cambios en estados ni auditoría | 0 alteraciones | **APROBADO** |
| **S2-42-15** | `GET /api/moderacion/resenas/pendientes` | Moderador activo | `200 OK` atajo a reportes pendientes | `200 OK` | **APROBADO** |
| **S2-42-16** | `GET /api/moderacion/reportes` | Moderador activo | `200 OK` (filtro PENDIENTE por defecto y filtrado explícito por estado) | `200 OK` | **APROBADO** |
| **S2-42-17** | `GET /api/moderacion/resenas/pendientes` y `?estado=PENDIENTE` | Reportes mixtos (2 PENDIENTE, 1 ACEPTADO) | `totalReportes=3`, `reportesPendientes=2`, 3 reportes en historial | `totalReportes=3`, `reportesPendientes=2` | **APROBADO** |

### 3. Cobertura de pruebas
- **Suite:** `com.example.backend.controller.ModeracionResenasIntegrationTest` (17 pruebas ejecutadas y aprobadas al 100%).


---

## S2-43: Pruebas de acciones operativas de moderación (Ocultar, Publicar, Rechazar)

### 1. Alcance y objetivo
Validar de forma automatizada las operaciones de moderación sobre reseñas y reportes:
- **Ocultar reseña:** Modificación de `ocultaPorModeracion = true` y persistencia obligatoria del evento en `resena_moderacion_auditoria` con `saveAndFlush`.
- **Publicar / restaurar reseña:** Reversión de `ocultaPorModeracion = false` y persistencia del evento `RESTAURAR` en `resena_moderacion_auditoria`.
- **Rechazo de reportes individual y en lote:** Transición de reportes en `EN_REVISION` a `RECHAZADO` con registro individual en `reporte_resena_decision_auditoria`.
- **Control de acceso y autorización multirrol:** Moderadores y administradores activos autorizados. Rechazo con `403 Forbidden` a usuarios regulares, representantes de tienda, cuentas suspendidas y moderadores revocados en la tabla `usuario_rol`. Rechazo con `401 Unauthorized` a llamadas anónimas.
- **Conflicto de interés:** Prohibición estricta de moderar reseñas propias o resolver reportes propios (`403 Forbidden`).
- **Respeto a la máquina de estados:** Intentar rechazar un reporte en `PENDIENTE` sin pasar por `EN_REVISION` devuelve `409 Conflict`.
- **Independencia de flags:** Las acciones manuales no modifican ni sobreescriben `ocultaPorReportes` ni el borrado lógico.
- **Recálculo de umbral:** Al bajar los reportes activos no rechazados a menos de 3, se restablece `ocultaPorReportes = false`.
- **Integridad de auditoría:** Cada acción válida genera exactamente un evento en la misma transacción; solicitudes rechazadas no generan auditoría.

### 2. Matriz de pruebas y resultados

| ID | Operación / Endpoint | Rol / Condición | Resultado esperado | Resultado obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **S2-43-01** | `PUT /api/moderacion/resenas/{id}/ocultar` | Moderador activo | `200 OK`, `ocultaPorModeracion = true` | `200 OK` | **APROBADO** |
| **S2-43-02** | `POST /api/moderacion/resenas/{id}/ocultar` | Administrador activo | `200 OK`, `ocultaPorModeracion = true` | `200 OK` | **APROBADO** |
| **S2-43-03** | `PUT /api/moderacion/resenas/{id}/ocultar` | Usuario regular | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-43-04** | `PUT /api/moderacion/resenas/{id}/ocultar` | Representante tienda | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-43-05** | `PUT /api/moderacion/resenas/{id}/ocultar` | Moderador suspendido (`estado=false`) | `403 Forbidden` | `403 Forbidden` | **APROBADO** |
| **S2-43-06** | `PUT /api/moderacion/resenas/{id}/ocultar` | Moderador revocado en multirrol | `403 Forbidden` (no usa rol legado) | `403 Forbidden` | **APROBADO** |
| **S2-43-07** | `PUT /api/moderacion/resenas/{id}/ocultar` | Solicitud anónima | `401 Unauthorized` | `401 Unauthorized` | **APROBADO** |
| **S2-43-08** | `PUT /api/moderacion/resenas/{id}/ocultar` | Moderador sobre reseña propia | `403 Forbidden` (conflicto de interés) | `403 Forbidden` | **APROBADO** |
| **S2-43-09** | `PUT /api/moderacion/resenas/{id}/ocultar` | Reseña inexistente | `404 Not Found` | `404 Not Found` | **APROBADO** |
| **S2-43-10** | `PUT /api/moderacion/resenas/{id}/ocultar` | Reseña eliminada por su autor | `409 Conflict` | `409 Conflict` | **APROBADO** |
| **S2-43-11** | `PUT /api/moderacion/resenas/{id}/publicar` | Reseña eliminada por su autor | `409 Conflict` | `409 Conflict` | **APROBADO** |
| **S2-43-12** | `PUT /api/moderacion/resenas/{id}/ocultar` | Reseña ya oculta manualmente | `409 Conflict` | `409 Conflict` | **APROBADO** |
| **S2-43-13** | `PUT /api/moderacion/resenas/{id}/publicar` | Reseña visible (no oculta) | `409 Conflict` | `409 Conflict` | **APROBADO** |
| **S2-43-14** | `PUT /api/moderacion/resenas/{id}/ocultar` | Reseña con reportes independientes | `ocultaPorModeracion = true`, `ocultaPorReportes` sin alterar | `ocultaPorReportes=false` | **APROBADO** |
| **S2-43-15** | `PUT /api/moderacion/resenas/{id}/publicar` | Reseña con ambas causas de ocultamiento | `ocultaPorModeracion = false`, conserva `ocultaPorReportes = true` | Conserva `ocultaPorReportes` | **APROBADO** |
| **S2-43-16** | `PUT /api/moderacion/reportes/{id}/rechazar` | Reporte en estado PENDIENTE | `409 Conflict` (máquina de estados estricta) | `409 Conflict` | **APROBADO** |
| **S2-43-17** | `PUT /api/moderacion/reportes/{id}/rechazar` | Reporte en EN_REVISION asignado | `200 OK`, `estado = RECHAZADO` | `200 OK` | **APROBADO** |
| **S2-43-18** | `PUT /api/moderacion/reportes/{id}/rechazar` | Moderador autor del reporte | `403 Forbidden` (no autorresolución) | `403 Forbidden` | **APROBADO** |
| **S2-43-19** | `PUT /api/moderacion/reportes/{id}/rechazar` | Reseña con 3 reportes, queda en 2 activos | `200 OK`, restablece `ocultaPorReportes = false` | `ocultaPorReportes=false` | **APROBADO** |
| **S2-43-20** | `PUT /api/moderacion/resenas/{id}/rechazar-reportes` | Todos en EN_REVISION | `200 OK`, todos en RECHAZADO, `ocultaPorReportes = false` | `200 OK` | **APROBADO** |
| **S2-43-21** | `PUT /api/moderacion/resenas/{id}/rechazar-reportes` | Existen reportes aún en PENDIENTE | `409 Conflict` | `409 Conflict` | **APROBADO** |
| **S2-43-22** | `PUT /api/moderacion/resenas/{id}/ocultar` | Moderador activo | Genera 1 registro en `resena_moderacion_auditoria` (`OCULTAR`) | 1 registro auditado | **APROBADO** |
| **S2-43-23** | `PUT /api/moderacion/resenas/{id}/publicar` | Moderador activo | Genera 1 registro en `resena_moderacion_auditoria` (`RESTAURAR`) | 1 registro auditado | **APROBADO** |
| **S2-43-24** | `PUT /api/moderacion/reportes/{id}/rechazar` | Admin activo | Genera 1 registro en `reporte_resena_decision_auditoria` (`RECHAZADO`) | 1 registro auditado | **APROBADO** |
| **S2-43-25** | `PUT /api/moderacion/resenas/{id}/ocultar` | Solicitud rechazada por 403 | 0 registros generados en tablas de auditoría | 0 registros | **APROBADO** |

### 3. Cobertura de suites
- **Suite focalizada:** `com.example.backend.controller.ModeracionAccionesIntegrationTest` (25 pruebas ejecutadas y aprobadas al 100%).
- **Suite completa del backend:** 351 pruebas ejecutadas, 0 fallos, 0 errores, 0 omitidas (`BUILD SUCCESS`).
