# API del Backend – TecReview

## Tabla de contenidos
- [Descripción general](#descripción-general)
- [Entidades y DTOs relevantes](#entidades-y-dtos-relevantes)
- [Rutas de `CategoriaController`](#rutas-de-categoriacontroller)
- [Manejo de errores (`ErrorResponse`)](#manejo-de-errores)
- [Entorno y ejecución](#entorno-y-ejecución)
- [Ejecución de pruebas](#ejecución-de-pruebas)

---

## Descripción general
El backend está construido con **Spring Boot 4** (Java 21) y utiliza **JPA** para la persistencia. Las pruebas usan una base de datos en memoria **H2** configurada en `src/main/resources/application.properties`. No existen dependencias de OpenAPI/Swagger en el proyecto.

---

## Entidades y DTOs relevantes
| Clase | Paquete | Comentario |
|-------|---------|------------|
| `Categoria` | `entity` | Entidad JPA con campos `idCategoria`, `nombre`, `descripcion` y `estado` (boolean) que indica si está activa. |
| `CategoriaRequest` | `dto` | DTO de entrada para crear/actualizar una categoría (`nombre`, `descripcion`). |
| `CategoriaResponse` | `dto` | DTO de salida con los mismos campos que la entidad, incluido `estado`. |
| `ErrorResponse` | `exception` | DTO estándar para respuestas de error (ver sección abajo). |

---

## Rutas de `CategoriaController`
| HTTP | Ruta | Descripción | Cuerpo de petición | Código de respuesta | Cuerpo de respuesta |
|------|------|-------------|--------------------|---------------------|---------------------|
| `GET` | `/api/categorias` | Lista todas las categorías **activas**. | – | `200 OK` | Array de `CategoriaResponse` |
| `GET` | `/api/categorias/{id}` | Obtiene la categoría por id. Si la categoría **no existe** o está **inactiva** se devuelve 404. | – | `200 OK` (exitoso) <br> `404 NOT FOUND` (no encontrada o inactiva) | `CategoriaResponse` (200) <br> `ErrorResponse` (404) |
| `POST` | `/api/categorias` | Crea una nueva categoría (estado = true). | `CategoriaRequest` (JSON) | `201 CREATED` | `CategoriaResponse` |
| `PUT` | `/api/categorias/{id}` | Actualiza nombre y descripción de la categoría existente. | `CategoriaRequest` (JSON) | `200 OK` | `CategoriaResponse` |
| `DELETE` | `/api/categorias/{id}` | **Eliminación lógica**: marca la categoría como `estado = false`. | – | `204 NO CONTENT` (eliminación correcta) <br> `409 CONFLICT` (la categoría ya estaba inactiva) | – (204) <br> `ErrorResponse` (409) |

### Detalles de los errores
| Código | Situación | Mensaje en `ErrorResponse.message` |
|--------|-----------|-----------------------------------|
| `404` | `ResourceNotFoundException` lanzada por `CategoriaService.obtenerPorId` cuando la categoría no existe **o** está inactiva. | `Categoría no encontrada con id {id}` |
| `409` | `ConflictException` lanzada por `CategoriaService.eliminar` si la categoría ya está inactiva. | `Categoría ya está inactiva` |
| `500` | Cualquier excepción no controlada (`Exception`). | `An unexpected error occurred. Please try again later.` |

---

## Manejo de errores (`ErrorResponse`)
```java
public class ErrorResponse {
    private LocalDateTime timestamp; // momento del error
    private int status;              // código HTTP
    private String error;            // frase del código (e.g., "Not Found")
    private String message;          // mensaje específico de la excepción
    private String path;             // URI solicitada
}
```
El `GlobalExceptionHandler` captura:
- `ConflictException` → 409
- `ResourceNotFoundException` → 404
- cualquier otra `Exception` → 500 con mensaje genérico.
Todos los errores se registran con **SLF4J** (`log.error("Unexpected server error", ex)`) sin exponer datos sensibles al cliente.

---

## Entorno y ejecución
| Requisito | Valor | Comentario |
|-----------|-------|------------|
| Java | 21 | Versión especificada en `pom.xml` (`<java.version>21</java.version>`). |
| Maven | 3.x (wrapper incluido) | Usa `./mvnw`. |
| Base de datos | H2 (memoria) para pruebas; PostgreSQL (runtime) configurado vía variables de entorno. |
| Variables de entorno (sin valores) |
| `SPRING_DATASOURCE_URL` |
| `SPRING_DATASOURCE_USERNAME` |
| `SPRING_DATASOURCE_PASSWORD` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` |
| `DOTENV_CONFIG_PATH` |
| `...` | Se cargan desde `.env` o `.env.example`. No se deben versionar ni exponer valores. |

Para lanzar la aplicación en modo desarrollo:
```bash
./mvnw spring-boot:run   # o java -jar target/backend-0.0.1-SNAPSHOT.jar
```
El servidor escucha por defecto en `http://localhost:8080`.

---

## Ejecución de pruebas
```bash
# Ejecuta todos los tests (incluye integración y unidad)
./mvnw -B clean test
```
- Las pruebas usan H2; no afectan la base de datos de producción.
- `CategoriaControllerIntegrationTest` verifica los escenarios de 404, 204 → 404 y 409.
- `CategoriaServiceTest` cubre la lógica de negocio.

---

## OpenAPI / Swagger
Actualmente el proyecto **no incluye** ninguna dependencia ni configuración de OpenAPI/Swagger (búsqueda en `pom.xml` no encontró `springdoc` ni `swagger`). Si se desea, se puede añadir en el futuro la dependencia `springdoc-openapi-starter-webmvc-ui` y generar la especificación a partir del código existente.

---

## Próximos pasos recomendados
1. Añadir la dependencia y configuración de OpenAPI si se necesita documentación automática.
2. Mantener el `README.md` raíz actualizado con un enlace a este archivo (`API_DOCUMENTATION.md`).
3. Revisar que las variables de entorno necesarias para PostgreSQL estén documentadas en el `.env.example`.

---

*Documento generado a partir del código fuente y de las pruebas actuales. No se han introducido cambios de lógica ni dependencias.*
