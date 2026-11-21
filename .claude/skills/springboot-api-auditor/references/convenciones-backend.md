# Convenciones del backend TecReview

Rutas relativas a `proyectos/backend/`.

## Capas

| Capa | Ejemplo | Regla |
|---|---|---|
| `controller` | `ProductoController` (`@RequestMapping("/api/productos")`) | Delgado: valida con `@Valid`, obtiene `Jwt`, delega al servicio |
| `dto` | `ReporteOfertaRequest`, `ProductoResponse` (records) | Entrada y salida separadas; sin entidades |
| `service` | `ReporteOfertaService`, `ModeracionReportesOfertaService` | Reglas de negocio, `@Transactional`, revalidación de permisos |
| `repository` | Spring Data JPA | Consultas derivadas o `@Query`; bloqueos cuando hay concurrencia |
| `entity` | `Producto` (`caracteristicas` JSONB con `@JdbcTypeCode(SqlTypes.JSON)`) | Debe coincidir con la BD (`ddl-auto=validate`) |
| `exception` | `GlobalExceptionHandler` | Formato de error común |
| `config` | `SecurityConfig`, `*AuthorizationManager`, `GeneralRateLimitingFilter`, `WebConfig` (CORS) | Seguridad y transversales |

## Matriz de pruebas por endpoint

| Caso | Esperado | Patrón existente |
|---|---|---|
| Sin token | 401 | `EndpointsNuevos401y403IntegrationTest` |
| Token con rol insuficiente | 403 | `AutorizacionAdminIntegrationTest`, `TiendaVerificada403IntegrationTest` |
| Cuenta suspendida | 403 | pruebas de moderación |
| Cuerpo inválido | 400 | `ProductoControllerValidationTest` |
| Recurso inexistente | 404 | `ProductoControllerReferenciaInexistenteTest` |
| Duplicado / conflicto | 409 | `ReporteOfertaIntegrationTest` |
| Límite superado | 429 | `ResenaServiceRateLimitTest`, `GeneralRateLimitingIntegrationTest` |
| Concurrencia | sin duplicados ni estados inválidos | `ResenaServiceConcurrencyTest`, `ReporteResenaRepositoryLockingTest` |
| Trigger PostgreSQL | comportamiento real | `ReporteResenaPostgresIntegrationTest` (Testcontainers, requiere Docker) |

## Documentación de API

- `proyectos/docs/api.md`: secciones numeradas (p. ej. §29 acciones de moderación de reseñas,
  §30 revisión de reseñas, §31 reportes de ofertas). Añadir una sección nueva por funcionalidad.
- `proyectos/backend/API_DOCUMENTATION.md`: referencia del backend.
- Otros: `proyectos/docs/usuarios-y-roles.md`, `proyectos/docs/pruebas-integracion.md`.

## Configuración

- `src/main/resources/application.properties`: valores por variables de entorno
  (`POSTGRES_USER`, `SUPABASE_JWT_ISSUER`, `RATE_LIMIT_GENERAL_*`…). Nunca imprimir valores
  reales de `.env`.
- `src/test/resources/application.properties`: H2 en memoria, `create-drop`.
