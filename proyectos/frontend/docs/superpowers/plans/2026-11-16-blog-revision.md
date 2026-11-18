# Revisión de blog y guías — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar solo la mejora 4: revisar el blog y sus guías para mejorar claridad y coherencia, comprobar enlaces y alinear las afirmaciones con la funcionalidad real.

**Architecture:** El blog sigue siendo contenido estático en `src/data/blog.ts`. No se crea CMS, endpoint ni persistencia. Se corrigen textos, se tipan las categorías contra `CategoriaSlug`, se añaden enlaces reales a comparador y reseñas, y se amplían las pruebas de contenido y navegación.

**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, Vitest, Testing Library.

**Spec:** Mejora 4 de la solicitud original, autorizada con «haz la que sigue». Lecturas previas: `src/data/blog.ts`, páginas `/blog` y `/blog/[slug]`, `src/lib/categorias.ts`, comparador actual (misma categoría y filas por categoría), `/resenas`, detalle de producto y `docs/tecreview-redesign.md`.

## Global Constraints

- Rama `adrian`, sin push ni merge, sin tocar capturas/carpetas locales ajenas.
- Sin cambios de backend, BD/JPA, arquitectura global ni dependencias.
- No adelantar favoritos (mejora 5).
- El blog no inventa productos, precios, disponibilidad, valoraciones ni métricas.
- Los enlaces deben apuntar a rutas reales: `/blog/[slug]`, `/categorias/[slug]`, `/comparador` y `/resenas`.
- La guía de comparación debe reflejar: máximo cuatro productos, misma categoría, filas técnicas registradas por categoría y «Sin dato» para valores ausentes.
- La guía de batería debe distinguir el valor ausente del comparador de los campos omitidos en la ficha.
- No se agregan autores, CMS, fechas nuevas ni contenido no respaldado por el código.

## Review Focus

- Que cada afirmación sobre el comparador coincida con el comportamiento implementado.
- Que las categorías enlazadas sean slugs navegables reales.
- Que los enlaces del índice y del artículo resuelvan a rutas existentes.
- Que slugs, fechas, secciones y puntos clave sean coherentes y no duplicados.

## Tarea 1 — Contenido y enlaces

**Archivos:** `src/data/blog.ts`; `src/app/blog/page.tsx`; `src/app/blog/[slug]/page.tsx`.

- [x] Corregir «miliamperios (mAh)» por «miliamperios-hora (mAh)».
- [x] Documentar la regla de misma categoría, las filas por categoría y «Sin dato».
- [x] Ajustar la guía de batería para describir «Sin dato» y los campos omitidos.
- [x] Enlazar la sección Reseñas desde el artículo y el comparador desde el índice.

## Tarea 2 — Contratos y pruebas

**Archivos:** `src/data/blog.test.ts`; `src/app/blog/page.test.tsx`.

- [x] Tipar `categoriaSlug` con `CategoriaSlug` y validar con `esSlugCategoria`.
- [x] Probar slugs, fechas, títulos de sección únicos y párrafos no vacíos.
- [x] Probar que la guía de comparación menciona misma categoría, «Sin dato» y cuatro productos.
- [x] Probar enlaces de artículos, categorías, comparador y reseñas.
- [x] Ejecutar pruebas y confirmar fallos esperados antes de implementar.

## Tarea 3 — Documentación y cierre

**Archivos:** `docs/blog-revision.md`, `docs/tecreview-redesign.md`, este plan.

- [x] Documentar alcance, hallazgos, cambios, límites y pruebas.
- [x] Ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [x] Revisión independiente read-only; atender hallazgos pertinentes con RED→GREEN.
- [x] Revisar `git status`, `git diff`, `git diff --check`.
- [x] Preparar commit local Conventional Commits con solo esta mejora y detenerse para revisión del usuario.

## Registro

- Se mantiene la rama autorizada y se ejecuta inline.
- No se toca comparador, presupuesto ni favoritos salvo los textos/enlaces del blog.
- Dependencia con mejoras 1–3: la guía usa la regla de misma categoría, las filas por categoría y el contrato de datos ausentes ya implementados.
- RED→GREEN: las pruebas del blog fallaron primero en misma categoría, «Sin dato», enlaces a comparador/reseñas y marcador de la ficha; después quedaron 17 pruebas selectivas correctas.
- Verificación global: 760 pruebas correctas en 62 archivos; `npx tsc --noEmit`, `npm run lint` y `npm run build` correctos. El build prerenderiza `/blog` y las cuatro rutas de artículo. `git diff --check` sin errores, solo avisos informativos LF/CRLF de Git en Windows.
- Revisión independiente: se corrigió la promesa de un marcador «ausente» en la ficha (ahora se distingue «Sin dato» del comparador y campo omitido en la ficha), se ató el límite a `MAX_COMPARADOR`, se validaron fechas imposibles y se precisó la separación entre promedio de estrellas y texto de reseñas. Sin hallazgos críticos; los menores pertinentes quedaron atendidos.
