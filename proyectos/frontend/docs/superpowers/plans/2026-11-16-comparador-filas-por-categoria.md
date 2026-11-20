# Filas técnicas por categoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar solo la mejora 2: filas técnicas pertinentes a la categoría, con datos registrados y sin valores inventados.

**Architecture:** Mantener la selección homogénea de la mejora 1. Normalizar las características del catálogo real en un módulo específico del comparador, sin ampliar ni cambiar el view model compartido por catálogo/favoritos/home. Construir la unión de filas con datos y usar esas mismas filas en el conteo informativo de especificaciones.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library.

**Spec:** Mejora 2 de la solicitud original y autorización «pasa a la siguiente tarea». Análisis previo de `docs/comparador-misma-categoria.md`, `README.md`, manual técnico, formulario de administración, `fichaTecnica.ts`, `specsHelper.ts`, categorías navegables y guía instalada Next.js `use-client.md`.

## Global Constraints

- Mantener rama `adrian`, sin push ni merge; archivos ajenos intactos.
- No modificar backend, entidades JPA, BD, configuración ni dependencias.
- No trabajar en mejoras 3–5 ni rediseñar la interfaz.
- Usar nombre de categoría resuelto desde API y `obtenerSlugDeCategoria`; no IDs fijos, nombres comerciales de productos ni fallback a móviles.
- Conservar filas generales y función «Solo diferencias».
- Una fila técnica aparece si al menos un producto tiene un valor registrado. La ausencia en los demás se representa como `null`/«Sin dato».
- Reconocer campos actuales del administrador y alias existentes. Mostrar campos técnicos personalizados válidos con su etiqueta, sin serializar objetos ni metadatos.
- En auriculares excluir campos de pantalla, procesador, memoria, almacenamiento y cámaras; en portátiles excluir cámaras de móvil, manteniendo webcam si está registrada.
- Leer campos planos, secciones explícitas y `metricasComparables` marcadas `comparable: true`. Prioridad para una misma característica: métrica comparable, sección, campo plano.
- No asumir unidades, convertir mediciones ni generar puntuaciones. Conservar `0` y `false` como datos.
- Usar claves técnicas prefijadas para no colisionar con precio, marca o categoría.

## Review Focus

- IDs de categoría no convencionales y categorías desconocidas sin inferir móviles.
- Audio con datos reales y campos ajenos residuales: no mostrar pantalla, cámaras o RAM.
- Booleanos falsos, cero, texto vacío, datos no finitos y objetos anidados.
- Secciones y métricas: aliases, precedencia, exclusión de metadatos/no comparables.
- Quitar/agregar productos y «Solo diferencias»: valores alineados y sugerencia basada en las filas vigentes.

## Tarea 1 — Filas técnicas desde datos reales

**Archivos:** nuevo `src/data/especificacionesComparador.ts` y test; `src/data/comparador.ts` y test.

**Interfaces:** `obtenerEspecificacionesComparador(producto: Producto): EspecificacionComparador[]` devuelve `{ clave, etiqueta, valor }`. `construirFilasComparacion(productos: ProductoViewModel[], catalogo: readonly Producto[]): FilaComparacion[]` alinea datos por ID y usa claves `tecnica:<clave>`.

- [x] Escribir pruebas de audio, otras categorías, alias, vacíos, formatos existentes y categorías desconocidas.
- [x] Ejecutar pruebas y observar fallos por ausencia de la adaptación.
- [x] Implementar normalización segura y unión de filas; conservar diferencias textuales y filas generales.
- [x] Repetir las pruebas hasta verde.

## Tarea 2 — Integración y conteo consistente

**Archivos:** `src/app/comparador/ComparadorCliente.tsx`, su test, `src/data/comparador.ts` y test.

**Interfaces:** la vista pasa el catálogo ya cargado a `construirFilasComparacion`. `generarRecomendacion(productos, filas)` conserva disponibilidad/precio como criterios y cuenta únicamente valores técnicos de las filas mostrables, sin denominador fijo de seis.

- [x] Escribir pruebas de audio en tabla, «Sin dato», «Solo diferencias», ausencia de datos, cambio de selección y conteo de recomendación.
- [x] Ejecutar los tests afectados y verificar fallos esperados.
- [x] Integrar las filas y el conteo sin modificar persistencia ni otras páginas.
- [x] Ejecutar tests afectados; resultado esperado: todos correctos.

## Tarea 3 — Documentar y verificar

**Archivos:** `docs/comparador-filas-por-categoria.md`, `docs/tecreview-redesign.md`, `../docs/manual-usuario.md`; enlace desde la documentación de mejora 1.

- [x] Documentar reglas, formatos, valores ausentes, categorías y límites.
- [x] Ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [x] Solicitar revisión independiente de solo lectura y atender hallazgos pertinentes con RED→GREEN.
- [x] Revisar `git status`, `git diff`, `git diff --check`.
- [x] Preparar un commit local Conventional Commits con solo esta mejora; detenerse para revisión.

## Registro

- Se ejecuta inline en la rama autorizada. Los archivos locales no rastreados de capturas, `.playwright-mcp` y `.superpowers` pertenecen al usuario y no se modifican.
- Dependencia tareas 1→2: ambas consumen el catálogo real ya enriquecido con nombres; ninguna requiere modificar tipos ni normalización del catálogo compartido.
- Tareas 1 y 2: RED→GREEN confirmado, 55 pruebas correctas en 3 archivos. TypeScript y lint correctos antes del cierre global.
- La función de unión de filas técnicas vive junto al normalizador para compartir claves, etiquetas y orden; el comparador solo añade las filas generales y calcula diferencias.
- Verificación global: 688 pruebas correctas en 61 archivos, sin advertencias/errores en el log; TypeScript, lint y build de producción correctos. `git status` conserva los archivos ajenos y `git diff --check` no detecta errores (Git avisa de conversión LF/CRLF en Windows).
- Revisión independiente: dos hallazgos importantes, ambos atendidos en una pasada RED→GREEN. Los alias heredados `memoria` y «CHIPSET & ARQUITECTURA» se reconocen para excluir RAM/CPU de audio; los puertos físicos también se permiten en auriculares. Regresiones de filas y sugerencia: 58 pruebas selectivas correctas.
- Decisiones de alcance mantenidas: las etiquetas visuales del view model global y los formatos simulados `detalleSpecs` no se modifican; la tabla consume el contrato real `Producto.caracteristicas`.
- Cierre posterior a revisión: 691 pruebas correctas en 61 archivos, TypeScript, lint y build correctos. Sin prueba manual contra backend real ni pruebas de backend (sin cambios en ese módulo).
