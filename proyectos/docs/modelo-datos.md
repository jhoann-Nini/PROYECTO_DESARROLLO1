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


---

# 25. Estado de implementación del esquema — 20 de noviembre de 2026

El modelo descrito en las secciones anteriores conserva elementos conceptuales y decisiones históricas. Para conocer la estructura SQL implementada debe consultarse la secuencia de scripts del backend en proyectos/backend/src/main/resources/db/migration/ y su réplica documental en proyectos/docs/sql/.

A la fecha de esta actualización, el repositorio contiene las migraciones 001–019. Entre las capacidades incorporadas por esa secuencia se encuentran:

- Soporte de identidad y autenticación de Supabase.
- Alineación del catálogo de roles y reseñas/valoraciones.
- Reportes y moderación de reseñas.
- Asignación de múltiples roles por usuario y relación de representantes con establecimientos.
- Auditoría de asignaciones, decisiones de moderación y ocultamiento manual.
- Restricciones de integridad, validación de transiciones y correlación transaccional de eventos de auditoría.
- Estado separado de moderación automática de reseñas mediante resena.estado_moderacion, con valores permitidos PUBLICADA y PENDIENTE (migración 012).
- Verificación de establecimientos por administradores mediante establecimiento.verificado (migración 017).
- Reportes de ofertas con precios o enlaces incorrectos mediante reporte_oferta (migración 018).
- Seguridad y endurecimiento de search_path en 21 funciones públicas de base de datos (migración 019).
- Revisión humana de reseñas retenidas (migración 020): resena.estado_moderacion admite RECHAZADA y resena_moderacion_auditoria admite las acciones APROBAR y RECHAZAR. Salir de PENDIENTE exige un evento de auditoría en la misma transacción (trigger diferido trg_exigir_auditoria_estado_moderacion_resena).
- Moderación de reportes de ofertas (migración 021): tabla append-only reporte_oferta_historial (moderador, estado anterior y nuevo, justificación, id_transaccion y fecha), índice único parcial uq_reporte_oferta_abierto_usuario (un reporte PENDIENTE o EN_REVISION por usuario y oferta), trigger que valida las transiciones PENDIENTE → EN_REVISION → ACEPTADO | RECHAZADO y actualiza fecha_actualizacion, y trigger diferido trg_exigir_historial_transicion_reporte_oferta que exige el evento de historial en la misma transacción. También registra en schema_version la 017 y la 018, cuyas estructuras ya existían en Supabase sin su fila.
- Enlace y fecha de las ofertas (migración 022): producto_establecimiento.url_oferta (TEXT opcional, solo http o https, máximo 2048 caracteres; restricción chk_producto_establecimiento_url_oferta) y producto_establecimiento.fecha_actualizacion_precio (NOT NULL, mantenida por el trigger trg_actualizar_fecha_precio_oferta al insertar y cuando cambian precio, disponibilidad o enlace). Desde la Fase 3, producto_establecimiento es la única fuente de tiendas y precios por tienda del detalle del producto; caracteristicas.tiendas queda solo para los datos mock y no se borra. Verificación del 20 de noviembre de 2026: en Supabase la tabla tenía 0 ofertas y 0 establecimientos, y ningún producto tenía caracteristicas.tiendas.
- Seguridad de la API pública de Supabase (migración 023): las 20 tablas de public tienen RLS activado **sin políticas**, de forma intencional. El frontend usa Supabase solo para autenticación y el backend se conecta como `postgres`, dueño de las tablas, al que RLS no aplica; para la API pública (PostgREST, roles `anon` y `authenticated`) el resultado es denegar todo. La 023 retira además a `anon` y `authenticated` todos los privilegios sobre tablas, secuencias y funciones de public (incluido `TRUNCATE`, que RLS no frena), quita a `PUBLIC` la ejecución de funciones y cambia los privilegios por defecto de `postgres` para que los objetos nuevos no los vuelvan a otorgar. Los privilegios por defecto de `supabase_admin` no se pueden cambiar con el rol de la aplicación. Verificación: `docs/sql/tests/023_verificacion_privilegios.sql`. **Si en el futuro el frontend necesita leer una tabla directamente, hará falta un `GRANT` y una política RLS explícita para esa tabla.**
- Texto revisado y suspensión de cuentas (migración 024): `resena_moderacion_auditoria.comentario_revisado` guarda el texto de la reseña en cada decisión; lo rellena el trigger `fn_validar_insert_resena_moderacion_auditoria`, así que el cliente no puede falsearlo. Tabla append-only `auditoria_usuario_estado` (administrador, estado anterior y nuevo, motivo, `id_transaccion`, fecha), con validación del actor (administrador activo, no sobre sí mismo ni sobre otro administrador activo) y el trigger diferido `trg_exigir_auditoria_estado_usuario`, que exige el evento al cambiar `usuario.estado`.
- Índice de reseñas por autor (migración 025): `idx_resena_usuario` sobre `resena (id_usuario)`, sin filtro, para contar las faltas de reincidencia incluyendo reseñas eliminadas. No cambia la estructura: el backend funciona con o sin ella.
- Apelaciones (migración 026): tabla `apelacion`, con una fila por apelación. Columnas:
  - `id_auditoria`: la decisión apelada; es única, así que hay una apelación por decisión;
  - `id_autor`, `motivo`;
  - `estado`: `PENDIENTE`, `ACEPTADA` o `RECHAZADA`;
  - `fecha_solicitud`;
  - al resolverse: `id_moderador`, `respuesta` y `fecha_resolucion`.

  Los triggers exigen que la decisión sea `RECHAZAR` u `OCULTAR`, que la apele su autor, que la reseña no esté eliminada y que no hayan pasado más de 15 días. Al resolverla, quien decide debe tener rol activo de moderación y no ser el autor ni el moderador original; después, la fila no se puede modificar ni borrar. No tiene permisos para `anon` ni `authenticated`. Verificación de comportamiento: `docs/sql/tests/026_verificacion_apelaciones.sql`.

## 25.1 Modelo conceptual frente al esquema implementado

Este documento no debe interpretarse como un DDL completo ni como una representación exacta, columna por columna, del esquema actual. Las migraciones SQL versionadas y las entidades JPA son las referencias técnicas para el esquema implementado. En particular, el modelo multirrol usa relaciones de asignación y auditoría; no debe describirse como un único rol funcional por usuario.

## 25.2 Estado de los scripts y de cada entorno

Los scripts 001–026 están incorporados al repositorio tanto en `proyectos/backend/src/main/resources/db/migration/` como en `proyectos/docs/sql/`. La existencia de un script no permite afirmar automáticamente que se haya aplicado en una instancia remota. Para verificar una base específica, comprobar los registros de public.schema_version, los objetos SQL y las restricciones correspondientes. La migración 004 marcada como obsoleta es una referencia histórica y no reemplaza la 004 vigente. La migración 013 asocia imágenes con licencia y atribución documentadas a siete productos existentes. Las migraciones 014 y 016 registran siete precios de referencia comerciales con fuente y fecha; no convierten esos valores en inventario garantizado. La migración 015 amplía la columna de imagen a TEXT para admitir URLs de origen largas sin truncarlas. La migración 017 añade la columna de verificación administrativa a establecimientos. La migración 018 crea la tabla `reporte_oferta` para gestionar reportes comunitarios de ofertas. La migración 019 asegura las funciones PL/pgSQL fijando `search_path = pg_catalog`. La migración 020 habilita la revisión humana de reseñas retenidas y la 021 la moderación de reportes de ofertas con historial append-only. Verificación del 20 de noviembre de 2026 en Supabase: la 020 estaba aplicada; las estructuras de la 017 y la 018 existían, pero sin fila en `schema_version`, y la 021 las registra.


## 25.3 Imágenes licenciadas del catálogo — 19 de noviembre de 2026

La migración 013 completa el campo `producto.imagen` para seis registros existentes, solo cuando la imagen estaba vacía y coinciden simultáneamente el identificador y el nombre del producto:

| ID | Producto |
|---:|---|
| 1 | Samsung Galaxy S24 Ultra |
| 7 | Samsung Galaxy A55 5G |
| 56 | Apple iPad Pro 11 pulgadas M4 |
| 69 | OnePlus Pad 2 |
| 74 | Sony WH-1000XM5 |
| 85 | Nothing Ear (2) |

La autoría, página de origen, licencia y tratamiento de cada fotografía se mantienen en `proyectos/frontend/src/data/atribucionImagenes.ts`. La migración no asigna precios ni modifica especificaciones: esos datos requieren una variante exacta y una fuente comercial vigente. El Xiaomi 14 Ultra (ID 3) se incorporó mediante la migración 015, que amplía `producto.imagen` a TEXT para conservar la URL CC0 original de Wikimedia Commons (283 caracteres) sin acortarla ni modificarla.


## 25.4 Precios de referencia documentados — 19 de noviembre de 2026

Las migraciones 014 y 016 registran siete precios observados para productos cuyo modelo coincide con la fuente consultada y cuyo campo `precio_referencia` estaba vacío:

| ID | Producto | Precio de referencia (COP) | Condición | Fuente |
|---:|---|---:|---|---|
| 74 | Sony WH-1000XM5 | $2.249.896 | Precio publicado por Sony Colombia; color Smoky Pink en la ficha consultada | [Sony Colombia](https://www.sony.com.co/electronics/audifonos-banda-cabeza/wh-1000xm5) |
| 85 | Nothing Ear (2) | $599.990 | Nuevo; oferta publicada por Exclusive JJ | [Exclusive JJ Colombia](https://www.exclusivejj.com/tienda/accesorios/1159-nothing-ear-2.html) |
| 37 | JBL Tune Buds | $299.900 | Precio publicado por JBL Colombia | [JBL Colombia](https://www.jbl.com.co/audifonos-true-wireless/) |
| 38 | JBL Live Beam 3 | $589.900 | Oferta de vendedor Smartphonetablet en Falabella | [Falabella Colombia](https://www.falabella.com.co/falabella-co/category/cat50670/Audifonos) |
| 39 | JBL Tour Pro 3 | $1.324.900 | Precio publicado por JBL Colombia | [JBL Colombia](https://www.jbl.com.co/audifonos-true-wireless/) |
| 73 | Sony WF-1000XM5 | $1.999.900 | Precio publicado por Sony Colombia | [Sony Colombia](https://www.sony.com.co/headphones/wireless) |
| 76 | Sony WH-CH720N | $349.900 | Oferta publicada por Sony Colombia en Falabella | [Falabella Colombia](https://www.falabella.com.co/falabella-co/category/cat50670/Audifonos) |

Estos importes son referencias observadas el 19/11/2026, no precios dinámicos ni garantía de inventario. La migración solo actualiza registros con ID y nombre coincidentes y precio previo NULL. Los demás productos permanecen sin precio cuando la fuente no permite confirmar la variante, condición o mercado.


## 25.5 Compatibilidad con URL de imagen largas — 19 de noviembre de 2026

La migración 015 cambia el tipo de `public.producto.imagen` de `VARCHAR(255)` a `TEXT`. La modificación es de ampliación y mantiene el contrato de aplicación como cadena de texto. Se necesitó para guardar la URL original de la fotografía CC0 del Xiaomi 14 Ultra (ID 3), que tiene 283 caracteres. No se utiliza un acortador ni se transforma el archivo de origen.


La migración 016 completa cinco precios adicionales del lote de auriculares. En JBL Live Beam 3 y Sony WH-CH720N se conserva que el precio observado proviene de un vendedor identificado en Falabella; no se presenta como precio directo del fabricante. Todos los importes son referencias observadas el 19/11/2026.
