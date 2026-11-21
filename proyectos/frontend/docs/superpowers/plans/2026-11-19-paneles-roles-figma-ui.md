# Paneles por rol — implementación de la propuesta Figma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar los paneles de TecReview a la propuesta editable de Figma en escritorio y móvil sin alterar contratos ni permisos existentes.

**Architecture:** Mantener los tres modales actuales y los módulos administrativos; no crear una segunda interfaz ni copiar el posicionamiento absoluto del boceto. Usar los tokens CSS del proyecto y Tailwind 4 para distribución adaptable; preservar las funciones CRUD, datos reales y la semántica de cada rol. Los números y nombres del boceto son ilustrativos, no datos de producción.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind 4, Vitest y Testing Library.

**Spec:** Archivo Figma `https://www.figma.com/design/ff4S5udP2dalpJBbfUvlQu`, pantallas `4:2`, `4:144`, `6:2`, `6:71` y `6:132`; auditoría acordada en conversación.

## Global Constraints

- Rama actual `adrian`; no trabajar sobre `main`, no hacer push ni merge automático.
- No alterar esquema de Supabase, entidades, endpoints, seguridad ni arquitectura del backend.
- Conservar tema oscuro por defecto, Inter, acento kiwi y tokens `--color-*`; soportar tema claro.
- Mantener los nombres y contratos funcionales existentes en el frontend, salvo correcciones explícitas de texto engañoso.
- «Ficha V3», cifras y usuarios de Figma son ilustrativos: no inventar datos ni activar funciones inexistentes.
- Revisar documentación Next.js 16 en `node_modules/next/dist/docs/` antes de editar código.
- No sobrescribir cambios preexistentes en el árbol de trabajo.

## Review Focus

- Ancho de 375 px y zoom 200 %: pestañas y acciones deben seguir visibles y operables (Task 1).
- Catálogo sin precio o con nombres muy largos: la tarjeta no debe recortar las acciones ni afirmar que el precio está verificado (Task 2).
- Cola vacía o con filtros activos: la pantalla no debe describir reportes de precios/enlaces como integrados ni confundir vacío con resuelto (Task 3).
- Apertura de confirmación desde teclado: el foco debe entrar, permanecer en el diálogo y regresar al activador al cerrarlo (Task 4).
- Respuesta del backend lenta o fallida: búsqueda y paginación locales no deben sustituir estados de carga/error ni datos reales (Task 2).

---

### Task 1: Contenedor administrativo adaptable

**Files:**
- Modify: `src/components/AdminPanelModal.tsx` (cabecera, navegación y estructura del diálogo).
- Test: `src/components/AdminPanelModal.test.tsx`.

**Interfaces:**
- Consumes: `TabAdministracion`, `usuarioSesion`, seis paneles existentes.
- Produces: mismas seis pestañas y lógica de apertura/cierre en un diseño con navegación lateral en escritorio y selector accesible en móvil.

- [ ] **Step 1: Write the failing tests.** Afirmar que las seis secciones siguen accesibles; que la navegación cambia panel sin perder semántica de selección; que hay controles móviles con nombres y foco visibles.
- [ ] **Step 2: Run test to verify it fails.** `npx vitest run src/components/AdminPanelModal.test.tsx`.
- [ ] **Step 3: Implement.** Reorganizar en shell adaptable de escritorio/móvil sin mover las operaciones CRUD ni introducir navegación de rutas nuevas; usar datos de sesión existentes, no los del boceto.
- [ ] **Step 4: Run test to verify it passes.** `npx vitest run src/components/AdminPanelModal.test.tsx`.
- [ ] **Step 5: Commit.** `git commit -m "feat: adapt admin panel navigation to screen size"`.

### Task 2: Catálogo y establecimientos usables a distintos anchos

**Files:**
- Modify: `src/components/AdminPanelModal.tsx` (vista de productos).
- Modify: `src/components/admin/AdminEstablecimientos.tsx`.
- Test: `src/components/AdminPanelModal.test.tsx`, `src/components/admin/AdminEstablecimientos.test.tsx`.

**Interfaces:**
- Consumes: productos, categorías, marcas y establecimientos devueltos por la API.
- Produces: búsqueda local por producto/marca, paginación local de productos sobre la lista recibida, tabla en escritorio y tarjetas en móvil con acciones visibles; establecimientos con tarjetas en móvil.

- [ ] **Step 1: Write failing tests.** Filtrar sin perder la lista, página reiniciada al filtrar, estado vacío por búsqueda, precio ausente mostrado como «—», mismas acciones Editar/Eliminar o Editar/Desactivar en escritorio y móvil.
- [ ] **Step 2: Run tests to verify failure.** `npx vitest run src/components/AdminPanelModal.test.tsx src/components/admin/AdminEstablecimientos.test.tsx`.
- [ ] **Step 3: Implement.** Reutilizar handlers actuales y `formatearCOP`; no agregar selección masiva ni simular verificación de precio/ficha; mostrar límites del dato de referencia con texto fiel.
- [ ] **Step 4: Run tests to verify pass.** Mismo comando.
- [ ] **Step 5: Commit.** `git commit -m "feat: make admin listings responsive and searchable"`.

### Task 3: Moderación coherente entre roles

**Files:**
- Modify: `src/components/AdminPanelModal.tsx` (cola administrativa).
- Modify: `src/components/moderacion/PanelModeracionModal.tsx`.
- Test: `src/components/AdminPanelModal.test.tsx`, `src/components/moderacion/PanelModeracionModal.test.tsx`.

**Interfaces:**
- Consumes: endpoints de moderación de reseñas existentes.
- Produces: copy que identifica explícitamente la cola como de reseñas; justificación obligatoria para ocultar/publicar en ambos paneles; estado y filtros consistentes tras mutación.

- [ ] **Step 1: Write failing tests.** Ausencia de afirmación de reportes de precios/enlaces integrados, motivo vacío bloquea ocultar/publicar, rechazar conserva regla real del backend, resultado deja de aparecer si no cumple el filtro activo.
- [ ] **Step 2: Run tests to verify failure.** `npx vitest run src/components/AdminPanelModal.test.tsx src/components/moderacion/PanelModeracionModal.test.tsx`.
- [ ] **Step 3: Implement.** Conservar acciones y autorizaciones; no inventar endpoints de anomalías comerciales.
- [ ] **Step 4: Run tests to verify pass.** Mismo comando.
- [ ] **Step 5: Commit.** `git commit -m "fix: align moderation panels with supported reports"`.

### Task 4: Diálogos, foco y claridad de roles

**Files:**
- Modify: `src/components/AdminPanelModal.tsx`.
- Modify: `src/components/representante/PanelRepresentanteModal.tsx`.
- Modify: `src/components/admin/AdminUsuariosRoles.tsx`.
- Test: tests de cada componente anterior.

**Interfaces:**
- Consumes: `CLASE_FOCO`, activadores y estados existentes.
- Produces: foco inicial/retorno, Escape donde procede, confirmaciones con foco contenido y jerarquía consistente; aviso visible para la ausencia de representaciones activas/historial sin fingir su lectura.

- [ ] **Step 1: Write failing tests.** Foco entra al modal, no sale con Tab, retorna al cerrar, Escape no dispara acciones mientras una confirmación está abierta; aclaración de representaciones ausentes visible.
- [ ] **Step 2: Run tests to verify failure.** `npx vitest run src/components/AdminPanelModal.test.tsx src/components/representante/PanelRepresentanteModal.test.tsx src/components/admin/AdminUsuariosRoles.test.tsx`.
- [ ] **Step 3: Implement.** Reutilizar utilidad de foco del proyecto cuando corresponda y preservar las confirmaciones de desactivación existentes.
- [ ] **Step 4: Run tests to verify pass.** Mismo comando.
- [ ] **Step 5: Commit.** `git commit -m "fix: improve role panel dialog accessibility"`.

### Task 5: Documentación y verificación final

**Files:**
- Modify: `docs/tecreview-redesign.md`.
- Modify: `docs/moderacion-resenas.md` si cambia el estado documentado.

**Interfaces:**
- Produces: registro de pantallas, límites de integración y comportamiento responsive realmente entregado.

- [ ] **Step 1: Update docs.** Precisar qué cambió visualmente, qué sigue pendiente del backend y qué se dejó deliberadamente fuera.
- [ ] **Step 2: Run verification.** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; comprobar visualmente 375, 768 y 1440 px y zoom 200 % si hay sesión y backend disponibles.
- [ ] **Step 3: Review.** `git status --short --branch`, `git diff --check`, `git diff --stat`; no incluir archivos de otros compañeros.
- [ ] **Step 4: Commit docs if appropriate.** `git commit -m "docs: document redesigned role panels"`. No push.
