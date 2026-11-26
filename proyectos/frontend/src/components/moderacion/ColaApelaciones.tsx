"use client";

import { useEffect, useState } from "react";
import type { ApelacionModeracion } from "@/types/moderacion";
import { ApiError, obtenerApelacionesModeracion, resolverApelacion } from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

type Decision = "aceptar" | "rechazar";

export const MENSAJE_RESPUESTA_OBLIGATORIA =
  "Escribe una respuesta para el autor al rechazar la apelación.";
export const MENSAJE_CONFLICTO_ORIGINAL =
  "Tú tomaste la decisión original; debe resolverla otra persona.";

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(fecha);
}

const ETIQUETA_ACCION: Record<ApelacionModeracion["accion"], string> = {
  RECHAZAR: "Rechazo",
  OCULTAR: "Ocultamiento",
};

/**
 * Cola de apelaciones (Caso 6). El autor impugna un rechazo o un
 * ocultamiento; la resuelve otra persona distinta del moderador original.
 * `onCambio` avisa al panel tras cada decisión para actualizar el contador.
 */
export default function ColaApelaciones({ onCambio }: { onCambio?: () => void } = {}) {
  const [apelaciones, setApelaciones] = useState<ApelacionModeracion[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [errorRespuesta, setErrorRespuesta] = useState<number | null>(null);
  const [enCurso, setEnCurso] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerApelacionesModeracion()
      .then((datos) => {
        if (!activo) return;
        setApelaciones(datos);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(err instanceof Error ? err.message : "No fue posible cargar las apelaciones.");
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  async function resolver(apelacion: ApelacionModeracion, decision: Decision) {
    if (enCurso !== null || !apelacion.puedeResolver) return;
    const respuesta = (respuestas[apelacion.idApelacion] ?? "").trim();
    if (decision === "rechazar" && respuesta === "") {
      setErrorRespuesta(apelacion.idApelacion);
      setMensajeExito(null);
      setErrorAccion(null);
      return;
    }
    setEnCurso(apelacion.idApelacion);
    setErrorRespuesta(null);
    setErrorAccion(null);
    setMensajeExito(null);
    try {
      await resolverApelacion(apelacion.idApelacion, decision, respuesta || undefined);
      setApelaciones((previas) => previas?.filter((a) => a.idApelacion !== apelacion.idApelacion) ?? previas);
      onCambio?.();
      setMensajeExito(
        decision === "aceptar"
          ? `Apelación de ${apelacion.nombreAutor} aceptada: la decisión se revirtió y la falta ya no cuenta.`
          : `Apelación de ${apelacion.nombreAutor} rechazada: la decisión se mantiene.`,
      );
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : "No fue posible registrar la decisión.");
    } finally {
      setEnCurso(null);
    }
  }

  return (
    <div>
      <p className="text-xs text-subtle">
        Autores que piden revisar un rechazo o un ocultamiento. Si aceptas, la reseña se publica o se
        restaura y la falta deja de contar para la reincidencia.
      </p>

      {mensajeExito && (
        <p role="status" className="mt-3 rounded-card border border-surface-border-strong bg-surface-2 p-3 text-xs text-ink">
          {mensajeExito}
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="mt-3 rounded-card border border-status-error bg-paper p-3 text-xs text-status-error">
          {errorAccion}
        </p>
      )}

      <div className="mt-4">
        {errorCarga ? (
          <EstadoVacio
            tipo="error"
            titulo="No pudimos cargar las apelaciones"
            descripcion={errorCarga}
            accion={{ etiqueta: "Reintentar", onClick: () => setIntento((valor) => valor + 1) }}
          />
        ) : apelaciones === null ? (
          <p role="status" aria-busy="true" className="py-10 text-center text-sm text-subtle">
            Cargando apelaciones…
          </p>
        ) : apelaciones.length === 0 ? (
          <EstadoVacio
            titulo="No hay apelaciones pendientes"
            descripcion="Ningún autor está esperando la revisión de una decisión."
          />
        ) : (
          <ul className="space-y-4" aria-label="Apelaciones pendientes">
            {apelaciones.map((apelacion) => {
              const idRespuesta = `respuesta-apelacion-${apelacion.idApelacion}`;
              const bloqueada = !apelacion.puedeResolver || enCurso !== null;
              return (
                <li
                  key={apelacion.idApelacion}
                  className="rounded-card border border-line bg-paper p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-ink">
                        {apelacion.nombreProducto ?? `Reseña #${apelacion.idResena}`}
                      </h3>
                      <p className="mt-1 text-xs text-subtle">
                        Por {apelacion.nombreAutor} · apelada el {formatearFecha(apelacion.fechaSolicitud)}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-star">
                      {ETIQUETA_ACCION[apelacion.accion]} apelado
                    </span>
                  </div>

                  <div className="mt-3 rounded-card bg-canvas p-3">
                    <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
                      Texto revisado
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink">
                      {apelacion.comentarioRevisado ?? "Sin texto registrado"}
                    </p>
                    <p className="mt-2 text-xs text-subtle">
                      {`Decisión de ${apelacion.nombreModeradorOriginal} el ${formatearFecha(apelacion.fechaDecision)}: ${apelacion.motivoDecision}`}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-ink">
                    <span className="font-medium">Motivo del autor: </span>
                    {apelacion.motivoApelacion}
                  </p>

                  <div className="mt-3 border-t border-line pt-3">
                    {!apelacion.puedeResolver && (
                      <p className="mb-2 rounded-card border border-surface-border-strong bg-surface-2 p-2 text-xs text-star">
                        {MENSAJE_CONFLICTO_ORIGINAL}
                      </p>
                    )}
                    <label htmlFor={idRespuesta} className="block text-xs font-medium text-subtle">
                      Respuesta para el autor
                      <textarea
                        id={idRespuesta}
                        value={respuestas[apelacion.idApelacion] ?? ""}
                        onChange={(evento) => {
                          const valor = evento.target.value;
                          setRespuestas((previas) => ({ ...previas, [apelacion.idApelacion]: valor }));
                          if (errorRespuesta === apelacion.idApelacion && valor.trim() !== "") {
                            setErrorRespuesta(null);
                          }
                        }}
                        rows={2}
                        maxLength={1000}
                        disabled={!apelacion.puedeResolver}
                        aria-describedby={errorRespuesta === apelacion.idApelacion ? `${idRespuesta}-error` : undefined}
                        className={`mt-1 block w-full rounded-card border border-line bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-blue disabled:opacity-60 ${CLASE_FOCO}`}
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-subtle">
                      Opcional si aceptas; obligatoria si rechazas.
                    </p>
                    {errorRespuesta === apelacion.idApelacion && (
                      <p id={`${idRespuesta}-error`} role="alert" className="mt-1 text-xs text-status-error">
                        {MENSAJE_RESPUESTA_OBLIGATORIA}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => resolver(apelacion, "aceptar")}
                        disabled={bloqueada}
                        aria-label={`Aceptar la apelación de ${apelacion.nombreAutor}`}
                        className={`cursor-pointer rounded-card bg-brand-solid px-3 py-1.5 text-xs font-medium text-on-solid disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        {enCurso === apelacion.idApelacion ? "Guardando…" : "Aceptar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => resolver(apelacion, "rechazar")}
                        disabled={bloqueada}
                        aria-label={`Rechazar la apelación de ${apelacion.nombreAutor}`}
                        className={`cursor-pointer rounded-card border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-status-error hover:text-status-error disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
