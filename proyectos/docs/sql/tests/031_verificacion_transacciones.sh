#!/bin/bash
# Verificacion de la 031 que necesita transacciones CONFIRMADAS distintas
# (el script .sql corre en una sola). SOLO para una base de pruebas
# desechable: deja datos confirmados que no se pueden borrar (tablas de
# solo insercion).
#
#   PSQL="psql -h 127.0.0.1 -p 55433 -U postgres" bash 031_verificacion_transacciones.sh
#
# Casos:
#   A. Apelacion aceptada en OTRA transaccion: APROBAR la RECHAZADA falla.
#   B. Apelacion aceptada de un rechazo que no es el ultimo: APROBAR falla.
#   C. Control: la apelacion aceptada del ultimo rechazo, en la misma
#      transaccion que APROBAR, publica.
set -euo pipefail
PSQL=${PSQL:-psql}
q() { $PSQL -qtA -v ON_ERROR_STOP=1 -c "$1"; }
debe_fallar() {
  if $PSQL -qtA -v ON_ERROR_STOP=1 -c "$1" >/dev/null 2>&1; then echo "FALLO: se permitio $2"; exit 1; fi
}
marca="t$(date +%s%N)"
q "INSERT INTO public.rol (nombre) SELECT 'Moderador' WHERE NOT EXISTS (SELECT 1 FROM public.rol WHERE lower(nombre) = 'moderador')"
RU=$(q "INSERT INTO public.rol (nombre) VALUES ('Usuario 031 $marca') RETURNING id_rol")
RM=$(q "SELECT id_rol FROM public.rol WHERE lower(nombre) = 'moderador' LIMIT 1")
u() { q "INSERT INTO public.usuario (correo, estado, fecha_registro, nombre, id_rol) VALUES ('$1.$marca@test.local', TRUE, now(), '$1', $2) RETURNING id_usuario"; }
AUT=$(u autor "$RU"); M1=$(u mod1 "$RM"); M2=$(u mod2 "$RM")
q "INSERT INTO public.usuario_rol (id_usuario, id_rol) VALUES ($AUT, $RU), ($M1, $RM), ($M2, $RM)"
pendiente() { q "INSERT INTO public.publicacion_comunidad (tipo, id_autor, titulo, contenido, estado_moderacion) VALUES ('GENERAL', $AUT, '$1', 'Texto', 'PENDIENTE') RETURNING id_publicacion"; }
rechazar() {  # confirma una decision RECHAZAR y devuelve su id
  q "BEGIN; INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES ($1, $M1, 'RECHAZAR', 'Insulto', 'Texto'); UPDATE public.publicacion_comunidad SET estado_moderacion = 'RECHAZADA' WHERE id_publicacion = $1; COMMIT;" >/dev/null
  q "SELECT max(id_auditoria) FROM public.moderacion_comunidad_auditoria WHERE id_publicacion = $1 AND accion = 'RECHAZAR'"
}
apelar() { q "INSERT INTO public.apelacion_comunidad (id_auditoria, id_autor, motivo) VALUES ($1, $AUT, 'No insulte') RETURNING id_apelacion"; }
aprobar_sql() { echo "INSERT INTO public.moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado) VALUES ($1, $M2, 'APROBAR', 'Apelacion aceptada', 'Texto'); UPDATE public.publicacion_comunidad SET estado_moderacion = 'PUBLICADA' WHERE id_publicacion = $1;"; }

# A. Aceptada en otra transaccion.
PA=$(pendiente "Caso A $marca"); DA=$(rechazar "$PA"); AA=$(apelar "$DA")
q "UPDATE public.apelacion_comunidad SET estado = 'ACEPTADA', id_moderador = $M2, respuesta = 'Si' WHERE id_apelacion = $AA"
debe_fallar "BEGIN; $(aprobar_sql "$PA") COMMIT;" "aprobar con una apelacion aceptada en otra transaccion"

# B. Apelacion de un rechazo que no es el ultimo.
PB=$(pendiente "Caso B $marca"); DB1=$(rechazar "$PB"); AB=$(apelar "$DB1")
q "UPDATE public.publicacion_comunidad SET estado_moderacion = 'PENDIENTE', contenido = 'Editada', fecha_edicion = now() WHERE id_publicacion = $PB"
rechazar "$PB" >/dev/null
debe_fallar "BEGIN; UPDATE public.apelacion_comunidad SET estado = 'ACEPTADA', id_moderador = $M2, respuesta = 'Si' WHERE id_apelacion = $AB; $(aprobar_sql "$PB") COMMIT;" "aprobar con la apelacion de un rechazo que no es el ultimo"

# C. Control positivo.
PC=$(pendiente "Caso C $marca"); DC=$(rechazar "$PC"); AC=$(apelar "$DC")
q "BEGIN; UPDATE public.apelacion_comunidad SET estado = 'ACEPTADA', id_moderador = $M2, respuesta = 'Si' WHERE id_apelacion = $AC; $(aprobar_sql "$PC") COMMIT;" >/dev/null
[ "$(q "SELECT estado_moderacion FROM public.publicacion_comunidad WHERE id_publicacion = $PC")" = "PUBLICADA" ] || { echo "FALLO: el control no publico"; exit 1; }

echo "OK: casos de transacciones confirmadas de la 031"
