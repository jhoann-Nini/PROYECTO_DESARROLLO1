# Alcance del proyecto

## 1. Información general

**Nombre del proyecto:** TecnoReview

**Tipo de proyecto:** Plataforma web de reseñas y comparación de productos tecnológicos.

**Ubicación/enfoque:** Usuarios y negocios de Tuluá, Valle del Cauca.

**Equipo de desarrollo:** 5 integrantes.

**Tecnologías principales:**

- Frontend: Next.js + TypeScript
- Backend: Spring Boot
- Base de datos: PostgreSQL
- Plataforma de base de datos: Supabase
- Control de versiones: Git + GitHub
- Despliegue: Vercel para el frontend

---

# 2. Descripción del proyecto

TecnoReview será una plataforma web orientada a la consulta, reseña y comparación de productos tecnológicos.

El sistema permitirá a los usuarios consultar información sobre diferentes productos tecnológicos, conocer sus características, consultar opiniones y calificaciones de otros usuarios y comparar productos para facilitar la consulta y toma de decisiones.

El proyecto tendrá inicialmente un enfoque relacionado con Tuluá, Valle del Cauca, permitiendo contemplar información de productos y establecimientos relacionados con tecnología dentro del contexto definido para el proyecto.

---

# 3. Problema que se busca abordar

Actualmente, una persona interesada en adquirir un producto tecnológico puede encontrar información distribuida entre diferentes páginas, tiendas y fuentes.

Esto puede dificultar:

- Encontrar información organizada sobre un producto.
- Comparar diferentes productos.
- Consultar opiniones de otros usuarios.
- Conocer establecimientos relacionados con la venta de tecnología.
- Identificar las características principales de diferentes productos.

TecnoReview busca centralizar esta información dentro de una plataforma web organizada.

---

# 4. Objetivo general

Desarrollar una plataforma web que permita consultar, reseñar y comparar productos tecnológicos, proporcionando información organizada sobre productos, características, calificaciones, reseñas y establecimientos relacionados con tecnología.

---

# 5. Objetivos específicos

1. Crear una plataforma web utilizando Next.js y TypeScript.

2. Desarrollar una API REST utilizando Spring Boot.

3. Implementar una base de datos PostgreSQL utilizando Supabase.

4. Permitir el registro y gestión de usuarios.

5. Permitir la consulta de productos tecnológicos.

6. Organizar los productos mediante categorías y marcas.

7. Permitir a los usuarios publicar reseñas sobre productos.

8. Permitir valorar productos mediante un sistema de calificación.

9. Permitir consultar reseñas positivas y negativas.

10. Implementar un motor de búsqueda de productos.

11. Permitir comparar diferentes productos tecnológicos.

12. Gestionar información relacionada con establecimientos tecnológicos.

13. Mantener el código fuente mediante Git y GitHub.

14. Implementar un flujo de trabajo basado en ramas y Pull Requests.

15. Preparar el proyecto para su implementación y publicación.

---

# 6. Alcance funcional

El proyecto contempla inicialmente los siguientes módulos.

## 6.1 Usuarios

El sistema permitirá gestionar usuarios registrados.

Los usuarios podrán contar con diferentes roles y permisos definidos posteriormente en el documento de usuarios y roles.

---

## 6.2 Productos tecnológicos

La plataforma permitirá almacenar y consultar productos tecnológicos.

La información de un producto podrá incluir:

- Nombre.
- Marca.
- Modelo.
- Categoría.
- Descripción.
- Características.
- Imagen.
- Precio de referencia.
- Calificación.
- Reseñas asociadas.

Las características específicas podrán variar dependiendo del tipo de producto.

---

## 6.3 Categorías

Los productos estarán organizados mediante categorías.

Entre las categorías que podrán contemplarse se encuentran:

- Celulares.
- Computadores.
- Portátiles.
- Tablets.
- Audífonos.
- Smartwatch.
- Accesorios.
- Otros productos tecnológicos.

La lista definitiva de categorías será definida durante el desarrollo del proyecto.

---

## 6.4 Marcas

Los productos podrán estar relacionados con una marca.

La información de las marcas permitirá organizar y facilitar la consulta de productos.

---

## 6.5 Búsqueda

La plataforma contará con un motor de búsqueda para permitir encontrar productos tecnológicos.

La búsqueda podrá realizarse utilizando información como:

- Nombre del producto.
- Marca.
- Modelo.
- Categoría.

Las funcionalidades específicas del motor de búsqueda serán definidas durante el desarrollo.

---

## 6.6 Reseñas

Los usuarios podrán publicar reseñas sobre productos.

Una reseña podrá contener:

- Calificación.
- Comentario.
- Fecha.
- Usuario que realizó la reseña.
- Producto reseñado.

Las reseñas podrán representar opiniones positivas o negativas de acuerdo con la valoración y el contenido proporcionado por el usuario.

---

## 6.7 Comparación de productos

La plataforma permitirá comparar productos tecnológicos.

La comparación estará orientada a mostrar las características relevantes de los productos seleccionados para facilitar su consulta.

---

## 6.8 Establecimientos

El sistema contemplará información sobre establecimientos relacionados con productos tecnológicos.

La información podrá incluir:

- Nombre del establecimiento.
- Dirección.
- Teléfono.
- Horario.
- Ubicación.
- Productos relacionados.

La definición final de las funciones disponibles para los establecimientos se establecerá en los requisitos del proyecto.

---

## 6.9 Ubicación

El proyecto contempla la utilización de servicios relacionados con mapas para representar la ubicación de establecimientos.

La integración específica con Google Maps API será definida durante el desarrollo técnico.

---

# 7. Alcance técnico

La solución estará compuesta inicialmente por los siguientes elementos:

```text
                 TECNOREVIEW
                     │
        ┌────────────┴────────────┐
        │                         │
     FRONTEND                  BACKEND
   Next.js + TS              Spring Boot
        │                         │
        └────────────┬────────────┘
                     │
                  REST API
                     │
              PostgreSQL
                     │
                  Supabase
```
## Frontend
Se desarrollará utilizando:

Next.js.
TypeScript.
Componentes reutilizables.
Diseño responsive.

## Backend
Se desarrollará utilizando:

Java.
Spring Boot.
API REST.
Arquitectura organizada por capas.

## Base de datos
Se utilizará:

PostgreSQL.
Supabase.

La estructura definitiva de tablas y relaciones será documentada en 05-modelo-datos.md.

## Control de versiones
El código será administrado mediante:

Git.
GitHub.
Ramas individuales.
Pull Requests.
Revisión de código.

La estrategia de trabajo se documentará en:

docs/08-github-y-flujo-git.md

---

# 8. Alcance de los usuarios
El sistema contemplará diferentes tipos de usuarios.

Inicialmente se consideran:

## Usuario registrado

Podrá:

Consultar productos.
Buscar productos.
Comparar productos.
Consultar reseñas.
Publicar reseñas.
Calificar productos.
Administrador

Podrá realizar funciones administrativas sobre la plataforma.

Los permisos exactos serán definidos en:

docs/04-usuarios-y-roles.md

Propietario o representante de establecimiento

El proyecto contempla la posibilidad de que los establecimientos tengan información administrable dentro de la plataforma.

Las funciones y permisos exactos serán definidos posteriormente.

## 9. Fuera del alcance inicial

Para evitar que el proyecto crezca de manera descontrolada, las siguientes funcionalidades no forman parte del alcance inicial salvo que posteriormente sean aprobadas por el equipo:

## Procesamiento de pagos.
Compra directa de productos.
Sistema completo de comercio electrónico.
Gestión de envíos.
Carrito de compras.
Chat en tiempo real.
Aplicación móvil nativa.
Integración con todas las tiendas existentes.
Sistema avanzado de recomendaciones mediante inteligencia artificial.
Sistema avanzado de publicidad.
Integración con múltiples servicios de mapas diferentes a la solución definida para el proyecto.

Si alguna de estas funcionalidades resulta necesaria posteriormente, deberá registrarse como una nueva necesidad y evaluarse para un sprint posterior.

---

## 10. Límites del proyecto

El proyecto se desarrollará inicialmente como una aplicación web académica.

El objetivo principal será demostrar el funcionamiento de:

Frontend.
Backend.
Base de datos.
API REST.
Gestión de usuarios.
Productos.
Búsqueda.
Reseñas.
Calificaciones.
Comparación.
Establecimientos.
Integración de ubicación.
Control de versiones.
Despliegue.

No se pretende inicialmente desarrollar una plataforma comercial completa.

---

## 11. Entregables principales

Durante el desarrollo se espera obtener:

Código fuente del frontend.
Código fuente del backend.
Base de datos PostgreSQL.
API REST.
Documentación del proyecto.
Sistema de usuarios y roles.
Catálogo de productos.
Sistema de búsqueda.
Sistema de reseñas.
Sistema de calificaciones.
Sistema de comparación.
Gestión de establecimientos.
Integración de mapas.
Pruebas del sistema.
Manual de usuario.
Manual técnico.
Aplicación desplegada.

---

# 12. Criterios generales para considerar el proyecto terminado

El proyecto podrá considerarse terminado cuando:

El frontend pueda ejecutarse correctamente.
El backend pueda ejecutarse correctamente.
La API REST funcione correctamente.
El backend pueda comunicarse con PostgreSQL/Supabase.
Los usuarios puedan utilizar las funcionalidades definidas para su rol.
Los productos puedan registrarse y consultarse.
La búsqueda funcione.
Los usuarios puedan publicar reseñas.
Las calificaciones funcionen.
La comparación de productos funcione.
La información de establecimientos pueda consultarse.
La integración de mapas definida para el proyecto funcione.
Se hayan realizado pruebas.
Los errores críticos identificados hayan sido corregidos.
El código esté organizado en GitHub.
La documentación esté actualizada.
El proyecto pueda ser desplegado.

---

# 13. División del desarrollo

El proyecto se dividirá en tres grandes etapas de Sprint.

## Sprint 1 — Fundamentos

Se trabajará principalmente en:

Configuración del proyecto.
Git y GitHub.
Estructura frontend.
Estructura backend.
Base de datos.
Modelo inicial.
Usuarios y roles.
Catálogo inicial.
Documentación.

## Sprint 2 — Funcionalidades principales

Se trabajará principalmente en:

Productos.
Búsqueda.
Reseñas.
Calificaciones.
Comparación.
Integración frontend-backend.

## Sprint 3 — Integración y publicación

Se trabajará principalmente en:

Establecimientos.
Mapas.
Pruebas.
Depuración.
Seguridad.
Integración final.
Documentación.
Despliegue.
Publicación.

La distribución definitiva de tareas de cada sprint será documentada en 07-sprints.md.

---

# 14. Control de cambios del alcance

Cualquier funcionalidad que no esté contemplada en este documento deberá ser evaluada antes de incorporarse al proyecto.

Para agregar una nueva funcionalidad se deberá:

Describir la necesidad.
Definir el beneficio para el proyecto.
Determinar las tareas necesarias.
Evaluar el tiempo de desarrollo.
Determinar las dependencias.
Asignar un responsable.
Incorporarla al backlog.
Priorizarla para un sprint.

De esta manera se evita modificar constantemente el alcance del proyecto durante el desarrollo.

---

# 15. Estado del documento

Estado: Borrador inicial.

Versión: 1.0

Documento: Alcance del proyecto.

Proyecto: TecnoReview.