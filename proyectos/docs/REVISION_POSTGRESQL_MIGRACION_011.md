# Revisión PostgreSQL de integridad — Migración 011

## Objetivo

La migración `011_integridad_multirole_y_auditoria_moderacion.sql` corrige las validaciones heredadas de la migración 007 para que la autorización dependa de las asignaciones activas de `usuario_rol`, y no del rol único heredado `usuario.id_rol`.

También exige que los cambios de estado de reportes y de ocultamiento manual de reseñas tengan su evento de auditoría en la misma transacción PostgreSQL.

## Orden y prerrequisitos

La migración 011 requiere que estén registradas en `public.schema_version`:

1. `007_moderacion_reportes`
2. `008_multirole_y_representantes`
3. `009_auditoria_asignaciones`
4. `010_auditoria_decisiones_moderacion`

No reemplaza ni edita las migraciones anteriores. No modifica los estados válidos de reportes ni elimina registros históricos.

## Cambios

- Añade `fn_usuario_tiene_rol_activo` como consulta común de cuenta activa + asignación activa.
- Actualiza `fn_validar_historial_roles`, `fn_validar_transicion_moderacion` y `fn_verificar_correspondencia_reasignacion`.
- Actualiza `fn_proteger_rol_administrador` para proteger una asignación activa de Administrador y permitir sincronizar el campo legado después de revocarla.
- Valida que quien registra decisiones u ocultamientos tenga rol activo Moderador o Administrador y que no actúe sobre su propio reporte/reseña.
- Añade `id_transaccion` a las tablas de auditoría. Los registros históricos reciben un identificador técnico de migración; los eventos nuevos reciben `txid_current()` por defecto.
- Añade constraint triggers diferidos que exigen un evento de auditoría en la misma transacción que el cambio del reporte o del ocultamiento manual.
- Para el inicio de revisión exige que el actor auditado sea el responsable asignado. Para la decisión final exige coherencia entre observación, notas y fecha.
- Para ocultar una reseña exige coherencia entre actor, motivo y fecha de moderación.

## Validación estructural en PostgreSQL

Después de aplicar las migraciones 007–011 en una base de pruebas o staging, ejecutar con `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f proyectos/docs/sql/tests/011_verificacion_postgresql.sql
```

El script es de solo lectura. Verifica el registro de la migración, las funciones multirrol, las columnas de correlación y la existencia/configuración diferida de los triggers.

**Alcance de la prueba:** esta verificación comprueba estructura y definiciones en PostgreSQL; no sustituye pruebas de comportamiento con datos de prueba. Antes de producción se deben ejecutar escenarios funcionales en una base PostgreSQL desechable o staging:

- Reasignación por Administrador con asignación activa y rechazo tras revocación.
- Responsable Moderador con rol heredado Usuario, pero asignación multirrol activa.
- Rechazo de un actor suspendido o con rol revocado.
- Rechazo de autorreporte/aut moderación.
- Rechazo de cambio de estado sin evento de auditoría en la misma transacción.
- Rechazo de evento sin cambio correspondiente del recurso.
- Aceptación de transición con evento coincidente dentro de la transacción.
- Restauración manual sin alterar `oculta_por_reportes` ni `estado`.

## Consideraciones operativas

La migración toma bloqueos `SHARE ROW EXCLUSIVE` en tablas de usuarios, asignaciones, reportes, reseñas y auditoría. Debe programarse en una ventana de mantenimiento, revisar duración y actividad de la base, y ejecutarse primero en staging con respaldo reciente.

No ejecutar directamente en producción sin revisar el plan de migración, el tamaño de las tablas y el impacto de los bloqueos.

## Estado

La migración está preparada en el repositorio en dos ubicaciones idénticas:

- `proyectos/backend/src/main/resources/db/migration/011_integridad_multirole_y_auditoria_moderacion.sql`
- `proyectos/docs/sql/011_integridad_multirole_y_auditoria_moderacion.sql`

No se ha ejecutado en Supabase ni en otra base remota.
