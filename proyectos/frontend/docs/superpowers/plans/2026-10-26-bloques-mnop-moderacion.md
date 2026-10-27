# Bloques M, N, O y P — Moderación y gestión de reseñas (frontend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar las 5 tareas independientes del sprint 2 — reglas de moderación (TEC-89, TEC-96), aviso preventivo (TEC-98), edición/eliminación de reseñas propias (TEC-75) y reporte de reseñas (TEC-103) — en bloques TDD separados.

**Architecture:** Las reglas de negocio viven en `src/data/resenas.ts` (datos puros + funciones). La UI reutiliza los patrones existentes de `ResenasCliente.tsx` y el patrón de accesibilidad de modales ya usado en `PanelBusquedaModal.tsx` (selectores enfocables, focus trap, Escape, backdrop). Sin backend: los endpoints de MG (TEC-76/77/78) y de reportes aún no existen, así que la UI se construye con estados de error/pendiente controlados y documentados.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind 4 con tokens semánticos (`--color-*`), Vitest 3 + happy-dom + Testing Library.

**Spec:** `docs/tecreview-redesign.md` (se añadirá Bloque M/N/O/P al terminar cada bloque).

## Global Constraints

- 100% frontend: no tocar backend, `.env`, ni base de datos.
- Copia exacta: 409 → `Ya has valorado este producto. Puedes editar tu reseña existente.`; 429 → `Has alcanzado el límite de 5 reseñas por hora. Intenta de nuevo más tarde.`; aviso (TEC-98) → `Tu reseña contiene términos que requieren revisión antes de publicarse.`; confirmación de borrado → `¿Deseas eliminar tu opinión?` con botones `Cancelar` y `Eliminar`.
- `MAX_RESENAS_POR_HORA = 5` (aprobado por el usuario).
- Solo tokens semánticos oficiales; nada de hex nuevos.
- No romper selectores existentes en `ResenasCliente.test.tsx`.
- `contieneLenguajeNoPermitido(texto: string): boolean` conserva su firma; los consumidores actuales no cambian.
- Antes de finalizar cada bloque: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Review Focus

1. **Subcadena engañosa:** hoy `includes("odio")` marcaría "periodismo" si la palabra fuera "odii"? — regla nueva: la coincidencia debe ignorar separadores entre letras de la palabra bloqueda (evasión como `m i e r d a`) pero **no** coincidir dentro de palabras válidas (p. ej. "operación" no contiene "perra" completa). Test: escribir "operación" no dispara el aviso; "m i e r d a" sí.
2. **Usuario sin sesión (TEC-75/103):** sin `usuario`, los botones de editar/eliminar no se renderizan en ninguna reseña y el botón "Reportar" sí se muestra para reseñas de otros. Test en la tarea del Bloque O.
3. **Endpoint inexistente (TEC-75):** al confirmar eliminar/editar, si el backend todavía no expone TEC-76/77/78, la captura muestra un mensaje controlado en el modal y ningún estado queda atascado en "enviando". Test: rechazar la promesa y verificar el mensaje.
4. **Doble envío de reporte (TEC-103):** tras un reporte enviado con éxito, la UI no debe permitir reenviar el mismo reporte; deshabilitar el botón y mostrar ya-no-más-modal. Test en la tarea del Bloque P.
5. **Focus trap en cada modal nuevo:** Tab/Shift+Tab cicla dentro del diálogo y Escape lo cierra, sin escuchar eventos globales cuando está cerrado. Test en O y P.

---

### Task 1 — Bloque M · TEC-89: reglas de tasa y mensajes (datos)

**Files:**
- Modify: `src/data/resenas.ts`
- Test: `src/data/resenas.test.ts` (crear; hoy no existe)

**Interfaces:**
- Produces (lo usan N, O y NM en backend):
  - `export const MAX_RESENAS_POR_HORA = 5;`
  - `export const MENSAJE_RESENA_DUPLICADA = "Ya has valorado este producto. Puedes editar tu reseña existente.";`
  - `export const MENSAJE_LIMITE_RESENAS = "Has alcanzado el límite de 5 reseñas por hora. Intenta de nuevo más tarde.";`
  - `export interface ReglaResenas { maxPorHora: number; mensajes: { duplicada: string; limite: string } }`
  - `export const REGLAS_RESENAS: ReglaResenas` (agrupa las tres constantes para exportarla como contrato).

- [ ] **Step 1:** prueba RED que afirme: `REGLAS_RESENAS.maxPorHora === 5`, el texto del 409 es exactamente el mensaje aprobado, el texto del 429 contiene "5 reseñas por hora" y la frase aprobada, y `REGLAS_RESENAS` usa las mismas referencias (sin copias divergentes).
- [ ] **Step 2:** confirmar RED (`npx vitest run src/data/resenas.test.ts`) con fallo "no exporta REGLAS_RESENAS".
- [ ] **Step 3:** implementar las tres constantes y `REGLAS_RESENAS` con comentario JSDoc: *el backend es la autoridad final del recorrido (NM las necesita para TEC-90/91/92)*.
- [ ] **Step 4:** GREEN dirigido.
- [ ] **Step 5:** commit `feat(resenas): definir reglas de tasa y mensajes de error (TEC-89)`.

### Task 2 — Bloque M · TEC-96: lista oficial de palabras y reglas de coincidencia

**Files:**
- Modify: `src/data/resenas.ts` (lista y `contieneLenguajeNoPermitido`)
- Modify: `src/data/resenas.test.ts` (misma prueba que la Tarea 1)

**Interfaces:**
- Consumes: `normalizarTexto` de `src/data/productoViewModel.ts` (quita tildes, minúsculas).
- Produces: `contieneLenguajeNoPermitido(texto: string): boolean` (mismo contrato), `PALABRAS_NO_PERMITIDAS: readonly string[]` (lista ampliada), `export function obtenerPalabrasDetectadas(texto: string): string[]` (para el aviso del Bloque N, lista vacía cuando es limpio).

- [ ] **Step 1:** pruebas RED:
  - detecta "`est@fa`", "`m i e r d a`", "`ESTU-PIDO`", "`ESTÚPIDO`" (evasión con símbolos/espacios/tildes).
  - **no** detecta "operación" ni "dimecuentas" (sin falsos positivos por inclusión de subcadenas).
- [ ] **Step 2:** confirmar RED (comportamiento actual falla: sin tildes y con subcadenas).
- [ ] **Step 3:** implementar: lista ampliada (incluye hoy más términos ofensivos/de spam; se define como `as const` y comentada como *lista oficial, ajustable)*; `contieneLenguajeNoPermitido` = `obtenerPalabrasDetectadas(texto).length > 0`; en el detector, para cada palabra prohibida, construir regex con los espacios de la palabra reemplazados por separadores no alfanuméricos (`[^a-z0-9]+`) y delimitada por fronteras alfanuméricas, aplicada al texto normalizado.
- [ ] **Step 4:** GREEN dirigido + suite completa (`npm test`) para verificar que `ResenasCliente` seguir bloqueando igual con su mensaje actual.
- [ ] **Step 5:** commit `feat(resenas): consolidar lista de palabras bloqueadas y reglas de coincidencia (TEC-96)`.

### Task 3 — Bloque N · TEC-98: aviso preventivo en el formulario

**Files:**
- Modify: `src/app/resenas/ResenasCliente.tsx` (solo bloques de JSX del formulario cerca de `comentario-resena` y `manejarEnvio` ya usa la función importada)
- Test: `src/app/resenas/ResenasCliente.test.tsx`

**Interfaces:**
- Consumes: `obtenerPalabrasDetectadas` (Tarea 2).
- Produces: aviso preventivo (no bloqueante eliminado: se mantiene el bloqueo actual en submit + mensaje actual; el emitido por el aviso es distinto, solo información).

- [ ] **Step 1:** pruebas RED:
  - al escribir "`esto es estafa`" aparece el aviso en amarillo con texto `Tu reseña contiene términos que requieren revisión antes de publicarse.`, `role="status"`, sin bloquear el envío ni alterar el seguimiento del textarea.
  - al escribir texto limpio el aviso desaparece (`queryByRole estado = null`).
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** implementar: junto al textarea, `<p role="status">` en amarillo (`text-[var(--color-brand-yellow)]` o el token yellow del tema) solo si hay palabras detectadas, con un icono de advertencia `aria-hidden`.
- [ ] **Step 4:** GREEN dirigido.
- [ ] **Step 5:** commit `feat(resenas): mostrar aviso preventivo de revisión en el formulario (TEC-98)`.

### Task 4 — Bloque O · TEC-75: edición y eliminación de reseñas propias

**Files:**
- Create: `src/app/resenas/EditableResena.tsx` (componente interno de acciones + modales de borrar/editar)
- Modify: `src/app/resenas/ResenasCliente.tsx` (render de acciones por reseña cuando `resena.idUsuario === usuario?.idUsuario`)
- Test: `src/app/resenas/EditarResena.test.tsx` (nuevo) + extender `ResenasCliente.test.tsx`

**Interfaces:**
- Consumes: patrón `SELECTOR_ENFOCABLES`/focus trap/Escape de `src/components/busqueda/PanelBusquedaModal.tsx`; `usuario.idUsuario: number` de la sesión; `ResenaResponse`.
- Produces: `EditarResena({ resena, onEditada: (resena) => void, onEliminada: (idResena: number) => void })`; stubs de API en `src/services/api.ts`: `editarResena(idResena: number, comentario: string): Promise<ResenaResponse>` y `eliminarResena(idResena: number): Promise<void>` apuntando a `/api/resenas/{id}` con `apiFetchAutenticado` (PUT y DELETE), documentados como endpoints MG pendientes (TEC-76/77/78).

- [ ] **Step 1:** pruebas RED:
  - `EditableResena`: renderiza `aria-label="Editar"` y `aria-label="Eliminar registro de reseña"` en botones secundarios discretos; abrir confirmación → diálogo con `¿Deseas eliminar tu opinión?` + `Cancelar` (cierra sin efectos) y `Eliminar`.
  - `Editar`: abre texto con el comentario precargado y guardado llama `onEditada` con la respuesta del stub; Esc y backdrop cancelan; foco atrapado; bloqueo de scroll.
  - rechazo: si `eliminarResena` o `editarResena` lanzan, se muestra el mensaje dentro del diálogo (`No fue posible completar la acción. Inténtalo de nuevo más tarde.`) y `enviando` se vuelve a `false`.
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** implementar: crear `EditarResena.tsx` modificando la tarjetita ya existente del listado para agregar fila de acciones con ambos botones; intl con `editarResena`/`eliminarResena` en `api.ts` (didactic con el patrón de `actualizarProducto`/`eliminarProducto`); integrar en `ResenasCliente.tsx` condicionado a sesión.
- [ ] **Step 4:** GREEN dirigido + suite completa.
- [ ] **Step 5:** commit `feat(resenas): agregar acciones de edición y eliminación con confirmación (TEC-75)`.

### Task 5 — Bloque P · TEC-103: botón y modal de reporte

**Files:**
- Create: `src/app/resenas/ReportarResenaModal.tsx`
- Modify: `src/app/resenas/ResenasCliente.tsx` (botón discreto "Reportar" con bandera en reseñas ajenas + abrir modal)
- Test: `src/app/resenas/ReportarResenaModal.test.tsx` (nuevo) + extender `ResenasCliente.test.tsx`

**Interfaces:**
- Consumes: patrón accesibilidad/focus trap de `PanelBusquedaModal`; `ResenaResponse`.
- Produces: `ReportarResenaModal({ resenaId: number, abierto: boolean, onCerrar: () => void, onReportado: (resenaId: number) => void })`; motivos como `const MOTIVOS_REPORTE = ["Spam", "Lenguaje ofensivo", "Falso", "Otro"] as const;` y radios agrupados por `name="motivo-reporte"`.

- [ ] **Step 1:** pruebas RED:
  - botón `aria-label="Reportar reseña"` (bandera) en la tarjeta de una reseña ajena, no en la propia.
  - abrir modal: diálogo con título `Reportar reseña`, radios demandados por motivo + campo justificación para `Otro`, botón `Enviar reporte` y separado `Cancelar`.
  - obligatorio: no enviar sin motivo elegido.
  - al confirmar: llamada simulada resuelta → diálogo se cierra, `onReportado` y la tarjeta muestra estado enviado y el botón se deshabilita con `aria-disabled` y estética/etiqueta `Reporte enviado`.
  - accesibilidad: foco inicial, Tab cíclico, Escape, backdrop, bloqueo de scroll.
- [ ] **Step 2:** confirmar RED.
- [ ] **Step 3:** implementar: `ReportarResenaModal.tsx` con radios + textarea para `Otro`; el envío es **solo de estado local** (no se invoca red): documento en JSDoc y en `docs/tecreview-redesign.md` que la persistencia queda pendiente del backend (sin TEC asignado aún); integrar en `ResenasCliente.tsx` con un `Set<number> de ids ya reportados`.
- [ ] **Step 4:** GREEN dirigido + suite completa.
- [ ] **Step 5:** commit `feat(resenas): agregar reporte accesible de reseñas (TEC-103)`.

### Task 6 — Documentación de los bloques (cierra M, N, O y P)

**Files:**
- Modify: `docs/tecreview-redesign.md`

- [ ] **Step 1:** añadir secciones `8.11 Bloque M — Reglas de moderación (TEC-89 + TEC-96)`, `8.12 Bloque N — Aviso preventivo (TEC-98)`, `8.13 Bloque O — Edición y eliminación (TEC-75)` y `8.14 Bloque P — Reporte de reseñas (TEC-103)` con criterios `-[x]` para localStorage y las decisiones tomadas (puntos que faltan del servidor).
- [ ] **Step 2:** añadir entrada en la verificación con fecha `2026-10-26` y del estado de pruebas.
- [ ] **Step 3:** ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; revisar `git status` y `git diff --check`.
- [ ] **Step 4:** commit final `docs(tecreview): documentar bloques M, N, O y P de moderación de reseñas`.

## Pendiente de backend (no bloquea)

- TEC-76/77/78 (MG): endpoints de listar/editar/eliminar reseñas para que O consuma datos reales.
- Reporte de reseñas: sin TEC asignada aún; persistencia pendiente.
- TEC-90/91/92 (NM): aplican `REGLAS_RESENAS` en el servidor.
