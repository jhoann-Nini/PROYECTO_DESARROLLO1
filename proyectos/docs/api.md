# API REST de TecnoReview

## 1. Información general

**Proyecto:** TecReview  
**Tipo de API:** REST  
**Backend:** Spring Boot / Java  
**Frontend:** Next.js + TypeScript  
**Base de datos:** PostgreSQL  
**Proveedor de base de datos:** Supabase  
**Formato de intercambio:** JSON  
**Protocolo:** HTTP/HTTPS  
**Estado:** En desarrollo

---

# 2. Objetivo

La API REST de TecnoReview permite la comunicación entre el frontend y el backend del sistema.

El frontend desarrollado con Next.js realiza solicitudes HTTP al backend desarrollado con Spring Boot.

El backend se encarga de:

- Recibir las solicitudes.
- Validar los datos.
- Aplicar las reglas de negocio.
- Consultar o modificar la base de datos.
- Controlar permisos.
- Devolver respuestas al frontend.

El flujo general es:

```text
Usuario
   ↓
Next.js + TypeScript
   ↓
HTTP/HTTPS
   ↓
Spring Boot REST API
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL / Supabase
```

---

# Organización propuesta del backend

La estructura del backend puede organizarse de la siguiente manera:

backend/
└── src/
    └── main/
        └── java/
            └── ...
                ├── controller/
                ├── service/
                ├── repository/
                ├── entity/
                ├── dto/
                ├── exception/
                └── config/

### Tabla inicial de endpoints

| Recurso          | Método | Endpoint                           | Acceso             |  Estado
| Productos        | GET    | `/api/productos`                   | Público            |
| Producto         | GET    | `/api/productos/{id}`              | Público            |
| Productos        | POST   | `/api/productos`                   | Autorizado         |
| Producto         | PUT    | `/api/productos/{id}`              | Autorizado         |
| Producto         | DELETE | `/api/productos/{id}`              | Autorizado         |
| Búsqueda         | GET    | `/api/productos/buscar`            | Público            |
| Categorías       | GET    | `/api/categorias`                  | Público            |
| Categoría        | POST   | `/api/categorias`                  | Autorizado         |
| Categoría        | PUT    | `/api/categorias/{id}`             | Autorizado         |
| Categoría        | DELETE | `/api/categorias/{id}`             | Autorizado         |
| Marcas           | GET    | `/api/marcas`                      | Público            |
| Marca            | POST   | `/api/marcas`                      | Autorizado         |
| Marca            | PUT    | `/api/marcas/{id}`                 | Autorizado         |
| Marca            | DELETE | `/api/marcas/{id}`                 | Autorizado         |
| Registro         | POST   | `/api/auth/register`               | Público            |
| Login            | POST   | `/api/auth/login`                  | Público            |
| Reseñas          | GET    | `/api/resenas`                     | Público            |
| Reseñas          | GET    | `/api/productos/{id}/resenas`      | Público            |
| Reseña           | POST   | `/api/resenas`                     | Usuario            |
| Reseña           | POST   | `/api/productos/{id}/resenas`      | Usuario            |
| Reseña           | PUT    | `/api/resenas/{id}`                | Usuario autorizado |
| Reseña           | PUT    | `/api/productos/{id}/resenas/{idResena}` | Usuario autorizado |
| Reseña           | DELETE | `/api/resenas/{id}`                | Usuario autorizado |
| Reseña           | DELETE | `/api/productos/{id}/resenas/{idResena}` | Usuario autorizado |
| Comparación      | GET    | `/api/comparador`                  | Público            |
| Establecimientos | GET    | `/api/establecimientos`            | Público            |
| Establecimiento  | GET    | `/api/establecimientos/{id}`       | Público            |
| Establecimiento  | POST   | `/api/establecimientos`            | Administrador      |
| Establecimiento  | PUT    | `/api/establecimientos/{id}`       | Administrador      |
| Establecimiento  | DELETE | `/api/establecimientos/{id}`       | Administrador      |
| Verificación de establecimiento | PUT | `/api/admin/establecimientos/{id}/verificacion` | Administrador (§18.6) |
| Ofertas de producto | GET | `/api/productos/{id}/establecimientos` | Público (§32.1) |
| Ofertas (admin)  | GET    | `/api/admin/ofertas`               | Administrador (§32.2) |
| Oferta (admin)   | PUT    | `/api/admin/productos/{id}/establecimientos/{idEstablecimiento}` | Administrador (§32.3) |
| Oferta (admin)   | DELETE | `/api/admin/productos/{id}/establecimientos/{idEstablecimiento}` | Administrador (§32.4) |
| Resumen de ofertas | GET  | `/api/productos/resumen-ofertas`   | Público (§32.5) |
| Estado de una cuenta | PUT | `/api/admin/usuarios/{id}/estado` | Administrador (§33.2) |

# 3. Arquitectura de la API

El backend utilizará una arquitectura por capas.

Controller
    ↓
Service
    ↓
Repository
    ↓
Entity
    ↓
PostgreSQL
Controller

Recibe las solicitudes HTTP y define los endpoints.

Ejemplo:

GET /api/productos
Service

Contiene la lógica de negocio.

Ejemplos:

Validar información.
Verificar permisos.
Procesar una reseña.
Preparar una comparación.
Aplicar reglas del sistema.
Repository

Permite realizar operaciones sobre la base de datos.

Entity

Representa las entidades principales de la base de datos.

Ejemplos:

Usuario
Producto
Categoria
Marca
Resena (incluye puntuación de 1 a 5)
Establecimiento

---

# 4. URL base

Durante el desarrollo se utilizará una URL local similar a:

<http://localhost:8080>

La API utilizará el prefijo:

/api

Por lo tanto, un endpoint podría ser:

<http://localhost:8080/api/productos>

La URL definitiva del backend se establecerá cuando se configure el entorno de despliegue.

El frontend no debe depender de una URL escrita directamente en los componentes. Se recomienda utilizar una variable de entorno.

Ejemplo:

NEXT_PUBLIC_API_URL=<http://localhost:8080>

---

# 5. Formato de datos

La API utilizará JSON para enviar y recibir información.

Ejemplo de producto:

{
  "id": 1,
  "nombre": "Laptop Lenovo IdeaPad",
  "descripcion": "Computador portátil para uso académico",
  "marca": "Lenovo",
  "categoria": "Portátiles"
}

La estructura definitiva de los objetos dependerá del modelo de datos implementado en el backend.

---

# 6. Métodos HTTP

La API utilizará principalmente los siguientes métodos:

Método Uso
GET Consultar información
POST Crear información
PUT Actualizar información
DELETE Eliminar información

---

# 7. Productos

Los productos constituyen una de las entidades principales de TecnoReview.

## 7.1 Consultar productos

GET /api/productos

Permite obtener el listado de productos disponibles.

Respuesta esperada
[
  {
    "idProducto": 1,
    "nombre": "Laptop Lenovo IdeaPad",
    "descripcion": "Computador portátil",
    "idCategoria": 1,
    "idMarca": 1,
    "imagen": null,
    "precioReferencia": 2500000,
    "estado": true
  }
]

## 7.2 Consultar un producto

GET /api/productos/{id}

Ejemplo:

GET /api/productos/1

Permite consultar la información detallada de un producto.

## 7.3 Crear producto

POST /api/productos

Este endpoint es de uso exclusivo para usuarios autorizados con el rol **Administrador**.

### Requisitos y Criterios de Validación (TEC-117):
1. **Solo un administrador escribe:** Requiere token Bearer de Supabase Auth correspondiente a un usuario activo con rol activo `Administrador`.
   - Solicitudes no autenticadas retornan `401 Unauthorized`.
   - Solicitudes de usuarios con cualquier otro rol (ej. `Usuario registrado`, `Moderador`, `Tienda`) retornan `403 Forbidden`.
2. **Los enlaces deben empezar por http o https:** El campo `imagen`, si no es nulo o vacío, debe iniciar con `http://` o `https://`. Protocolos ajenos (ej. `ftp://`, `javascript:`) o rutas de texto plano retornan `400 Bad Request` con el mensaje:
   `"Los enlaces deben empezar por http o https"`
3. **El precio no puede ser negativo:** El campo `precioReferencia` debe ser un número decimal mayor o igual a `0.0`. Valores negativos retornan `400 Bad Request` con el mensaje:
   `"El precio no puede ser negativo"`

Ejemplo de solicitud válida:

```json
{
  "nombre": "Samsung Galaxy A55",
  "descripcion": "Teléfono inteligente",
  "idMarca": 2,
  "idCategoria": 1,
  "imagen": "https://images.unsplash.com/photo-example.jpg",
  "precioReferencia": 1500000
}
```

El backend valida los datos mediante Bean Validation antes de persistirlos.

## 7.4 Actualizar producto

PUT /api/productos/{id}

Permite modificar la información de un producto existente.

### Requisitos y Criterios de Validación (TEC-117):
- **Solo un administrador escribe:** Requiere rol activo `Administrador` (`401` si no autenticado, `403` si no es administrador).
- **Validaciones:** Aplican los mismos criterios que en la creación:
  - Enlaces de imagen deben iniciar con `http://` o `https://` (`400 Bad Request`).
  - `precioReferencia` no puede ser negativo (`400 Bad Request`).

Ejemplo:

PUT /api/productos/1

## 7.5 Eliminar producto

DELETE /api/productos/{id}

Permite realizar la eliminación lógica (`estado=false`) de un producto existente.

### Requisitos de Seguridad (TEC-117):
- Requiere rol activo `Administrador`. Usuarios sin este rol son rechazados con `403 Forbidden` y usuarios anónimos con `401 Unauthorized`.
- Responde `204 No Content` al completarse exitosamente.

---

> **Nota de implementación:** el listado actual devuelve únicamente productos activos (`estado=true`). La eliminación es lógica y responde `204 No Content`. Un producto inactivo se considera no encontrado al consultarlo o actualizarlo por ID.

# 8. Búsqueda de productos

La plataforma debe permitir buscar productos.

Un endpoint propuesto es:

GET /api/productos/buscar?nombre=laptop

También pueden implementarse parámetros para filtrar por:

Nombre.
Categoría.
Marca.

Ejemplo:

GET /api/productos?idCategoria=1

La implementación exacta de los parámetros podrá ajustarse durante el desarrollo.

> **Uso actual en el frontend:** el filtro `idCategoria` ya se utiliza en las
> páginas `/categorias/[slug]`. El frontend obtiene primero los IDs reales desde
> `GET /api/categorias`, por lo que nunca envía un ID fijo ni inventado.

---

# 9. Categorías

## 9.1 Consultar categorías

GET /api/categorias

Devuelve las categorías disponibles.

Ejemplo:

[
  {
    "id": 1,
    "nombre": "Portátiles"
  },
  {
    "id": 2,
    "nombre": "Celulares"
  }
]

## 9.2 Crear categoría

POST /api/categorias

Ejemplo:

{
  "nombre": "Tablets"
}

La creación estará restringida a usuarios con permisos correspondientes.

## 9.3 Actualizar categoría

PUT /api/categorias/{id}

## 9.4 Eliminar categoría

DELETE /api/categorias/{id}

# 10. Marcas

## 10.1 Consultar marcas

GET /api/marcas

## 10.2 Crear marca

POST /api/marcas

## 10.3 Actualizar marca

PUT /api/marcas/{id}

## 10.4 Eliminar marca

DELETE /api/marcas/{id}

Las operaciones de modificación estarán restringidas según el sistema de roles.

---

# 11. Usuarios

La API debe permitir gestionar las operaciones relacionadas con los usuarios.

## 11.1 Registro

POST /api/auth/register

Ejemplo:

{
  "nombre": "Juan",
  "correo": "<juan@example.com>",
  "password": "********"
}

El backend debe validar:

Campos obligatorios.
Formato del correo.
Existencia previa del usuario.
Reglas de contraseña.
Información requerida.

---

# 12. Inicio de sesión

POST /api/auth/login

Ejemplo:

{
  "correo": "<juan@example.com>",
  "password": "********"
}

La respuesta dependerá del mecanismo de autenticación que se implemente.

Por ejemplo:

{
  "mensaje": "Inicio de sesión exitoso",
  "usuario": {
    "id": 1,
    "nombre": "Juan",
    "rol": "USUARIO"
  }
}

El mecanismo definitivo de autenticación deberá establecerse durante la implementación del backend.

---

# 13. Roles y autorización

Los perfiles funcionales canónicos de TecReview son:

- `ADMINISTRADOR`
- `MODERADOR`
- `USUARIO_REGISTRADO`
- `REPRESENTANTE_ESTABLECIMIENTO`

Visitante representa acceso público y no es un rol persistido.

Una cuenta puede tener varios roles simultáneamente. Los permisos efectivos corresponden a la unión de las capacidades de sus roles vigentes, sujetos al estado general de la cuenta, a la vigencia de cada asignación, al contexto del recurso, a los permisos específicos y a las reglas de conflicto de interés. El rol o los permisos nunca deben aceptarse desde el cuerpo de la solicitud como autoridad: el backend obtiene la identidad de un JWT validado y consulta el estado vigente de las asignaciones.

Para operaciones de representante, el backend debe comprobar además que exista un vínculo vigente entre la cuenta y el establecimiento objetivo y que la acción concreta esté permitida para ese vínculo. Tener el rol de representante no concede acceso global a todos los establecimientos.

La suspensión de una cuenta bloquea todos sus roles. La suspensión o revocación de un rol individual bloquea solo sus capacidades y conserva los demás roles vigentes. La suspensión del rol Administrador debe surtir efecto en todas las sesiones/dispositivos desde su confirmación; cada solicitud administrativa vuelve a validar el estado vigente. Una cuenta no puede autoasignarse, auto-reactivarse ni cambiar por API una asignación administrativa suspendida.

Los permisos se controlan en el backend. Ocultar botones en el frontend no sustituye la autorización del servidor. Las operaciones no autorizadas responden con `403 Forbidden`; las solicitudes sin autenticación válida responden con `401 Unauthorized`.

**Estado de implementación:** este bloque describe el contrato funcional objetivo aprobado. El código actual todavía contiene una relación JPA de un único rol por usuario y no implementa la matriz completa de perfiles, vínculos y suspensión global; requiere migración y pruebas en una fase posterior.

---

# 14. Reseñas

Los usuarios registrados podrán crear, actualizar y eliminar reseñas sobre productos. La calificación (escala de 1 a 5) está integrada directamente en la reseña.

### 14.1 Consultar reseñas de un producto

GET /api/productos/{productoId}/resenas
GET /api/resenas (admite query param opcional ?idProducto={id})

Ejemplo de respuesta (200 OK):

[
  {
    "idResena": 1,
    "idProducto": 1,
    "nombreProducto": "Galaxy S25",
    "idUsuario": 5,
    "nombreUsuario": "Juan Pérez",
    "comentario": "El producto tiene buen rendimiento para estudiar y trabajar.",
    "puntuacion": 5,
    "fechaCreacion": "2026-11-01T15:30:00",
    "estado": true
  }
]

### 14.2 Publicar reseña

POST /api/resenas
POST /api/productos/{productoId}/resenas

Requiere encabezado `Authorization: Bearer <token_supabase>`.

Cuerpo de la solicitud (JSON - ResenaRequest):

```json
{
  "idProducto": 1,
  "comentario": "El producto tiene buen rendimiento para estudiar y trabajar.",
  "puntuacion": 5
}
```

- `idProducto`: Obligatorio en `/api/resenas` (en `/api/productos/{productoId}/resenas` se extrae de la URL).
- `comentario`: Obligatorio, no vacío, máx. 1000 caracteres.
- `puntuacion`: Opcional, entero entre 1 y 5 (si no se proporciona o es nulo, se asigna 5 por defecto).

### 14.3 Actualizar reseña por ID (S2-17)

PUT /api/resenas/{idResena}  
PUT /api/productos/{productoId}/resenas/{idResena}

Permite a un usuario autenticado modificar su propia reseña existente.

**Seguridad y Reglas de Negocio:**
- Requiere encabezado `Authorization: Bearer <token_supabase>`.
- Si la petición es anónima o carece de token válido, devuelve `401 Unauthorized`.
- Si la reseña con `idResena` no existe o está inactiva (`estado = false`), devuelve `404 Not Found`.
- **Validación de producto:** En la ruta anidada `/api/productos/{productoId}/resenas/{idResena}`, se comprueba que la reseña pertenezca al `productoId` indicado en la URL; si no coincide, devuelve `404 Not Found`.
- **Control de autoría:** Solo el autor original de la reseña (`idUsuario`) puede modificarla. Si otro usuario intenta editarla, el servidor devuelve `403 Forbidden` ("No tienes permiso para modificar esta reseña").
- **Fecha de creación inmutable:** La actualización no modifica la fecha original de publicación (`fechaCreacion`).
- **Validación de campos:**
  - `comentario`: Obligatorio, no vacío, máx. 1000 caracteres.
  - `puntuacion`: Opcional, entero entre 1 y 5 (si se omite, se conserva la puntuación previa).

**Cuerpo de la solicitud (JSON - ResenaUpdateRequest):**

```json
{
  "comentario": "Comentario modificado con observaciones detalladas.",
  "puntuacion": 5
}
```

**Respuesta exitosa (200 OK - ResenaResponse):**

```json
{
  "idResena": 1,
  "idProducto": 1,
  "nombreProducto": "Galaxy S25",
  "idUsuario": 5,
  "nombreUsuario": "Juan Pérez",
  "comentario": "Comentario modificado con observaciones detalladas.",
  "puntuacion": 5,
  "fechaCreacion": "2026-11-01T15:30:00",
  "estado": true
}
```

### 14.4 Eliminar reseña (S2-18)

DELETE /api/resenas/{idResena}  
DELETE /api/productos/{productoId}/resenas/{idResena}

Permite eliminar (desactivar de forma lógica) una reseña existente.

**Seguridad y Reglas de Negocio:**
- Requiere encabezado `Authorization: Bearer <token_supabase>`.
- Si la petición es anónima o carece de token válido, devuelve `401 Unauthorized`.
- Si la reseña con `idResena` no existe o ya está inactiva (`estado = false`), devuelve `404 Not Found`.
- **Validación de producto:** En la ruta anidada `/api/productos/{productoId}/resenas/{idResena}`, se comprueba que la reseña pertenezca al `productoId` indicado en la URL; si no coincide, devuelve `404 Not Found`.
- **Control de autoría y moderación:**
  - El autor original de la reseña (`idUsuario`) tiene autorización para eliminarla.
  - Los usuarios con rol `Administrador` pueden eliminar cualquier reseña con fines de moderación.
  - Si otro usuario sin permisos intenta eliminarla, el servidor devuelve `403 Forbidden` ("No tienes permiso para eliminar esta reseña").
- **Eliminación lógica:** Se establece `estado = false` en `public.resena`, de modo que no aparezca en consultas públicas y se preserve la integridad referencial.
- Responde `204 No Content` sin cuerpo en la respuesta.

---

### 14.5 Validación de la propiedad de las reseñas en el backend (S2-19)

El backend aplica el principio de **Zero-Trust** y autorización rigurosa del lado del servidor para garantizar que las operaciones sobre reseñas respeten la autoría legítima:

- **Asociación irrefutable en creación (`POST`):** La identidad del autor (`idUsuario`) se obtiene exclusivamente a partir del token JWT validado de Supabase. El cliente no puede inyectar un autor arbitrario en el cuerpo de la petición.
- **Modificación exclusiva por el autor (`PUT`):** Solo el usuario propietario que creó originalmente la reseña tiene permiso para editarla. Cualquier intento por otro usuario autenticado es rechazado con código `403 Forbidden` (`"No tienes permiso para modificar esta reseña."`).
- **Eliminación por el autor o Administrador (`DELETE`):** La eliminación (lógica con `estado = false`) solo puede ser ejecutada por el autor legítimo de la reseña o por un usuario con rol `Administrador` (para fines de moderación de contenido). Cualquier otro usuario recibe `403 Forbidden` (`"No tienes permiso para eliminar esta reseña."`).
- **Control de estado del usuario:** Cuentas de usuario suspendidas o inactivas (`estado = false`) tienen prohibido registrar, modificar o eliminar reseñas, respondiendo con `403 Forbidden` (`"Usuario inactivo o suspendido."`).
- **Denegación anónima:** Solicitudes sin token Bearer válido reciben de inmediato `401 Unauthorized`.
- **Correspondencia de producto:** En las rutas anidadas `/api/productos/{productoId}/resenas/{idResena}`, el servidor verifica que la reseña pertenezca efectivamente al producto indicado en la URL, respondiendo `404 Not Found` en caso de discrepancia.

---

# 15. Valoraciones

> **Nota:** La puntuación de productos utiliza una escala de 1 a 5 y está integrada directamente en cada **Reseña**. Por tanto, la calificación y el comentario forman una sola entidad y no se gestionan mediante endpoints independientes de valoraciones.

---

La plataforma permitirá comparar productos.

La comparación podrá realizarse consultando varios productos.

Ejemplo:

GET /api/comparador?producto1=1&producto2=2

La respuesta podría contener información como:

{
  "productos": [
    {
      "id": 1,
      "nombre": "Producto A",
      "marca": "Marca A"
    },
    {
      "id": 2,
      "nombre": "Producto B",
      "marca": "Marca B"
    }
  ]
}

La estructura definitiva dependerá de las características que se definan para cada categoría de producto.

La comparación no requiere necesariamente una tabla COMPARACION en la base de datos, ya que puede generarse mediante consultas sobre los productos.

## 18. Establecimientos

TecnoReview también contempla información sobre establecimientos relacionados con productos tecnológicos.

### 18.1 Consultar establecimientos

`GET /api/establecimientos`

- **Acceso:** público, sin JWT.
- **Respuesta `200 OK`:** arreglo de `EstablecimientoResponse` con los establecimientos activos, ordenados por nombre.
- No incluye establecimientos inactivos.

### 18.2 Consultar un establecimiento

`GET /api/establecimientos/{id}`

- **Acceso:** público, sin JWT.
- **`200 OK`:** `EstablecimientoResponse` si el establecimiento está activo.
- **`404 Not Found`:** si no existe o está inactivo.

### 18.3 Crear establecimiento

`POST /api/establecimientos`

- **Acceso:** JWT válido con rol `Administrador` activo.
- **Cuerpo (`EstablecimientoUpdateRequest`):**

```json
{
  "nombre": "Tienda Tecnológica",
  "direccion": "Carrera 10 # 20-30",
  "telefono": "3001234567",
  "correo": "tienda@ejemplo.com",
  "descripcion": "Tienda de tecnología",
  "latitud": 4.08,
  "longitud": -76.19
}
```

- `nombre` es obligatorio y admite hasta 150 caracteres.
- `direccion` admite hasta 255 caracteres; `telefono`, hasta 30.
- `correo` debe tener formato válido y hasta 150 caracteres.
- `latitud` debe estar entre -90 y 90; `longitud`, entre -180 y 180.
- El establecimiento se crea activo (`estado = true`).
- **`201 Created`:** `EstablecimientoResponse` del recurso creado.
- **`400 Bad Request`:** errores de validación.
- **`401 Unauthorized` / `403 Forbidden`:** token ausente o cuenta sin rol Administrador activo.
- Las asignaciones de representantes se gestionan con los endpoints administrativos existentes.

### 18.4 Actualizar establecimiento

`PUT /api/establecimientos/{id}`

- **Acceso:** JWT válido con rol `Administrador` activo.
- Usa el mismo cuerpo y validaciones que la creación.
- No modifica `estado` ni las asignaciones de representantes.
- **`200 OK`:** `EstablecimientoResponse` actualizado.
- **`404 Not Found`:** establecimiento inexistente.
- **`401 Unauthorized` / `403 Forbidden`:** token ausente o cuenta sin rol Administrador activo.

### 18.5 Eliminar establecimiento

`DELETE /api/establecimientos/{id}`

- **Acceso:** JWT válido con rol `Administrador` activo.
- La eliminación es lógica: marca `estado = false` y conserva el registro y las asignaciones históricas.
- **`204 No Content`:** establecimiento desactivado.
- **`409 Conflict`:** el establecimiento ya está inactivo.
- **`404 Not Found`:** establecimiento inexistente.
- **`401 Unauthorized` / `403 Forbidden`:** token ausente o cuenta sin rol Administrador activo.

### 18.6 Verificar o retirar la verificación de un establecimiento (TEC-151)

`PUT /api/admin/establecimientos/{id}/verificacion`

- **Acceso:** JWT válido con rol `Administrador` activo.
- **Cuerpo:** `{ "verificado": true }` (obligatorio, booleano).
- Actualiza `establecimiento.verificado`. Desde la Fase 3, el detalle del producto muestra el sello «Verificada» solo cuando vale `true`.
- Para marketplaces, ver el criterio en `docs/carga-ofertas.md`: por ahora no se marca ningún sitio como verificado.
- **`200 OK`:** `EstablecimientoResponse` actualizado.
- **`400 Bad Request`:** falta `verificado`.
- **`404 Not Found`:** establecimiento inexistente.
- **`401 Unauthorized` / `403 Forbidden`:** token ausente o cuenta sin rol Administrador activo.

### Respuesta de establecimiento

```json
{
  "idEstablecimiento": 1,
  "nombre": "Tienda Tecnológica",
  "direccion": "Carrera 10 # 20-30",
  "telefono": "3001234567",
  "correo": "tienda@ejemplo.com",
  "descripcion": "Tienda de tecnología",
  "latitud": 4.08,
  "longitud": -76.19,
  "estado": true
}
```

**Nota:** las rutas `/api/representante/establecimientos` siguen siendo el mecanismo para que una cuenta con rol Representante consulte y actualice únicamente sus establecimientos asignados. El Administrador conserva alcance global en esas rutas.

 1. Productos y establecimientos

Un producto puede estar disponible en diferentes establecimientos.

Por esta razón, el modelo contempla una relación:

PRODUCTO
    N
    │
    │
    N
ESTABLECIMIENTO

La relación se implementa mediante:

PRODUCTO_ESTABLECIMIENTO

La API podrá incorporar endpoints específicos para administrar esta relación cuando sea necesario.

 1. Google Maps

La plataforma utilizará Google Maps para mostrar la ubicación de los establecimientos.

La integración de Google Maps se realizará principalmente desde el frontend.

Flujo conceptual:

Establecimiento
      ↓
Dirección / coordenadas
      ↓
Next.js
      ↓
Google Maps
      ↓
Mapa mostrado al usuario

La API puede proporcionar al frontend los datos necesarios del establecimiento.

Ejemplo:

{
  "id": 1,
  "nombre": "Tienda Tecnológica",
  "direccion": "Carrera XX # XX-XX",
  "latitud": 4.08,
  "longitud": -76.19
}

Las coordenadas y campos definitivos dependerán de la implementación seleccionada.

 1. Códigos de respuesta HTTP

La API utilizará códigos HTTP para indicar el resultado de las operaciones.

Código Significado
200 Solicitud exitosa
201 Recurso creado
204 Operación exitosa sin contenido
400 Solicitud incorrecta
401 No autenticado
403 Sin permisos
404 Recurso no encontrado
409 Conflicto
500 Error interno del servidor
22. Ejemplo de respuesta exitosa

Una consulta:

GET /api/productos/1

Podría devolver:

200 OK

Con:

{
  "id": 1,
  "nombre": "Laptop Lenovo IdeaPad",
  "descripcion": "Computador portátil",
  "marca": {
    "id": 1,
    "nombre": "Lenovo"
  },
  "categoria": {
    "id": 1,
    "nombre": "Portátiles"
  }
}
23. Ejemplo de error

Si el producto no existe:

GET /api/productos/999

La API podría responder:

404 Not Found

Con un mensaje:

{
  "mensaje": "Producto no encontrado"
}

La estructura definitiva de los errores deberá mantenerse uniforme en toda la API.

 1. Validación

El backend debe validar los datos recibidos antes de realizar operaciones.

Ejemplos:

Producto
Nombre obligatorio
Categoría válida
Marca válida
Usuario
Correo obligatorio
Correo con formato válido
Contraseña obligatoria
Reseña
Producto existente
Usuario autenticado
Contenido válido
Valoración
Producto existente
Usuario autenticado
Valor dentro de la escala definida
25. Seguridad

La API debe considerar mecanismos de autenticación y autorización.

Las operaciones protegidas deberán comprobar la identidad y permisos del usuario.

Se debe evitar:

Contraseñas almacenadas en texto plano.
Claves API dentro del código fuente.
Credenciales dentro de GitHub.
Acceso no autorizado a endpoints administrativos.
Validaciones únicamente en el frontend.

Las credenciales y variables sensibles deberán manejarse mediante variables de entorno.

 1. Variables de entorno

El backend podrá utilizar variables de entorno para información sensible.

Ejemplo:

DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=

El frontend podrá utilizar:

NEXT_PUBLIC_API_URL=

Las variables reales no deben almacenarse directamente en el repositorio.

 1. Integración con el frontend

Next.js consumirá la API mediante solicitudes HTTP.

Ejemplo conceptual:

const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/productos`
);

const productos = await response.json();

Se recomienda centralizar las llamadas a la API mediante servicios.

Por ejemplo:

frontend/
└── services/
    └── api/
        ├── productos.ts
        ├── usuarios.ts
        ├── resenas.ts
        └── establecimientos.ts

Esto evita tener solicitudes HTTP dispersas por todos los componentes.

 1. Organización propuesta del backend

La estructura del backend puede organizarse de la siguiente manera:

backend/
└── src/
    └── main/
        └── java/
            └── ...
                ├── controller/
                ├── service/
                ├── repository/
                ├── entity/
                ├── dto/
                ├── exception/
                └── config/
controller

Endpoints REST.

service

Reglas de negocio.

repository

Acceso a datos.

entity

Entidades de persistencia.

dto

Objetos utilizados para recibir y devolver información.

exception

Manejo de errores.

config

Configuraciones del backend.

 1. Pruebas de la API

Los endpoints deberán probarse antes de integrarse completamente con el frontend.

Las pruebas podrán realizarse mediante herramientas como:

Postman.
Insomnia.
Herramientas de desarrollo del navegador.
Pruebas automatizadas del backend.

Para cada endpoint se debe comprobar:

Entrada válida
Entrada inválida
Respuesta exitosa
Respuesta de error
Autorización
Persistencia
31. Documentación de endpoints

Cada endpoint implementado debe documentarse con:

Método HTTP.
URL.
Descripción.
Parámetros.
Headers necesarios.
Cuerpo de la solicitud.
Respuesta exitosa.
Posibles errores.
Requisitos de autenticación.
Rol requerido cuando corresponda.

Ejemplo:

GET /api/productos/{id}

Descripción:
Consulta un producto específico.

Parámetro:
id → identificador del producto.

Respuesta:
200 OK → producto encontrado.
404 Not Found → producto inexistente.

Acceso:
Público.
32. Relación con los requisitos

La API permite implementar principalmente los siguientes requisitos:

Requisito Funcionalidad API
RF-01 Registro
RF-02 Login
RF-03 Usuarios y roles
RF-04 Consulta de productos
RF-05 CRUD de productos
RF-06 CRUD de categorías
RF-07 CRUD de marcas
RF-08 Búsqueda
RF-09 Reseñas
RF-10 Valoraciones
RF-11 Opiniones positivas/negativas
RF-12 Comparación
RF-13 Establecimientos
RF-14 Datos para ubicación
RF-15 Comunicación REST
RF-16 Persistencia
33. Relación con las historias de usuario

La API servirá como soporte técnico para historias como:

HU-01 → Registro
HU-02 → Inicio de sesión
HU-03 → Consultar productos
HU-04 → Buscar productos
HU-05 → Filtrar por categoría
HU-06 → Consultar marca
HU-07 → Detalle del producto
HU-08 → Registrar reseña
HU-09 → Valorar producto
HU-10 → Aspectos positivos y negativos
HU-11 → Comparar productos
HU-12 → Consultar establecimientos
HU-13 → Consultar ubicación
HU-14 → Administrar productos
HU-15 → Administrar categorías
HU-16 → Administrar marcas
HU-17 → Administrar establecimientos

 1. Estado de implementación

Los siguientes elementos se consideran inicialmente planificados:

 [x] Configuración de Spring Boot.
 [x] Conexión con PostgreSQL/Supabase.
 [x] Entidades. (las 9 de modelo-datos.md)
 [x] Repositories. (las 9)
 [x] Services. (Categoria, Marca, Producto — faltan Resena, Valoracion, Establecimiento, Usuario)
 [x] Controllers. (Categoria, Marca, Producto)
 [x] DTOs. (Categoria, Marca, Producto)
 [x] Validaciones. (Categoria, Marca, Producto)
 [x] Manejo de excepciones. (GlobalExceptionHandler general para toda la API)
 [ ] Autenticación.
 [ ] Autorización por roles.
 [x] Endpoints de productos.
 [x] Endpoints de categorías.
 [x] Endpoints de marcas.
 [ ] Endpoints de usuarios.
 [x] Endpoints de reseñas (con puntuación integrada de 1 a 5, S2-17, S2-18 y validación de propiedad S2-19).
 [x] Valoraciones (unificadas en reseñas mediante el campo puntuacion).
 [ ] Endpoint de comparación.
 [ ] Endpoints de establecimientos.
 [ ] Pruebas de API.
 [ ] Integración con Next.js.
 [ ] Documentación definitiva.

 1. Consideraciones de diseño

La API debe mantener una estructura consistente.

Se recomienda:

Utilizar nombres claros.
Mantener convenciones REST.
Evitar lógica de negocio en los controllers.
Utilizar DTOs cuando sea necesario.
Validar los datos en el backend.
Controlar los permisos desde el backend.
Mantener respuestas consistentes.
Manejar errores de forma uniforme.
No exponer información sensible.
Mantener separada la configuración de las credenciales.
Documentar cambios importantes.
36. Definición de terminado de un endpoint

Un endpoint se considera terminado cuando:

 Está implementado.
 Tiene ruta definida.
 Utiliza el método HTTP correspondiente.
 Tiene validaciones.
 Tiene manejo de errores.
 Respeta los permisos establecidos.
 Se conecta correctamente con la base de datos cuando corresponde.
 Fue probado.
 La respuesta tiene una estructura clara.
 Está documentado.
 Fue integrado mediante Git/GitHub.
37. Estado del documento

Versión: 1.0
Estado: Borrador
Última actualización: Pendiente
Responsable: Equipo de desarrollo TecnoReview


---

# 26. Contrato objetivo de moderación de reportes

## Estados y transiciones

Los reportes de reseñas utilizan los estados `PENDIENTE`, `EN_REVISION`, `PROCEDENTE`, `NO_PROCEDENTE`, `ESCALADO` y `CERRADO`.

- Un reporte nuevo inicia en `PENDIENTE`.
- Un moderador o administrador autorizado y sin conflicto puede iniciar la revisión.
- Desde `EN_REVISION`, el caso puede resolverse como `PROCEDENTE` o `NO_PROCEDENTE`, o pasar a `ESCALADO`.
- Un caso `ESCALADO` solo puede ser resuelto por un administrador autorizado sin conflicto de interés.
- `PROCEDENTE` se cierra automáticamente solo después de registrar la decisión y aplicar correctamente la acción correctiva.
- `NO_PROCEDENTE` se cierra automáticamente después de guardar la justificación.
- Si la acción correctiva falla, el reporte no se cierra; se conserva para corrección y se registra el error.
- El cierre conserva el reporte y todo su historial.

## Autorización y auditoría

Toda transición se valida en backend. Un usuario sin capacidad de moderación recibe `403 Forbidden` y no altera el reporte. Los intentos denegados se auditan sin guardar contraseñas, tokens ni secretos. El conflicto de interés bloquea la intervención del moderador y provoca el escalamiento; si no hay administrador disponible sin conflicto, el caso permanece escalado hasta que se asigne uno.

## Endpoints

El backend actual documenta e implementa el registro de reportes en `POST /api/resenas/{idResena}/reportes` y la consulta de los reportes propios en `GET /api/reportes/mis-reportes`. La API de asignación, revisión, transición de estados, resolución, escalamiento y consulta administrativa todavía debe definirse y construirse para cumplir el flujo objetivo. No se deben presentar esos endpoints administrativos como existentes hasta que se implementen y prueben.

**Estado de implementación:** el flujo anterior es el contrato funcional aprobado, no una afirmación de que el ciclo completo de moderación esté disponible actualmente. El enum y las operaciones actuales del backend representan una versión parcial y deben alinearse en una fase posterior.

En concreto, el enum Java actual usa `PENDIENTE`, `EN_REVISION`, `ACEPTADO` y `RECHAZADO`; los scripts SQL históricos 006/007 usan esos mismos estados. No equivalen a `PROCEDENTE`, `NO_PROCEDENTE`, `ESCALADO` y `CERRADO` del contrato aprobado. La API actual solo expone registro y consulta de reportes propios; no implementa aún las transiciones ni la resolución administrativa. Esta brecha queda identificada para la fase de implementación.

---

# 27. Endpoint para reportar reseñas (S2-39)

Permite a los usuarios autenticados reportar una reseña que consideren inapropiada, fraudulenta o fuera de lugar. La identidad del reportante se extrae exclusivamente del JWT de Supabase (Zero-Trust); cualquier campo `idUsuario` o `estado` enviado en el cuerpo es ignorado por el backend.

- **Método y ruta canónica:** `POST /api/resenas/{idResena}/reportes`
- **Rutas aliases:**
  - `POST /api/reportes/resenas/{idResena}`
  - `POST /api/reportes` (con `idResena` en el cuerpo JSON)
- **Autenticación:** Requerida (`Bearer <token_jwt>`). Solo usuarios autenticados activos pueden reportar.

### Reglas de negocio (Migración 006):
1. **Autenticación obligatoria:** Usuarios anónimos reciben `401 Unauthorized`.
2. **Prohibición de autorreporte:** Un usuario no puede reportar sus propias reseñas (`403 Forbidden: "No puedes reportar tu propia reseña."`).
3. **Unicidad de reporte:** Un usuario solo puede reportar una vez una misma reseña (`409 Conflict: "Ya has reportado esta reseña previamente."`).
4. **Reseña activa requerida:** No se pueden reportar reseñas inexistentes o eliminadas lógicamente (`404 Not Found`).
5. **Motivos válidos:** `spam`, `lenguaje-ofensivo`, `falso`, `otro`. Cualquier otro valor devuelve `400 Bad Request`.
6. **Descripción condicional:** Si el motivo es `otro`, el campo `descripcion` es obligatorio y no puede consistir únicamente en espacios en blanco (`400 Bad Request`). En los demás motivos, es opcional.
7. **Estado inicial:** Todo reporte creado inicia estrictamente con `estado = PENDIENTE`.
8. **Inmutabilidad:** Los campos `id_resena` e `id_usuario` son inmutables una vez persistidos.

### Cuerpo de la solicitud (Payload):
```json
{
  "idResena": 15,
  "motivo": "spam",
  "descripcion": "Enlaces a tiendas externas sospechosas"
}
```
*(Nota: `idResena` es obligatorio al consumir `POST /api/reportes`; es opcional u omitible al consumir `POST /api/resenas/{idResena}/reportes` o su alias `POST /api/reportes/resenas/{idResena}`).*

### Respuestas:
- `201 Created`:
  ```json
  {
    "idReporte": 42,
    "idResena": 15,
    "motivo": "spam",
    "descripcion": "Enlaces a tiendas externas sospechosas",
    "estado": "PENDIENTE",
    "fechaCreacion": "2026-11-11T01:25:00"
  }
  ```
- `400 Bad Request`: Motivo inválido, motivo 'otro' sin descripción requerida, o ausencia de `idResena` al consumir `POST /api/reportes`.
- `401 Unauthorized`: Token JWT ausente o inválido.
- `403 Forbidden`: Intento de autoreporte o usuario suspendido.
- `404 Not Found`: Reseña inexistente o eliminada lógicamente por su autor.
- `409 Conflict`: El usuario ya reportó previamente la reseña especificada.


---

# 27. Endpoint para reportar reseñas (S2-39)

Permite a los usuarios autenticados reportar una reseña que consideren inapropiada, fraudulenta o fuera de lugar. La identidad del reportante se extrae exclusivamente del JWT de Supabase (Zero-Trust); cualquier campo `idUsuario` o `estado` enviado en el cuerpo es ignorado por el backend.

- **Método y ruta canónica:** `POST /api/resenas/{idResena}/reportes`
- **Rutas aliases:**
  - `POST /api/reportes/resenas/{idResena}`
  - `POST /api/reportes` (con `idResena` en el cuerpo JSON)
- **Autenticación:** Requerida (`Bearer <token_jwt>`). Solo usuarios autenticados activos pueden reportar.

### Reglas de negocio (Migración 006):
1. **Autenticación obligatoria:** Usuarios anónimos reciben `401 Unauthorized`.
2. **Prohibición de autorreporte:** Un usuario no puede reportar sus propias reseñas (`403 Forbidden: "No puedes reportar tu propia reseña."`).
3. **Unicidad de reporte:** Un usuario solo puede reportar una vez una misma reseña (`409 Conflict: "Ya has reportado esta reseña previamente."`).
4. **Reseña activa requerida:** No se pueden reportar reseñas inexistentes o eliminadas lógicamente (`404 Not Found`).
5. **Motivos válidos:** `spam`, `lenguaje-ofensivo`, `falso`, `otro`. Cualquier otro valor devuelve `400 Bad Request`.
6. **Descripción condicional:** Si el motivo es `otro`, el campo `descripcion` es obligatorio y no puede consistir únicamente en espacios en blanco (`400 Bad Request`). En los demás motivos, es opcional.
7. **Estado inicial:** Todo reporte creado inicia estrictamente con `estado = PENDIENTE`.
8. **Inmutabilidad:** Los campos `id_resena` e `id_usuario` son inmutables una vez persistidos.

### Cuerpo de la solicitud (Payload):
```json
{
  "idResena": 15,
  "motivo": "spam",
  "descripcion": "Enlaces a tiendas externas sospechosas"
}
```
*(Nota: `idResena` es obligatorio al consumir `POST /api/reportes`; es opcional u omitible al consumir `POST /api/resenas/{idResena}/reportes`).*

### Respuestas:
- `201 Created`:
  ```json
  {
    "idReporte": 42,
    "idResena": 15,
    "motivo": "spam",
    "descripcion": "Enlaces a tiendas externas sospechosas",
    "estado": "PENDIENTE",
    "fechaCreacion": "2026-11-11T01:25:00"
  }
  ```
- `400 Bad Request`: Motivo inválido, o motivo 'otro' sin descripción requerida.
- `401 Unauthorized`: Token JWT ausente o inválido.
- `403 Forbidden`: Intento de autoreporte o usuario suspendido.
- `404 Not Found`: Reseña inexistente o eliminada lógicamente por su autor.
- `409 Conflict`: El usuario ya reportó previamente la reseña especificada.

---

# Endpoints administrativos de asignaciones (Fase 1)

Todas las rutas de esta sección requieren un JWT de Supabase válido y una asignación activa del rol `Administrador`. El backend identifica al actor mediante el claim `sub`; el cliente no puede indicar quién realiza la operación.

## Asignar o reactivar un rol

`POST /api/admin/usuarios/{usuarioId}/roles/{rolId}`

Cuerpo opcional:

```json
{ "motivo": "Asignación autorizada" }
```

- Respuesta: `201 Created`.
- Rechaza usuarios inactivos, roles inexistentes y asignaciones que ya estén activas.
- Si la pareja usuario/rol existe revocada, la reactiva y registra el evento `REACTIVADO`.

## Revocar un rol

`DELETE /api/admin/usuarios/{usuarioId}/roles/{rolId}`

Cuerpo opcional: `{"motivo":"Cambio de responsabilidades"}`.

- Respuesta: `204 No Content`.
- Registra fecha, actor y motivo tanto en la asignación como en auditoría.
- No permite revocar el último rol activo de Administrador.

## Asignar o reactivar representante

`POST /api/admin/usuarios/{usuarioId}/establecimientos/{establecimientoId}/representacion`

Cuerpo opcional:

```json
{ "motivo": "Representante autorizado" }
```

- Respuesta: `201 Created`.
- Rechaza usuarios o establecimientos inactivos y asignaciones ya activas.
- Reactiva una relación previamente revocada y registra el evento.

## Revocar representante

`DELETE /api/admin/usuarios/{usuarioId}/establecimientos/{establecimientoId}/representacion`

Cuerpo opcional: `{"motivo":"Fin de representación"}`.

- Respuesta: `204 No Content`.
- Registra fecha, actor y motivo; no elimina la relación ni los eventos anteriores.

## Códigos de respuesta

- `401 Unauthorized`: token ausente o inválido.
- `403 Forbidden`: cuenta autenticada sin rol Administrador activo.
- `404 Not Found`: usuario, rol, establecimiento o asignación inexistente.
- `409 Conflict`: operación duplicada, recurso inactivo o intento de retirar el último administrador.
- `201 Created` / `204 No Content`: operación exitosa.

**Migraciones:** `008_multirole_y_representantes.sql` y `009_auditoria_asignaciones.sql` ya fueron aplicadas y validadas por el equipo según `usuarios-y-roles.md`. No deben volver a ejecutarse.

---

# Consultas administrativas de apoyo (Fase 1)

Estas consultas son de solo lectura y permiten localizar cuentas y conocer el catálogo de roles antes de usar los endpoints de asignación. Todas requieren un JWT de Supabase válido y una asignación activa del rol `Administrador`.

## Listar o buscar usuarios

`GET /api/admin/usuarios`

- **Parámetro opcional:** `correo`. Si se envía, filtra por coincidencia parcial sin distinguir mayúsculas.
- **Respuesta `200 OK`:** arreglo de `UsuarioAdminResponse`, ordenado por nombre:

```json
[
  {
    "idUsuario": 12,
    "nombre": "María López",
    "correo": "maria@ejemplo.com",
    "rol": "Usuario registrado",
    "activo": true,
    "fechaRegistro": "2026-11-13T10:15:00",
    "roles": ["Usuario registrado"]
  }
]
```

- `roles` contiene únicamente las asignaciones activas, ordenadas alfabéticamente.
- `rol` conserva el rol principal por compatibilidad y toma el primer elemento de `roles`; si no hay roles activos, vale `"Sin roles activos"`.
- No expone contraseña, `password` ni `supabaseUid`.
- **`401 Unauthorized` / `403 Forbidden`:** token ausente o cuenta sin rol Administrador activo.

## Listar roles

`GET /api/admin/roles`

- **Respuesta `200 OK`:** arreglo de `RolResponse`, ordenado por nombre:

```json
[
  { "idRol": 1, "nombre": "Administrador", "descripcion": "Administración global" },
  { "idRol": 2, "nombre": "Usuario registrado", "descripcion": "Participación en la comunidad" }
]
```

- **`401 Unauthorized` / `403 Forbidden`:** token ausente o cuenta sin rol Administrador activo.

**Pendiente para una iteración posterior:** los endpoints para listar asignaciones activas por usuario o establecimiento y para leer el historial de auditoría. Esta iteración no los implementa.

---

# 28. Moderación de reseñas y consulta de reportes (S2-42)

Esta sección describe los endpoints del módulo de moderación para listar reseñas pendientes y reportadas, así como la consulta plana de reportes de moderación.

## 28.1 Listar reseñas reportadas

Permite a moderadores y administradores activos consultar la cola de reseñas que han acumulado reportes, ordenadas prioritariamente por cantidad de reportes pendientes y, en empate, por total de reportes.

- **Método y ruta:** `GET /api/moderacion/resenas/reportadas`
- **Autenticación:** Requerida (`Bearer <token_jwt>`). Solo accesible para usuarios activos con rol `Moderador` o `Administrador` en la tabla multirrol `usuario_rol`.
- **Parámetros de consulta (Query Params):**
  - `estado` (opcional, `EstadoReporte`): Criterio de selección de reseñas. Filtra la cola para incluir únicamente reseñas que posean al menos un reporte en el estado especificado (`PENDIENTE`, `EN_REVISION`, `ACEPTADO`, `RECHAZADO`), sin falsear las métricas globales de la reseña.
  - `oculta` (opcional, `Boolean`): Filtra por `ocultaPorReportes` (`true` o `false`).
  - `idProducto` (opcional, `Long`): Filtra reseñas asociadas al producto especificado.
- **Criterio de ordenamiento determinista:**
  Las reseñas se ordenan priorizando: 1) Mayor cantidad de reportes pendientes (`reportesPendientes` DESC); 2) En empate, mayor cantidad de reportes totales (`totalReportes` DESC); 3) En persistencia de empate, desempate determinista por identificador de reseña (`idResena` DESC).
- **Semántica de campos en la respuesta:**
  - `totalReportes`: Cantidad total de reportes asociados a la reseña, independientemente del filtro aplicado.
  - `reportesPendientes`: Cantidad real de reportes en estado `PENDIENTE` asociados a la reseña.
  - `reportes`: Historial completo de reportes asociados a la reseña, proporcionando el contexto íntegro de moderación para la toma de decisiones.
- **Códigos de respuesta:**
  - `200 OK`: Lista JSON con objetos `ResenaReportadaResponse`:
    ```json
    [
      {
        "idResena": 1,
        "idProducto": 10,
        "nombreProducto": "Smartphone Pro",
        "idAutor": 5,
        "nombreAutor": "Usuario Autor",
        "comentario": "Texto de la reseña reportada...",
        "puntuacion": 1,
        "fechaCreacion": "2026-11-10T20:00:00",
        "estado": true,
        "ocultaPorReportes": false,
        "totalReportes": 2,
        "reportesPendientes": 2,
        "reportes": [
          {
            "idReporte": 101,
            "idUsuarioReportante": 8,
            "nombreReportante": "Usuario Reportante",
            "motivo": "spam",
            "descripcion": "Publicidad encubierta",
            "estado": "PENDIENTE",
            "fechaCreacion": "2026-11-10T21:00:00"
          }
        ]
      }
    ]
    ```
  - `401 Unauthorized`: Token ausente o inválido.
  - `403 Forbidden`: Usuario inactivo, suspendido o sin rol activo de `Moderador` o `Administrador` (por ejemplo, `Usuario registrado`, `Representante de establecimiento` o rol revocado).

## 28.2 Listar reseñas con reportes pendientes (atajo)

- **Método y ruta:** `GET /api/moderacion/resenas/pendientes`
- **Autenticación:** Requerida (`Bearer <token_jwt>`). Solo accesible para `Moderador` o `Administrador` activos.
- **Parámetros:** `oculta` (opcional), `idProducto` (opcional).
- **Comportamiento:** Retorna las reseñas con al menos un reporte en estado `PENDIENTE`.

## 28.3 Consulta plana de reportes de moderación

- **Método y ruta:** `GET /api/moderacion/reportes`
- **Autenticación:** Requerida (`Bearer <token_jwt>`). Solo accesible para `Moderador` o `Administrador` activos.
- **Parámetros:** `estado` (opcional, `EstadoReporte`, valor por defecto: `PENDIENTE`). Si no se envía el parámetro, conserva la compatibilidad con la bandeja de moderación base de Fase 2 filtrando por reportes pendientes.
- **Respuesta `200 OK`:** Lista de `ReporteResenaResponse` (`idReporte`, `idResena`, `motivo`, `descripcion`, `estado`, `fechaCreacion`).


---

# 29. Acciones operativas de moderación de reseñas (S2-43)

Esta sección describe las acciones operativas de moderación sobre reseñas y reportes: **Ocultar**, **Publicar** y **Rechazar**.
Todos los endpoints operan exclusivamente bajo la raíz `/api/moderacion/**`.

**Reglas de autorización:**
- Accesibles para usuarios con cuenta activa y asignación activa de rol `Moderador` o `Administrador` en la tabla multirrol `usuario_rol`.
- Denegadas (`403 Forbidden`) para `Usuario registrado`, `Representante de establecimiento` y usuarios inactivos o suspendidos.
- Prohibición estricta de conflicto de interés: un moderador o administrador no puede moderar sus propias reseñas ni resolver reportes propios (`403 Forbidden`).
- Máquina de estados estricta (Migraciones 007, 010 y 011): un reporte debe encontrarse en estado `EN_REVISION` para ser resuelto (`RECHAZADO` o `ACEPTADO`). Los reportes en estado `PENDIENTE` no pueden ser rechazados directamente (`409 Conflict`).
- Independencia de flags: las acciones manuales operan exclusivamente sobre `ocultaPorModeracion`. El ocultamiento automático por reportes (`ocultaPorReportes`) y el borrado lógico del autor permanecen independientes.

## 29.1 Ocultar reseña
Establece `ocultaPorModeracion = true`, `moderadaPor = actor`, `fechaModeracion = ahora` y `motivoModeracion = motivo`. Registra de manera transaccional un evento de auditoría inmutable en `resena_moderacion_auditoria` (`accion = 'OCULTAR'`).

- **Métodos y ruta:** `PUT /api/moderacion/resenas/{idResena}/ocultar` (alias: `POST /api/moderacion/resenas/{idResena}/ocultar`)
- **Autenticación:** Requerida (`Bearer <token_jwt>`). `Moderador` o `Administrador` activo.
- **Cuerpo (opcional):**
  ```json
  {
    "motivo": "Contenido ofensivo verificado por moderación"
  }
  ```
- **Códigos de respuesta:**
  - `200 OK`: Retorna `ResenaReportadaResponse` con `ocultaPorModeracion: true`.
  - `400 Bad Request`: Identificador inválido o motivo mayor a 2000 caracteres.
  - `401 Unauthorized`: Token ausente o inválido.
  - `403 Forbidden`: Sin rol activo de moderación, cuenta suspendida o intento de automoderación.
  - `404 Not Found`: Reseña inexistente.
  - `409 Conflict`: Reseña ya oculta manualmente o reseña eliminada previamente por su autor.

## 29.2 Publicar reseña (restaurar visibilidad manual)
Restaura la visibilidad manual (`ocultaPorModeracion = false`, `moderadaPor = null`, `fechaModeracion = null`, `motivoModeracion = null`). Registra transaccionalmente un evento en `resena_moderacion_auditoria` (`accion = 'RESTAURAR'`). No altera `ocultaPorReportes`.

- **Métodos y ruta:** `PUT /api/moderacion/resenas/{idResena}/publicar` (alias: `POST /api/moderacion/resenas/{idResena}/publicar`)
- **Autenticación:** Requerida (`Bearer <token_jwt>`). `Moderador` o `Administrador` activo.
- **Cuerpo (opcional):**
  ```json
  {
    "motivo": "Reseña verificada y legítima tras revisión"
  }
  ```
- **Códigos de respuesta:**
  - `200 OK`: Retorna `ResenaReportadaResponse` con `ocultaPorModeracion: false`.
  - `401 Unauthorized`: Token ausente o inválido.
  - `403 Forbidden`: Sin permisos de moderación, cuenta suspendida o automoderación.
  - `404 Not Found`: Reseña inexistente.
  - `409 Conflict`: La reseña no estaba oculta manualmente, o fue eliminada por su autor impidiendo su republicación.

## 29.3 Rechazar reporte individual
Actualiza el estado de un reporte específico en `EN_REVISION` a `RECHAZADO`. Registra transaccionalmente la decisión en `reporte_resena_decision_auditoria`. Recalcula los reportes activos no rechazados de la reseña: si bajan de 3, restablece automáticamente `ocultaPorReportes = false`.

- **Métodos y ruta:** `PUT /api/moderacion/reportes/{idReporte}/rechazar` (alias: `POST /api/moderacion/reportes/{idReporte}/rechazar`)
- **Autenticación:** Requerida (`Bearer <token_jwt>`). `Moderador` responsable o `Administrador` activo.
- **Cuerpo (opcional):**
  ```json
  {
    "motivo": "Reporte infundado tras verificar el producto"
  }
  ```
- **Códigos de respuesta:**
  - `200 OK`: Retorna `ReporteResenaResponse` con `estado: "RECHAZADO"`.
  - `401 Unauthorized`: Token ausente o inválido.
  - `403 Forbidden`: Moderador no responsable asignado, cuenta suspendida o conflicto de interés (actor reportante o autor).
  - `404 Not Found`: Reporte inexistente.
  - `409 Conflict`: Reporte en estado `PENDIENTE` (debe pasar a `EN_REVISION` primero) o reporte ya finalizado.

## 29.4 Rechazar reportes de una reseña en lote
Marca los reportes en estado `EN_REVISION` de una reseña como `RECHAZADO`, registrando su evento de decisión individual para cada reporte en `reporte_resena_decision_auditoria`. Si los reportes no rechazados quedan por debajo del umbral de 3 y la reseña sigue activa, restablece `ocultaPorReportes = false`.

- **Métodos y rutas:** `PUT /api/moderacion/resenas/{idResena}/rechazar-reportes` (alias: `/rechazar`)
- **Autenticación:** Requerida (`Bearer <token_jwt>`). `Moderador` o `Administrador` activo.
- **Códigos de respuesta:**
  - `200 OK`: Retorna `ResenaReportadaResponse` actualizado con los reportes en `RECHAZADO`.
  - `401 Unauthorized`: Token ausente o inválido.
  - `403 Forbidden`: Sin permisos de moderación, cuenta suspendida o autor de la reseña.
  - `404 Not Found`: Reseña inexistente.
  - `409 Conflict`: Si existen reportes todavía en estado `PENDIENTE` que requieren revisión previa.

# 30. Revisión de reseñas retenidas por el filtro automático (Fase 1, migración 020)

El filtro automático (`ResenaModerationService`) retiene en `estadoModeracion = PENDIENTE` los comentarios con lenguaje no permitido, enlaces o texto repetido. Una reseña retenida no es pública ni cuenta en promedios o rankings hasta que un moderador la revise. Esta cola es distinta de la de reportes: ningún usuario reportó estas reseñas.

**Estados de `estadoModeracion`:** `PUBLICADA`, `PENDIENTE` y `RECHAZADA`.

**Reglas:**
- Las rutas están bajo `/api/moderacion/**`: requieren cuenta activa y rol activo `Moderador` o `Administrador`.
- Un moderador no puede revisar su propia reseña (`403`).
- Cada decisión registra primero un evento `APROBAR` o `RECHAZAR` en `resena_moderacion_auditoria` (moderador, motivo y fecha) y después cambia el estado, en la misma transacción. La migración 020 lo exige en PostgreSQL.
- Si el autor edita una reseña `RECHAZADA`, vuelve a `PENDIENTE`: un texto nuevo no se publica sin revisión. Si edita una `PENDIENTE`, sigue `PENDIENTE`.
- `RECHAZADA` no puede pasar directamente a `PUBLICADA`, ni `PUBLICADA` a `RECHAZADA`.

La respuesta de crear o editar una reseña (`POST /api/resenas`, `PUT /api/resenas/{id}`) incluye `estadoModeracion`; el frontend la usa para avisar al autor que su opinión quedó en revisión.

## 30.1 Listar reseñas en revisión
- **Ruta:** `GET /api/moderacion/resenas/en-revision`
- **Respuesta `200`:** lista de `ResenaEnRevisionResponse`, de la más antigua a la más reciente:
  ```json
  [{
    "idResena": 7,
    "idProducto": 3,
    "nombreProducto": "Samsung Galaxy Buds FE",
    "idUsuario": 11,
    "nombreUsuario": "laura",
    "comentario": "Más barato en www.otra-tienda.com",
    "puntuacion": 4,
    "fechaCreacion": "2026-11-20T10:00:00",
    "estadoModeracion": "PENDIENTE",
    "ocultaPorModeracion": false,
    "ocultaPorReportes": false,
    "motivosDeteccion": ["Contiene un enlace o dominio web"]
  }]
  ```
  `motivosDeteccion` se recalcula sobre el comentario actual; valores posibles: `Contiene lenguaje no permitido`, `Contiene un enlace o dominio web`, `Contiene texto repetido`.
- **Errores:** `401` sin token, `403` sin rol de moderación.

## 30.2 Aprobar una reseña en revisión
- **Ruta:** `PUT /api/moderacion/resenas/{idResena}/revision/aprobar` (alias `POST`)
- **Cuerpo (opcional):** `{ "motivo": "Enlace a la página oficial del fabricante" }`. Si se omite, se registra `Contenido revisado y aprobado por moderación`.
- **Respuesta `200`:** `ResenaEnRevisionResponse` con `estadoModeracion: "PUBLICADA"`.
- **Errores:** `400` motivo de más de 2000 caracteres; `401`; `403` sin rol o reseña propia; `404` reseña inexistente; `409` la reseña no está `PENDIENTE` o fue eliminada por su autor.

## 30.3 Rechazar una reseña en revisión
- **Ruta:** `PUT /api/moderacion/resenas/{idResena}/revision/rechazar` (alias `POST`)
- **Cuerpo (obligatorio):** `{ "motivo": "Insulto directo a otro usuario" }`
- **Respuesta `200`:** `ResenaEnRevisionResponse` con `estadoModeracion: "RECHAZADA"`.
- **Errores:** `400` motivo vacío o de más de 2000 caracteres; `401`; `403`; `404`; `409` igual que en 30.2.

El historial de estas decisiones se consulta con el endpoint existente `GET /api/moderacion/resenas/{idResena}/historial`, que ahora puede devolver las acciones `APROBAR` y `RECHAZAR` además de `OCULTAR` y `RESTAURAR`.

---

# 31. Reportes de precio y enlace de ofertas (TEC-147, TEC-148 y Fase 2, migraciones 018 y 021)

Un usuario registrado puede reportar que el precio o el enlace de una oferta (`producto_establecimiento`) es incorrecto. Los moderadores revisan esos reportes en una cola propia, separada de la de reseñas.

**Ciclo de estados:** `PENDIENTE` → `EN_REVISION` → `ACEPTADO` | `RECHAZADO`. Los dos últimos son finales.

**Reglas:**
- Un usuario solo puede tener **un reporte abierto** (`PENDIENTE` o `EN_REVISION`) por oferta. Cuando se cierra, puede volver a reportarla.
- **Límite compartido:** como máximo **10 reportes por hora** por usuario, sumando reportes de reseñas y de ofertas. Aplica también a `POST /api/resenas/{idResena}/reportes` y sus alias.
- Cada cambio de estado registra primero un evento en `reporte_oferta_historial` (moderador, estado anterior y nuevo, justificación y fecha) y después cambia el estado, en la misma transacción. La migración 021 lo exige en PostgreSQL y el historial no admite `UPDATE`, `DELETE` ni `TRUNCATE`.
- Un moderador no puede resolver un reporte creado por él (`403`).
- **Aceptar no modifica la oferta.** El moderador corrige el precio desde la administración de establecimientos. El motivo `enlace_incorrecto` se conserva, aunque las ofertas todavía no tienen un campo de URL (pendiente de la Fase 3).

## 31.1 Crear un reporte de oferta
- **Ruta:** `POST /api/reportes/ofertas` (requiere JWT)
- **Cuerpo:**
  ```json
  { "idProducto": 3, "idEstablecimiento": 8, "motivo": "precio_incorrecto", "descripcion": "En la tienda cuesta 120.000" }
  ```
  `motivo`: `precio_incorrecto` o `enlace_incorrecto`. `descripcion`: opcional, máximo 2000 caracteres. El usuario se toma del JWT.
- **Respuesta `201`:** `{ idReporte, idProducto, idEstablecimiento, motivo, descripcion, estado: "PENDIENTE", fechaCreacion }`.
- **Errores:**
  - `400` validación;
  - `401` sin token;
  - `403` usuario inactivo;
  - `404` la oferta no existe;
  - `409` `Ya tienes un reporte abierto sobre esta oferta. Espera a que moderación lo revise.`;
  - `429` `Alcanzaste el límite de 10 reportes por hora. Intenta de nuevo más tarde.`

## 31.2 Listar reportes de ofertas (moderación)
- **Ruta:** `GET /api/moderacion/ofertas/reportes?estado=PENDIENTE` (`estado` es opcional)
- **Respuesta `200`:** lista de `ReporteOfertaModeracionResponse`, del más antiguo al más reciente:
  ```json
  [{
    "idReporte": 5,
    "idProducto": 3, "nombreProducto": "Samsung Galaxy Buds FE",
    "idEstablecimiento": 8, "nombreEstablecimiento": "Tienda Centro",
    "precioActual": 95000.00, "disponibilidadActual": true,
    "idUsuario": 11, "nombreUsuario": "laura",
    "motivo": "precio_incorrecto", "descripcion": "En la tienda cuesta 120.000",
    "estado": "EN_REVISION",
    "fechaCreacion": "2026-11-20T10:00:00", "fechaActualizacion": "2026-11-20T11:00:00",
    "historial": [{
      "idHistorial": 1, "estadoAnterior": "PENDIENTE", "estadoNuevo": "EN_REVISION",
      "idModerador": 2, "nombreModerador": "mod", "justificacion": null,
      "fechaEvento": "2026-11-20T11:00:00"
    }]
  }]
  ```
  `precioActual` y `disponibilidadActual` son los valores vigentes de la oferta, para contrastarlos con el reporte.
- **Errores:** `400` estado inválido; `401`; `403` sin rol activo de `Moderador` o `Administrador`.

## 31.3 Consultar un reporte
- **Ruta:** `GET /api/moderacion/ofertas/reportes/{idReporte}`
- **Respuesta `200`:** `ReporteOfertaModeracionResponse` con su historial.
- **Errores:** `401`; `403`; `404`.

## 31.4 Tomar, aceptar o rechazar
- **Rutas** (alias `POST`):
  - `PUT /api/moderacion/ofertas/reportes/{idReporte}/en-revision`: solo desde `PENDIENTE`.
  - `PUT /api/moderacion/ofertas/reportes/{idReporte}/aceptar`
  - `PUT /api/moderacion/ofertas/reportes/{idReporte}/rechazar`
- **Cuerpo:** `{ "motivo": "El precio coincide con la tienda" }`. Es obligatorio para rechazar y opcional para tomar o aceptar.
- Aceptar o rechazar un reporte `PENDIENTE` lo pasa antes por `EN_REVISION` en la misma transacción, así que el historial registra los dos pasos.
- **Respuesta `200`:** `ReporteOfertaModeracionResponse` actualizado.
- **Errores:**
  - `400` justificación vacía al rechazar, o de más de 2000 caracteres;
  - `401`;
  - `403` sin rol, o reporte propio;
  - `404`;
  - `409` el reporte ya fue resuelto, o se intenta tomar uno que no está `PENDIENTE`.

---

# 32. Ofertas por tienda: consulta pública y administración (Fase 3, migración 022)

Una oferta (`producto_establecimiento`) es el precio, la disponibilidad y el enlace de un producto en una tienda. **Es la única fuente de «Dónde comprar»** en el detalle del producto; el JSON `caracteristicas.tiendas` solo existe en los datos mock.

**Reglas:**
- `fechaActualizacionPrecio` la fija PostgreSQL: un trigger la actualiza al crear la oferta y cuando cambian el precio, la disponibilidad o el enlace. El cliente no la envía.
- `urlOferta` es opcional; si se envía, debe empezar por `http://` o `https://`, sin espacios y con máximo 2048 caracteres. Un enlace vacío se guarda como `null`.
- `verificado` refleja `establecimiento.verificado` (TEC-151). El frontend muestra el sello «Verificada» solo cuando vale `true`.
- Una oferta con reportes (§31) no se puede eliminar, porque su historial depende de ella: se marca como no disponible.

## 32.1 Ofertas disponibles de un producto (público)
- **Ruta:** `GET /api/productos/{idProducto}/establecimientos`
- **Respuesta `200`:** ofertas disponibles de tiendas activas, de menor a mayor precio:
  ```json
  [{
    "idEstablecimiento": 8, "nombre": "Tienda Centro",
    "direccion": null, "telefono": null, "correo": null, "latitud": null, "longitud": null,
    "precio": 95000.00, "disponibilidad": true,
    "verificado": true,
    "urlOferta": "https://tienda.co/buds",
    "fechaActualizacionPrecio": "2026-11-20T10:00:00"
  }]
  ```
  Los tres últimos campos se añadieron en la Fase 3; el resto del contrato no cambia.
- **Errores:** `404` producto inexistente o inactivo.

## 32.2 Listar ofertas (administración)
- **Ruta:** `GET /api/admin/ofertas?idProducto=3` (`idProducto` es opcional)
- **Respuesta `200`:** lista de `OfertaAdminResponse`, incluidas las no disponibles: `idProducto`, `nombreProducto`, `idEstablecimiento`, `nombreEstablecimiento`, `establecimientoActivo`, `establecimientoVerificado`, `precio`, `disponibilidad`, `urlOferta`, `fechaActualizacionPrecio` y `reportesAbiertos` (reportes `PENDIENTE` o `EN_REVISION`).
- **Errores:** `401`; `403` sin rol activo de `Administrador` o con la cuenta suspendida.

## 32.3 Crear o actualizar una oferta
- **Ruta:** `PUT /api/admin/productos/{idProducto}/establecimientos/{idEstablecimiento}`
- **Cuerpo:**
  ```json
  { "precio": 95000, "disponibilidad": true, "urlOferta": "https://tienda.co/buds" }
  ```
  `precio`: obligatorio, mayor que cero, hasta 10 enteros y 2 decimales. `disponibilidad`: obligatoria. `urlOferta`: opcional.
- Si la oferta no existe, la crea; si existe, la actualiza.
- **Respuesta `200`:** `OfertaAdminResponse`.
- **Errores:** `400` validación; `401`; `403`; `404` producto o tienda inexistentes; `409` dos administradores crearon la misma oferta a la vez.

## 32.4 Eliminar una oferta
- **Ruta:** `DELETE /api/admin/productos/{idProducto}/establecimientos/{idEstablecimiento}`
- **Respuesta `204`.**
- **Errores:** `401`; `403`; `404` la oferta no existe; `409` `La oferta tiene reportes asociados y no se puede eliminar. Márcala como no disponible.`

## 32.5 Resumen de ofertas de todos los productos (Fase 4)
- **Ruta:** `GET /api/productos/resumen-ofertas` (público)
- **Respuesta `200`:** una entrada por producto activo con ofertas disponibles, con precio mayor que cero, en tiendas activas:
  ```json
  [{ "idProducto": 3, "tiendasDisponibles": 2, "menorPrecio": 89000.00, "fechaActualizacionMasReciente": "2026-11-20T10:00:00" }]
  ```
  Un producto que no aparece no tiene ofertas disponibles. El frontend lo usa para mostrar la disponibilidad real en el catálogo y el comparador con una sola consulta.

---

# 33. Moderación inteligente y suspensión de cuentas (Caso 6, migración 024)

## 33.1 Niveles de riesgo del filtro automático
Al crear o editar una reseña (`POST /api/resenas`, `PUT /api/resenas/{id}`), el filtro por reglas asigna un nivel:
- `NINGUNO` y `BAJO` → `estadoModeracion: "PUBLICADA"`. `BAJO` son palabras ambiguas sobre el producto («odio que la batería…»).
- `MEDIO` → `PENDIENTE`: insultos, vulgaridades, palabras ambiguas dirigidas a una persona, enlaces, texto repetido.
- `ALTO` → `PENDIENTE`: posibles amenazas o acoso.

`GET /api/moderacion/resenas/en-revision` (§30.1) añade el campo `riesgo` (`MEDIO` o `ALTO`) y ordena primero las de riesgo `ALTO`. El motivo nuevo `Posible amenaza o acoso` aparece en `motivosDeteccion`, y también `Contiene un insulto dirigido a una persona`.

El historial de moderación de una reseña (`resena_moderacion_auditoria`) guarda `comentario_revisado`: el texto en el momento de cada decisión, copiado por PostgreSQL.

## 33.2 Suspender o reactivar una cuenta
- **Ruta:** `PUT /api/admin/usuarios/{idUsuario}/estado` (requiere rol `Administrador` activo)
- **Cuerpo:** `{ "activo": false, "motivo": "Insultos reiterados" }`. `activo` es obligatorio; `motivo` es obligatorio, máximo 2000 caracteres.
- Una cuenta suspendida no puede publicar reseñas, reportar ni moderar (esas validaciones ya existían).
- Cada cambio queda en `auditoria_usuario_estado`, de solo inserción: administrador, estado anterior y nuevo, motivo y fecha. PostgreSQL exige el evento en la misma transacción.
- **Respuesta `200`:** `UsuarioAdminResponse` con `activo` actualizado.
- **Errores:**
  - `400` falta `activo` o el motivo está vacío;
  - `401`;
  - `403` sin rol de administrador, o intento de cambiar la propia cuenta;
  - `404` cuenta inexistente;
  - `409` `La cuenta ya está activa.` / `La cuenta ya está suspendida.` / `No se puede suspender a un administrador activo; primero retira su rol.`

