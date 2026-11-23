# Apelaciones de decisiones de moderación (Caso 6, prioridad media)

**Fecha:** 22 de noviembre de 2026. **Estado:** pendiente de aprobación.

## Para qué

Que el autor pueda impugnar un rechazo o un ocultamiento que considere
injusto, y que otra persona lo revise. Es el contrapeso de la reincidencia:
una falta equivocada no debe acumularse hacia el bloqueo.

## Reglas (aprobadas)

| Tema | Regla |
|---|---|
| Qué se apela | Un `RECHAZAR` o un `OCULTAR` sobre una reseña propia que no se haya eliminado |
| Plazo | 15 días desde la decisión. Una sola apelación por decisión |
| Autor | Escribe por qué cree que la decisión fue un error (obligatorio, máximo 1000 caracteres) |
| Quién decide | Un moderador o administrador activo, que no sea el moderador de la decisión original ni el autor |
| Aceptada | La reseña se publica o se restaura, la falta deja de contar y el autor ve la respuesta |
| Rechazada | La decisión queda firme. Respuesta obligatoria |
| Mientras está pendiente | Las restricciones por reincidencia siguen vigentes |
| Interfaz | El autor apela desde su perfil y ve allí el estado. Los moderadores tienen la pestaña «Apelaciones» y su número en el contador |

## Enfoque elegido: una tabla con una fila por apelación (A)

Descartados:
- **Tabla de eventos de solo inserción:** complica todas las consultas para
  una sola transición.
- **Registrarlas en `resena_moderacion_auditoria`:** obligaría a debilitar
  sus triggers, que exigen que el actor sea un moderador.

## Base de datos: migración 026 (propuesta)

Estado actual verificado en Supabase el 22 de noviembre: `apelacion` no
existe, la última versión es la 025 y `resena_moderacion_auditoria` coincide
con las migraciones.

```sql
CREATE TABLE IF NOT EXISTS public.apelacion (
  id_apelacion     BIGSERIAL PRIMARY KEY,
  id_auditoria     BIGINT NOT NULL,          -- decisión apelada
  id_autor         BIGINT NOT NULL,
  motivo           TEXT NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_solicitud  TIMESTAMP NOT NULL DEFAULT now(),
  id_moderador     BIGINT,                   -- quien resuelve
  respuesta        TEXT,
  fecha_resolucion TIMESTAMP,
  CONSTRAINT uk_apelacion_auditoria UNIQUE (id_auditoria),
  CONSTRAINT fk_apelacion_auditoria FOREIGN KEY (id_auditoria)
    REFERENCES public.resena_moderacion_auditoria (id_auditoria),
  CONSTRAINT fk_apelacion_autor FOREIGN KEY (id_autor) REFERENCES public.usuario (id_usuario),
  CONSTRAINT fk_apelacion_moderador FOREIGN KEY (id_moderador) REFERENCES public.usuario (id_usuario),
  CONSTRAINT chk_apelacion_estado CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
  CONSTRAINT chk_apelacion_motivo CHECK (btrim(motivo) <> '' AND char_length(motivo) <= 1000),
  CONSTRAINT chk_apelacion_resolucion CHECK (
    (estado = 'PENDIENTE' AND id_moderador IS NULL AND respuesta IS NULL AND fecha_resolucion IS NULL)
    OR (estado <> 'PENDIENTE' AND id_moderador IS NOT NULL AND fecha_resolucion IS NOT NULL
        AND btrim(respuesta) <> '' AND char_length(respuesta) <= 1000))
);
CREATE INDEX IF NOT EXISTS idx_apelacion_estado_fecha ON public.apelacion (estado, fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_apelacion_autor ON public.apelacion (id_autor);
```

**Triggers.** Todas las funciones con `SET search_path = pg_catalog` (criterio
de la 019) y sin permisos para `anon` ni `authenticated` (criterio de la 023).

- **`BEFORE INSERT`:**
  - la decisión es `RECHAZAR` u `OCULTAR`;
  - `id_autor` es el autor de la reseña;
  - la reseña no está eliminada (`estado = true`);
  - `fecha_solicitud` no supera la fecha de la decisión más 15 días;
  - el estado inicial es `PENDIENTE`.
- **`BEFORE UPDATE`:**
  - solo se resuelve desde `PENDIENTE`;
  - `id_auditoria`, `id_autor`, `motivo` y `fecha_solicitud` no cambian;
  - quien resuelve tiene rol activo de moderador o administrador
    (`fn_usuario_tiene_rol_activo`) y no es el autor ni el moderador de la
    decisión original.
- **`BEFORE DELETE` y `TRUNCATE`:** prohibidos.

**Respuesta al aceptar:** la base de datos exige una respuesta no vacía
siempre. Si al aceptar el moderador no escribe nada, el backend usa
«Apelación aceptada: la decisión se revirtió.».

**Entidad JPA nueva:** `Apelacion` con el enum `EstadoApelacion`. Las
entidades existentes no cambian. Con `ddl-auto=validate`, **la 026 debe
aplicarse en Supabase antes de desplegar este backend.**

## Qué pasa al aceptar (decisiones del diseño)

Todo ocurre en una sola transacción. Se marca la apelación como `ACEPTADA` y:

- **Si se apeló un `RECHAZAR` y la reseña sigue `RECHAZADA`:** pasa a
  `PENDIENTE`, se registra `APROBAR` con el moderador que resuelve y el motivo
  «Apelación aceptada», y pasa a `PUBLICADA`. Los triggers de la 020 ya
  permiten exactamente ese camino.
- **Si se apeló un `OCULTAR` y la reseña sigue oculta por moderación:** se
  registra `RESTAURAR` y se quita el ocultamiento, igual que el flujo de
  restauración que ya existe.
- **Mi decisión: si la reseña cambió desde la decisión**, la apelación
  aceptada **anula la falta igual**, pero no publica nada. Por ejemplo, si el
  autor la editó y volvió a revisión, sigue su curso normal en la cola. Así
  nadie publica un texto que ningún moderador revisó.

**Reincidencia:** la consulta de faltas excluye las decisiones que tienen una
apelación `ACEPTADA`. Afecta a los dos tipos de decisión, aunque la reseña no
se haya podido publicar o restaurar.

## Cuándo se puede apelar (decisiones del diseño)

- **Mi decisión:** un `RECHAZAR` se puede apelar aunque el autor haya editado
  la reseña después, para impugnar la falta. Un `OCULTAR` que ya se restauró
  devuelve `409`: la falta ya no cuenta.
- **Mi decisión:** se apela la **decisión más reciente** de tipo `RECHAZAR` u
  `OCULTAR` de la reseña. El autor solo indica la reseña.
- **Mi decisión:** un usuario **bloqueado por reincidencia sí puede apelar**.
  El bloqueo limita publicar y reportar, y si no pudiera apelar no tendría
  forma de impugnar justo las faltas que lo bloquearon. Una cuenta
  **suspendida** no puede apelar, como en el resto de la API.

## Endpoints

| Ruta | Quién | Qué hace |
|---|---|---|
| `POST /api/apelaciones` `{ idResena, motivo }` | Autor autenticado y activo | Crea la apelación. Errores: `400` motivo vacío o largo; `403` reseña ajena; `404` reseña inexistente o eliminada; `409` sin decisión apelable, ya apelada, fuera de plazo u ocultamiento ya restaurado |
| `GET /api/apelaciones/mias` | Autor | Sus decisiones de los últimos 90 días, con producto, texto revisado, tipo, motivo y fecha de la decisión, hasta cuándo puede apelar y su apelación si la hay (estado, motivo, respuesta y fecha) |
| `GET /api/moderacion/apelaciones?estado=` | Moderador o administrador | Cola, por defecto `PENDIENTE` y de la más antigua a la más reciente: texto revisado, tipo y motivo de la decisión, moderador original, motivo del autor. Marca `puedeResolver = false` si quien consulta tomó la decisión original o es el autor |
| `PUT /api/moderacion/apelaciones/{id}/aceptar` `{ respuesta? }` | Moderador o administrador, sin conflicto | `403` por conflicto de interés; `409` si ya está resuelta |
| `PUT /api/moderacion/apelaciones/{id}/rechazar` `{ respuesta }` | Moderador o administrador, sin conflicto | `400` sin respuesta |

El contador (`GET /api/moderacion/pendientes/resumen`) agrega `apelaciones`,
las pendientes, y las suma al total.

## Interfaz

- **Perfil, sección «Decisiones de moderación»:** una fila por decisión
  reciente con lo que se revisó y el motivo.
  - Dentro de plazo y sin apelar: botón «Apelar», que abre un formulario con
    el motivo y avisa hasta cuándo puede apelar.
  - Con apelación: «En revisión», «Aceptada» o «Rechazada», con la respuesta.
  - Sin decisiones, la sección no aparece.
- **Panel de moderación, pestaña «Apelaciones» con contador:** cada tarjeta
  muestra la decisión original y el motivo del autor, con «Aceptar» (respuesta
  opcional) y «Rechazar» (respuesta obligatoria). Si quien consulta tomó la
  decisión original, los botones aparecen deshabilitados con el aviso «Tú
  tomaste la decisión original; debe resolverla otra persona».

## Fuera de alcance

- Apelar una apelación rechazada.
- Notificar por correo.
- Apelar decisiones sobre reportes de ofertas.

## Lo que haría fracasar esto aunque funcione

- Que el mismo moderador revise su propia decisión.
- Que una apelación aceptada publique un texto que nadie revisó.
- Que la falta siga contando después de aceptarse la apelación.

## Pruebas

- **PostgreSQL** (Testcontainers, patrón `ReporteResenaPostgresIntegrationTest`):
  - los triggers rechazan una segunda apelación, una fuera de plazo, una
    resolución del moderador original y modificar o borrar una apelación
    resuelta;
  - aceptar un `RECHAZAR` pasa por `PENDIENTE` y `APROBAR` sin violar los
    triggers de la 020.
- **Integración en H2:**
  - cada error de los endpoints;
  - aceptar publica o restaura y anula la falta;
  - aceptar con la reseña editada no publica;
  - rechazar deja la falta;
  - un usuario bloqueado puede apelar;
  - el contador incluye las apelaciones.
- **Frontend:** la sección del perfil en cada estado, el formulario, y la
  pestaña con el conflicto de interés.
