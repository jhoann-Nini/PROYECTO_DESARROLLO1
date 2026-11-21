---
name: springboot-api-auditor
description: Usar cuando en TecReview se cree, modifique o revise un endpoint REST del backend Spring Boot, un DTO, un servicio, reglas de SecurityConfig o AuthorizationManager, manejo de errores (400, 401, 403, 404, 409, 429), límites de peticiones, concurrencia en servicios o la documentación de la API (proyectos/docs/api.md, API_DOCUMENTATION.md).
---

# Auditor de API Spring Boot — TecReview

## Principio

El backend es la **autoridad final** de validación y autorización; el frontend solo oculta
botones. Cada endpoint debe estar protegido en dos capas (`SecurityConfig` + servicio),
recibir y devolver DTO, fallar con el formato de error común y estar documentado.

## Cuándo usarla / cuándo no

| Usar | No usar |
|---|---|
| Endpoints, DTO, servicios, seguridad, errores | Diferencias de esquema SQL → `supabase-auditor` |
| Revisar un contrato que consume el frontend (`frontend/src/services/api.ts`) | Flujo completo de moderación → `moderacion-inteligente` (que usa esta skill para la parte HTTP) |

## Hechos del proyecto

- **Spring Boot 4** (`spring-boot-starter-webmvc`, `springboot4-dotenv`), **Java 21**, Maven
  (`./mvnw`). Paquete base `com.example.backend` con capas `config`, `controller`, `dto`,
  `entity`, `exception`, `repository`, `service`. Nombres de dominio en español.
- Autenticación: JWT de Supabase (ES256) como resource server; en controladores
  `@AuthenticationPrincipal Jwt jwt`.
- Autorización (`config/SecurityConfig.java`):
  `/api/admin/**` → `AdminAuthorizationManager`; `/api/moderacion/**` →
  `ModeratorAuthorizationManager`; `/api/representante/**` → `RepresentativeAuthorizationManager`;
  escrituras de catálogo (`POST/PUT/PATCH/DELETE` de productos, categorías, marcas,
  establecimientos) → admin; GET públicos de catálogo; resto `authenticated()`.
  **El orden de los `requestMatchers` importa** (el primero que coincide gana).
- Límite general: `GeneralRateLimitingFilter` (100 peticiones/60 s, configurable) tras el
  filtro de bearer. Límite de reportes: `LimiteReportesService` (10/h).
- DTO como `record` con Bean Validation y `@Valid @RequestBody`.
- Errores: `exception/GlobalExceptionHandler.java` maneja `ConflictException` (409),
  `TooManyRequestsException` (429), `ResponseStatusException`, `ResourceNotFoundException`
  (404), validación (400), JSON ilegible, tipo de parámetro y `Exception` genérica.
- **Hallazgo conocido**: `ErrorResponse` existe dos veces (`dto/` y `exception/`); el
  manejador usa la de `exception/`. Señalarlo; no borrar ninguna sin aprobación.
- Fichas técnicas: `GET/PUT/PATCH /api/productos/{id}/ficha-tecnica` pasan por
  `FichaTecnicaV3Dispatcher` (400 ante versión inválida o V3 inválida).
- Persistencia: `ddl-auto=validate`, `open-in-view=false` (cuidado con lazy loading fuera
  de transacción).

Convenciones detalladas: [references/convenciones-backend.md](references/convenciones-backend.md).

## Procedimiento

1. **Ruta y seguridad**: localiza el matcher que aplica en `SecurityConfig` (en orden) y el
   `AuthorizationManager`; confirma la revalidación de rol y estado de cuenta en el servicio.
2. **Entrada**: DTO `record` con restricciones (`@NotNull`, `@Size`, `@Pattern`…); nunca
   aceptar del cliente campos que decide el servidor (usuario, estado, fechas).
3. **Salida**: DTO de respuesta; ninguna entidad JPA serializada directamente.
4. **Errores**: cada caso de fallo mapeado a la excepción del proyecto y su código.
5. **Transacciones y concurrencia**: `@Transactional` en el servicio; revisar condiciones de
   carrera (hay pruebas de concurrencia y bloqueo pesimista que sirven de patrón).
6. **Contrato con el frontend**: el tipo en `frontend/src/types/` y la función en
   `frontend/src/services/api.ts` deben coincidir con el DTO.
7. **Documentación**: `proyectos/docs/api.md` (sección numerada) y
   `proyectos/backend/API_DOCUMENTATION.md`.
8. **Pruebas**: matriz rol × endpoint (ver referencia).

## Reglas obligatorias

- No cambiar la arquitectura de capas ni introducir librerías sin autorización.
- Cada endpoint nuevo: pruebas de 401 (sin token) y 403 (rol insuficiente) siguiendo
  `EndpointsNuevos401y403IntegrationTest` / `LineaBaseSeguridadTest`.
- Antes de usar una API de Spring Boot 4 / Spring Security 7 que no aparezca ya en el código,
  consultar la documentación vigente (context7).
- No exponer secretos ni valores de `application.properties` que vengan de variables de entorno.

## Validaciones

Desde `proyectos/backend`: `./mvnw test` (o `-Dtest=<Clase>` mientras se itera; al final, la
suite completa). Recordar que H2 no ejecuta triggers.

## Criterios de aceptación

- Matriz de roles del endpoint completa y probada.
- Errores en el formato común con el código correcto.
- DTO y tipos del frontend alineados; documentación actualizada.
- `./mvnw test` en verde.

## Errores frecuentes

| Error | Corrección |
|---|---|
| Añadir un matcher después de uno más general | Colocar el específico antes (el orden decide) |
| Proteger solo en `SecurityConfig` | Revalidar en el servicio (cuenta activa, conflicto de interés) |
| Devolver la entidad para "ahorrar" un DTO | Crear el `record` de respuesta |
| Lanzar `RuntimeException` genérica | Usar `ResourceNotFoundException`, `ConflictException`, `TooManyRequestsException` o `ResponseStatusException` |
| Acceder a relaciones lazy en el controlador | Resolver en el servicio dentro de la transacción (`open-in-view=false`) |
