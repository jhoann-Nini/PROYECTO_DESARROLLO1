# Fase 2 — Autorización del representante de establecimiento

## Alcance implementado

La API permite que una cuenta con el rol activo **Representante de establecimiento** consulte y actualice los datos básicos de los establecimientos que tiene asignados.

El **Administrador** activo conserva acceso global a los establecimientos activos mediante estos mismos endpoints.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/representante/establecimientos` | Lista los establecimientos activos asignados a la cuenta. |
| GET | `/api/representante/establecimientos/{idEstablecimiento}` | Consulta el detalle de un establecimiento dentro del alcance autorizado. |
| PUT | `/api/representante/establecimientos/{idEstablecimiento}` | Actualiza los datos básicos de un establecimiento dentro del alcance autorizado. |

Todas las rutas requieren un JWT válido de Supabase.

## Reglas de autorización

- La cuenta debe estar activa.
- La asignación del rol Representante de establecimiento debe estar activa.
- Para representantes, la relación `usuario_establecimiento` debe existir y tener `estado = true`.
- Un representante no puede consultar ni modificar establecimientos sin asignación activa.
- Las asignaciones revocadas no conceden acceso.
- Los establecimientos inactivos no se incluyen en el listado ni se pueden consultar o actualizar.
- Un Administrador activo puede consultar y actualizar cualquier establecimiento activo.
- El cuerpo de actualización no permite modificar el estado del establecimiento ni las asignaciones de representantes.
- Moderadores y usuarios ordinarios no tienen acceso a estas rutas.

Las verificaciones se realizan en Spring Security y nuevamente en el servicio. La seguridad no depende de que el frontend oculte botones.

## Datos editables

El PUT recibe: `nombre`, `direccion`, `telefono`, `correo`, `descripcion`, `latitud` y `longitud`.

El nombre es obligatorio. Se validan longitudes de texto, formato de correo y rangos geográficos de latitud y longitud.

## Fuera de alcance

- Asignar o revocar representantes: se conserva en los endpoints administrativos existentes.
- Cambiar el estado de un establecimiento.
- Administrar el catálogo global de productos, categorías o marcas.
- Editar precios o disponibilidad de productos en establecimientos.

No se agregaron ni modificaron migraciones SQL. La implementación usa las tablas y columnas existentes en las migraciones 008 y 009.
