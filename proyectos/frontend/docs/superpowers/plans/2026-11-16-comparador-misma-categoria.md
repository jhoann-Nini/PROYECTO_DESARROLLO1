# Comparador de una misma categoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar únicamente la mejora 1 solicitada: comparar hasta cuatro productos de la misma categoría real.

**Architecture:** Mantener `tecreview:comparador` como lista de IDs. Centralizar la validación por `idCategoria` en las funciones de selección y en `useComparador`, usando el catálogo real. El selector reutiliza su consulta actual; el botón de la ficha consulta el catálogo para validar selecciones antiguas sin almacenar categorías potencialmente obsoletas.

**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, Vitest y Testing Library.

**Spec:** Solicitud del usuario en esta ejecución: primer producto fija categoría; aplicar en selector, ficha y selección guardada. Inspección previa: `README.md`, `docs/tecreview-redesign.md`, `../docs/arquitectura.md`, `../docs/manual-usuario.md` y guía instalada de Next.js `use-client.md`.

## Global Constraints

- Respetar la rama actual `adrian`; sin push ni merge.
- No tocar archivos locales ajenos, backend, JPA, configuración sensible ni BD.
- No adelantar mejoras 2–5: filas técnicas, presupuesto, blog o favoritos.
- Conservar persistencia local, máximo de cuatro, orden, duplicados e historial reciente.
- Una selección antigua mixta conserva el primer producto existente con categoría válida y los compatibles; descarta IDs ausentes o sin categoría válida.
- Sin catálogo verificado, no agregar ni depurar lo guardado. Permitir reintentar.
- Al quitar el último producto o vaciar, se libera la categoría.

## Review Focus

- Categorías reales diferentes aunque sus nombres o detecciones visuales coincidan.
- Selección mixta antigua cuyo primer ID ya no existe.
- Cambios de otra pestaña: depurar sin renderizar una comparación mixta.
- Error de catálogo: no perder la selección ni permitir adiciones sin validar.
- Clics rápidos y almacenamiento no disponible: mantener la regla en memoria.

## Tarea 1 — Regla compartida y persistencia

**Archivos:** `src/data/comparador.ts`, `src/data/comparador.test.ts`, `src/hooks/useComparador.ts`, `src/hooks/useComparador.test.tsx`.

**Interfaces:** `ProductoComparable` contiene `idProducto` e `idCategoria`; `validarSeleccionComparador(ids, catalogo): number[]`; `agregarIdComparador(ids, id, catalogo)` devuelve un motivo adicional `categoria-incompatible`. `useComparador(catalogo?)` acepta catálogo nullable y expone categoría activa y estado de validación; sin argumento conserva el uso de solo lectura del perfil.

- [x] Añadir pruebas de categoría real, mezcla guardada, IDs ausentes, categoría inválida, liberación de categoría y sincronización.
- [x] Ejecutar `npm test -- src/data/comparador.test.ts src/hooks/useComparador.test.tsx`; comprobar fallos por falta de la regla.
- [x] Implementar validación compartida y depuración tras hidratación/cambios de catálogo o storage; proteger adiciones antes de validar.
- [x] Repetir las pruebas; resultado esperado: todas verdes.

## Tarea 2 — Selector y ficha

**Archivos:** `src/app/comparador/ComparadorCliente.tsx`, su test, `src/components/detalle/BotonComparador.tsx`, nuevo test del botón y `src/app/productos/[id]/DetalleProductoCliente.test.tsx`.

**Interfaces:** Usar el catálogo real de la tarea 1; filtrar selector por categoría activa antes de recortar resultados. El botón conserva sus props y obtiene el catálogo con `obtenerProductos`; carga/error/reintento independientes de la ficha.

- [x] Añadir pruebas de filtrado, restauración mixta sin columnas incompatibles, cambio de categoría al vaciar, bloqueo desde ficha y error/reintento.
- [x] Ejecutar los tests afectados y comprobar los fallos esperados.
- [x] Integrar la regla y mensajes explicativos en los componentes existentes, sin rediseñar la interfaz.
- [x] Ejecutar los tests afectados; resultado esperado: todos verdes.

## Tarea 3 — Documentación, revisión y cierre

**Archivos:** `docs/tecreview-redesign.md`, `../docs/manual-usuario.md`, este plan.

- [x] Documentar categoría activa, recuperación de selección y ausencia de cambios de BD.
- [x] Ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [x] Revisar `git status`, `git diff`, `git diff --check`; realizar revisión del cambio.
- [x] Preparar un único commit local `feat(comparador): limitar productos a la misma categoria` con solo los archivos de esta mejora.
- [x] Preparar la entrega de resultados y detenerse hasta la revisión del usuario.

## Registro de ejecución

- Plan revisado contra la solicitud. Ejecución inline autorizada por el usuario; se mantiene la rama actual en lugar de crear otro worktree.
- Dependencia entre tareas 1 y 2: el catálogo usa IDs de categoría reales, no `CategoriaDispositivo` inferida del view model.
- Tareas 1 y 2: ciclo RED→GREEN confirmado. Pruebas adicionales de actualización del catálogo detectaron que quitar el primero antes de la reconciliación podía recuperar un producto descartado; `quitar` ahora valida antes de retirar. Regresión confirmada RED→GREEN.
- Primera verificación global: 667 pruebas en 60 archivos, TypeScript y lint correctos; se agregaron después dos casos adicionales del hook.
- Verificación global final: 669 pruebas en 60 archivos; TypeScript, lint y build de producción correctos. `git status` confirma únicamente cambios propios previstos y los archivos locales ajenos ya presentes; `git diff --check` sin errores (avisos de conversión LF/CRLF de Git en Windows).
- Revisión independiente: sin fallos críticos/importantes en la regla. El aviso mostraba una categoría visual inferida; se atendió antes del cierre porque contradice la categoría real aplicada. Dos pruebas reprodujeron el fallo y pasaron después de usar el nombre registrado o el ID como respaldo. No se tocaron las filas técnicas.
- Verificación posterior a revisión: 671 pruebas en 60 archivos, TypeScript, lint y build correctos. Se conservan las decisiones de alcance: filas técnicas y mejoras 2–5 pendientes, perfil de solo lectura y sincronización por eventos sin garantía transaccional de operaciones simultáneas entre pestañas.
