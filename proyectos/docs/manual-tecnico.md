# Manual Técnico - TecnoReview

## 1. Información general

**Nombre del proyecto:** TecnoReview

**Tipo de aplicación:** Aplicación web

**Frontend:** Next.js + TypeScript

**Backend:** Spring Boot + Java

**Base de datos:** PostgreSQL

**Proveedor de base de datos:** Supabase

**Control de versiones:** Git + GitHub

**Frontend deployment:** Vercel

**Mapas:** Google Maps

**Estado:** En desarrollo

---

# 2. Objetivo del manual

Este documento describe los aspectos técnicos necesarios para instalar, configurar, ejecutar, probar y mantener TecnoReview.

Está dirigido principalmente a:

- Desarrolladores.
- Responsables del repositorio.
- Integrantes encargados de la base de datos.
- Integrantes encargados de pruebas.
- Personas responsables del mantenimiento del proyecto.

---

# 3. Arquitectura general

TecnoReview utiliza una arquitectura separada entre frontend, backend y base de datos.

```text
                         USUARIO
                            │
                            ▼
                 ┌────────────────────┐
                 │      FRONTEND      │
                 │ Next.js +          │
                 │ TypeScript         │
                 └─────────┬──────────┘
                           │
                     HTTP / HTTPS
                           │
                           ▼
                 ┌────────────────────┐
                 │      BACKEND       │
                 │ Spring Boot + Java │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │     PostgreSQL     │
                 │      Supabase      │
                 └────────────────────┘

                           │
                           ▼
                    Google Maps
```
---

# 4. Estructura del repositorio

La estructura general del proyecto es:

PROYECTO_DESARROLLO1/
│
├── frontend/
│
├── backend/
│
├── docs/
│   ├── alcance.md
│   ├── requisitos.md
│   ├── historias-usuario.md
│   ├── usuarios-y-roles.md
│   ├── modelo-datos.md
│   ├── arquitectura.md
│   ├── sprints.md
│   ├── github-y-flujo-git.md
│   ├── api.md
│   ├── manual-usuario.md
│   └── manual-tecnico.md
│
├── .gitignore
│
└── README.md

---

# 5. Requisitos del entorno

Para trabajar con el proyecto se necesitarán herramientas de desarrollo compatibles con las tecnologías seleccionadas.

Frontend

Se requiere:

Node.js.
npm.
Git.
Editor de código.

Se recomienda utilizar una versión LTS de Node.js.

La versión exacta utilizada por el equipo deberá documentarse cuando el proyecto quede configurado.

Backend

Se requiere:

Java.
JDK compatible con la versión de Spring Boot utilizada.
Maven o Gradle, dependiendo de la configuración del proyecto.
Git.
Editor de código o IDE.

La versión definitiva de Java deberá registrarse cuando se cree el proyecto Spring Boot.

Base de datos

Se requiere:

Cuenta de Supabase.
Proyecto PostgreSQL configurado.
Credenciales de conexión.

---

# 6. Clonar el repositorio

Para obtener el proyecto:

git clone https://github.com/jhoann-Nini/PROYECTO_DESARROLLO1.git

Ingresar al proyecto:

cd PROYECTO_DESARROLLO1

Comprobar el estado:

git status

---

# 7. Configuración del frontend

Ingresar a la carpeta:

cd frontend

Instalar las dependencias:

npm install

Las dependencias se obtienen a partir del archivo:

package.json

---

# 8. Ejecutar el frontend

Para iniciar el servidor de desarrollo:

npm run dev

El proyecto normalmente estará disponible mediante una dirección local proporcionada por Next.js.

Por ejemplo:

http://localhost:3000

La dirección exacta puede variar según la configuración.

---

# 9. Construcción del frontend

Para generar una versión de producción:

npm run build

Después de una compilación exitosa se puede ejecutar:

npm start

La disponibilidad de estos comandos dependerá de la configuración final de package.json.

---

# 10. Configuración del backend

Ingresar a:

cd backend

El proyecto será desarrollado utilizando Spring Boot.

La estructura inicial será similar a:

backend/
└── src/
    ├── main/
    │   ├── java/
    │   └── resources/
    │
    └── test/

---

# 11. Estructura del código backend

La organización propuesta es:

backend/
└── src/
    └── main/
        ├── java/
        │   └── .../
        │       ├── controller/
        │       ├── service/
        │       ├── repository/
        │       ├── entity/
        │       ├── dto/
        │       ├── exception/
        │       └── config/
        │
        └── resources/
            └── application.properties

---

# 12. Capa Controller

Los controllers reciben las solicitudes HTTP.

Ejemplo conceptual:

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

}

Los controllers deben encargarse principalmente de:

Recibir solicitudes.
Obtener parámetros.
Recibir datos.
Invocar servicios.
Devolver respuestas HTTP.

La lógica principal de negocio no debe concentrarse en los controllers.

---

# 13. Capa Service

La capa Service contiene las reglas de negocio.

Ejemplo conceptual:

@Service
public class ProductoService {

}

Puede encargarse de:

Validaciones.
Consultas.
Creación de productos.
Actualización.
Eliminación.
Reglas relacionadas con productos.
Coordinación entre diferentes repositories.

---

# 14. Capa Repository

Los repositories gestionan el acceso a la base de datos.

Ejemplo conceptual:

@Repository
public interface ProductoRepository
        extends JpaRepository<Producto, Long> {

}

La implementación definitiva dependerá de la configuración de Spring Data JPA.

---

# 15. Entidades

Las entidades representan los datos almacenados en PostgreSQL.

Entre las principales entidades se encuentran:

Usuario
Rol
Producto
Categoria
Marca
Resena
Valoracion
Establecimiento
ProductoEstablecimiento

Estas entidades deben mantenerse sincronizadas con el modelo de datos documentado en:

docs/modelo-datos.md

---

# 16. DTO

Los DTO (Data Transfer Object) pueden utilizarse para controlar los datos que entran y salen de la API.

Por ejemplo:

ProductoRequest
ProductoResponse
UsuarioRequest
UsuarioResponse
ResenaRequest

Su utilización ayuda a evitar exponer directamente toda la información de las entidades.

---

# 17. Manejo de excepciones

Los errores del backend deben manejarse de forma controlada.

Ejemplos:

Producto no encontrado
Usuario no encontrado
Datos inválidos
Acceso no autorizado
Recurso duplicado
Error de conexión

Se recomienda utilizar un mecanismo centralizado de manejo de excepciones.

---

# 18. Base de datos

TecnoReview utiliza PostgreSQL mediante Supabase.

La base de datos debe contener las tablas correspondientes al modelo definido en:

docs/modelo-datos.md

Entre las tablas inicialmente contempladas están:

ROL
USUARIO
CATEGORIA
MARCA
PRODUCTO
RESENA
VALORACION
ESTABLECIMIENTO
PRODUCTO_ESTABLECIMIENTO

---

# 19. Conexión con PostgreSQL

La conexión del backend con PostgreSQL se configurará mediante variables de entorno o configuración externa.

Ejemplo conceptual:

spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}

Los valores reales no deben escribirse directamente en el código fuente.

---

# 20. Variables de entorno

Las variables sensibles deben mantenerse fuera del repositorio.

Ejemplo para backend:

DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=

Ejemplo para frontend:

NEXT_PUBLIC_API_URL=

Para Google Maps:

GOOGLE_MAPS_API_KEY=

La nomenclatura definitiva dependerá de la implementación.

---

# 21. Archivo .env

Los archivos que contengan credenciales no deben subirse a GitHub.

Ejemplo:

.env
.env.local
.env.*.local

El .gitignore debe incluirlos.

Ejemplo:

.env
.env.local
.env.*.local

---

# 22. Archivo .env.example

Se recomienda mantener un archivo:

.env.example

Este archivo debe mostrar únicamente las variables necesarias.

Ejemplo:

DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=
NEXT_PUBLIC_API_URL=
GOOGLE_MAPS_API_KEY=

No debe contener las claves reales.

---

# 23. Configuración de Supabase

Para utilizar PostgreSQL mediante Supabase se debe:

Crear o utilizar el proyecto correspondiente.
Obtener los datos de conexión.
Configurar las variables de entorno.
Configurar el backend.
Ejecutar las migraciones o scripts necesarios.
Comprobar la conexión.
Verificar las tablas.

Las credenciales reales deben permanecer privadas.

---

# 24. Modelo de datos

El modelo conceptual principal es:

ROL
 │
 └──────< USUARIO

CATEGORIA
 │
 └──────< PRODUCTO

MARCA
 │
 └──────< PRODUCTO

USUARIO
 │
 ├──────< RESENA
 │
 └──────< VALORACION

PRODUCTO
 │
 ├──────< RESENA
 │
 └──────< VALORACION

PRODUCTO
 │
 └──────< PRODUCTO_ESTABLECIMIENTO >────── ESTABLECIMIENTO

La estructura definitiva debe coincidir con la implementación de PostgreSQL.

---

# 25. Ejecución del sistema completo

Para ejecutar el proyecto localmente se deben iniciar sus componentes.

Backend

Ingresar a:

cd backend

Ejecutar mediante el mecanismo configurado para el proyecto.

Por ejemplo, si se utiliza Maven:

./mvnw spring-boot:run

En Windows puede utilizarse:

mvnw.cmd spring-boot:run

El puerto dependerá de la configuración del backend.

Frontend

En otra terminal:

cd frontend
npm install
npm run dev

El frontend se conectará al backend mediante la URL configurada en:

NEXT_PUBLIC_API_URL

---

# 26. Flujo de ejecución

El sistema completo funciona de la siguiente manera:

1. Usuario abre TecnoReview
              ↓
2. Next.js carga la interfaz
              ↓
3. Frontend realiza una solicitud
              ↓
4. Spring Boot recibe la solicitud
              ↓
5. Controller procesa la petición
              ↓
6. Service aplica la lógica
              ↓
7. Repository consulta PostgreSQL
              ↓
8. PostgreSQL devuelve información
              ↓
9. Backend genera respuesta JSON
              ↓
10. Next.js recibe la respuesta
              ↓
11. Información mostrada al usuario

---

# 27. Integración frontend-backend

La comunicación entre ambas aplicaciones se realizará mediante HTTP/HTTPS.

Ejemplo:

Frontend
   │
   │ GET /api/productos
   ▼
Backend
   │
   │ consulta
   ▼
PostgreSQL

El backend devolverá información en formato JSON.

---

# 28. Pruebas del backend

Los endpoints deben probarse individualmente.

Se pueden utilizar herramientas como:

Postman.
Insomnia.
Pruebas automatizadas de Spring Boot.

Ejemplo:

GET /api/productos

Debe verificarse:

Código HTTP
Respuesta JSON
Datos obtenidos
Manejo de errores

---

# 29. Pruebas del frontend

Las pruebas del frontend deben verificar:

Navegación.
Formularios.
Búsqueda.
Filtros.
Visualización de productos.
Detalle de productos.
Reseñas.
Valoraciones.
Comparación.
Establecimientos.
Diseño responsive.
Comunicación con la API.

---

# 30. Pruebas de integración

Las pruebas de integración deben comprobar la comunicación entre:

Next.js
   ↕
Spring Boot
   ↕
PostgreSQL

Por ejemplo:

Usuario consulta producto
        ↓
Next.js solicita producto
        ↓
Spring Boot procesa solicitud
        ↓
PostgreSQL devuelve producto
        ↓
Spring Boot responde
        ↓
Next.js muestra producto

---

# 31. Pruebas de autenticación

Se deben verificar diferentes escenarios:

Registro correcto
Usuario nuevo
      ↓
Registro
      ↓
Cuenta creada
Registro inválido
Datos incorrectos
      ↓
Validación
      ↓
Mensaje de error
Login correcto
Credenciales válidas
      ↓
Autenticación
      ↓
Acceso
Login incorrecto
Credenciales inválidas
      ↓
Rechazo
      ↓
Mensaje de error

---

# 32. Pruebas de autorización

Se deben comprobar los permisos según el rol.

Ejemplo:

Visitante
   ↓
Consultar producto
   ↓
Permitido

Visitante
   ↓
Eliminar producto
   ↓
No permitido

La autorización debe validarse en el backend.

---

# 33. Pruebas de base de datos

Se debe verificar:

Conexión.
Creación de registros.
Consulta.
Actualización.
Eliminación.
Relaciones.
Claves primarias.
Claves foráneas.
Restricciones.
Integridad de los datos.

---

# 34. Google Maps

La integración con Google Maps permitirá mostrar la ubicación de los establecimientos.

El frontend utilizará la información proporcionada por el backend para representar la ubicación.

Flujo:

Establecimiento
      ↓
Dirección / coordenadas
      ↓
Backend
      ↓
Frontend
      ↓
Google Maps

La clave utilizada para la integración debe manejarse de acuerdo con las variables de entorno y las restricciones configuradas.

---

# 35. Control de versiones

Todo el desarrollo debe realizarse utilizando Git.

La rama:

main

representa la versión integrada del proyecto.

Los desarrolladores deben trabajar en ramas independientes.

Ejemplo:

feature/productos
feature/login
feature/comparador
feature/resenas

Los cambios se integrarán mediante Pull Requests.

---

# 36. Flujo recomendado de Git

Antes de trabajar:

git checkout main
git pull origin main

Crear rama:

git checkout -b feature/nombre

Trabajar y revisar:

git status

Agregar cambios:

git add .

Crear commit:

git commit -m "feat: descripción del cambio"

Subir rama:

git push -u origin feature/nombre

Después:

Pull Request
     ↓
Revisión
     ↓
Correcciones si son necesarias
     ↓
Merge
     ↓
main

---

# 37. Reglas de Git

Se deben cumplir las siguientes reglas:

No realizar push directo a main.
Trabajar en ramas independientes.
Utilizar mensajes de commit descriptivos.
Revisar los cambios antes del commit.
No subir secretos.
No subir archivos innecesarios.
Mantener las ramas actualizadas.
Resolver conflictos cuidadosamente.
Utilizar Pull Requests para integrar cambios.

---

# 38. Despliegue

La arquitectura de despliegue propuesta es:

                    INTERNET
                       │
                       ▼
              ┌─────────────────┐
              │     Vercel      │
              │    Next.js      │
              └────────┬────────┘
                       │
                       │ HTTPS
                       ▼
              ┌─────────────────┐
              │     Backend     │
              │   Spring Boot   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │    Supabase     │
              │   PostgreSQL    │
              └─────────────────┘

El proveedor definitivo del backend deberá establecerse durante la etapa de despliegue.

---

# 39. Entornos

Se contemplan tres entornos:

Desarrollo

Utilizado por los integrantes mientras programan.

localhost
Pruebas

Utilizado para validar la integración antes de publicar.

Producción

Entorno utilizado por los usuarios finales.

Los datos y credenciales de cada entorno deben mantenerse separados.

---

# 40. Mantenimiento

El mantenimiento del proyecto incluye:

Corrección de errores.
Actualización de dependencias.
Mejoras de seguridad.
Mejoras de rendimiento.
Actualización de documentación.
Revisión de la base de datos.
Revisión de endpoints.
Revisión del frontend.
Control de versiones.

Los cambios importantes deben registrarse mediante Git.

---

# 41. Actualización de dependencias

Antes de actualizar dependencias importantes se recomienda:

Crear una rama.
Revisar la versión actual.
Actualizar la dependencia.
Ejecutar las pruebas.
Verificar que el proyecto compile.
Revisar posibles errores.
Crear Pull Request.

Ejemplo:

fix/
feature/

La actualización no debe realizarse directamente sobre main.

---

# 42. Solución de problemas
El frontend no inicia

Comprobar:

npm install

Después:

npm run dev

También verificar:

Node.js instalado.
package.json.
Variables de entorno.
Puerto disponible.
El backend no inicia

Comprobar:

Java instalado.
Versión del JDK.
Dependencias.
Variables de entorno.
Configuración de Spring Boot.
Conexión con PostgreSQL.
No existe conexión con PostgreSQL

Comprobar:

DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD

También verificar que:

Supabase esté disponible.
Las credenciales sean correctas.
La configuración de conexión sea válida.
El frontend no puede comunicarse con el backend

Verificar:

NEXT_PUBLIC_API_URL

También comprobar:

Backend iniciado.
Puerto correcto.
Endpoint correcto.
Conectividad.
Configuración CORS.
Aparece un error 404

Comprobar:

URL.
Método HTTP.
Endpoint.
ID utilizado.
Controller correspondiente.

Ejemplo:

GET /api/productos/1
Aparece un error 401

Normalmente indica que la solicitud requiere autenticación.

Comprobar:

Sesión.
Credenciales.
Token, si se utiliza.
Configuración de autenticación.
Aparece un error 403

Indica que el usuario no tiene permisos suficientes para realizar la operación.

Se debe verificar el rol y las reglas de autorización.

---

# 43. Registro de errores

Cuando se encuentre un error importante se recomienda registrar:

Fecha:
Responsable:
Descripción:
Pasos para reproducir:
Resultado esperado:
Resultado obtenido:
Archivo relacionado:
Solución:
Estado:

Ejemplo:

Fecha: 00/00/0000
Responsable: Desarrollador
Descripción: Error al consultar productos
Pasos: Entrar a /productos
Resultado esperado: Mostrar productos
Resultado obtenido: Error 500
Solución: Pendiente
Estado: En revisión

---

# 44. Buenas prácticas
Código
Utilizar nombres descriptivos.
Evitar código duplicado.
Mantener clases pequeñas.
Separar responsabilidades.
Validar los datos.
Manejar errores.
Git
Utilizar ramas.
Realizar commits claros.
Revisar Pull Requests.
Evitar cambios innecesarios.
Base de datos
Mantener relaciones correctamente.
Utilizar claves primarias.
Utilizar claves foráneas.
Evitar duplicación innecesaria.
Validar integridad.
Seguridad
No almacenar contraseñas en texto plano.
No subir secretos.
Utilizar variables de entorno.
Validar permisos en backend.

---

# 45. Documentación relacionada

Este manual debe consultarse junto con los demás documentos del proyecto.

docs/
├── alcance.md
├── requisitos.md
├── historias-usuario.md
├── usuarios-y-roles.md
├── modelo-datos.md
├── arquitectura.md
├── sprints.md
├── github-y-flujo-git.md
├── api.md
├── manual-usuario.md
└── manual-tecnico.md

Cada documento tiene un propósito diferente.

---

# 46. Responsabilidades técnicas

Las responsabilidades se distribuirán de acuerdo con las tareas del equipo.

Backend

Responsable de:

Spring Boot.
Controllers.
Services.
Repositories.
API REST.
Validaciones.
Integración con PostgreSQL.
Frontend

Responsable de:

Next.js.
TypeScript.
Componentes.
Páginas.
Formularios.
Consumo de API.
Diseño responsive.
Base de datos

Responsable de:

PostgreSQL.
Supabase.
Tablas.
Relaciones.
Datos iniciales.
Integridad de datos.
Git/GitHub

Responsable de:

Ramas.
Pull Requests.
Revisión del repositorio.
Control de versiones.
Organización del historial.
Protección de main.
Pruebas

Responsable de:

Pruebas funcionales.
Pruebas de API.
Pruebas de integración.
Detección de errores.
Verificación de correcciones.

---

# 47. Definición de terminado técnico

Una funcionalidad se considera técnicamente terminada cuando:

 Código implementado.
 Código organizado.
 Validaciones implementadas.
 Manejo de errores implementado.
 Base de datos actualizada cuando corresponde.
 API funcionando cuando corresponde.
 Frontend integrado cuando corresponde.
 Pruebas realizadas.
 Sin errores críticos conocidos.
 Variables sensibles protegidas.
 Documentación actualizada.
 Commit realizado.
 Pull Request realizado.
 Cambio integrado correctamente.

---

# 48. Lista de verificación para una nueva funcionalidad

Antes de considerar una funcionalidad terminada:

[ ] Requisito identificado
[ ] Historia de usuario identificada
[ ] Tarea asignada
[ ] Rama creada
[ ] Base de datos revisada
[ ] Backend desarrollado
[ ] API probada
[ ] Frontend desarrollado
[ ] Integración realizada
[ ] Pruebas realizadas
[ ] Errores corregidos
[ ] Documentación actualizada
[ ] Commit realizado
[ ] Pull Request creado
[ ] Revisión realizada
[ ] Merge realizado

---

# 49. Estado del proyecto

El proyecto se encuentra en desarrollo.

Los siguientes elementos deben completarse progresivamente:

 Configuración definitiva del frontend.
 Configuración definitiva del backend.
 Configuración de PostgreSQL/Supabase.
 Implementación de entidades.
 Implementación de API.
 Implementación de autenticación.
 Implementación de roles.
 Catálogo de productos.
 Búsqueda.
 Reseñas.
 Valoraciones.
 Comparación.
 Establecimientos.
 Google Maps.
 Pruebas.
 Integración final.
 Despliegue.
 Documentación final.

 ---

# 50. Estado del documento

Versión: 1.0

Estado: Borrador

Última actualización: Pendiente

Responsable: Equipo de desarrollo TecnoReview