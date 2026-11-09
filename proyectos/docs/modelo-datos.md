# Modelo de datos

## 1. Información general

**Nombre del proyecto:** TecReview

**Base de datos:** PostgreSQL

**Servicio de base de datos:** Supabase

El modelo de datos define las principales entidades que serán utilizadas por TecnoReview y las relaciones existentes entre ellas.

El objetivo es organizar correctamente la información de:

- Usuarios.
- Roles.
- Productos.
- Categorías.
- Marcas.
- Reseñas.
- Valoraciones.
- Establecimientos.
- Ubicaciones.
- Relaciones entre productos y establecimientos.

---

# 2. Entidades principales

El modelo inicial contempla las siguientes entidades:

```text
USUARIO
ROL
PRODUCTO
CATEGORIA
MARCA
RESEÑA
VALORACION
ESTABLECIMIENTO
```

Algunas relaciones pueden requerir tablas intermedias dependiendo de la implementación definitiva.

---

# 3. Entidad: ROL

Catálogo de perfiles funcionales que pueden asignarse a las cuentas.

## Atributos

| Campo | Tipo conceptual | Descripción |
|---|---|---|
| id_rol | PK | Identificador del rol |
| nombre | VARCHAR | Nombre canónico único del rol |
| descripcion | TEXT | Descripción del rol |

### Roles canónicos

- `ADMINISTRADOR`
- `MODERADOR`
- `USUARIO_REGISTRADO`
- `REPRESENTANTE_ESTABLECIMIENTO`

Visitante es acceso público y no se persiste como rol ni requiere una cuenta.

---

# 4. Entidad: USUARIO

Representa una cuenta individual. Una cuenta puede tener varios roles vigentes; por tanto, el rol no debe modelarse como un único atributo obligatorio dentro de USUARIO en el modelo objetivo.

## Atributos

| Campo | Tipo conceptual | Descripción |
|---|---|---|
| id_usuario | PK | Identificador del usuario |
| nombre | VARCHAR | Nombre del usuario |
| correo | VARCHAR | Correo electrónico único |
| password | VARCHAR / nullable según autenticación | Credencial local si aplica; no almacenar contraseñas en texto plano |
| supabase_uid | VARCHAR, UNIQUE, nullable según integración | Identificador del usuario en Supabase Auth |
| fecha_registro | TIMESTAMP | Fecha de creación de la cuenta |
| estado | BOOLEAN | Estado general de la cuenta; una cuenta inactiva no puede operar con ninguno de sus roles |

El campo conceptual `id_rol` único de la versión anterior se sustituye por la relación intermedia `USUARIO_ROL`. Esta es una evolución del modelo objetivo y no afirma que el esquema o la entidad JPA actuales ya estén migrados.

## Relación cuenta-roles

Una cuenta puede tener uno o varios roles, y un rol puede asignarse a muchas cuentas. La relación es muchos a muchos y debe resolverse mediante una entidad/tabla intermedia.

### USUARIO_ROL

| Campo | Tipo conceptual | Descripción |
|---|---|---|
| id_usuario | PK/FK | Cuenta a la que se asigna el rol |
| id_rol | PK/FK | Rol asignado |
| estado_asignacion | VARCHAR/ENUM | Vigente, suspendida o revocada, según la política de roles |
| fecha_asignacion | TIMESTAMP | Fecha de asignación |
| asignado_por | FK a USUARIO | Actor autorizado que asignó el rol, cuando aplique |
| fecha_cambio | TIMESTAMP | Fecha del último cambio de estado |

La clave primaria compuesta `(id_usuario, id_rol)` evita duplicar una asignación del mismo rol a la misma cuenta. Los cambios de asignación, suspensión y revocación deben conservar trazabilidad. La cuenta inactiva bloquea todos sus roles; suspender o revocar un rol individual no elimina los demás roles vigentes.

---

1. Entidad: CATEGORIA

Representa las categorías utilizadas para organizar los productos tecnológicos.

## Atributos

Campo      | Tipo conceptual | Descripción
id_categoria | PK            | Identificador de la categoría
nombre      | VARCHAR        | Nombre de la categoría
descripcion  | TEXT            | Descripción de la categoría
estado      | BOOLEAN        | Estado de la categoría

## Ejemplos

Celulares
Computadores
Portátiles
Tablets
Accesorios

---

# 6. Entidad: MARCA

Representa las marcas de los productos tecnológicos.

## Atributos

Campo     | Tipo conceptual | Descripción
id_marca | PK           | Identificador de la marca
nombre     | VARCHAR       | Nombre de la marca
descripcion | TEXT       | Descripción
estado     | BOOLEAN       | Estado de la marca

---

# 7. Entidad: PRODUCTO

Representa los productos tecnológicos registrados en la plataforma.

## Atributos iniciales

Campo           | Tipo conceptual | Descripción
id_producto       | PK             | Identificador del producto
nombre           | VARCHAR         | Nombre del producto
descripcion       | TEXT         | Descripción
id_categoria      | FK             | Categoría del producto
id_marca       | FK             | Marca del producto
imagen           | VARCHAR         | Referencia de la imagen
precio_referencia | DECIMAL         | Precio de referencia, si aplica
estado           | BOOLEAN         | Estado del producto

## Relaciones

Un producto pertenece a una categoría.

CATEGORIA 1 ───────── N PRODUCTO

Una marca puede tener múltiples productos.

MARCA 1 ───────── N PRODUCTO

Por lo tanto:

CATEGORIA
    │
    │ 1
    │
    │ N
PRODUCTO
    │
    │ N
    │
    │ 1
   MARCA

# 8. Entidad: RESEÑA

Representa la opinión escrita y calificación asignada por un usuario acerca de un producto.

## Atributos

Campo        | Tipo conceptual | Descripción
id_resena    | PK              | Identificador de la reseña
id_usuario    | FK              | Usuario que realiza la reseña
id_producto   | FK              | Producto reseñado
comentario    | TEXT           | Contenido o detalle de la reseña
puntuacion    | INTEGER        | Calificación del producto (escala de 1 a 5, por defecto 5)
fecha_creacion| TIMESTAMP      | Fecha de publicación
estado        | BOOLEAN        | Estado de la reseña (activa/inactiva para borrado lógico)

## Relaciones

Un usuario puede realizar varias reseñas.

USUARIO 1 ───────── N RESEÑA

Un producto puede tener varias reseñas.

PRODUCTO 1 ───────── N RESEÑA

La relación general queda:

USUARIO
   │
   │ 1
   │
   │ N
RESEÑA
   │
   │ N
   │
   │ 1
PRODUCTO
---

# 9. Nota: valoración integrada en RESEÑA

> **Nota:** La puntuación utiliza una escala de 1 a 5 y está integrada directamente en la entidad **RESEÑA** mediante el campo `puntuacion`. No se gestiona como una entidad o funcionalidad independiente de valoraciones.

---

## 10. Entidad: ESTABLECIMIENTO

Representa los establecimientos relacionados con la comercialización de productos tecnológicos.

## Atributos iniciales

Campo            | Tipo conceptual | Descripción
id_establecimiento | PK              | Identificador establecimiento
nombre            | VARCHAR      | Nombre del establecimiento
direccion        | VARCHAR      | Dirección
telefono        | VARCHAR      | Número de contacto
correo            | VARCHAR      | Correo de contacto
descripcion        | TEXT          | Información del establecimiento
latitud            | DECIMAL         | Coordenada geográfica
longitud        | DECIMAL      | Coordenada geográfica
estado            | BOOLEAN      | Estado del establecimiento

Las coordenadas permitirán relacionar el establecimiento con la funcionalidad de mapas.

---

# 11. Relación entre establecimientos y usuarios

La relación cuenta-establecimiento es de muchos a muchos: una cuenta con el rol Representante de establecimiento puede representar varios establecimientos y un establecimiento puede tener varios representantes.

### USUARIO_ESTABLECIMIENTO

| Campo | Tipo conceptual | Descripción |
|---|---|---|
| id_usuario | PK/FK | Cuenta representante |
| id_establecimiento | PK/FK | Establecimiento representado |
| estado_vinculo | VARCHAR/ENUM | Vigente, suspendido o revocado |
| fecha_inicio | TIMESTAMP | Inicio de la relación |
| fecha_fin | TIMESTAMP, nullable | Fin o revocación del vínculo |
| asignado_por | FK a USUARIO | Administrador autorizado que asignó el vínculo, cuando aplique |

La clave primaria compuesta `(id_usuario, id_establecimiento)` evita duplicar el vínculo. Revocar un vínculo afecta únicamente a esa relación; no elimina otros vínculos de la cuenta ni los demás representantes del establecimiento. La autorización se valida por establecimiento y por permiso específico en cada operación.

La suspensión del establecimiento bloquea sus operaciones comerciales, pero no desactiva las cuentas personales ni borra los vínculos. El cierre es lógico y conserva el historial. La reapertura exige revisión y no restaura automáticamente vínculos revocados ni publicaciones.

Esta relación es parte del modelo objetivo aprobado. La entidad y el esquema actuales deben migrarse y probarse en una fase de implementación; esta documentación no afirma que la relación ya exista en producción.

---

# 12. Relación entre productos y establecimientos

La plataforma debe permitir relacionar productos tecnológicos con establecimientos.

Dependiendo de las reglas de negocio, un producto puede encontrarse disponible en varios establecimientos y un establecimiento puede ofrecer varios productos.

Esto representa una relación de muchos a muchos:

PRODUCTO N ───────── N ESTABLECIMIENTO

Para implementarla en una base de datos relacional se puede utilizar una tabla intermedia.

## PRODUCTO_ESTABLECIMIENTO

Campo            | Tipo conceptual | Descripción
id_producto        | PK/FK          | Producto relacionado
id_establecimiento | PK/FK          | Establecimiento relacionado
precio            | DECIMAL      | Precio en el establecimiento, si aplica
disponibilidad    | BOOLEAN      | Indica si está disponible

La estructura sería:

PRODUCTO
   │
   │ 1
   │
   │ N
PRODUCTO_ESTABLECIMIENTO
   │
   │ N
   │
   │ 1
ESTABLECIMIENTO

---

# 13. Modelo general

La estructura conceptual inicial puede representarse de la siguiente manera:

                         ┌──────────────┐
                         │     ROL      │
                         └──────┬───────┘
                                │
                                │ 1:N
                                │
                         ┌──────▼───────┐
                         │    USUARIO   │
                         └──┬────────┬──┘
                            │        │
                         1:N│        │1:N
                            │        │
                    ┌───────▼──┐  ┌──▼───────────┐
                    │  RESEÑA  │  │  VALORACION  │
                    └───────┬──┘  └──────┬───────┘
                            │             │
                            │ N:1         │ N:1
                            │             │
                            └──────┬──────┘
                                   │
                            ┌──────▼───────┐
                            │   PRODUCTO   │
                            └───┬─────┬────┘
                                │     │
                              N:1│     │N:1
                                │     │
                     ┌──────────▼┐   ┌▼──────────┐
                     │ CATEGORIA │   │   MARCA   │
                     └───────────┘   └───────────┘

                            PRODUCTO
                                │
                               N:N
                                │
                 ┌──────────────▼──────────────┐
                 │ PRODUCTO_ESTABLECIMIENTO    │
                 └──────────────┬──────────────┘
                                │
                               N:1
                                │
                       ┌────────▼─────────┐
                       │ ESTABLECIMIENTO  │
                       └──────────────────┘

---

# 14. Claves primarias

Cada entidad principal tendrá un identificador único.

Las claves primarias iniciales serán:

Entidad                  | Clave primaria
ROL                      | id_rol
USUARIO                  | id_usuario
CATEGORIA              | id_categoria
MARCA                  | id_marca
PRODUCTO              | id_producto
RESEÑA                  | id_reseña
VALORACION              | id_valoracion
ESTABLECIMIENTO          | id_establecimiento
PRODUCTO_ESTABLECIMIENTO |id_producto + id_establecimiento

---

# 15. Claves foráneas

Las principales claves foráneas serán:

Tabla                  | Clave foránea      | Referencia
USUARIO                  | id_rol           | ROL.id_rol
PRODUCTO              | id_categoria       | CATEGORIA.id_categoria
PRODUCTO              | id_marca           | MARCA.id_marca
RESEÑA                  | id_usuario         | USUARIO.id_usuario
RESEÑA                  | id_producto        | PRODUCTO.id_producto
VALORACION              | id_usuario         | USUARIO.id_usuario
VALORACION              | id_producto        | PRODUCTO.id_producto
PRODUCTO_ESTABLECIMIENTO | id_producto       | PRODUCTO.id_producto
PRODUCTO_ESTABLECIMIENTO | id_establecimiento | ESTABLECIMIENTO.id_establecimiento

---

# 16. Integridad de los datos

La base de datos deberá mantener la integridad de la información.

Se deben considerar:

- Claves primarias para identificar registros.
- Claves foráneas para mantener relaciones.
- Restricciones de valores obligatorios.
- Validación de datos.
- Restricciones de unicidad cuando sean necesarias.
- Control de valores permitidos.
- Manejo adecuado de eliminación y actualización de registros relacionados.

Por ejemplo, el correo electrónico de un usuario deberá ser único:

>> USUARIO.correo → UNIQUE

También se deberá evitar registrar relaciones con productos, usuarios o establecimientos inexistentes.

---

# 17. Reglas de negocio iniciales

Se contemplan inicialmente las siguientes reglas:

RN-01

Cada usuario registrado debe tener un rol.

RN-02

El correo electrónico de un usuario no debe repetirse.

RN-03

Un producto debe pertenecer a una categoría.

RN-04

Un producto debe estar asociado a una marca.

RN-05

Una reseña debe estar asociada a un usuario y a un producto.

RN-06

Una valoración debe estar asociada a un usuario y a un producto.

RN-07

La puntuación de una valoración debe encontrarse dentro de la escala definida.

RN-08

Solo los usuarios autorizados pueden registrar reseñas y valoraciones.

RN-09

Las operaciones administrativas deben estar restringidas según el rol.

RN-10

Un representante de establecimiento solamente debe poder modificar establecimientos para los cuales tenga autorización.

RN-11

Un producto puede relacionarse con varios establecimientos.

RN-12

Un establecimiento puede ofrecer varios productos.

---

# 18. Modelo de comparación

La comparación de productos no requiere necesariamente una tabla denominada COMPARACION.

La comparación puede realizarse mediante consultas sobre los productos seleccionados por el usuario.

Por ejemplo:

Usuario selecciona:

Producto A
Producto B
Producto C

          ↓

Sistema consulta información

          ↓

┌───────────┬───────────┬───────────┬───────────┐
│ Caracter. │ Producto A│ Producto B│ Producto C│
├───────────┼───────────┼───────────┼───────────┤
│ Marca     │ ...       │ ...       │ ...       │
│ Categoría │ ...       │ ...       │ ...       │
│ Valoración│ ...       │ ...       │ ...       │
│ Precio    │ ...       │ ...       │ ...       │
└───────────┴───────────┴───────────┴───────────┘

La implementación definitiva dependerá de cómo se diseñen las características técnicas de los productos.

---

# 19. Características técnicas de productos

Las características técnicas detalladas todavía deben definirse de acuerdo con las categorías que finalmente maneje el sistema.

Por ejemplo, diferentes categorías pueden requerir diferentes atributos:

Celulares
Pantalla
Memoria RAM
Almacenamiento
Cámara
Batería
Procesador
Computadores
Procesador
RAM
Almacenamiento
Tarjeta gráfica
Pantalla
Accesorios
Tipo
Compatibilidad
Conectividad
Características principales

Por esta razón, el modelo definitivo de características deberá establecerse antes de crear todas las tablas correspondientes.

---

# 20. Consideraciones para PostgreSQL y Supabase

La implementación de la base de datos utilizará PostgreSQL.

Supabase será utilizado como servicio para administrar y proporcionar acceso a la base de datos PostgreSQL.

Antes de realizar la implementación definitiva se deberá configurar:

Proyecto de Supabase.
Base de datos PostgreSQL.
Credenciales de conexión.
Variables de entorno.
Tablas.
Relaciones.
Restricciones.
Datos iniciales de prueba.

Las credenciales y claves privadas no deben almacenarse directamente en el repositorio de GitHub.

---

# 21. Relación con Spring Boot

Las entidades definidas en este documento servirán como base para construir las entidades del backend.

La estructura conceptual será:

Base de datos PostgreSQL
          ↓
      Entidades JPA
          ↓
      Repositories
          ↓
       Services
          ↓
      Controllers
          ↓
        REST API

La implementación concreta de estas capas se documentará posteriormente en:

docs/ arquitectura.md

---

# 22. Pendientes de definición

Antes de considerar el modelo de datos como definitivo, el equipo debe tomar decisiones sobre:

Escala definitiva de valoración.
Características específicas de cada categoría.
Relación exacta entre representantes y establecimientos.
Manejo de imágenes.
Precio de referencia.
Reglas para eliminar productos.
Reglas para eliminar reseñas.
Si un usuario puede modificar sus propias reseñas.
Si un usuario puede realizar una sola valoración por producto o varias.
Datos adicionales requeridos para establecimientos.

Estas decisiones deberán registrarse y actualizarse en este documento cuando sean aprobadas por el equipo.

---

# 23. Estado del documento

Versión: 1.0
Estado: Borrador inicial
Documento: Modelo de datos
Última actualización: Pendiente de registrar


---

# 24. Reportes y trazabilidad de moderación (modelo objetivo)

Un reporte se asocia con una reseña y con la cuenta que lo crea. El flujo aprobado requiere conservar el reporte incluso después de su cierre.

### REPORTE_RESENA

| Campo | Tipo conceptual | Descripción |
|---|---|---|
| id_reporte | PK | Identificador del reporte |
| id_resena | FK a RESENA | Reseña reportada |
| id_usuario | FK a USUARIO | Cuenta reportante |
| motivo | VARCHAR | Categoría del reporte |
| descripcion | TEXT, nullable | Detalle adicional |
| estado | ENUM/VARCHAR | PENDIENTE, EN_REVISION, PROCEDENTE, NO_PROCEDENTE, ESCALADO o CERRADO |
| fecha_creacion | TIMESTAMP | Fecha de recepción |
| fecha_actualizacion | TIMESTAMP | Última actualización |

### Historial de moderación

El diseño debe conservar cada transición de estado y sus datos de auditoría: estado anterior/nuevo, actor, fecha, motivo, justificación, acción aplicada, resultado y datos del escalamiento/cierre. La resolución de un caso escalado corresponde a un administrador autorizado sin conflicto de interés. Los cierres son automáticos únicamente después de completar las condiciones aprobadas.

Los scripts SQL y entidades actuales pueden representar una versión parcial del flujo; los estados y restricciones deberán alinearse con esta especificación mediante migraciones revisadas. No se debe ejecutar ni aplicar una migración de base de datos como parte de esta revisión documental.

Los scripts SQL históricos `006_reportes_resenas.sql` y `007_moderacion_reportes.sql` todavía admiten los estados `PENDIENTE`, `EN_REVISION`, `ACEPTADO` y `RECHAZADO`, con estados finales inmutables. Estos nombres y transiciones no representan la política objetivo aprobada en esta Fase 1. Deben tratarse como una versión previa del esquema: no ejecutar ni modificar esos scripts como parte de esta revisión; en la fase de implementación se diseñará una migración nueva, numerada y revisada para los estados `PROCEDENTE`, `NO_PROCEDENTE`, `ESCALADO` y `CERRADO`, conservando la trazabilidad y los datos existentes.
