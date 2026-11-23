# Lista de palabras de moderación administrable (Caso 6, prioridad media)

**Fecha:** 22 de noviembre de 2026. **Estado:** aprobado e implementado (commits 6fabd2f a 76c7bcd).

## Para qué

Que los administradores agreguen insultos nuevos, términos discriminatorios o
frases de spam sin desplegar código, de modo que el filtro reaccione en
minutos y no en el próximo despliegue. Responde a la limitación documentada
en el corpus («insultos fuera de la lista», «discriminación: requiere
categorías»).

## Decisiones aprobadas

**Enfoque mixto (A):**
- La lista base sigue en el código, en Java y en el formulario, con el corpus
  compartido. El aviso previo del formulario no cambia.
- Los términos agregados se guardan en la base de datos y **solo los revisa
  el backend**. No se exponen al navegador.
- Con un término agregado, el autor no recibe aviso previo: la reseña queda en
  revisión con su motivo.

**Reglas:**

| Tema | Regla |
|---|---|
| Categorías | `AMENAZA` → riesgo `ALTO`. `ACOSO`, `DISCRIMINACION`, `INSULTO` y `SPAM` → riesgo `MEDIO` |
| Término | Palabra o frase de 2 a 60 caracteres |
| Detección | La misma normalización que la lista base: mayúsculas, tildes, NFKC, homoglifos, leet, separadores, letras repetidas y plural simple. Siempre palabra completa |
| Quién | Solo administradores con rol activo agregan y desactivan. Los moderadores ven en la cola el término detectado y su categoría |
| Borrado | No se borra: se desactiva, registrando quién y cuándo. Reactivar es volver a agregarlo |
| Lista base | No se modifica desde el panel. Los términos agregados solo suman |
| Efecto | Aplica a reseñas nuevas o editadas. La cola recalcula los motivos con la lista vigente |

**Enfoque de datos elegido:** una tabla con una fila por término (A).
Descartados una tabla con historial aparte (B) y un registro JSON.

## Base de datos: migración 027 (propuesta)

Estado verificado en Supabase el 22 de noviembre: `termino_moderacion` no
existe y la 026 ya está aplicada.

```sql
CREATE TABLE IF NOT EXISTS public.termino_moderacion (
  id_termino           BIGSERIAL PRIMARY KEY,
  termino              VARCHAR(60) NOT NULL,   -- como lo escribió el administrador
  termino_normalizado  VARCHAR(60) NOT NULL,   -- lo calcula el backend
  categoria            VARCHAR(20) NOT NULL,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  id_creado_por        BIGINT NOT NULL REFERENCES public.usuario (id_usuario),
  fecha_creacion       TIMESTAMP NOT NULL DEFAULT now(),
  id_desactivado_por   BIGINT NULL REFERENCES public.usuario (id_usuario),
  fecha_desactivacion  TIMESTAMP NULL,
  CONSTRAINT chk_termino_moderacion_categoria
    CHECK (categoria IN ('AMENAZA', 'ACOSO', 'DISCRIMINACION', 'INSULTO', 'SPAM')),
  CONSTRAINT chk_termino_moderacion_longitud
    CHECK (char_length(btrim(termino)) BETWEEN 2 AND 60
           AND char_length(btrim(termino_normalizado)) BETWEEN 2 AND 60),
  CONSTRAINT chk_termino_moderacion_desactivacion CHECK (
    (activo AND id_desactivado_por IS NULL AND fecha_desactivacion IS NULL)
    OR (NOT activo AND id_desactivado_por IS NOT NULL AND fecha_desactivacion IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_termino_moderacion_activo
  ON public.termino_moderacion (termino_normalizado) WHERE activo;
```

**Triggers.** Funciones con `SET search_path = pg_catalog` y sin permisos
para `anon` ni `authenticated`.

- **`BEFORE INSERT`:**
  - se crea activo;
  - quien lo crea es un administrador con rol activo (`fn_usuario_tiene_rol_activo`);
  - `fecha_creacion = now()`.
- **`BEFORE UPDATE`:**
  - solo se permite pasar `activo` de verdadero a falso, rellenando una vez
    `id_desactivado_por` (administrador activo) y `fecha_desactivacion`;
  - las demás columnas no cambian;
  - un término inactivo ya no se modifica.
- **`BEFORE DELETE` y `TRUNCATE`:** prohibidos.

**Entidad JPA nueva:** `TerminoModeracion` con el enum
`CategoriaTerminoModeracion`. Las entidades existentes no cambian. **La 027
debe aplicarse en Supabase antes de desplegar este backend**
(`ddl-auto=validate`).

## Detección (decisiones del diseño)

- **Normalización del término:** al guardarlo, el backend aplica
  `ResenaModerationService.normalizar`, convierte los separadores en espacios
  y colapsa las letras repetidas.
  - Se rechaza (`400`) si queda con menos de 2 caracteres o sin letras.
  - Se rechaza (`409`) si ya está activo o si ya está en la lista base, con
    el mensaje «Ese término ya está en la lista base del filtro.»
- **Patrones:**
  - una palabra usa el mismo patrón que los insultos base: separadores entre
    letras, plural con `s` o `es` y límite de palabra;
  - una frase usa el patrón de las amenazas: palabras completas con cualquier
    separador entre ellas;
  - los dos se comparan con las cuatro variantes del texto (normalizado, con
    leet y cada uno con letras colapsadas).
- **Resultado:**
  - `AMENAZA` sube el riesgo a `ALTO`; las demás categorías, a `MEDIO`;
  - motivo, uno por término detectado, con el término tal como lo escribió el
    administrador (aprobado): `Contiene «imbécil», de la lista de moderación (Insulto)`.
    El motivo solo lo ven los moderadores; el navegador del autor no lo recibe.
- **Memoria:**
  - un componente `TerminosModeracionCache` guarda los patrones de los
    términos activos;
  - se recarga **después del commit** de cada alta o desactivación, y de forma
    perezosa si la carga tiene más de 5 minutos, por si hubiera varias
    instancias;
  - si la consulta falla, conserva la última carga y registra el error: el
    filtro base sigue funcionando.
- **`ResenaModerationService`** recibe la caché por constructor. Conserva un
  constructor sin argumentos, sin términos agregados, para las pruebas
  unitarias y el corpus. **El corpus compartido no cambia.**

## Endpoints

Todos bajo `/api/admin/terminos-moderacion`, solo para `Administrador`.

| Ruta | Qué hace |
|---|---|
| `GET ?estado=ACTIVOS\|INACTIVOS\|TODOS` (por defecto `ACTIVOS`) | Lista con término, categoría, quién lo creó y cuándo, y quién lo desactivó y cuándo |
| `POST` `{ termino, categoria }` | `201`. Errores: `400` término inválido o categoría desconocida; `409` duplicado activo o ya está en la lista base |
| `PUT /{id}/desactivar` | `200`. Errores: `404`; `409` si ya está inactivo |

## Interfaz

Pestaña «Palabras de moderación» en el panel de administración:
- formulario con el término y la categoría;
- lista de términos activos con «Desactivar» (pide confirmación);
- filtro para ver los inactivos y su historial;
- texto de ayuda: «Estas palabras solo las revisa el servidor: el autor no
  recibe aviso previo y su reseña queda en revisión.»

## Fuera de alcance

- Editar o quitar términos de la lista base.
- Importar listas masivas.
- Términos que publiquen con aviso (riesgo `BAJO`).

## Lo que haría fracasar esto aunque funcione

- Exponer la lista agregada al navegador.
- Un término que dispare falsos positivos dentro de otras palabras.
- Que un fallo de la base de datos deje sin filtro las reseñas.

## Pruebas

- **Script SQL `docs/sql/tests/027_verificacion_terminos.sql`:** alta por
  administrador, rechazo de un no administrador, duplicado activo, reactivar
  tras desactivar, modificación, desactivar dos veces, borrado y permisos.
- **Unitarias de detección:**
  - palabra con tildes y leet («1mb3cil»), plural, letras repetidas y
    separadores;
  - frase con separadores;
  - límite de palabra («imbécil» no marca «imbecilidad»);
  - `AMENAZA` da `ALTO`;
  - sin términos agregados, el corpus se clasifica igual.
- **Integración:**
  - endpoints con `401` y `403`, `400`, `409` y desactivación;
  - una reseña con un término agregado queda `PENDIENTE` con su motivo;
  - después de desactivarlo, una reseña nueva se publica;
  - la cola muestra la categoría.
- **Contra PostgreSQL local:** la suite de integración nueva.
- **Frontend:** la pestaña con alta, errores y desactivación.
