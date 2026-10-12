# CRUD implementado — TecnoReview Backend

Este documento describe los endpoints **realmente implementados y probados** contra Supabase, a diferencia de `api.md` que recoge el diseño planeado. Se actualiza a medida que se agregan entidades.

**Base URL local:** `http://localhost:8080`
**Formato:** JSON
**Autenticación:** ninguna todavía (pendiente de definir — ver sección "Pendientes")

---

## Convenciones comunes a todos los recursos

- **Eliminación lógica:** `DELETE` nunca borra la fila. Marca `estado = false` y el registro deja de aparecer en los `GET` de listado, pero sigue existiendo en la base de datos (porque otras entidades pueden referenciarlo por clave foránea).
- **Listados:** solo devuelven registros con `estado = true`.
- **Validación:** los campos marcados `@NotBlank`/`@NotNull` en el request devuelven `400 Bad Request` si faltan o están vacíos.
- **Recurso no encontrado:** `404 Not Found` con cuerpo `ErrorResponse` (ver abajo) cuando el `id` no existe.
- **Formato de error**, igual en todos los endpoints (definido en `GlobalExceptionHandler`):

```json
{
  "timestamp": "2026-09-29T20:15:03.123Z",
  "status": 404,
  "error": "Not Found",
  "message": "Categoría no encontrada con id 99",
  "path": "/api/categorias/99"
}
```

---

## Categoria

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| GET | `/api/categorias` | — | `200` — lista de `CategoriaResponse` |
| GET | `/api/categorias/{id}` | — | `200` / `404` |
| POST | `/api/categorias` | `CategoriaRequest` | `201` — `CategoriaResponse` |
| PUT | `/api/categorias/{id}` | `CategoriaRequest` | `200` / `404` |
| DELETE | `/api/categorias/{id}` | — | `204` / `404` (eliminación lógica) |

**CategoriaRequest**
```json
{
  "nombre": "Celulares",
  "descripcion": "Smartphones y accesorios"
}
```
`nombre`: obligatorio, máx. 100 caracteres. `descripcion`: opcional.

**CategoriaResponse**
```json
{
  "idCategoria": 1,
  "nombre": "Celulares",
  "descripcion": "Smartphones y accesorios",
  "estado": true
}
```

---

## Marca

Misma estructura que Categoria (sin relaciones).

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| GET | `/api/marcas` | — | `200` — lista de `MarcaResponse` |
| GET | `/api/marcas/{id}` | — | `200` / `404` |
| POST | `/api/marcas` | `MarcaRequest` | `201` — `MarcaResponse` |
| PUT | `/api/marcas/{id}` | `MarcaRequest` | `200` / `404` |
| DELETE | `/api/marcas/{id}` | — | `204` / `404` (eliminación lógica) |

**MarcaRequest**
```json
{
  "nombre": "Samsung",
  "descripcion": "Electrónica y tecnología"
}
```

**MarcaResponse**
```json
{
  "idMarca": 1,
  "nombre": "Samsung",
  "descripcion": "Electrónica y tecnología",
  "estado": true
}
```

---

## Producto

Primera entidad con relaciones: referencia `Categoria` y `Marca` por `id`. El servicio resuelve ambas referencias antes de guardar — si el `idCategoria` o `idMarca` enviado no existe, responde `404` con el mensaje correspondiente (`"Categoría no encontrada con id X"` o `"Marca no encontrada con id X"`), en vez de un error crudo de base de datos.

| Método | Endpoint | Body | Respuesta |
|---|---|---|---|
| GET | `/api/productos` | — | `200` — todos los activos |
| GET | `/api/productos?idCategoria={id}` | — | `200` — filtrados por categoría |
| GET | `/api/productos?idMarca={id}` | — | `200` — filtrados por marca |
| GET | `/api/productos/{id}` | — | `200` / `404` |
| POST | `/api/productos` | `ProductoRequest` | `201` — `ProductoResponse` |
| PUT | `/api/productos/{id}` | `ProductoRequest` | `200` / `404` |
| DELETE | `/api/productos/{id}` | — | `204` / `404` (eliminación lógica) |

**ProductoRequest**
```json
{
  "nombre": "Galaxy S25",
  "descripcion": "Flagship 2026",
  "idCategoria": 1,
  "idMarca": 1,
  "imagen": "https://...",
  "precioReferencia": 3500000
}
```
`nombre`: obligatorio, máx. 150 caracteres. `idCategoria`, `idMarca`: obligatorios, deben existir. `precioReferencia`: opcional, no negativo. `imagen`, `descripcion`: opcionales.

**ProductoResponse**

La respuesta expone el `id` y el `nombre` de categoría/marca (no el objeto completo), para no sobrecargar el payload:
```json
{
  "idProducto": 1,
  "nombre": "Galaxy S25",
  "descripcion": "Flagship 2026",
  "idCategoria": 1,
  "nombreCategoria": "Celulares",
  "idMarca": 1,
  "nombreMarca": "Samsung",
  "imagen": "https://...",
  "precioReferencia": 3500000,
  "estado": true
}
```

---

## Probar rápido con curl

```bash
# Crear categoría
curl -X POST http://localhost:8080/api/categorias \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Celulares","descripcion":"Smartphones"}'

# Crear marca
curl -X POST http://localhost:8080/api/marcas \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Samsung","descripcion":"Electrónica"}'

# Crear producto (usa los ids devueltos arriba)
curl -X POST http://localhost:8080/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Galaxy S25","idCategoria":1,"idMarca":1,"precioReferencia":3500000}'

# Listar
curl http://localhost:8080/api/productos
```

---

## Pendientes

Entidades documentadas en `modelo-datos.md` que **todavía no tienen CRUD**, por depender de reglas de negocio sin confirmar:

- **Establecimiento** — sin dependencias de reglas pendientes, se puede construir en cualquier momento.
- **Usuario / Rol** — requieren definir autenticación (¿JWT? ¿sesión?) antes de exponer registro/login.
- **Resena** — requiere confirmar si un usuario puede editar/borrar su propia reseña, y si se modera contenido.
- **Valoracion** — requiere confirmar la escala de puntuación (¿1–5? ¿1–10?).
- **ProductoEstablecimiento** — requiere confirmar la cardinalidad usuario–establecimiento (relación N:N con precio/disponibilidad por par).

No hay autenticación ni autorización implementada todavía — todos los endpoints actuales son de acceso público, a diferencia de lo que marca `api.md` como objetivo ("Autorizado" para POST/PUT/DELETE).