BEGIN;

-- Migracion 011: cerrar validaciones heredadas y exigir auditoria transaccional.
-- Requiere 007, 008, 009 y 010. No modifica datos historicos ni estados existentes.

DO $preflight$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.schema_version
        WHERE version = '011_integridad_multirole_y_auditoria_moderacion'
    ) THEN
        RAISE EXCEPTION 'La migracion 011 ya esta registrada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '007_moderacion_reportes')
       OR NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '008_multirole_y_representantes')
       OR NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '009_auditoria_asignaciones')
       OR NOT EXISTS (SELECT 1 FROM public.schema_version WHERE version = '010_auditoria_decisiones_moderacion') THEN
        RAISE EXCEPTION 'Preflight fallido: se requieren las migraciones 007, 008, 009 y 010.';
    END IF;

    IF to_regclass('public.usuario_rol') IS NULL
       OR to_regclass('public.reporte_resena_historial') IS NULL
       OR to_regclass('public.reporte_resena_decision_auditoria') IS NULL
       OR to_regclass('public.resena_moderacion_auditoria') IS NULL THEN
        RAISE EXCEPTION 'Preflight fallido: faltan tablas multirrol o de auditoria.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='usuario_rol' AND column_name='estado'
    ) THEN
        RAISE EXCEPTION 'Preflight fallido: usuario_rol.estado no existe.';
    END IF;
END
$preflight$;

LOCK TABLE public.usuario IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.usuario_rol IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.reporte_resena IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.reporte_resena_historial IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.reporte_resena_decision_auditoria IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.resena IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.resena_moderacion_auditoria IN SHARE ROW EXCLUSIVE MODE;

-- Una sola fuente de verdad para permisos de moderacion y administracion.
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_rol_activo(
    p_id_usuario BIGINT,
    p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario u
        JOIN public.usuario_rol ur
          ON ur.id_usuario = u.id_usuario
         AND ur.estado = TRUE
        JOIN public.rol r
          ON r.id_rol = ur.id_rol
        WHERE u.id_usuario = p_id_usuario
          AND u.estado = TRUE
          AND LOWER(TRIM(r.nombre)) IN (
              SELECT LOWER(TRIM(roles.rol_nombre))
              FROM unnest(p_roles) AS roles(rol_nombre)
          )
    );
$function$;

-- La proteccion historica del rol Administrador tambien debe respetar el multirrol.
-- Mientras exista una asignacion activa de Administrador, no se permite degradar
-- el campo legado usuario.id_rol. Tras revocar esa asignacion, la columna puede sincronizarse.
CREATE OR REPLACE FUNCTION public.fn_proteger_rol_administrador()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.id_rol IS DISTINCT FROM OLD.id_rol
       AND public.fn_usuario_tiene_rol_activo(OLD.id_usuario, ARRAY['administrador']) THEN
        RAISE EXCEPTION
            'Operacion denegada: no se puede degradar el rol legado mientras la cuenta conserve una asignacion activa de Administrador (id_usuario: %).',
            OLD.id_usuario;
    END IF;
    RETURN NEW;
END;
$function$;

-- La auditoria de reasignacion solo puede ser creada por un Administrador activo.
-- El responsable nuevo debe ser una cuenta activa con rol activo de Administrador/Moderador.
CREATE OR REPLACE FUNCTION public.fn_validar_historial_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_admin, ARRAY['administrador']) THEN
        RAISE EXCEPTION
            'Operacion denegada: el actor debe tener una asignacion activa de Administrador (id_usuario: %).',
            NEW.id_admin;
    END IF;

    IF NOT public.fn_usuario_tiene_rol_activo(
        NEW.id_responsable_nuevo, ARRAY['administrador', 'moderador']
    ) THEN
        RAISE EXCEPTION
            'Operacion denegada: el responsable nuevo debe tener una cuenta y rol activo de Administrador o Moderador (id_usuario: %).',
            NEW.id_responsable_nuevo;
    END IF;

    RETURN NEW;
END;
$function$;

-- La maquina de estados conserva las reglas de 010 y valida responsables con multirrol.
CREATE OR REPLACE FUNCTION public.fn_validar_transicion_moderacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado <> 'PENDIENTE' THEN
            RAISE EXCEPTION 'Un reporte nuevo debe crearse en estado PENDIENTE.';
        END IF;

        IF NEW.id_responsable IS NOT NULL
           OR NEW.fecha_inicio_revision IS NOT NULL
           OR NEW.fecha_revision IS NOT NULL
           OR NEW.notas_revision IS NOT NULL
           OR NEW.id_historial_reasignacion IS NOT NULL THEN
            RAISE EXCEPTION 'Un reporte nuevo no puede incluir datos de moderacion.';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.id_responsable IS NOT NULL
       AND NEW.id_responsable IS DISTINCT FROM OLD.id_responsable
       AND NOT public.fn_usuario_tiene_rol_activo(
           NEW.id_responsable, ARRAY['administrador', 'moderador']
       ) THEN
        RAISE EXCEPTION
            'El responsable debe ser una cuenta activa con rol activo de Administrador o Moderador (id_usuario: %).',
            NEW.id_responsable;
    END IF;

    IF OLD.estado = 'PENDIENTE' THEN
        IF NEW.estado <> 'EN_REVISION' THEN
            RAISE EXCEPTION 'Un reporte PENDIENTE solo puede pasar a EN_REVISION.';
        END IF;
        IF NEW.id_responsable IS NULL OR NEW.fecha_inicio_revision IS NULL THEN
            RAISE EXCEPTION 'Iniciar revision exige responsable y fecha de inicio.';
        END IF;
        IF NEW.fecha_revision IS NOT NULL OR NEW.notas_revision IS NOT NULL
           OR NEW.id_historial_reasignacion IS NOT NULL THEN
            RAISE EXCEPTION 'Iniciar revision no admite fecha final, notas ni historial de reasignacion.';
        END IF;

    ELSIF OLD.estado = 'EN_REVISION' THEN
        IF NEW.estado = 'EN_REVISION' THEN
            IF NEW.id_responsable IS NOT DISTINCT FROM OLD.id_responsable THEN
                RAISE EXCEPTION 'La permanencia en EN_REVISION solo admite reasignacion a otro responsable.';
            END IF;
            IF NEW.fecha_inicio_revision IS NULL
               OR NEW.fecha_inicio_revision <= OLD.fecha_inicio_revision THEN
                RAISE EXCEPTION 'La reasignacion exige una fecha de inicio posterior.';
            END IF;
            IF NEW.fecha_revision IS NOT NULL OR NEW.notas_revision IS NOT NULL THEN
                RAISE EXCEPTION 'Un reporte en revision no puede tener fecha final ni notas finales.';
            END IF;
            IF NEW.id_historial_reasignacion IS NULL
               OR NEW.id_historial_reasignacion IS NOT DISTINCT FROM OLD.id_historial_reasignacion THEN
                RAISE EXCEPTION 'La reasignacion exige un nuevo evento de historial.';
            END IF;

        ELSIF NEW.estado IN ('ACEPTADO', 'RECHAZADO') THEN
            IF NEW.id_responsable IS DISTINCT FROM OLD.id_responsable
               OR NEW.fecha_inicio_revision IS DISTINCT FROM OLD.fecha_inicio_revision
               OR NEW.id_historial_reasignacion IS DISTINCT FROM OLD.id_historial_reasignacion THEN
                RAISE EXCEPTION 'La decision final no puede alterar responsable, inicio ni historial de reasignacion.';
            END IF;
            IF NEW.fecha_revision IS NULL
               OR NEW.fecha_revision < NEW.fecha_inicio_revision THEN
                RAISE EXCEPTION 'La decision final exige una fecha valida.';
            END IF;
            IF NEW.notas_revision IS NULL OR TRIM(NEW.notas_revision) = '' THEN
                RAISE EXCEPTION 'La decision final exige notas no vacias.';
            END IF;
        ELSE
            RAISE EXCEPTION 'Transicion invalida desde EN_REVISION a %.', NEW.estado;
        END IF;

    ELSIF OLD.estado IN ('ACEPTADO', 'RECHAZADO') THEN
        RAISE EXCEPTION 'Un reporte finalizado es inmutable.';
    END IF;

    RETURN NEW;
END;
$function$;

-- La comprobacion diferida de reasignacion tampoco consulta usuario.id_rol.
CREATE OR REPLACE FUNCTION public.fn_verificar_correspondencia_reasignacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_hist RECORD;
BEGIN
    IF OLD.id_responsable IS NOT NULL
       AND NEW.id_responsable IS DISTINCT FROM OLD.id_responsable THEN
        IF NEW.id_historial_reasignacion IS NULL THEN
            RAISE EXCEPTION 'La reasignacion del reporte % carece de evento de historial.', NEW.id_reporte;
        END IF;

        SELECT * INTO v_hist
        FROM public.reporte_resena_historial
        WHERE id_historial = NEW.id_historial_reasignacion;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe el evento de historial %.', NEW.id_historial_reasignacion;
        END IF;

        IF NOT public.fn_usuario_tiene_rol_activo(v_hist.id_admin, ARRAY['administrador']) THEN
            RAISE EXCEPTION 'El actor de la reasignacion ya no tiene cuenta y rol activo de Administrador.';
        END IF;

        IF v_hist.id_reporte <> NEW.id_reporte
           OR v_hist.id_responsable_anterior <> OLD.id_responsable
           OR v_hist.id_responsable_nuevo <> NEW.id_responsable
           OR v_hist.fecha_inicio_nueva IS DISTINCT FROM NEW.fecha_inicio_revision
           OR v_hist.fecha_inicio_anterior IS DISTINCT FROM OLD.fecha_inicio_revision THEN
            RAISE EXCEPTION 'El evento de historial no coincide con la reasignacion del reporte %.', NEW.id_reporte;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- Correlaciona los eventos de auditoria con la misma transaccion que cambia el recurso.
-- txid_current() permite comprobar atomicidad sin depender del orden de flush de JPA.
ALTER TABLE public.reporte_resena_decision_auditoria
    ADD COLUMN IF NOT EXISTS id_transaccion BIGINT;
ALTER TABLE public.resena_moderacion_auditoria
    ADD COLUMN IF NOT EXISTS id_transaccion BIGINT;

UPDATE public.reporte_resena_decision_auditoria
SET id_transaccion = txid_current()
WHERE id_transaccion IS NULL;
UPDATE public.resena_moderacion_auditoria
SET id_transaccion = txid_current()
WHERE id_transaccion IS NULL;

ALTER TABLE public.reporte_resena_decision_auditoria
    ALTER COLUMN id_transaccion SET DEFAULT txid_current(),
    ALTER COLUMN id_transaccion SET NOT NULL;
ALTER TABLE public.resena_moderacion_auditoria
    ALTER COLUMN id_transaccion SET DEFAULT txid_current(),
    ALTER COLUMN id_transaccion SET NOT NULL;

-- Antes de insertar un evento, valida actor, conflicto de interes y estado de origen.
CREATE OR REPLACE FUNCTION public.fn_validar_insert_reporte_decision_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_estado VARCHAR(20);
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;

    SELECT rr.estado INTO v_estado
    FROM public.reporte_resena rr
    JOIN public.resena r ON r.id_resena = rr.id_resena
    WHERE rr.id_reporte = NEW.id_reporte
      AND rr.id_usuario <> NEW.id_moderador
      AND r.id_usuario <> NEW.id_moderador
    FOR KEY SHARE OF rr, r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe el reporte o el actor tiene conflicto de interes.';
    END IF;

    IF v_estado IS DISTINCT FROM NEW.estado_anterior THEN
        RAISE EXCEPTION 'El estado anterior del evento no coincide con el estado actual del reporte.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_insert_reporte_decision_auditoria
    ON public.reporte_resena_decision_auditoria;
CREATE TRIGGER trg_validar_insert_reporte_decision_auditoria
BEFORE INSERT ON public.reporte_resena_decision_auditoria
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_reporte_decision_auditoria();

CREATE OR REPLACE FUNCTION public.fn_validar_insert_resena_moderacion_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_oculta BOOLEAN;
    v_autor BIGINT;
BEGIN
    IF NOT public.fn_usuario_tiene_rol_activo(NEW.id_moderador, ARRAY['moderador', 'administrador']) THEN
        RAISE EXCEPTION 'El actor de moderacion debe tener cuenta y rol activo.';
    END IF;

    SELECT oculta_por_moderacion, id_usuario
      INTO v_oculta, v_autor
    FROM public.resena
    WHERE id_resena = NEW.id_resena
    FOR KEY SHARE;

    IF NOT FOUND OR v_autor = NEW.id_moderador THEN
        RAISE EXCEPTION 'No existe la resena o el actor tiene conflicto de interes.';
    END IF;

    IF (NEW.accion = 'OCULTAR' AND v_oculta IS DISTINCT FROM FALSE)
       OR (NEW.accion = 'RESTAURAR' AND v_oculta IS DISTINCT FROM TRUE) THEN
        RAISE EXCEPTION 'La accion de auditoria no coincide con el estado previo del ocultamiento manual.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_insert_resena_moderacion_auditoria
    ON public.resena_moderacion_auditoria;
CREATE TRIGGER trg_validar_insert_resena_moderacion_auditoria
BEFORE INSERT ON public.resena_moderacion_auditoria
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_insert_resena_moderacion_auditoria();

-- Al COMMIT, cada cambio de estado debe tener evento correspondiente en la misma transaccion.
CREATE OR REPLACE FUNCTION public.fn_exigir_auditoria_transicion_reporte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado
       AND NOT EXISTS (
           SELECT 1
           FROM public.reporte_resena_decision_auditoria a
           WHERE a.id_reporte = NEW.id_reporte
             AND a.estado_anterior = OLD.estado
             AND a.estado_nuevo = NEW.estado
             AND a.id_transaccion = txid_current()
             AND (
                 (OLD.estado = 'PENDIENTE'
                  AND NEW.estado = 'EN_REVISION'
                  AND a.id_moderador = NEW.id_responsable)
                 OR
                 (NEW.estado IN ('ACEPTADO', 'RECHAZADO')
                  AND a.observacion IS NOT DISTINCT FROM NEW.notas_revision
                  AND a.fecha_evento = NEW.fecha_revision)
             )
       ) THEN
        RAISE EXCEPTION 'La transicion del reporte % no tiene auditoria en la misma transaccion.', NEW.id_reporte;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_auditoria_transicion_reporte ON public.reporte_resena;
CREATE CONSTRAINT TRIGGER trg_exigir_auditoria_transicion_reporte
AFTER UPDATE ON public.reporte_resena
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_auditoria_transicion_reporte();

CREATE OR REPLACE FUNCTION public.fn_exigir_estado_final_evento_reporte()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_estado VARCHAR(20);
BEGIN
    SELECT estado INTO v_estado
    FROM public.reporte_resena
    WHERE id_reporte = NEW.id_reporte;

    IF v_estado IS DISTINCT FROM NEW.estado_nuevo THEN
        RAISE EXCEPTION 'El evento de auditoria del reporte % no coincide con el estado final persistido.', NEW.id_reporte;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_estado_final_evento_reporte
    ON public.reporte_resena_decision_auditoria;
CREATE CONSTRAINT TRIGGER trg_exigir_estado_final_evento_reporte
AFTER INSERT ON public.reporte_resena_decision_auditoria
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_estado_final_evento_reporte();

CREATE OR REPLACE FUNCTION public.fn_exigir_auditoria_ocultamiento_resena()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_accion VARCHAR(20);
BEGIN
    IF OLD.oculta_por_moderacion IS DISTINCT FROM NEW.oculta_por_moderacion THEN
        v_accion := CASE WHEN NEW.oculta_por_moderacion THEN 'OCULTAR' ELSE 'RESTAURAR' END;
        IF NOT EXISTS (
            SELECT 1
            FROM public.resena_moderacion_auditoria a
            WHERE a.id_resena = NEW.id_resena
              AND a.accion = v_accion
              AND a.id_transaccion = txid_current()
              AND (
                  (v_accion = 'RESTAURAR')
                  OR
                  (a.id_moderador = NEW.moderada_por
                   AND a.motivo = NEW.motivo_moderacion
                   AND a.fecha_evento = NEW.fecha_moderacion)
              )
        ) THEN
            RAISE EXCEPTION 'El cambio de ocultamiento manual de la resena % no tiene auditoria en la misma transaccion.', NEW.id_resena;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_auditoria_ocultamiento_resena ON public.resena;
CREATE CONSTRAINT TRIGGER trg_exigir_auditoria_ocultamiento_resena
AFTER UPDATE ON public.resena
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_auditoria_ocultamiento_resena();

CREATE OR REPLACE FUNCTION public.fn_exigir_estado_final_evento_resena()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_oculta BOOLEAN;
BEGIN
    SELECT oculta_por_moderacion INTO v_oculta
    FROM public.resena
    WHERE id_resena = NEW.id_resena;

    IF v_oculta IS DISTINCT FROM (NEW.accion = 'OCULTAR') THEN
        RAISE EXCEPTION 'El evento de auditoria no coincide con el ocultamiento manual final de la resena %.', NEW.id_resena;
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_exigir_estado_final_evento_resena
    ON public.resena_moderacion_auditoria;
CREATE CONSTRAINT TRIGGER trg_exigir_estado_final_evento_resena
AFTER INSERT ON public.resena_moderacion_auditoria
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_exigir_estado_final_evento_resena();

CREATE INDEX IF NOT EXISTS idx_reporte_decision_auditoria_transaccion
    ON public.reporte_resena_decision_auditoria (id_transaccion, id_reporte);
CREATE INDEX IF NOT EXISTS idx_resena_moderacion_auditoria_transaccion
    ON public.resena_moderacion_auditoria (id_transaccion, id_resena);

INSERT INTO public.schema_version (version, descripcion)
VALUES (
    '011_integridad_multirole_y_auditoria_moderacion',
    'Valida roles activos multirrol en funciones heredadas y exige auditoria transaccional de decisiones y ocultamiento manual.'
);

COMMIT;
