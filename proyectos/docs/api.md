# API REST de TecnoReview

## 1. Información general

**Proyecto:** TecnoReview  
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
| Recurso          | Método | Endpoint                           | Acceso             |  
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
| Reseñas          | GET    | `/api/productos/{id}/resenas`      | Público            |
| Reseña           | POST   | `/api/productos/{id}/resenas`      | Usuario            |
| Reseña           | PUT    | `/api/resenas/{id}`                | Usuario autorizado |
| Reseña           | DELETE | `/api/resenas/{id}`                | Usuario autorizado |
| Valoración       | POST   | `/api/productos/{id}/valoraciones` | Usuario            |
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
Resena
Valoracion
Establecimiento

---

# 4. URL base

Durante el desarrollo se utilizará una URL local similar a:

http://localhost:8080

La API utilizará el prefijo:

/api

Por lo tanto, un endpoint podría ser:

http://localhost:8080/api/productos

La URL definitiva del backend se establecerá cuando se configure el entorno de despliegue.

El frontend no debe depender de una URL escrita directamente en los componentes. Se recomienda utilizar una variable de entorno.

Ejemplo:

NEXT_PUBLIC_API_URL=http://localhost:8080

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

Método	Uso
GET	Consultar información
POST	Crear información
PUT	Actualizar información
DELETE	Eliminar información

---

# 7. Productos

Los productos constituyen una de las entidades principales de TecnoReview.

## 7.1 Consultar productos
GET /api/productos

Permite obtener el listado de productos disponibles.

Respuesta esperada
[
  {
    "id": 1,
    "nombre": "Laptop Lenovo IdeaPad",
    "descripcion": "Computador portátil",
    "marca": "Lenovo",
    "categoria": "Portátiles"
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
  "marcaId": 2,
  "categoriaId": 1
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

# 8. Búsqueda de productos

La plataforma debe permitir buscar productos.

Un endpoint propuesto es:

GET /api/productos/buscar?nombre=laptop

También pueden implementarse parámetros para filtrar por:

Nombre.
Categoría.
Marca.

Ejemplo:

GET /api/productos?categoria=portatiles

La implementación exacta de los parámetros podrá ajustarse durante el desarrollo.

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
  "correo": "juan@example.com",
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
  "correo": "juan@example.com",
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

TecnoReview contempla los siguientes tipos de usuario:

VISITANTE
USUARIO
ADMINISTRADOR
REPRESENTANTE_ESTABLECIMIENTO

Los permisos deben ser controlados desde el backend.

No es suficiente ocultar botones en el frontend.

Por ejemplo, aunque el frontend no muestre el botón de eliminar producto a un usuario normal, el backend también debe impedir:

DELETE /api/productos/1

si el usuario no tiene autorización.

---

# 14. Reseñas

Los usuarios registrados podrán crear reseñas sobre productos.

### 14.1 Consultar reseñas de un producto
GET /api/productos/{productoId}/resenas

Ejemplo:

GET /api/productos/1/resenas
14.2 Crear reseña
POST /api/productos/{productoId}/resenas

Ejemplo:

{
  "titulo": "Buena experiencia",
  "comentario": "El producto tiene buen rendimiento para estudiar."
}

El usuario debe estar autenticado.

14.3 Actualizar reseña
PUT /api/resenas/{id}

El backend debe verificar que el usuario tenga permiso para modificar la reseña.

14.4 Eliminar reseña
DELETE /api/resenas/{id}

La autorización deberá validarse en el backend.

15. Valoraciones

Los usuarios podrán valorar los productos.

La escala exacta de valoración todavía debe definirse en el proyecto.

Por ejemplo, podría utilizarse:

1 a 5

Si se adopta esta escala, una solicitud podría tener:

POST /api/productos/{productoId}/valoraciones

Ejemplo:

{
  "valor": 5
}

El backend deberá validar que el valor recibido pertenezca a la escala establecida.

16. Opiniones positivas y negativas

TecnoReview contempla el registro de aspectos positivos y negativos relacionados con un producto.

La estructura definitiva todavía debe definirse en función de la implementación de reseñas.

Una posibilidad sería:

{
  "positivos": [
    "Buena batería",
    "Pantalla de buena calidad"
  ],
  "negativos": [
    "Cargador lento"
  ]
}

La estructura final deberá mantenerse consistente con el modelo de datos y la interfaz definida para las reseñas.

17. Comparación de productos

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

18. Establecimientos

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

19. Productos y establecimientos

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

20. Google Maps

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

21. Códigos de respuesta HTTP

La API utilizará códigos HTTP para indicar el resultado de las operaciones.

Código	Significado
200	Solicitud exitosa
201	Recurso creado
204	Operación exitosa sin contenido
400	Solicitud incorrecta
401	No autenticado
403	Sin permisos
404	Recurso no encontrado
409	Conflicto
500	Error interno del servidor
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

24. Validación

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

26. Variables de entorno

El backend podrá utilizar variables de entorno para información sensible.

Ejemplo:

DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=

El frontend podrá utilizar:

NEXT_PUBLIC_API_URL=

Las variables reales no deben almacenarse directamente en el repositorio.

27. Integración con el frontend

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

28. Organización propuesta del backend

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

30. Pruebas de la API

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

Requisito	Funcionalidad API
RF-01	Registro
RF-02	Login
RF-03	Usuarios y roles
RF-04	Consulta de productos
RF-05	CRUD de productos
RF-06	CRUD de categorías
RF-07	CRUD de marcas
RF-08	Búsqueda
RF-09	Reseñas
RF-10	Valoraciones
RF-11	Opiniones positivas/negativas
RF-12	Comparación
RF-13	Establecimientos
RF-14	Datos para ubicación
RF-15	Comunicación REST
RF-16	Persistencia
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
34. Estado de implementación

Los siguientes elementos se consideran inicialmente planificados:

 Configuración de Spring Boot.
 Conexión con PostgreSQL/Supabase.
 Entidades.
 Repositories.
 Services.
 Controllers.
 DTOs.
 Validaciones.
 Manejo de excepciones.
 Autenticación.
 Autorización por roles.
 Endpoints de productos.
 Endpoints de categorías.
 Endpoints de marcas.
 Endpoints de usuarios.
 Endpoints de reseñas.
 Endpoints de valoraciones.
 Endpoint de comparación.
 Endpoints de establecimientos.
 Pruebas de API.
 Integración con Next.js.
 Documentación definitiva.
35. Consideraciones de diseño

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