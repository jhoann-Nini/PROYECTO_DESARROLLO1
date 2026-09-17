# Usuarios y roles

## 1. Información general

**Nombre del proyecto:** TecnoReview

TecnoReview manejará diferentes tipos de usuarios con permisos y responsabilidades específicas.

La definición de roles permite controlar el acceso a las funcionalidades de la plataforma y establecer qué operaciones puede realizar cada usuario.

Los roles contemplados inicialmente son:

- Visitante
- Usuario registrado
- Administrador
- Representante de establecimiento

---

# 2. Roles del sistema

## 2.1 Visitante

Es una persona que accede a TecnoReview sin haber iniciado sesión.

### Funciones permitidas

El visitante podrá:

- Acceder a la página principal.
- Consultar el catálogo público.
- Buscar productos.
- Consultar categorías.
- Consultar marcas.
- Consultar el detalle público de los productos.
- Consultar reseñas y valoraciones disponibles.
- Consultar establecimientos.
- Consultar la ubicación de establecimientos mediante el mapa.
- Acceder al formulario de registro.
- Acceder al formulario de inicio de sesión.

### Restricciones

El visitante no podrá:

- Registrar reseñas.
- Registrar valoraciones.
- Administrar productos.
- Administrar categorías.
- Administrar marcas.
- Administrar establecimientos.
- Acceder a información privada de otros usuarios.

---

## 2.2 Usuario registrado

Es una persona que posee una cuenta en TecnoReview y ha iniciado sesión.

### Funciones permitidas

El usuario registrado podrá:

- Consultar productos.
- Buscar productos.
- Consultar categorías.
- Consultar marcas.
- Consultar detalles de productos.
- Comparar productos.
- Consultar reseñas.
- Registrar reseñas.
- Registrar valoraciones.
- Registrar aspectos positivos y negativos sobre productos.
- Consultar establecimientos.
- Consultar ubicaciones.
- Gestionar la información básica de su propia cuenta.

### Restricciones

El usuario registrado no podrá:

- Administrar globalmente el catálogo.
- Crear o eliminar categorías sin autorización.
- Administrar las cuentas de otros usuarios.
- Modificar información restringida de establecimientos.
- Acceder a funciones exclusivas del administrador.

---

# 3. Administrador

El administrador es el usuario encargado de administrar y supervisar la información principal de la plataforma.

### Funciones permitidas

El administrador podrá:

- Gestionar productos.
- Crear productos.
- Consultar productos.
- Actualizar productos.
- Eliminar productos.
- Gestionar categorías.
- Crear categorías.
- Consultar categorías.
- Actualizar categorías.
- Eliminar categorías cuando corresponda.
- Gestionar marcas.
- Crear marcas.
- Consultar marcas.
- Actualizar marcas.
- Eliminar marcas cuando corresponda.
- Gestionar establecimientos.
- Consultar información de usuarios según los permisos establecidos.
- Supervisar el contenido de la plataforma.
- Realizar operaciones administrativas necesarias para mantener el sistema.

### Restricciones

Las funciones administrativas deberán estar protegidas mediante autenticación y autorización.

Un usuario que no tenga el rol de administrador no debe poder ejecutar operaciones exclusivas del administrador.

---

# 4. Representante de establecimiento

Es el usuario autorizado para administrar información correspondiente a un establecimiento tecnológico.

### Funciones contempladas

El representante podrá:

- Consultar la información de su establecimiento.
- Registrar información del establecimiento cuando tenga autorización.
- Actualizar información permitida.
- Consultar productos asociados al establecimiento.
- Mantener actualizada la información de ubicación.
- Consultar la información pública de otros establecimientos.

### Restricciones

El representante no podrá:

- Administrar establecimientos que no tenga autorizados.
- Administrar usuarios.
- Modificar categorías globales sin autorización.
- Modificar marcas globales sin autorización.
- Realizar operaciones exclusivas del administrador.

> Los mecanismos exactos para determinar qué establecimiento pertenece a cada representante se definirán durante el desarrollo del backend y el modelo de datos.

---

# 5. Matriz de permisos

| Funcionalidad | Visitante | Usuario registrado | Administrador | Representante |
|---|:---:|:---:|:---:|:---:|
| Ver página principal | ✅ | ✅ | ✅ | ✅ |
| Consultar productos | ✅ | ✅ | ✅ | ✅ |
| Buscar productos | ✅ | ✅ | ✅ | ✅ |
| Consultar categorías | ✅ | ✅ | ✅ | ✅ |
| Consultar marcas | ✅ | ✅ | ✅ | ✅ |
| Ver detalle de producto | ✅ | ✅ | ✅ | ✅ |
| Comparar productos | ✅ | ✅ | ✅ | ✅ |
| Ver reseñas | ✅ | ✅ | ✅ | ✅ |
| Crear reseña | ❌ | ✅ | ✅ | ✅ |
| Crear valoración | ❌ | ✅ | ✅ | ✅ |
| Registrar aspectos positivos/negativos | ❌ | ✅ | ✅ | ✅ |
| Consultar establecimientos | ✅ | ✅ | ✅ | ✅ |
| Consultar ubicación | ✅ | ✅ | ✅ | ✅ |
| Crear producto | ❌ | ❌ | ✅ | ❌ |
| Actualizar producto | ❌ | ❌ | ✅ | Según autorización |
| Eliminar producto | ❌ | ❌ | ✅ | ❌ |
| Crear categoría | ❌ | ❌ | ✅ | ❌ |
| Actualizar categoría | ❌ | ❌ | ✅ | ❌ |
| Eliminar categoría | ❌ | ❌ | ✅ | ❌ |
| Crear marca | ❌ | ❌ | ✅ | ❌ |
| Actualizar marca | ❌ | ❌ | ✅ | ❌ |
| Eliminar marca | ❌ | ❌ | ✅ | ❌ |
| Administrar establecimiento | ❌ | ❌ | ✅ | Según autorización |
| Administrar usuarios | ❌ | ❌ | ✅ | ❌ |

---

# 6. Autenticación

Las funciones que requieran una cuenta deberán estar protegidas mediante autenticación.

El proceso general será:

```text
Usuario
   ↓
Ingresa credenciales
   ↓
Frontend
   ↓
Backend / API REST
   ↓
Validación de credenciales
   ↓
Identificación del usuario
   ↓
Identificación del rol
   ↓
Acceso a funcionalidades permitidas
```
---

El backend será responsable de validar que el usuario tenga los permisos necesarios para ejecutar operaciones protegidas.

# 7. Autorización

La autorización determina qué operaciones puede ejecutar un usuario después de autenticarse.

Por ejemplo:

```
Usuario registrado
        ↓
¿Puede crear producto?
        ↓
       NO

Mientras que:

Administrador
        ↓
¿Puede crear producto?
        ↓
       SÍ
```

La autorización deberá implementarse principalmente en el backend para evitar que un usuario pueda acceder directamente a operaciones restringidas mediante solicitudes a la API.

# 8. Relación con las funcionalidades

Los roles se relacionan con las principales funcionalidades de TecnoReview de la siguiente manera:

Visitante
Principalmente consulta información pública.

- Productos
- Categorías
- Marcas
- Reseñas
- Establecimientos
- Ubicaciones
- Usuario registrado

Además de consultar información, puede participar en la plataforma.

- Productos
- Búsqueda
- Comparación
- Reseñas
- Valoraciones
- Opiniones
- Administrador

Administra la información general del sistema.

- Productos
- Categorías
- Marcas
- Establecimientos
- Usuarios
- Contenido
- Representante de establecimiento

Administra información relacionada con su establecimiento según los permisos asignados.

- Establecimiento
- Información
- Ubicación
- Productos asociados

---

# 9. Reglas generales de seguridad

Se deberán considerar las siguientes reglas:

1. Las contraseñas no deben almacenarse directamente en texto plano.
2. Las credenciales y secretos no deben almacenarse en GitHub.
3. Las variables sensibles deben manejarse mediante variables de entorno.
4. Las operaciones administrativas deben estar protegidas.
5. El backend debe validar el rol antes de ejecutar operaciones restringidas.
6. Un usuario no debe poder modificar información que no le pertenece.
7. Los datos recibidos desde el frontend deben validarse en el backend.
8. Las operaciones de eliminación deben estar restringidas a usuarios autorizados.
9. Los endpoints protegidos no deben depender únicamente de las restricciones visuales del frontend.
10. Se deben realizar pruebas para verificar que usuarios sin permisos no puedan acceder a operaciones restringidas.

---

# 10. Relación con la base de datos

Los usuarios y roles deberán estar representados en el modelo de datos.

De manera inicial se contempla una estructura similar a:

```
USUARIO
   |
   | pertenece a
   ↓
ROL
```

Un usuario tendrá asociado un rol que permitirá determinar sus permisos dentro de la aplicación.

La estructura definitiva de las tablas, claves y relaciones será especificada en:

docs/modelo-datos.md

# 11. Relación con la API

Los endpoints de la API deberán clasificarse según el nivel de acceso requerido.

Ejemplo conceptual:

```
GET /api/productos
        ↓
Acceso público
POST /api/resenas
        ↓
Requiere usuario autenticado
POST /api/productos
        ↓
Requiere rol administrador
PUT /api/establecimientos/{id}
        ↓
Requiere administrador
o representante autorizado
```

Los endpoints definitivos serán documentados posteriormente en:

docs/api.md

# 12. Estado del documento

Versión: 1.0
Estado: Borrador inicial
Documento: Usuarios y roles
Última actualización: Pendiente de registrar


