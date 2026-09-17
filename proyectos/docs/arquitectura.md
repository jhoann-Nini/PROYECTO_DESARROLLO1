# Arquitectura del sistema

## 1. Información general

**Nombre del proyecto:** TecnoReview

**Tipo de sistema:** Plataforma web de reseñas y comparación tecnológica.

TecnoReview utilizará una arquitectura separada por componentes, permitiendo dividir las responsabilidades entre el frontend, backend y base de datos.

La arquitectura inicial estará compuesta por:

- Frontend desarrollado con Next.js y TypeScript.
- Backend desarrollado con Spring Boot.
- API REST para la comunicación entre frontend y backend.
- PostgreSQL como sistema gestor de base de datos.
- Supabase como servicio para PostgreSQL.
- Git y GitHub para control de versiones.
- Vercel como plataforma contemplada para el despliegue del frontend.
- Google Maps para la funcionalidad relacionada con ubicación de establecimientos.

---

# 2. Arquitectura general

La comunicación principal del sistema será:

```text
┌──────────────────────────┐
│        USUARIO           │
│ Navegador web / móvil    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       FRONTEND           │
│   Next.js + TypeScript   │
└────────────┬─────────────┘
             │
             │ HTTP / HTTPS
             │ JSON
             ▼
┌──────────────────────────┐
│       API REST           │
│       Spring Boot        │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        BACKEND           │
│ Controllers              │
│ Services                 │
│ Repositories             │
│ Entities                 │
└────────────┬─────────────┘
             │
             │ SQL / JPA
             ▼
┌──────────────────────────┐
│       PostgreSQL         │
│        Supabase          │
└──────────────────────────┘
```

Para la funcionalidad de ubicación se contempla adicionalmente:

Frontend
   │
   ▼
Google Maps
   │
   ▼
Ubicación del establecimiento

---

# 3. Arquitectura por capas

El backend utilizará una organización por capas para separar responsabilidades.

La estructura propuesta es:

Controller
     ↓
Service
     ↓
Repository
     ↓
Database

Las entidades estarán relacionadas con la estructura de persistencia:

Entity
   ↕
Repository
   ↓
PostgreSQL

---

# 4. Frontend

## 4.1 Tecnología
El frontend será desarrollado utilizando:

Next.js
TypeScript

Su responsabilidad principal será proporcionar la interfaz mediante la cual los usuarios interactúan con TecnoReview.

## 4.2 Responsabilidades del frontend

El frontend será responsable de:

Mostrar la interfaz.
Mostrar el catálogo de productos.
Mostrar categorías y marcas.
Permitir búsquedas.
Mostrar el detalle de productos.
Permitir seleccionar productos para comparación.
Mostrar reseñas y valoraciones.
Permitir registrar información cuando el usuario tenga permisos.
Mostrar establecimientos.
Mostrar ubicaciones mediante mapas.
Gestionar la interacción con el usuario.
Consumir la API REST.
Mostrar mensajes de error y confirmación.

El frontend no será responsable de ejecutar directamente consultas sobre PostgreSQL.

---

# 5. Estructura conceptual del frontend

La estructura inicial podrá organizarse de la siguiente manera:

frontend/
├── app/
│   ├── page.tsx
│   ├── productos/
│   ├── categorias/
│   ├── establecimientos/
│   ├── comparador/
│   ├── login/
│   └── registro/
│
├── components/
│   ├── productos/
│   ├── reseñas/
│   ├── establecimientos/
│   ├── comparador/
│   └── ui/
│
├── services/
│   └── api/
│
├── types/
│
├── hooks/
│
└── public/

Esta estructura es una propuesta inicial y podrá modificarse durante el desarrollo.

---

# 6. Backend

## 6.1 Tecnología

El backend será desarrollado utilizando:

Java
Spring Boot
Spring Web
Spring Data JPA
PostgreSQL

Las dependencias definitivas podrán ajustarse según las necesidades del proyecto.

---

# 7. Responsabilidades del backend

El backend será responsable de:

Procesar solicitudes del frontend.
Exponer los endpoints REST.
Validar datos.
Gestionar autenticación y autorización.
Aplicar reglas de negocio.
Consultar y modificar la base de datos.
Gestionar productos.
Gestionar categorías.
Gestionar marcas.
Gestionar usuarios.
Gestionar reseñas.
Gestionar valoraciones.
Gestionar establecimientos.
Gestionar relaciones entre entidades.
Manejar errores.
Validar permisos según el rol del usuario.

---

# 8. Capas del backend

## 8.1 Controller

Los controladores recibirán las solicitudes HTTP provenientes del frontend.

Ejemplo conceptual:

GET /api/productos
POST /api/productos
GET /api/productos/{id}
PUT /api/productos/{id}
DELETE /api/productos/{id}

El Controller no debe concentrar toda la lógica de negocio.

Su responsabilidad principal será recibir solicitudes y devolver respuestas.

## 8.2 Service

La capa Service contendrá la lógica de negocio.

Ejemplo:

ProductoController
        ↓
ProductoService
        ↓
ProductoRepository

El Service podrá encargarse de:

Validar reglas de negocio.
Procesar información.
Coordinar diferentes repositorios.
Verificar condiciones antes de guardar información.
Aplicar reglas relacionadas con los roles.
8.3 Repository

Los repositorios serán responsables de interactuar con la base de datos mediante Spring Data JPA.

Ejemplo conceptual:

ProductoRepository
        ↓
PostgreSQL

Esta capa permitirá realizar operaciones como:

Guardar.
Consultar.
Actualizar.
Eliminar.
8.4 Entity

Las entidades representan las principales tablas de la base de datos dentro del backend.

Entre las entidades iniciales estarán:

Usuario
Rol
Producto
Categoria
Marca
Reseña
Valoracion
Establecimiento
ProductoEstablecimiento

Estas entidades estarán relacionadas con PostgreSQL mediante JPA.

---

# 9. Flujo de una solicitud

Un ejemplo de consulta de productos será:

1. Usuario accede al catálogo
            ↓
2. Frontend realiza solicitud HTTP
            ↓
3. ProductoController recibe la solicitud
            ↓
4. ProductoService procesa la operación
            ↓
5. ProductoRepository consulta PostgreSQL
            ↓
6. PostgreSQL devuelve los datos
            ↓
7. Repository entrega los datos al Service
            ↓
8. Service procesa la información
            ↓
9. Controller genera la respuesta
            ↓
10. Frontend recibe los datos
            ↓
11. Usuario visualiza los productos
10. Comunicación mediante API REST

El frontend y backend se comunicarán mediante una API REST.

La información se intercambiará principalmente utilizando JSON.

Ejemplo conceptual de respuesta:

{
  "id": 1,
  "nombre": "Producto de ejemplo",
  "marca": "Marca de ejemplo",
  "categoria": "Celulares"
}

El diseño definitivo de los endpoints se documentará en:

docs/ api.md

---

# 11. Base de datos

La base de datos utilizará PostgreSQL.

Supabase proporcionará el entorno para administrar la base de datos PostgreSQL.

Las principales entidades contempladas son:

ROL
USUARIO
CATEGORIA
MARCA
PRODUCTO
RESEÑA
VALORACION
ESTABLECIMIENTO
PRODUCTO_ESTABLECIMIENTO

El modelo detallado se encuentra documentado en:

docs/ modelo-datos.md

---

# 12. Seguridad

La seguridad deberá aplicarse principalmente en el backend.

El sistema deberá considerar:

Autenticación de usuarios.
Autorización basada en roles.
Validación de datos.
Protección de endpoints.
Protección de credenciales.
Variables de entorno.
Manejo seguro de contraseñas.
Restricción de operaciones administrativas.

El frontend podrá ocultar funciones que el usuario no tenga permitido utilizar, pero la protección real de los recursos deberá realizarse en el backend.

---

# 13. Autenticación y autorización

El flujo conceptual será:

Usuario
   ↓
Login
   ↓
Frontend
   ↓
Backend
   ↓
Validación de credenciales
   ↓
Usuario autenticado
   ↓
Identificación del rol
   ↓
Acceso permitido

Ejemplo:

Usuario registrado
       ↓
GET /api/productos
       ↓
Permitido

Mientras que:

Usuario registrado
       ↓
POST /api/productos
       ↓
Verificación de permisos
       ↓
No autorizado

El mecanismo específico de autenticación será definido durante la implementación del backend.

---

# 14. Integración con Google Maps

La plataforma contempla utilizar Google Maps para mostrar la ubicación de establecimientos.

El flujo conceptual será:

Establecimiento
       ↓
Dirección / coordenadas
       ↓
Backend
       ↓
Frontend
       ↓
Google Maps
       ↓
Mapa

La información de ubicación se relacionará con los datos almacenados del establecimiento.

Las credenciales de servicios externos no deberán almacenarse directamente en GitHub.

---

# 15. Variables de entorno

La aplicación deberá utilizar variables de entorno para información sensible o dependiente del entorno.

Ejemplos conceptuales:

DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
GOOGLE_MAPS_API_KEY
API_URL

Los nombres definitivos dependerán de la configuración de cada componente.

No se deben almacenar valores reales de claves, contraseñas o tokens dentro del repositorio.

Se podrá utilizar un archivo:

.env.example

para documentar las variables necesarias sin incluir sus valores privados.

---

# 16. Control de versiones

El proyecto utilizará Git y GitHub.

La estructura de trabajo será:

                 main
                  ↑
             Pull Request
                  ↑
              rama personal
                  ↑
                commit
                  ↑
             trabajo local

La rama main deberá mantenerse protegida.

Los integrantes trabajarán sobre sus respectivas ramas y posteriormente solicitarán la integración mediante Pull Requests.

El flujo detallado será documentado en:

docs/github-y-flujo-git.md

---

# 17. Organización general del repositorio

La estructura propuesta del proyecto será:

PROYECTO_DESARROLLO1/
│
├── frontend/
│
├── backend/
│
├── docs/
│   ├── 01-alcance.md
│   ├── 02-requisitos.md
│   ├── 03-historias-usuario.md
│   ├── 04-usuarios-y-roles.md
│   ├── 05-modelo-datos.md
│   ├── 06-arquitectura.md
│   ├── 07-sprints.md
│   ├── 08-github-y-flujo-git.md
│   ├── 09-api.md
│   ├── 10-manual-usuario.md
│   └── 11-manual-tecnico.md
│
├── .gitignore
│
└── README.md

---

# 18. Despliegue

El despliegue contemplará diferentes componentes.

Frontend
Next.js
   ↓
Vercel
Backend

El backend Spring Boot deberá desplegarse en un servicio compatible con aplicaciones Java/Spring Boot.

La plataforma definitiva de despliegue del backend queda pendiente de selección.

Base de datos
PostgreSQL
    ↓
Supabase

La configuración definitiva de producción deberá realizarse una vez finalizadas las pruebas.

---

# 19. Entornos

Durante el desarrollo se recomienda diferenciar entre:

Desarrollo
     ↓
Pruebas
     ↓
Producción

Cada entorno deberá utilizar la configuración correspondiente.

Las variables de entorno permitirán cambiar las conexiones y configuraciones sin modificar directamente el código fuente.

---

# 20. Principios de arquitectura

Durante el desarrollo se deberán procurar los siguientes principios:

Separación de responsabilidades

Cada componente debe encargarse de una función específica.

Bajo acoplamiento

El frontend no debe depender directamente de la estructura interna de la base de datos.

Reutilización

Los componentes y servicios que puedan reutilizarse deben organizarse para evitar duplicación innecesaria.

Mantenibilidad

El código debe mantenerse organizado para facilitar futuras modificaciones.

Seguridad

Las operaciones sensibles deben protegerse desde el backend.

Escalabilidad

La arquitectura debe permitir incorporar nuevas funcionalidades posteriormente.

---

# 21. Tecnologías
Componente	Tecnología
Frontend	Next.js
Lenguaje frontend	TypeScript
Backend	Spring Boot
Lenguaje backend	Java
API	REST
ORM	Spring Data JPA
Base de datos	PostgreSQL
Servicio de base de datos	Supabase
Mapas	Google Maps
Control de versiones	Git
Repositorio	GitHub
Despliegue frontend	Vercel

---

# 22. Resumen de arquitectura

La arquitectura general de TecnoReview será:

                         USUARIO
                            │
                            ▼
                  ┌──────────────────┐
                  │     NEXT.JS      │
                  │   TYPESCRIPT     │
                  └────────┬─────────┘
                           │
                           │ HTTP/HTTPS
                           │ JSON
                           ▼
                  ┌──────────────────┐
                  │    SPRING BOOT   │
                  │     REST API     │
                  └────────┬─────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        Controller      Service     Repository
                                      │
                                      ▼
                             ┌─────────────────┐
                             │   PostgreSQL    │
                             │    Supabase     │
                             └─────────────────┘

                           │
                           │
                           ▼
                    Google Maps
                  (establecimientos)
--- 

# 23. Estado del documento

Versión: 1.0
Estado: Borrador inicial
Documento: Arquitectura del sistema
Última actualización: Pendiente de registrar