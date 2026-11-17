# Revisión de favoritos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la mejora 5 con sesión obligatoria: solo las cuentas autenticadas pueden agregar, consultar o quitar favoritos; los visitantes deben iniciar sesión y no se guardan favoritos anónimos. Evaluar la persistencia entre dispositivos sin modificar backend, JPA ni base de datos sin aprobación.

**Architecture:** `useFavoritos` comprueba la sesión de Supabase con `getSession()` y `onAuthStateChange`. Sin sesión no hidrata ni escribe. Con sesión, persiste en `localStorage` con una clave por cuenta (`tecreview:favoritos:<idSesion>`) y elimina la clave anónima heredada `tecreview:favoritos`. `BotonFavorito` abre `AuthModal` sin sesión y `/favoritos` exige `useSesionTecReview`. La sincronización entre dispositivos se documenta como propuesta sujeta a aprobación; no se crean tablas, entidades, repositorios, servicios ni endpoints.

**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, Vitest, Testing Library.

**Spec:** Mejora 5 corregida por el usuario: «solo las personas con sesión iniciada pueden agregar, consultar o quitar productos de favoritos… no deben guardarse favoritos anónimos en el navegador». Lecturas previas: `src/data/favoritos.ts`, `src/hooks/useFavoritos.ts`, `src/app/favoritos/FavoritosCliente.tsx`, `src/components/favoritos/BotonFavorito.tsx`, `AuthModal`, `useSesionTecReview`, pruebas de favoritos, `docs/tecreview-redesign.md`, entidades JPA y configuración del backend.

## Global Constraints

- Rama `adrian`, sin push ni merge, sin tocar capturas/carpetas locales ajenas.
- Sin cambios de backend, BD/JPA, arquitectura global ni dependencias en esta ejecución.
- Ningún cambio de base de datos o JPA se implementa sin aprobación explícita del usuario.
- Solo una sesión activa puede agregar, consultar o quitar favoritos.
- Sin sesión no se hidratan ni se escriben favoritos; la clave anónima histórica se elimina.
- El límite de 100 se mantiene y debe comunicarse cuando se alcanza.
- No se inventan productos, disponibilidad, precios ni sincronización inexistente.
- La evaluación entre dispositivos debe describir el estado real y una propuesta concreta, no una funcionalidad ya implementada.

## Tarea 1 — Retroalimentación del botón de favoritos

**Archivos:** `src/components/favoritos/BotonFavorito.tsx`; `src/components/favoritos/BotonFavorito.test.tsx`.

- [x] Escribir pruebas de guardar y quitar con sesión, persistencia por cuenta, `aria-pressed` y aviso accesible.
- [x] Escribir prueba de límite alcanzado: no se altera la lista y se anuncia el máximo.
- [x] Ejecutar pruebas y confirmar fallos esperados.
- [x] Implementar el estado de aviso y la etiqueta de lista llena.
- [x] Repetir pruebas hasta verde.

## Tarea 2 — Sesión obligatoria en datos y hook

**Archivos:** `src/data/favoritos.ts`; `src/data/favoritos.test.ts`; `src/hooks/useFavoritos.ts`; `src/hooks/useFavoritos.test.tsx`.

- [x] Escribir pruebas de clave por cuenta, lectura/escritura explícita y eliminación de la clave anónima.
- [x] Escribir pruebas de `sin-sesion`, cierre de sesión y aislamiento entre cuentas.
- [x] Confirmar fallo esperado.
- [x] Implementar `claveFavoritos`, `eliminarFavoritosLegados` y el motivo `sin-sesion`.
- [x] Integrar la sesión de Supabase y bloquear lecturas/escrituras sin sesión.
- [x] Repetir pruebas hasta verde.

## Tarea 3 — Acceso con sesión en la vista de favoritos

**Archivos:** `src/app/favoritos/FavoritosCliente.tsx`; `src/app/favoritos/FavoritosCliente.test.tsx`.

- [x] Escribir prueba del acceso sin sesión y de la ausencia de consultas al catálogo.
- [x] Escribir prueba del copy: solo con sesión y sin sincronización entre dispositivos.
- [x] Confirmar fallo esperado.
- [x] Integrar `useSesionTecReview` y `AuthModal`, y evitar cargar el catálogo sin sesión.
- [x] Repetir pruebas hasta verde.

## Tarea 4 — Coherencia del ranking de más deseados

**Archivos:** `src/components/home/RankingsHome.tsx`; `src/components/home/home.test.tsx`; `src/app/page.test.tsx`.

- [x] Escribir pruebas del estado vacío: favoritos locales no alimentan el ranking.
- [x] Confirmar fallo esperado.
- [x] Ajustar título, subtítulo y copy del vacío para distinguir favoritos de cuenta.
- [x] Repetir pruebas hasta verde.

## Tarea 5 — Evaluación entre dispositivos y cierre

**Archivos:** `docs/favoritos-revision.md`, `docs/tecreview-redesign.md`, este plan.

- [x] Documentar estado actual, hallazgos, cambios, pruebas y límites.
- [x] Documentar la evaluación entre dispositivos: tabla, entidad, repositorio, servicio, endpoints, fusión y riesgos.
- [x] Marcar la propuesta como pendiente de aprobación; no implementarla.
- [x] Ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [x] Revisar `git status`, `git diff`, `git diff --check`.
- [x] Preparar commit local Conventional Commits con solo esta mejora y detenerse para revisión del usuario.

## Registro

- Se mantiene la rama autorizada y se ejecuta inline.
- No se adelanta la implementación entre dispositivos: requiere aprobación de BD/JPA/backend.
- Los favoritos de invitado se retiraron; la alternativa local-first ahora es una caché por cuenta autenticada.
- RED→GREEN: fallaron primero la falta de aviso/límite, la ausencia de clave por cuenta, el acceso sin sesión en `/favoritos`, el copy de sesión obligatoria y el texto del ranking; las pruebas selectivas de favoritos y home quedaron verdes.
- La suite completa quedó en 772 pruebas correctas; `npx tsc --noEmit` y `npm run lint` pasan.
