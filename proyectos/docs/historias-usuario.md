# Historias de usuario

## 1. Información general

**Nombre del proyecto:** TecnoReview

**Tipo de sistema:** Plataforma web de reseñas y comparación tecnológica.

Las historias de usuario describen las funcionalidades del sistema desde la perspectiva de las personas que utilizarán la plataforma.

La estructura utilizada será:

> Como [tipo de usuario], quiero [acción o funcionalidad], para [beneficio o propósito].

Cada historia incluye:

- Identificador.
- Usuario o rol.
- Historia.
- Prioridad.
- Criterios de aceptación.
- Requisito funcional relacionado.

---

# 2. Historias de usuario

## HU-01 - Registro de usuario

**Rol:** Usuario no registrado

**Historia:**

> Como usuario no registrado, quiero crear una cuenta en TecnoReview, para poder utilizar las funciones que requieren autenticación.

**Prioridad:** Alta

**Requisito relacionado:** RF-01

### Criterios de aceptación

- El usuario debe encontrar una opción para registrarse.
- El sistema debe solicitar los datos definidos para el registro.
- El correo electrónico debe validarse.
- No debe permitirse registrar un correo que ya exista.
- La información debe almacenarse correctamente.
- El sistema debe informar si el registro fue exitoso o si ocurrió un error.

---

## HU-02 - Inicio de sesión

**Rol:** Usuario registrado

**Historia:**

> Como usuario registrado, quiero iniciar sesión, para acceder a las funciones disponibles para mi cuenta.

**Prioridad:** Alta

**Requisito relacionado:** RF-02

### Criterios de aceptación

- El usuario debe ingresar sus credenciales.
- El sistema debe validar las credenciales.
- Si son correctas, debe permitir el acceso.
- Si son incorrectas, debe mostrar un mensaje.
- El sistema debe identificar el rol del usuario.

---

## HU-03 - Consultar productos

**Rol:** Usuario

**Historia:**

> Como usuario, quiero consultar productos tecnológicos, para conocer sus características y opiniones.

**Prioridad:** Alta

**Requisito relacionado:** RF-04

### Criterios de aceptación

- El usuario debe poder acceder al catálogo.
- El sistema debe mostrar los productos disponibles.
- Cada producto debe mostrar la información registrada.
- El usuario debe poder acceder al detalle de un producto.

---

## HU-04 - Buscar productos

**Rol:** Usuario

**Historia:**

> Como usuario, quiero buscar productos tecnológicos por diferentes criterios, para encontrar rápidamente el producto que me interesa.

**Prioridad:** Alta

**Requisito relacionado:** RF-08

### Criterios de aceptación

- Debe existir un mecanismo de búsqueda.
- El usuario debe poder introducir un término de búsqueda.
- El sistema debe mostrar las coincidencias encontradas.
- La búsqueda debe considerar la información disponible del producto.
- Si no existen coincidencias, el sistema debe informar al usuario.

---

## HU-05 - Filtrar productos por categoría

**Rol:** Usuario

**Historia:**

> Como usuario, quiero consultar productos por categoría, para encontrar productos relacionados con el tipo de tecnología que estoy buscando.

**Prioridad:** Alta

**Requisito relacionado:** RF-06

### Criterios de aceptación

- El sistema debe mostrar las categorías disponibles.
- El usuario debe poder seleccionar una categoría.
- El sistema debe mostrar los productos pertenecientes a dicha categoría.

---

## HU-06 - Consultar productos por marca

**Rol:** Usuario

**Historia:**

> Como usuario, quiero consultar productos según su marca, para encontrar productos de un fabricante específico.

**Prioridad:** Alta

**Requisito relacionado:** RF-07

### Criterios de aceptación

- El sistema debe permitir identificar la marca de un producto.
- La información de marca debe estar asociada correctamente al producto.
- El usuario debe poder utilizar la marca como criterio de consulta cuando esta función esté disponible.

---

## HU-07 - Consultar detalle del producto

**Rol:** Usuario

**Historia:**

> Como usuario, quiero consultar el detalle de un producto, para conocer sus características antes de tomar una decisión.

**Prioridad:** Alta

**Requisito relacionado:** RF-04

### Criterios de aceptación

- El usuario debe poder seleccionar un producto.
- El sistema debe mostrar la información disponible.
- Deben mostrarse las características registradas.
- Deben mostrarse las valoraciones y reseñas disponibles.

---

## HU-08 - Registrar una reseña

**Rol:** Usuario registrado

**Historia:**

> Como usuario registrado, quiero escribir una reseña sobre un producto, para compartir mi experiencia con otros usuarios.

**Prioridad:** Alta

**Requisito relacionado:** RF-09

### Criterios de aceptación

- Solo usuarios autenticados pueden registrar reseñas.
- La reseña debe estar asociada al producto.
- La reseña debe estar asociada al usuario que la publicó.
- El sistema debe validar la información antes de almacenarla.
- La reseña debe aparecer posteriormente en el producto correspondiente.

---

## HU-09 - Valorar un producto

**Rol:** Usuario registrado

**Historia:**

> Como usuario registrado, quiero valorar un producto, para expresar mi nivel de satisfacción con este.

**Prioridad:** Alta

**Requisito relacionado:** RF-10

### Criterios de aceptación

- Solo usuarios autorizados pueden registrar una valoración.
- La valoración debe pertenecer a un producto.
- El sistema debe validar el valor seleccionado.
- La valoración debe almacenarse correctamente.
- El resultado debe poder visualizarse en el producto.

---

## HU-10 - Registrar aspectos positivos y negativos

**Rol:** Usuario registrado

**Historia:**

> Como usuario registrado, quiero indicar aspectos positivos y negativos de un producto, para proporcionar información más detallada a otros usuarios.

**Prioridad:** Media

**Requisito relacionado:** RF-11

### Criterios de aceptación

- El usuario debe poder registrar aspectos positivos.
- El usuario debe poder registrar aspectos negativos.
- La información debe asociarse con la reseña o producto correspondiente.
- Los demás usuarios deben poder consultar esta información.

---

## HU-11 - Comparar productos

**Rol:** Usuario

**Historia:**

> Como usuario, quiero comparar diferentes productos tecnológicos, para identificar sus diferencias y características.

**Prioridad:** Alta

**Requisito relacionado:** RF-12

### Criterios de aceptación

- El usuario debe poder seleccionar productos para comparar.
- El sistema debe mostrar los productos seleccionados.
- Las características deben presentarse de forma organizada.
- La comparación debe utilizar información almacenada en el sistema.

---

## HU-12 - Consultar establecimientos

**Rol:** Usuario

**Historia:**

> Como usuario, quiero consultar establecimientos relacionados con productos tecnológicos, para conocer dónde puedo encontrar este tipo de productos.

**Prioridad:** Media

**Requisito relacionado:** RF-13

### Criterios de aceptación

- El sistema debe mostrar los establecimientos registrados.
- Cada establecimiento debe mostrar la información disponible.
- El usuario debe poder consultar los productos relacionados cuando dicha información esté registrada.

---

## HU-13 - Consultar ubicación de un establecimiento

**Rol:** Usuario

**Historia:**

> Como usuario, quiero consultar la ubicación de un establecimiento mediante un mapa, para conocer dónde se encuentra.

**Prioridad:** Media

**Requisito relacionado:** RF-14

### Criterios de aceptación

- El establecimiento debe tener una ubicación registrada.
- El sistema debe mostrar la ubicación mediante la integración de mapas.
- La información mostrada debe corresponder al establecimiento seleccionado.

---

## HU-14 - Administrar productos

**Rol:** Administrador

**Historia:**

> Como administrador, quiero administrar los productos registrados, para mantener actualizado el catálogo de TecnoReview.

**Prioridad:** Alta

**Requisito relacionado:** RF-05

### Criterios de aceptación

- El administrador debe poder crear productos.
- El administrador debe poder consultar productos.
- El administrador debe poder actualizar productos.
- El administrador debe poder eliminar productos.
- El sistema debe validar los datos ingresados.

---

## HU-15 - Administrar categorías

**Rol:** Administrador

**Historia:**

> Como administrador, quiero administrar las categorías de productos, para mantener organizado el catálogo.

**Prioridad:** Alta

**Requisito relacionado:** RF-06

### Criterios de aceptación

- El administrador debe poder crear categorías.
- El administrador debe poder consultar categorías.
- El administrador debe poder actualizar categorías.
- El administrador debe poder eliminar categorías cuando corresponda.

---

## HU-16 - Administrar marcas

**Rol:** Administrador

**Historia:**

> Como administrador, quiero administrar las marcas de productos, para mantener organizada la información del catálogo.

**Prioridad:** Alta

**Requisito relacionado:** RF-07

### Criterios de aceptación

- El administrador debe poder registrar marcas.
- El administrador debe poder consultar marcas.
- El administrador debe poder actualizar marcas.
- El administrador debe poder eliminar marcas cuando corresponda.

---

## HU-17 - Administrar establecimientos

**Rol:** Administrador / Representante de establecimiento

**Historia:**

> Como usuario autorizado, quiero administrar la información de un establecimiento, para mantener actualizados sus datos dentro de la plataforma.

**Prioridad:** Media

**Requisito relacionado:** RF-13

### Criterios de aceptación

- El usuario debe tener los permisos correspondientes.
- Debe poder registrar o actualizar la información permitida.
- Los datos deben almacenarse correctamente.
- La información actualizada debe reflejarse en la plataforma.

---

## HU-18 - Consultar información como visitante

**Rol:** Usuario no registrado

**Historia:**

> Como visitante, quiero consultar productos y sus características, para conocer la información disponible antes de crear una cuenta.

**Prioridad:** Alta

**Requisito relacionado:** RF-04

### Criterios de aceptación

- El visitante debe poder acceder al catálogo público.
- Debe poder consultar productos disponibles.
- Debe poder consultar la información pública del producto.
- Las funciones que requieran autenticación deben solicitar el inicio de sesión.

---

## HU-19 - Consumir información mediante la API

**Rol:** Sistema

**Historia:**

> Como sistema frontend, quiero consumir los servicios proporcionados por el backend, para mostrar y gestionar la información de TecnoReview.

**Prioridad:** Alta

**Requisito relacionado:** RF-15

### Criterios de aceptación

- El frontend debe comunicarse con la API REST.
- Las solicitudes deben utilizar los endpoints correspondientes.
- El frontend debe procesar las respuestas.
- Los errores de comunicación deben manejarse adecuadamente.

---

## HU-20 - Almacenar información del sistema

**Rol:** Sistema

**Historia:**

> Como sistema, quiero almacenar la información de usuarios, productos, reseñas, valoraciones y establecimientos, para conservar los datos de la plataforma.

**Prioridad:** Alta

**Requisito relacionado:** RF-16

### Criterios de aceptación

- La aplicación debe conectarse con PostgreSQL.
- Los datos deben almacenarse correctamente.
- Las relaciones entre las entidades deben mantenerse.
- La información debe poder recuperarse posteriormente.

---

# 3. Resumen de historias

| ID | Historia | Rol principal | Prioridad |
|---|---|---|---|
| HU-01 | Registro de usuario | Usuario no registrado | Alta |
| HU-02 | Inicio de sesión | Usuario registrado | Alta |
| HU-03 | Consultar productos | Usuario | Alta |
| HU-04 | Buscar productos | Usuario | Alta |
| HU-05 | Filtrar por categoría | Usuario | Alta |
| HU-06 | Consultar por marca | Usuario | Alta |
| HU-07 | Consultar detalle | Usuario | Alta |
| HU-08 | Registrar reseña | Usuario registrado | Alta |
| HU-09 | Valorar producto | Usuario registrado | Alta |
| HU-10 | Aspectos positivos y negativos | Usuario registrado | Media |
| HU-11 | Comparar productos | Usuario | Alta |
| HU-12 | Consultar establecimientos | Usuario | Media |
| HU-13 | Consultar ubicación | Usuario | Media |
| HU-14 | Administrar productos | Administrador | Alta |
| HU-15 | Administrar categorías | Administrador | Alta |
| HU-16 | Administrar marcas | Administrador | Alta |
| HU-17 | Administrar establecimientos | Usuario autorizado | Media |
| HU-18 | Consultar como visitante | Visitante | Alta |
| HU-19 | Consumir API | Sistema | Alta |
| HU-20 | Persistencia de información | Sistema | Alta |

---

# 4. Relación entre historias y requisitos

| Historia | Requisito relacionado |
|---|---|
| HU-01 | RF-01 |
| HU-02 | RF-02 |
| HU-03 | RF-04 |
| HU-04 | RF-08 |
| HU-05 | RF-06 |
| HU-06 | RF-07 |
| HU-07 | RF-04 |
| HU-08 | RF-09 |
| HU-09 | RF-10 |
| HU-10 | RF-11 |
| HU-11 | RF-12 |
| HU-12 | RF-13 |
| HU-13 | RF-14 |
| HU-14 | RF-05 |
| HU-15 | RF-06 |
| HU-16 | RF-07 |
| HU-17 | RF-13 |
| HU-18 | RF-04 |
| HU-19 | RF-15 |
| HU-20 | RF-16 |

---

# 5. Notas para el desarrollo

Las historias de usuario representan el alcance funcional inicial del proyecto. Durante los sprints podrán dividirse en tareas técnicas más pequeñas.

Por ejemplo:

**HU-04 - Buscar productos**

Puede dividirse en:

1. Diseñar componente de búsqueda.
2. Crear endpoint de búsqueda.
3. Implementar consulta en PostgreSQL.
4. Conectar frontend con backend.
5. Mostrar resultados.
6. Manejar búsqueda sin resultados.
7. Realizar pruebas.

De esta manera, una historia de usuario puede ser trabajada por diferentes integrantes del equipo sin perder la relación con el objetivo funcional.

---

# 6. Estado del documento

**Versión:** 1.0  
**Estado:** Borrador inicial  
**Documento:** Historias de usuario  
**Última actualización:** Pendiente de registrar