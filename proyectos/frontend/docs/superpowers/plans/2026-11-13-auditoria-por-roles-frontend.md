# Plan — Cierre frontend de la auditoría por roles

**Fecha:** 2026-11-13
**Rama:** `adrian`
**Alcance:** consumir los contratos backend ya implementados, completar los paneles por rol y corregir las heurísticas de Home/Catálogo detectadas en la auditoría.

## Restricciones globales

- No modificar migraciones, entidades ni esquema de base de datos.
- No inventar endpoints, campos, permisos ni datos.
- Mantener el tema oscuro por defecto, kiwi `var(--color-brand-solid)`, Inter, `CLASE_FOCO` y contraste AA.
- Todo cambio de producción se escribe después de una prueba que falle (TDD).
- No hacer push a `main` ni merge automático.

## Tareas

### Tarea 1 — Contratos y tipos de API

**Archivos:** `src/services/api.ts`, `src/types/establecimiento.ts`, `src/types/administracion.ts`, `src/services/api.test.ts`.

**Produce:**

- Tipos `Establecimiento`, `EstablecimientoRequest`, `UsuarioAdmin`, `RolAdmin`.
- Funciones para establecimientos públicos y administrativos.
- Funciones para establecimientos asignados al representante.
- Consultas administrativas de usuarios y roles.
- Asignación/revocación de roles y representaciones.
- Corrección de las rutas de moderación a `/api/moderacion/resenas/{id}/...`.

**Pruebas:** cada función construye el método, la ruta, el token y el cuerpo correctos; las listas se validan como arreglos.

**Comando:** `npx vitest run src/services/api.test.ts`

### Tarea 2 — Panel de representante

**Archivos:** `src/components/representante/PanelRepresentanteModal.tsx`, `src/components/representante/PanelRepresentanteModal.test.tsx`, `src/app/perfil/PerfilCliente.tsx`, `src/app/perfil/PerfilCliente.test.tsx`.

**Comportamiento:**

- Solo visible para Administrador o Representante de establecimiento.
- Lista los establecimientos asignados con carga, error con reintento y vacío.
- Permite seleccionar uno y editar nombre, dirección, teléfono, correo, descripción, latitud y longitud.
- Valida nombre obligatorio, correo, longitudes y rangos geográficos.
- Envía `PUT /api/representante/establecimientos/{id}` y refresca la lista.

### Tarea 3 — Administración de usuarios y roles

**Archivos:** `src/components/admin/AdminUsuariosRoles.tsx`, `src/components/admin/AdminUsuariosRoles.test.tsx`, `src/components/AdminPanelModal.tsx`, `src/components/AdminPanelModal.test.tsx`.

**Comportamiento:**

- Nueva pestaña “Usuarios y roles”.
- Búsqueda de cuentas por correo con `GET /api/admin/usuarios`.
- Catálogo de roles con `GET /api/admin/roles`.
- Asignar y revocar roles con motivo opcional.
- Asignar y revocar representación sobre un establecimiento activo.
- Manejo de 403/404/409 y recarga tras cada mutación.
- Aviso honesto: el backend aún no lista asignaciones activas ni historial.

### Tarea 4 — Administración de establecimientos

**Archivos:** `src/components/admin/AdminEstablecimientos.tsx`, `src/components/admin/AdminEstablecimientos.test.tsx`, `src/components/AdminPanelModal.tsx`, `src/components/AdminPanelModal.test.tsx`.

**Comportamiento:**

- Nueva pestaña “Establecimientos”.
- Lista activos con `GET /api/establecimientos`.
- Crea, edita y desactiva con `POST`, `PUT` y `DELETE`.
- Formulario con los campos editables reales y validaciones equivalentes al backend.
- Confirmación de desactivación y manejo de 404/409/403.

### Tarea 5 — Moderación alineada al backend real

**Archivos:** `src/components/moderacion/PanelModeracionModal.tsx`, `src/components/moderacion/PanelModeracionModal.test.tsx`, `src/services/api.ts`, `src/services/api.test.ts`, `src/types/moderacion.ts`.

**Comportamiento:**

- Retirar el aviso de API no implementada.
- Moderadores y administradores pueden ejecutar acciones.
- Ocultar y publicar exigen justificación no vacía; rechazar reportes envía motivo opcional.
- Las acciones usan `/api/moderacion/resenas/{id}/ocultar|publicar|rechazar-reportes`.

### Tarea 6 — Heurísticas de Home y Catálogo

**Archivos:** `src/app/page.tsx`, `src/app/page.test.tsx`, `src/components/home/MasVendidosBusqueda.tsx`, `src/components/catalogo/CatalogoCliente.tsx`, `src/components/catalogo/CatalogoCliente.test.tsx`.

**Comportamiento:**

- Sustituir las sugerencias de búsqueda basadas en mocks por productos reales del backend, sin notas ni ventas inventadas.
- Mostrar un vacío específico cuando el catálogo no tiene productos, distinto del vacío por filtros.
- Mantener la navegación y el filtrado existentes.

### Tarea 7 — Documentación y verificación

- Actualizar `docs/moderacion-resenas.md` y `docs/tecreview-redesign.md` con el estado real.
- Ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.
- Revisar `git status` y `git diff`.
- Commit Conventional Commits solo con archivos de la tarea.
