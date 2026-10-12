# Modelo de datos

## 1. Información general

**Nombre del proyecto:** TecnoReview
**Motor de base de datos:** PostgreSQL 15+
**Servicio de base de datos:** Supabase
**Backend:** Spring Boot 4 / Java 21 / Spring Data JPA

El modelo de datos define las principales entidades que son utilizadas por TecnoReview y las relaciones existentes entre ellas.

El objetivo es organizar correctamente la información de:

- Usuarios.
- Roles.
- Productos.
- Categorías.
- Marcas.
- Reseñas.
- Valoraciones.
- Establecimientos.
- Ubicaciones y coordenadas.
- Relaciones entre productos y establecimientos.

Este documento refleja el estado verificado del esquema en **Supabase**, su correspondencia con las **entidades JPA** del backend y los **acuerdos de negocio** formalizados por el equipo de desarrollo durante el Sprint 1 (tarea Jira S1-18).

---

# 2. Entidades principales y tablas de Supabase

El modelo de datos y el esquema verificado en Supabase constan de **nueve (9) tablas físicas**:

```text
rol
usuario
categoria
marca
producto
resena
valoracion
establecimiento
producto_establecimiento
```

> **Convención de nomenclatura:** Todos los identificadores físicos de tablas y columnas utilizan exclusivamente caracteres ASCII en minúsculas y formato `snake_case` (por ejemplo, `resena` e `id_resena`), evitando caracteres especiales como `ñ` o tildes para garantizar total compatibilidad con PostgreSQL, JDBC y JPA.

---

# 3. Entidad y tabla: `rol`

Representa los diferentes roles disponibles dentro del sistema para el control de acceso y autorización.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_rol` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador único del rol |
| `nombre` | VARCHAR(50) | `String` | NOT NULL | Nombre del rol |
| `descripcion` | TEXT | `String` | NULL | Descripción de permisos y alcance del rol |

### Roles iniciales
- `Usuario registrado`
- `Administrador`
- `Representante de establecimiento`

El visitante no requiere necesariamente un registro en la tabla `rol`, ya que puede utilizar la plataforma sin autenticarse para consultar información pública.

---

# 4. Entidad y tabla: `usuario`

Representa a las personas que poseen una cuenta registrada en TecnoReview.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_usuario` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador único del usuario |
| `nombre` | VARCHAR(150) | `String` | NOT NULL | Nombre del usuario |
| `correo` | VARCHAR(150) | `String` | NOT NULL, UNIQUE | Correo electrónico de acceso |
| `password` | VARCHAR(255) | `String` | NOT NULL | Contraseña (almacenada cifrada) |
| `id_rol` | BIGINT | `Rol` (objeto) | FK hacia `rol(id_rol)`, NOT NULL | Rol asignado al usuario |
| `fecha_registro` | TIMESTAMP | `LocalDateTime` | NOT NULL | Fecha y hora de creación de la cuenta |
| `estado` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Estado de la cuenta (borrado lógico) |

## Relaciones

Un usuario pertenece a un rol:

```text
rol 1 ───────── N usuario
```

Un rol puede estar asociado a muchos usuarios, mientras que cada usuario tendrá un rol asignado.

---

# 5. Entidad y tabla: `categoria`

Representa las categorías utilizadas para organizar los productos tecnológicos.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_categoria` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador de la categoría |
| `nombre` | VARCHAR(100) | `String` | NOT NULL | Nombre de la categoría |
| `descripcion` | TEXT | `String` | NULL | Descripción de la categoría |
| `estado` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Estado de la categoría (borrado lógico) |

## Ejemplos
- Celulares
- Computadores
- Portátiles
- Tablets
- Accesorios

---

# 6. Entidad y tabla: `marca`

Representa los fabricantes y marcas de los productos tecnológicos.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_marca` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador de la marca |
| `nombre` | VARCHAR(100) | `String` | NOT NULL | Nombre de la marca (ej. Samsung, Apple, Lenovo) |
| `descripcion` | TEXT | `String` | NULL | Descripción de la marca |
| `estado` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Estado de la marca (borrado lógico) |

---

# 7. Entidad y tabla: `producto`

Representa los productos tecnológicos registrados en la plataforma.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_producto` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador del producto |
| `nombre` | VARCHAR(150) | `String` | NOT NULL | Nombre del producto |
| `descripcion` | TEXT | `String` | NULL | Descripción general |
| `id_categoria` | BIGINT | `Categoria` (objeto) | FK hacia `categoria(id_categoria)`, NOT NULL | Categoría asignada |
| `id_marca` | BIGINT | `Marca` (objeto) | FK hacia `marca(id_marca)`, NOT NULL | Marca del producto |
| `imagen` | VARCHAR(255) | `String` | NULL | Referencia de la imagen |
| `precio_referencia` | NUMERIC(12,2) | `BigDecimal` | NULL | Precio de referencia sugerido |
| `estado` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Estado del producto (borrado lógico) |

> **Nota técnica confirmada en Supabase:** Actualmente la tabla `producto` en Supabase y la entidad JPA **no contienen** una columna `caracteristicas`. El modelado de especificaciones técnicas detalladas por categoría se analiza en la sección 19.

## Relaciones

Un producto pertenece a una categoría y está asociado a una marca:

```text
categoria 1 ───────── N producto
marca     1 ───────── N producto
```

Estructura de dependencias:

```text
categoria
    │
    │ 1
    │
    │ N
producto
    │
    │ N
    │
    │ 1
  marca
```

---

# 8. Entidad y tabla: `resena`

Representa la opinión escrita por un usuario acerca de un producto tecnológico.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_resena` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador único de la reseña |
| `id_usuario` | BIGINT | `Usuario` (objeto) | FK hacia `usuario(id_usuario)`, NOT NULL | Usuario que realiza la reseña |
| `id_producto` | BIGINT | `Producto` (objeto) | FK hacia `producto(id_producto)`, NOT NULL | Producto reseñado |
| `comentario` | TEXT | `String` | NOT NULL | Contenido textual de la reseña |
| `fecha_creacion` | TIMESTAMP | `LocalDateTime` | NOT NULL | Fecha y hora de publicación |
| `estado` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Estado de la reseña (borrado lógico / moderación) |

> **Observación de integridad confirmada:** En el esquema actual de Supabase y en JPA **no existe** una restricción de unicidad sobre `(id_usuario, id_producto)`. Esto permite técnicamente que un usuario publique múltiples reseñas sobre el mismo producto mientras no se aplique dicha restricción.

## Relaciones

Un usuario puede realizar reseñas y un producto puede recibir reseñas:

```text
usuario  1 ───────── N resena
producto 1 ───────── N resena
```

Estructura de relaciones:

```text
usuario
   │
   │ 1
   │
   │ N
 resena
   │
   │ N
   │
   │ 1
producto
```

---

# 9. Entidad y tabla: `valoracion`

Representa la puntuación numérica que un usuario asigna a un producto.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_valoracion` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador de la valoración |
| `id_usuario` | BIGINT | `Usuario` (objeto) | FK hacia `usuario(id_usuario)`, NOT NULL | Usuario que realiza la valoración |
| `id_producto` | BIGINT | `Producto` (objeto) | FK hacia `producto(id_producto)`, NOT NULL | Producto valorado |
| `puntuacion` | INTEGER | `Integer` | NOT NULL | Puntuación asignada |
| `fecha_creacion` | TIMESTAMP | `LocalDateTime` | NOT NULL | Fecha y hora del registro |

> **Observaciones técnicas confirmadas:**
> 1. En Supabase y en JPA, la tabla `valoracion` **no tiene columna `estado`**.
> 2. `puntuacion` es de tipo `integer NOT NULL` en PostgreSQL y no posee una restricción `CHECK (puntuacion BETWEEN 1 AND 5)` a nivel de base de datos.
> 3. **No existe** restricción de unicidad sobre `(id_usuario, id_producto)`. Un usuario puede calificar repetidamente el mismo producto en el estado actual del esquema.

## Relaciones

Un usuario puede realizar valoraciones sobre productos:

```text
usuario  1 ───────── N valoracion
producto 1 ───────── N valoracion
```

---

# 10. Entidad y tabla: `establecimiento`

Representa los establecimientos comerciales relacionados con la venta y distribución de productos tecnológicos.

## Columnas y tipos
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_establecimiento` | BIGINT | `Long` | PK, IDENTITY BY DEFAULT | Identificador del establecimiento |
| `nombre` | VARCHAR(150) | `String` | NOT NULL | Nombre comercial del comercio |
| `direccion` | VARCHAR(255) | `String` | NULL | Dirección física |
| `telefono` | VARCHAR(30) | `String` | NULL | Número de contacto |
| `correo` | VARCHAR(150) | `String` | NULL | Correo electrónico de contacto |
| `descripcion` | TEXT | `String` | NULL | Información del establecimiento |
| `latitud` | NUMERIC(10,6) | `BigDecimal` | NULL | Coordenada geográfica para mapas |
| `longitud` | NUMERIC(10,6) | `BigDecimal` | NULL | Coordenada geográfica para mapas |
| `estado` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Estado del establecimiento (borrado lógico) |

Las coordenadas geográficas permiten integrar el establecimiento con la funcionalidad de mapas en el frontend (Google Maps).

> **Observación de relación confirmada:** Actualmente la tabla `establecimiento` en Supabase y la entidad JPA `Establecimiento.java` **no poseen** la columna ni relación `id_usuario`. Ver la sección 11 para el acuerdo formalizado.

---

# 11. Relación entre establecimientos y usuarios (DEC-01)

### Acuerdo confirmado del equipo:
- Un usuario puede representar **varios establecimientos**.
- Cada establecimiento tiene un **único representante** asignado.
- Corresponde a una relación **uno a muchos (1:N)** desde `usuario` hacia `establecimiento`:

```text
usuario 1 ───────── N establecimiento
```

### Estado técnico actual:
> ⚠️ **Pendiente de implementación en el esquema físico y en JPA:**
> La columna de clave foránea `id_usuario` **aún no existe** en la tabla física `establecimiento` de Supabase ni en la entidad JPA `Establecimiento.java`.
> Para materializar este acuerdo en un sprint posterior se requerirá:
> 1. Migración DDL en Supabase: `ALTER TABLE establecimiento ADD COLUMN id_usuario BIGINT REFERENCES usuario(id_usuario);`.
> 2. Mapeo en JPA: `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "id_usuario") private Usuario usuario;` en `Establecimiento.java`.

---

# 12. Relación entre productos y establecimientos

La plataforma permite relacionar productos tecnológicos con los comercios donde se encuentran disponibles.
Un producto puede encontrarse disponible en varios establecimientos y un establecimiento puede ofrecer múltiples productos, conformando una relación de muchos a muchos (N:M).

Esta relación se implementa mediante la tabla intermedia `producto_establecimiento`.

## Tabla: `producto_establecimiento`
| Campo | Tipo PostgreSQL | Tipo JPA | Restricciones | Descripción |
|---|---|---|---|---|
| `id_producto` | BIGINT | `@Id` `Producto` | PK, FK hacia `producto(id_producto)` | Producto relacionado |
| `id_establecimiento` | BIGINT | `@Id` `Establecimiento` | PK, FK hacia `establecimiento(id_establecimiento)` | Establecimiento relacionado |
| `precio` | NUMERIC(12,2) | `BigDecimal` | NULL | Precio de venta en este comercio |
| `disponibilidad` | BOOLEAN | `Boolean` | NOT NULL, DEFAULT true | Indica si está disponible en inventario |

### Estructura relacional:

```text
producto
   │
   │ 1
   │
   │ N
producto_establecimiento
   │
   │ N
   │
   │ 1
establecimiento
```

En JPA está implementada con clave primaria compuesta mediante la clase `@IdClass(ProductoEstablecimientoId.class)`.

---

# 13. Diagrama general del modelo de datos

La estructura del modelo de datos se representa conceptualmente de la siguiente manera:

```text
                         ┌──────────────┐
                         │     rol      │
                         └──────┬───────┘
                                │
                                │ 1:N
                                │
                         ┌──────▼───────┐
                         │   usuario    │
                         └──┬────┬────┬─┘
                            │    │    │
               ┌────────────┘    │    └────────────┐
            1:N│              1:N│              1:N│ (Acuerdo DEC-01,
               │                 │                 │ pendiente en BD)
        ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼──────────┐
        │    resena    │  │  valoracion  │  │ establecimiento │
        └──────┬───────┘  └──────┬───────┘  └──────┬──────────┘
               │                 │                 │
            N:1│              N:1│              1:N│
               │                 │                 │
               └────────────┬────┘                 │
                            │                      │
                     ┌──────▼───────┐              │
                     │   producto   │              │
                     └──┬────┬────┬─┘              │
                        │    │    │                │
                     N:1│ N:1│    └────────┐       │
                        │    │          1:N│       │
            ┌───────────┘    └──────┐      │       │
            │                       │   ┌──▼───────▼──────────────┐
     ┌──────▼──────┐         ┌──────▼──┐│ producto_establecimiento│
     │  categoria  │         │  marca  │└─────────────────────────┘
     └─────────────┘         └─────────┘
```

---

# 14. Claves primarias verificadas

Cada entidad principal tiene un identificador único. En Supabase se confirmaron las siguientes claves:

| Tabla | Clave primaria física | Estrategia en Supabase |
|---|---|---|
| `rol` | `id_rol` | IDENTITY BY DEFAULT |
| `usuario` | `id_usuario` | IDENTITY BY DEFAULT |
| `categoria` | `id_categoria` | IDENTITY BY DEFAULT |
| `marca` | `id_marca` | IDENTITY BY DEFAULT |
| `producto` | `id_producto` | IDENTITY BY DEFAULT |
| `resena` | `id_resena` | IDENTITY BY DEFAULT |
| `valoracion` | `id_valoracion` | IDENTITY BY DEFAULT |
| `establecimiento` | `id_establecimiento` | IDENTITY BY DEFAULT |
| `producto_establecimiento` | `(id_producto, id_establecimiento)` | Compuesta (PK combinada) |

---

# 15. Claves foráneas verificadas

Las relaciones de clave foránea confirmadas en Supabase son:

| Tabla origen | Clave foránea | Tabla referenciada | Clave referenciada |
|---|---|---|---|
| `usuario` | `id_rol` | `rol` | `id_rol` |
| `producto` | `id_categoria` | `categoria` | `id_categoria` |
| `producto` | `id_marca` | `marca` | `id_marca` |
| `resena` | `id_usuario` | `usuario` | `id_usuario` |
| `resena` | `id_producto` | `producto` | `id_producto` |
| `valoracion` | `id_usuario` | `usuario` | `id_usuario` |
| `valoracion` | `id_producto` | `producto` | `id_producto` |
| `producto_establecimiento` | `id_producto` | `producto` | `id_producto` |
| `producto_establecimiento` | `id_establecimiento` | `establecimiento` | `id_establecimiento` |

---

# 16. Integridad de los datos

La base de datos debe preservar la integridad relacional de la información en todo momento:

- **Claves primarias:** Identifican unívocamente cada fila con valores generados por el motor (`IDENTITY BY DEFAULT`).
- **Claves foráneas:** Aseguran la integridad referencial impidiendo registros huérfanos.
- **Unicidad:** El correo electrónico del usuario es estrictamente único (`usuario.correo` → `UNIQUE`).
- **Eliminación y relaciones:** Las eliminaciones en entidades de catálogo y comercios se realizan mediante borrado lógico (`estado = false`) para no corromper el histórico de reseñas, valoraciones ni disponibilidad de productos.

### Restricciones ausentes confirmadas en Supabase:
1. **Unicidad en valoraciones:** No existe restricción única sobre `(id_usuario, id_producto)`.
2. **Unicidad en reseñas:** No existe restricción única sobre `(id_usuario, id_producto)`.
3. **Control de rango en valoraciones:** `puntuacion` no tiene restricción `CHECK` a nivel de base de datos.

---

# 17. Reglas de negocio

Se contemplan las siguientes reglas de negocio del sistema:

- **RN-01:** Cada usuario registrado debe tener un rol asignado.
- **RN-02:** El correo electrónico de un usuario no debe repetirse en el sistema (`UNIQUE`).
- **RN-03:** Un producto debe pertenecer obligatoriamente a una categoría.
- **RN-04:** Un producto debe estar asociado obligatoriamente a una marca.
- **RN-05:** Una reseña debe estar asociada a un usuario y a un producto existentes.
- **RN-06:** Una valoración debe estar asociada a un usuario y a un producto existentes.
- **RN-07:** La puntuación de una valoración debe encontrarse dentro de la escala definida por el sistema.
- **RN-08:** Solo los usuarios autorizados (autenticados) pueden registrar reseñas y valoraciones.
- **RN-09:** Las operaciones administrativas deben estar restringidas según el rol del usuario.
- **RN-10:** Un representante de establecimiento solamente debe poder modificar los establecimientos para los cuales tenga autorización asignada (Acuerdo DEC-01).
- **RN-11:** Un producto puede relacionarse con varios establecimientos con precios y disponibilidad independientes.
- **RN-12:** Un establecimiento puede ofrecer varios productos tecnológicos.

---

# 18. Modelo de comparación

La comparación de productos tecnológicos no requiere una tabla persistente de datos denominada `comparacion`. Se realiza dinámicamente mediante consultas sobre los productos seleccionados por el usuario.

### Flujo conceptual de comparación:

```text
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
```

La implementación detallada de la tabla comparativa dependerá de cómo se diseñen las especificaciones técnicas de los productos.

---

# 19. Características técnicas de productos (DEC-04)

Las características técnicas varían ampliamente según la categoría del producto:

- **Celulares:** Pantalla, Memoria RAM, Almacenamiento, Cámara, Batería, Procesador.
- **Computadores / Portátiles:** Procesador, Memoria RAM, Almacenamiento (SSD/HDD), Tarjeta gráfica (GPU), Pantalla.
- **Tablets:** Pantalla, Procesador, Memoria RAM, Almacenamiento, Conectividad (Wi-Fi/LTE).
- **Accesorios:** Tipo, Compatibilidad, Conectividad, Características principales.

Actualmente la tabla `producto` en Supabase no almacena especificaciones técnicas. Para el comparador se contemplan dos alternativas técnicas pendientes de definición por el equipo (ver sección 22).

---

# 20. Consideraciones para PostgreSQL y Supabase

La persistencia de TecnoReview utiliza PostgreSQL administrado mediante Supabase.

Consideraciones técnicas fundamentales:
- **Seguridad:** Las credenciales y claves privadas de la base de datos nunca deben almacenarse en texto plano en el repositorio de GitHub. Se gestionan mediante variables de entorno parametrizadas en `application.properties` y cargadas en local mediante `.env` (a través de `springboot4-dotenv`).
- **Control de esquema:** La base de datos de Supabase ya existe. Hibernate debe configurarse de manera que valide el esquema (`validate`) una vez sincronizado, evitando alteraciones destructivas accidentales.
- **Conectividad:** Las conexiones remotas hacia el pooler de Supabase requieren obligatoriamente `sslmode=require`.

---

# 21. Relación con Spring Boot

Las entidades definidas en este documento corresponden a la capa de persistencia del backend. La arquitectura por capas del sistema sigue la siguiente estructura conceptual:

```text
Base de datos PostgreSQL (Supabase)
          ↓
      Entidades JPA
          ↓
      Repositories (Spring Data JPA)
          ↓
       Services (Lógica de negocio)
          ↓
      Controllers (Endpoints REST)
          ↓
        REST API (JSON)
```

La documentación detallada de estas capas se encuentra en `proyectos/docs/arquitectura.md` y `proyectos/docs/crud-implementado.md`.

---

# 22. Decisiones de negocio y técnicas pendientes de confirmación por el equipo

A diferencia de los acuerdos ya confirmados (como la relación 1:N en DEC-01), los siguientes puntos corresponden a **decisiones que aún deben ser debatidas y aprobadas por el equipo**:

### 1. Obligatoriedad del representante en `establecimiento`:
- Al implementar la columna `id_usuario` en `establecimiento`:
  - *Opción A:* Permitir que sea `NULL` (facilita registrar establecimientos comerciales antes de que su representante cree una cuenta o sea asignado).
  - *Opción B:* Exigir que sea `NOT NULL` (todo establecimiento requiere forzosamente un usuario asignado desde su creación).

### 2. Política de actualización de valoraciones (Edición vs. Rechazo):
- Al intentar registrar una valoración cuando ya existe una previa para el mismo usuario y producto:
  - *Opción A (Recomendada):* Realizar una actualización (*upsert*), modificando la puntuación anterior.
  - *Opción B:* Rechazar la solicitud devolviendo error de conflicto (`409 Conflict`).

### 3. Política de borrado y ciclo de vida de `valoracion`:
- La tabla física `valoracion` no tiene columna `estado`.
  - *Opción A:* Mantener borrado físico (`DELETE`) si el usuario decide retirar su puntuación.
  - *Opción B:* Añadir la columna `estado BOOLEAN DEFAULT true` para permitir desactivación o moderación lógica sin eliminar el registro histórico.

### 4. Alternativa técnica para características de productos (DEC-04):
- Para almacenar las especificaciones técnicas requeridas por el comparador:
  - *Alternativa 1 (Flexible / JSONB):* Agregar una columna `caracteristicas JSONB` en la tabla `producto`, indexada mediante GIN en PostgreSQL y mapeada en Hibernate.
  - *Alternativa 2 (Relacional EAV):* Crear tablas relacionales `caracteristica` y `producto_caracteristica` con claves foráneas tradicionales.

### 5. Escala definitiva de puntuación:
- Definir formalmente si la escala se restringe a valores enteros de 1 a 5 y si se añade una restricción `CHECK (puntuacion BETWEEN 1 AND 5)` en la base de datos.

---

# 23. Control de cambios y estado del documento

- **Versión:** 1.1
- **Estado:** Actualizado según auditoría técnica S1-18 (JPA vs. Supabase)
- **Última revisión:** Octubre 2026
- **Próximos pasos:** Aprobación por el equipo de las decisiones pendientes de la sección 22 antes de generar migraciones DDL.