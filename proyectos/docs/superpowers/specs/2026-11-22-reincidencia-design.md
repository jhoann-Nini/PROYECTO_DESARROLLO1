# Reincidencia con restricciones graduales (Caso 6, prioridad media)

**Fecha:** 22 de noviembre de 2026. **Estado:** pendiente de aprobación.

## Para qué

Que quien vuelve a publicar contenido que un moderador ya rechazó reciba
consecuencias crecientes y automáticas, sin cargar a los moderadores con
decisiones repetitivas. La suspensión de la cuenta sigue siendo una decisión
humana. Responde a la pregunta del profesor sobre la dependencia del equipo
humano de moderación.

## Escalones (aprobados)

Faltas contadas en los últimos 90 días:

| Faltas | Restricción | Quién la aplica |
|---|---|---|
| 1 | Aviso en el perfil del autor | Automática |
| 2 | Revisión previa: todas sus reseñas nuevas o editadas quedan en revisión durante 30 días | Automática |
| 3 | No puede publicar, editar ni reportar durante 7 días | Automática |
| 4 o más | La cuenta aparece en una lista para que un administrador decida si la suspende | Administrador (suspensión de la 024) |

## Qué es una falta (aprobado)

- Un evento `RECHAZAR` en `resena_moderacion_auditoria`: un moderador rechazó
  una reseña retenida.
- Un evento `OCULTAR` sin un `RESTAURAR` posterior en la misma reseña: un
  moderador la ocultó y nadie revirtió la decisión.
- Sobre cualquier reseña del autor, **incluidas las que él mismo eliminó**:
  borrar la reseña no borra la falta.
- **No** cuenta el ocultamiento automático por 3 reportes
  (`oculta_por_reportes`): no genera eventos y permitiría castigar a alguien
  con reportes falsos.
- Cada evento cuenta una vez. Si una reseña se rechaza, se edita y se vuelve a
  rechazar, son dos faltas.

## Enfoque elegido: calcular a partir del historial (A)

La restricción no se guarda: se deduce del historial de moderación, que es de
solo inserción, cada vez que hace falta. No puede quedar desincronizada y, si
en el futuro una apelación revierte una falta, el escalón se recalcula solo.

Descartado: **guardar cada restricción en una tabla nueva (B)**. Permitiría
levantarlas a mano, pero exige migración, entidad y triggers, y mantener de
acuerdo dos fuentes. Las apelaciones tendrían que revocar la restricción por
separado.

## Cálculo (decisiones del diseño)

`ReincidenciaService.evaluar(idUsuario)` devuelve las faltas vigentes, la fecha
de la más reciente y el nivel:

- `revisionPreviaHasta` = última falta + 30 días, si hay 2 faltas o más.
- `bloqueoHasta` = última falta + 7 días, si hay 3 faltas o más.
- Los niveles se acumulan: con 3 faltas, cuando termina el bloqueo sigue la
  revisión previa hasta cumplir 30 días.
- **Mi decisión:** los plazos se cuentan desde la **falta más reciente**, no
  desde la que hizo subir de escalón. Así, una falta nueva durante una
  restricción la alarga.
- Una consulta JPQL cuenta los eventos que son falta, uniendo
  `resena_moderacion_auditoria` con `resena` por autor.

## Dónde se aplica

| Acción | Bloqueo | Revisión previa |
|---|---|---|
| Crear o editar una reseña (`POST /api/resenas`, `PUT /api/resenas/{id}` y sus variantes por producto) | `403`: «Tu cuenta no puede publicar ni reportar hasta el {fecha} por reincidencia.» | Queda en `PENDIENTE` aunque el filtro no detecte nada |
| Reportar una reseña o una oferta | `403` con el mismo mensaje | — |
| Eliminar su propia reseña | Permitido | Permitido |

En la cola de revisión, la reseña retenida por revisión previa muestra el
motivo «Revisión previa por reincidencia» (riesgo `MEDIO`), recalculado igual
que los demás motivos.

Las restricciones solo limitan publicar y reportar. Un moderador con faltas
como autor sigue pudiendo moderar.

## Endpoints nuevos

- `GET /api/usuarios/me/reincidencia` (cualquier usuario autenticado):
  `{ faltas, nivel, revisionPreviaHasta, bloqueoHasta, proximaCaducidad }`.
  - `nivel`: `NINGUNO`, `AVISO`, `REVISION_PREVIA` o `BLOQUEO`, el más alto vigente.
  - `proximaCaducidad`: fecha en que deja de contar la falta más antigua.
- `GET /api/admin/usuarios/reincidentes` (solo `Administrador`): cuentas
  **activas** con 4 faltas o más, con id, nombre, correo, faltas y última
  falta. Las cuentas ya suspendidas no aparecen porque ya se decidió sobre
  ellas.

## Interfaz

- **Perfil:** una tarjeta «Estado de tu cuenta» cuando hay al menos una falta,
  con el nivel, hasta cuándo dura y cuándo caduca la falta más antigua. No se
  muestra nada si no hay faltas.
- **Formulario de reseña:** muestra el mensaje del `403` con el manejo de
  errores que ya existe. Con revisión previa activa, el aviso «Tu reseña quedó
  en revisión» ya existe.
- **Panel de administración, Usuarios y roles:** una sección «Cuentas
  reincidentes» con la lista. Cada fila permite seleccionar la cuenta para usar
  el bloque «Estado de la cuenta» que ya existe y suspenderla.

## Base de datos

Sin columnas ni tablas nuevas: las entidades no cambian y `ddl-auto=validate`
no se ve afectado.

**Migración 025, solo un índice**, para contar las faltas por autor sin
recorrer toda la tabla:

```sql
CREATE INDEX IF NOT EXISTS idx_resena_usuario ON public.resena (id_usuario);
INSERT INTO public.schema_version (version, descripcion) VALUES (...)
  ON CONFLICT DO NOTHING;
```

El índice actual `uk_resena_usuario_producto_activa` excluye las reseñas
eliminadas, que también cuentan. El backend funciona sin la 025: se puede
aplicar antes o después de desplegar.

## Fuera de alcance

- Levantar una restricción a mano sin revertir la falta.
- Notificar por correo.
- Apelaciones: siguiente punto del Caso 6. Revertir una falta se diseñará
  allí.

## Lo que haría fracasar esto aunque funcione

- Suspender cuentas automáticamente.
- Contar los ocultamientos automáticos por reportes.
- Que un autor no entienda por qué no puede publicar: el mensaje debe decir
  hasta cuándo.

## Pruebas

- Unitarias del cálculo: cada escalón, la caducidad a los 90 días, un
  `OCULTAR` revertido, una falta en una reseña eliminada y los plazos desde la
  última falta.
- Integración:
  - `403` al publicar, editar y reportar con bloqueo;
  - `PENDIENTE` con revisión previa y su motivo en la cola;
  - la eliminación sigue permitida;
  - `401` y `403` de los endpoints nuevos y la lista de reincidentes.
- Frontend: la tarjeta del perfil en cada nivel y la sección del panel de
  administración.
