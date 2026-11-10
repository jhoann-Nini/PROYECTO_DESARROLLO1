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
| Establecimiento  | POST   | `/api/establecimientos`            | Autorizado         |
| Establecimiento  | PUT    | `/api/establecimientos/{id}`       | Autorizado         |
| Establecimiento  | DELETE | `/api/establecimientos/{id}`       | Autorizado         |

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

Este endpoint será utilizado por los usuarios autorizados para registrar productos.

Ejemplo:

{
  "nombre": "Samsung Galaxy A55",
  "descripcion": "Teléfono inteligente",
  "idMarca": 2,
  "idCategoria": 1,
  "imagen": null,
  "precioReferencia": 1500000
}

El backend deberá validar los datos antes de almacenarlos.

## 7.4 Actualizar producto

PUT /api/productos/{id}

Ejemplo:

PUT /api/productos/1

Permite modificar la información de un producto.

7.5 Eliminar producto
DELETE /api/productos/{id}

Permite eliminar un producto cuando el usuario tenga los permisos correspondientes.

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

 1. Establecimientos

TecnoReview también contempla información sobre establecimientos relacionados con productos tecnológicos.

18.1 Consultar establecimientos
GET /api/establecimientos
18.2 Consultar un establecimiento
GET /api/establecimientos/{id}
18.3 Crear establecimiento
POST /api/establecimientos

Ejemplo:

{
  "nombre": "Tienda Tecnológica",
  "direccion": "Dirección del establecimiento",
  "telefono": "0000000000"
}

Los campos definitivos se establecerán durante la implementación.

18.4 Actualizar establecimiento
PUT /api/establecimientos/{id}
18.5 Eliminar establecimiento
DELETE /api/establecimientos/{id}

La operación deberá estar protegida mediante autorización.

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

**Migraciones requeridas:** ejecutar primero `src/main/resources/db/migration/005_multirole_y_representantes.sql` y después `006_auditoria_asignaciones.sql`, únicamente tras validarlas en una base de pruebas PostgreSQL. Estas migraciones no han sido ejecutadas en Supabase.
