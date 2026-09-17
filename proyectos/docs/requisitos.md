# Requisitos del sistema

## 1. Información general

**Nombre del proyecto:** TecnoReview

**Tipo de sistema:** Plataforma web de reseñas y comparación tecnológica.

**Contexto:** Tuluá, Valle del Cauca.

**Tecnologías principales:**
- Frontend: Next.js + TypeScript
- Backend: Spring Boot
- Base de datos: PostgreSQL + Supabase
- Control de versiones: Git + GitHub
- Integración de ubicación: Google Maps API

---

## 2. Requisitos funcionales

Los requisitos funcionales describen las acciones y funcionalidades que el sistema debe permitir realizar.

### RF-01 - Registro de usuarios

El sistema debe permitir que una persona cree una cuenta mediante un formulario de registro.

**Datos iniciales considerados:**
- Nombre
- Correo electrónico
- Contraseña

**Criterio de aceptación:**
- El sistema debe validar los datos ingresados.
- No debe permitir registrar un correo que ya exista.
- La cuenta debe quedar almacenada en la base de datos.

---

### RF-02 - Inicio de sesión

El sistema debe permitir a los usuarios registrados iniciar sesión.

**Criterio de aceptación:**
- El usuario debe ingresar sus credenciales.
- El sistema debe validar la información.
- Si las credenciales son correctas, debe permitir el acceso.
- Si son incorrectas, debe mostrar un mensaje de error.

---

### RF-03 - Gestión de usuarios y roles

El sistema debe manejar diferentes tipos de usuarios y permisos.

Los roles contemplados son:

- Usuario registrado
- Administrador
- Propietario o representante de establecimiento

**Criterio de aceptación:**
- El sistema debe identificar el rol del usuario.
- Las funciones disponibles deben depender de los permisos correspondientes.

> Los permisos específicos de cada rol se definirán con mayor detalle en `usuarios-y-roles.md`.

---

### RF-04 - Consulta de productos

El sistema debe permitir consultar productos tecnológicos registrados en la plataforma.

La información del producto podrá incluir:

- Nombre
- Descripción
- Marca
- Categoría
- Características
- Imagen
- Precio de referencia, si se define para la versión final

**Criterio de aceptación:**
- El usuario debe poder visualizar la información disponible del producto.
- Los productos deben obtenerse desde la base de datos.

---

### RF-05 - Gestión de productos

El sistema debe permitir administrar el catálogo de productos.

Las operaciones contempladas son:

- Crear productos
- Consultar productos
- Actualizar productos
- Eliminar productos

Estas operaciones estarán sujetas a los permisos definidos para cada rol.

**Criterio de aceptación:**
- Los datos deben almacenarse correctamente.
- El sistema debe validar la información antes de realizar cambios.
- Las operaciones restringidas solo deben estar disponibles para usuarios autorizados.

---

### RF-06 - Gestión de categorías

El sistema debe permitir organizar los productos mediante categorías tecnológicas.

Ejemplos de categorías:

- Celulares
- Computadores
- Portátiles
- Tablets
- Accesorios
- Otros productos tecnológicos

**Criterio de aceptación:**
- Cada producto debe poder asociarse a una categoría.
- Las categorías deben poder consultarse desde el catálogo.

---

### RF-07 - Gestión de marcas

El sistema debe permitir asociar los productos con sus respectivas marcas.

**Criterio de aceptación:**
- Un producto debe poder relacionarse con una marca.
- La marca debe poder utilizarse como criterio de consulta o filtrado cuando esta función sea implementada.

---

### RF-08 - Búsqueda de productos

El sistema debe proporcionar un mecanismo de búsqueda para localizar productos tecnológicos.

La búsqueda podrá realizarse utilizando información como:

- Nombre del producto
- Marca
- Categoría

**Criterio de aceptación:**
- El sistema debe devolver los productos relacionados con los criterios ingresados.
- Si no existen coincidencias, debe informar al usuario.

---

### RF-09 - Reseñas de productos

Los usuarios registrados deben poder publicar reseñas sobre productos tecnológicos.

Una reseña podrá contener:

- Comentario
- Valoración
- Información relacionada con la experiencia del usuario

**Criterio de aceptación:**
- Solo los usuarios autorizados pueden publicar reseñas.
- La reseña debe quedar asociada al usuario y al producto.
- El sistema debe almacenar la información en la base de datos.

---

### RF-10 - Valoración de productos

El sistema debe permitir que los usuarios valoren productos tecnológicos mediante un sistema de puntuación.

La escala exacta de valoración será definida durante el desarrollo.

**Criterio de aceptación:**
- La valoración debe estar asociada al producto y al usuario.
- El sistema debe validar que la puntuación se encuentre dentro de los valores permitidos.

---

### RF-11 - Opiniones positivas y negativas

El sistema debe permitir representar aspectos positivos y negativos relacionados con la experiencia de los usuarios sobre un producto.

**Criterio de aceptación:**
- La información debe quedar asociada a la reseña correspondiente.
- Debe poder visualizarse junto con la información del producto.

---

### RF-12 - Comparación de productos

El sistema debe permitir seleccionar productos tecnológicos para realizar una comparación.

La comparación podrá considerar características como:

- Marca
- Categoría
- Características técnicas
- Valoración
- Opiniones
- Precio de referencia, si está disponible

**Criterio de aceptación:**
- El usuario debe poder seleccionar los productos que desea comparar.
- El sistema debe mostrar sus características de manera organizada.
- La información utilizada debe corresponder a los datos registrados en la plataforma.

---

### RF-13 - Gestión de establecimientos

El sistema debe permitir registrar y consultar establecimientos relacionados con la comercialización de productos tecnológicos.

La información podrá incluir:

- Nombre del establecimiento
- Dirección
- Información de contacto
- Productos relacionados
- Ubicación geográfica

**Criterio de aceptación:**
- Los establecimientos deben almacenarse en la base de datos.
- Los usuarios deben poder consultar la información disponible.

---

### RF-14 - Ubicación de establecimientos

El sistema debe integrar información de ubicación mediante Google Maps.

**Criterio de aceptación:**
- El usuario debe poder consultar la ubicación de un establecimiento.
- La ubicación debe corresponder a la información registrada.
- La integración debe funcionar desde la interfaz web.

---

### RF-15 - Integración frontend-backend

El frontend debe comunicarse con el backend mediante una API REST.

**Criterio de aceptación:**
- El frontend debe poder consultar información del backend.
- Las operaciones permitidas deben enviarse mediante los endpoints correspondientes.
- Las respuestas de la API deben ser procesadas correctamente por el frontend.

---

### RF-16 - Persistencia de información

El sistema debe almacenar la información principal en una base de datos PostgreSQL administrada mediante Supabase.

La información podrá incluir:

- Usuarios
- Roles
- Productos
- Categorías
- Marcas
- Reseñas
- Valoraciones
- Establecimientos

**Criterio de aceptación:**
- La información debe permanecer almacenada después de cerrar o reiniciar la aplicación.
- Las relaciones entre las entidades deben mantenerse correctamente.

---

## 3. Requisitos no funcionales

Los requisitos no funcionales establecen características relacionadas con la calidad, seguridad, mantenimiento y funcionamiento del sistema.

### RNF-01 - Usabilidad

La interfaz debe ser clara y sencilla de utilizar.

El usuario debe poder acceder a las principales funciones sin necesidad de conocimientos técnicos.

---

### RNF-02 - Diseño responsive

La plataforma debe adaptarse a diferentes tamaños de pantalla.

Se debe considerar como mínimo:

- Computadores
- Tablets
- Dispositivos móviles

---

### RNF-03 - Rendimiento

El sistema debe responder de manera adecuada a las operaciones realizadas por los usuarios.

Se debe evitar realizar consultas innecesarias o procesos que afecten considerablemente el tiempo de respuesta.

---

### RNF-04 - Seguridad

El sistema debe proteger la información de los usuarios y restringir las operaciones según los permisos correspondientes.

Se debe considerar:

- Protección de credenciales.
- Validación de datos.
- Control de acceso.
- Protección de variables de entorno.
- No almacenar claves o secretos directamente en el repositorio.

---

### RNF-05 - Mantenibilidad

El código debe organizarse de manera que facilite su mantenimiento y modificación.

Se debe procurar:

- Separación de responsabilidades.
- Estructura organizada del proyecto.
- Nombres claros para clases, funciones y componentes.
- Documentación de las partes importantes.

---

### RNF-06 - Arquitectura

El sistema debe mantener una separación entre:

```text
Frontend
   ↓
API REST
   ↓
Backend
   ↓
Base de datos
```
El frontend será desarrollado con Next.js y TypeScript, mientras que el backend será desarrollado con Spring Boot.

### RNF-07 - Base de datos

La base de datos debe utilizar PostgreSQL.

La estructura debe permitir mantener relaciones entre las diferentes entidades del sistema.

### RNF-08 - Control de versiones

El proyecto debe utilizar Git y GitHub para controlar las versiones del código.

Se deben aplicar las siguientes prácticas:

Uso de ramas individuales.
Commits descriptivos.
Pull Requests para integrar cambios.
Evitar modificaciones directas sobre main.
Revisión de cambios antes de realizar un merge.
RNF-09 - Compatibilidad

La aplicación debe funcionar correctamente en los principales navegadores web modernos.

### RNF-10 - Escalabilidad

La estructura del proyecto debe permitir agregar nuevas funcionalidades sin tener que modificar completamente la arquitectura existente.

### RNF-11 - Disponibilidad

La aplicación debe poder desplegarse en un entorno accesible mediante Internet.

El frontend se contempla para despliegue mediante Vercel y los servicios de backend y base de datos deberán configurarse de acuerdo con el entorno definido para el proyecto.

### RNF-12 - Documentación

El proyecto debe contar con documentación técnica y funcional.

La documentación debe incluir como mínimo:

Alcance
Requisitos
Historias de usuario
Usuarios y roles
Modelo de datos
Arquitectura
Sprints
Flujo de Git y GitHub
API
Manual de usuario
Manual técnico

---

# 4. Priorización inicial

Para organizar el desarrollo se utilizará una prioridad inicial:

Prioridad	Descripción
Alta	Funcionalidad necesaria para el funcionamiento principal del sistema
Media	Funcionalidad importante que complementa el sistema
Baja	Funcionalidad complementaria que puede desarrollarse posteriormente
Requisitos de prioridad alta
- RF-01 Registro de usuarios
- RF-02 Inicio de sesión
- RF-03 Usuarios y roles
- RF-04 Consulta de productos
- RF-05 Gestión de productos
- RF-06 Categorías
- RF-07 Marcas
- RF-08 Búsqueda
- RF-09 Reseñas
- RF-10 Valoraciones
- RF-12 Comparación
- RF-15 Integración frontend-backend
- RF-16 Persistencia de información
- Requisitos de prioridad media
- RF-11 Opiniones positivas y negativas
- RF-13 Gestión de establecimientos
- RF-14 Ubicación mediante Google Maps

La prioridad podrá modificarse durante la planificación de los sprints según las necesidades del proyecto.

---

# 5. Relación con el alcance

Los requisitos definidos en este documento corresponden a las funcionalidades contempladas dentro del alcance inicial de TecnoReview.

Cualquier funcionalidad nueva que no se encuentre contemplada deberá analizarse antes de incorporarse al proyecto, considerando:

Necesidad de la funcionalidad.
Beneficio para el proyecto.
Tiempo de desarrollo.
Dependencias técnicas.
Impacto sobre la arquitectura.
Impacto sobre la base de datos.
Impacto sobre los sprints.

---

# 6. Estado del documento

Versión: 1.0
Estado: Borrador inicial
Documento: Requisitos del sistema
Última actualización: Pendiente de registrar