# Presupuesto hacia catálogo general — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar solo la mejora 3: confirmar presupuesto en home abre el catálogo general con precio máximo inclusivo en COP, sin alterar destacados.

**Architecture:** Navegar a `/productos?precioMax=<entero COP>`. El catálogo lee el parámetro dentro de una frontera Suspense, inicializa su filtro de precio y mantiene las búsquedas/filtros locales existentes. Un cambio de presupuesto en URL inicia una selección de filtros nueva mediante una clave de React, sin efectos de sincronización tardíos. Se retira la conexión de presupuesto con destacados/rankings/ofertas de la home, manteniendo su búsqueda.

**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, Vitest, Testing Library.

**Spec:** Mejora 3 de la solicitud original, autorizada con «haz el siguiente». Lecturas previas: `docs/tecreview-redesign.md` (bloque I histórico), manual de usuario, contrato COP de `precios.ts`, home y filtros del catálogo, guías instaladas Next.js `use-search-params.md` y `page.md`.

## Global Constraints

- Rama `adrian`, sin push ni merge, sin tocar capturas/carpetas locales ajenas.
- Sin cambios de backend, BD/JPA, arquitectura global ni dependencias.
- No adelantar revisión de blog/guías ni favoritos (mejoras 4–5).
- Parámetro `precioMax`: entero positivo en COP menor que `Number.MAX_SAFE_INTEGER` (sentinela existente de sin límite); ausente, inválido o repetido significa sin límite.
- El presupuesto no se convierte a otra moneda ni se restringe a la categoría, marca o búsqueda de la home.
- Reutilizar `filtrarProductos`: incluye precio igual al límite y excluye precios no positivos/desconocidos con filtro activo.
- Confirmar desde botón o al terminar ajuste con puntero/touch/teclas de ajuste/Enter; no navegar mientras se arrastra ni por Tab.
- Un mismo valor confirmado no dispara duplicados pointer/mouse/touch; el botón permite confirmación explícita.
- Destacados conserva selección habitual de hasta seis (salvo búsqueda activa), ranking y navegación a fichas, independiente del presupuesto.
- El URL aporta el filtro inicial; los cambios manuales de filtros del catálogo siguen siendo locales, como el resto de sus filtros. Recargar el enlace vuelve a aplicar su presupuesto inicial.

## Review Focus

- Límite exacto y productos de distintas categorías; precios ausentes, cero e inválidos.
- Confirmación con valor actual del control, sin cierre obsoleto de React ni duplicados de eventos.
- Acceso directo/recarga y navegación a otro presupuesto sin conservar filtros previos.
- Parámetro malformado, repetido, no finito, negativo o fuera del rango seguro.
- Destacados invariable ante mover/confirmar presupuesto; búsqueda conservada y Tab sin navegar.

## Tarea 1 — Contrato URL y catálogo

**Archivos:** nuevo `src/data/presupuesto.ts` y test; `src/components/catalogo/CatalogoCliente.tsx` y test; `src/app/productos/page.tsx`; mock de navegación en test de foco. Por revisión: `FilterSidebar.tsx`, `filtros.test.tsx`, `src/data/catalogo.ts` y su test para conservar el máximo al salir sin editar y reconocer límites finitos activos.

**Interfaces:** `normalizarPresupuestoCOP(valor: unknown): number | null`, `rutaCatalogoPresupuesto(valor: number): string`. El wrapper del catálogo lee un único `precioMax`, y su contenido recibe el máximo inicial normalizado.

- [x] Escribir pruebas de validación, categorías múltiples, igualdad, sin precio, quitar/limpiar presupuesto, cambio de URL y vacío.
- [x] Ejecutar tests y comprobar fallos esperados.
- [x] Integrar el parámetro con Suspense y el filtro existente, sin depender de categorías/marcas disponibles.
- [x] Repetir tests afectados hasta verde.

## Tarea 2 — Confirmación e independencia de destacados

**Archivos:** `src/components/home/PresupuestoHome.tsx`, `DestacadosHome.tsx`, `RankingsHome.tsx` (solo retirar la instrucción obsoleta de desactivar presupuesto), `home.test.tsx`, `src/app/page.tsx`, `src/app/page.test.tsx`.

**Interfaces:** `PresupuestoHome` recibe `onConfirmarPresupuesto(valorCOP)`. Home navega usando `rutaCatalogoPresupuesto`; destacados ya no recibe props de presupuesto.

- [x] Escribir/actualizar pruebas de botón, finalización, eventos duplicados, teclado y destacados invariantes.
- [x] Ejecutar tests y confirmar el comportamiento previo incorrecto.
- [x] Navegar al catálogo, desacoplar destacados y retirar únicamente el filtro local de presupuesto sustituido por esta mejora.
- [x] Repetir tests afectados hasta verde.

## Tarea 3 — Documentación y cierre

**Archivos:** `docs/presupuesto-catalogo-general.md`, `docs/tecreview-redesign.md`, `README.md`, `../docs/manual-usuario.md`, este plan.

- [x] Documentar contrato URL, COP, confirmación, independencia y filtros locales.
- [x] Ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [x] Revisión independiente read-only; atender hallazgos pertinentes con RED→GREEN.
- [x] Revisar `git status`, `git diff`, `git diff --check`.
- [x] Preparar commit local Conventional Commits con solo esta mejora y detenerse para revisión del usuario.

## Registro

- Se mantiene la rama autorizada y se ejecuta inline. No se repiten las mejoras 1–2.
- La frontera Suspense mantiene la ruta compatible con prerenderizado y evita consultar `window.location` durante hidratación.
- Dependencia 1→2: ambos usan el mismo entero COP y nombre de parámetro. No hay filtros de categoría en el enlace que genera la home.
- Tareas 1–2 RED→GREEN: 143 pruebas selectivas correctas; TypeScript y lint correctos. El contador se alinea con el catálogo general (no añade disponibilidad); un nuevo cambio del control libera la deduplicación para permitir confirmar otra vez el mismo importe.
- Verificación global: 744 pruebas correctas en 62 archivos; TypeScript, lint y build correctos. La ruta `/productos` sigue prerenderizada. Log sin errores/advertencias, `git diff --check` sin errores salvo avisos informativos LF/CRLF de Git en Windows. Archivos ajenos intactos.
- Revisión independiente: corregidos en una pasada RED→GREEN el blur sin edición que ampliaba/eliminaba presupuestos y la limpieza lateral deshabilitada por comparar el máximo con el rango del catálogo. Se trata también el segundo hallazgo como pertinente al contrato del presupuesto: un máximo finito sigue siendo activo aunque no excluya ningún precio conocido. 78 pruebas selectivas correctas.
- Cierre posterior a revisión: 750 pruebas correctas en 62 archivos; TypeScript, lint y build correctos. Se usa el precio de referencia COP que ya filtraba el catálogo. Se conserva la decisión documentada de URL como presupuesto inicial y filtros posteriores locales; las mejoras 4–5 siguen pendientes.
