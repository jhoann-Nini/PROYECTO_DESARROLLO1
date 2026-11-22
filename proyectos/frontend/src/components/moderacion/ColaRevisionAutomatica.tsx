"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ResenaEnRevisionResponse } from "@/types/moderacion";
import {
  ApiError,
  decidirRevisionResena,
  obtenerResenasEnRevision,
} from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

type Decision = "aprobar" | "rechazar";

export const MENSAJE_JUSTIFICACION_RECHAZO =
  "La justificación es obligatoria para rechazar una reseña.";

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

/**
 * Cola de reseñas retenidas por el filtro automático (H-01).
 * Ningún usuario las reportó: el filtro las detuvo antes de publicarlas y
 * esperan una decisión humana. Cada decisión queda auditada en el backend.
 */
export default function ColaRevisionAutomatica() {
  const [resenas, setResenas] = useState<ResenaEnRevisionResponse[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [justificaciones, setJustificaciones] = useState<Record<number, string>>({});
  const [errorJustificacion, setErrorJustificacion] = useState<number | null>(null);
  const [enCurso, setEnCurso] = useState<{ idResena: number; decision: Decision } | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerResenasEnRevision()
      .then((datos) => {
        if (!activo) return;
        setResenas(datos);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(
          err instanceof Error ? err.message : "No fue posible cargar las reseñas en revisión.",
        );
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  async function decidir(resena: ResenaEnRevisionResponse, decision: Decision) {
    if (enCurso) return;
    const motivo = (justificaciones[resena.idResena] ?? "").trim();
    if (decision === "rechazar" && motivo === "") {
      setErrorJustificacion(resena.idResena);
      setMensajeExito(null);
      setErrorAccion(null);
      return;
    }

    setErrorJustificacion(null);
    setEnCurso({ idResena: resena.idResena, decision });
    setMensajeExito(null);
    setErrorAccion(null);

    try {
      await decidirRevisionResena(resena.idResena, decision, motivo || undefined);
      setResenas((previas) => previas?.filter((item) => item.idResena !== resena.idResena) ?? previas);
      setJustificaciones((previas) => ({ ...previas, [resena.idResena]: "" }));
      const autor = resena.nombreUsuario ?? "el usuario";
      setMensajeExito(
        decision === "aprobar"
          ? `Reseña de ${autor} aprobada y publicada.`
          : `Reseña de ${autor} rechazada. No se publicará.`,
      );
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError ? err.message : "No fue posible registrar la decisión.",
      );
    } finally {
      setEnCurso(null);
    }
  }

  const accionActual = (idResena: number, decision: Decision) =>
    enCurso?.idResena === idResena && enCurso.decision === decision;

  return (
    <div>
      <p className="mt-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-subtle)]">
        El filtro automático retuvo estas reseñas antes de publicarlas (enlaces, lenguaje no
        permitido o texto repetido). No son visibles para nadie hasta que las apruebes. Rechazar
        exige una justificación; ambas decisiones quedan registradas con tu usuario y la fecha.
      </p>

      {mensajeExito && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {mensajeExito}
        </p>
      )}

      {errorAccion && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {errorAccion}
        </p>
      )}

      <div className="mt-4">
        {errorCarga ? (
          <EstadoVacio
            tipo="error"
            titulo="No pudimos cargar las reseñas en revisión"
            descripcion={errorCarga}
            accion={{ etiqueta: "Reintentar", onClick: () => setIntento((valor) => valor + 1) }}
          />
        ) : resenas === null ? (
          <p role="status" aria-busy="true" className="py-10 text-center text-sm text-[var(--color-subtle)]">
            Cargando reseñas en revisión…
          </p>
        ) : resenas.length === 0 ? (
          <EstadoVacio
            titulo="No hay reseñas en revisión"
            descripcion="El filtro automático no tiene reseñas retenidas en este momento."
          />
        ) : (
          <ul className="space-y-4" aria-label="Reseñas en revisión">
            {resenas.map((resena) => (
              <li
                key={resena.idResena}
                className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                      {resena.idProducto !== null ? (
                        <Link
                          href={`/productos/${resena.idProducto}`}
                          className={`text-[var(--color-brand-blue)] hover:underline ${CLASE_FOCO}`}
                        >
                          {resena.nombreProducto ?? `Producto #${resena.idProducto}`}
                        </Link>
                      ) : (
                        "Producto no disponible"
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-subtle)]">
                      Por {resena.nombreUsuario ?? "Usuario"} · {formatearFecha(resena.fechaCreacion)}
                      {typeof resena.puntuacion === "number" && ` · ${resena.puntuacion}/5`}
                    </p>
                  </div>
                  <span className="flex flex-wrap gap-1">
                    {resena.riesgo === "ALTO" && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-800">
                        Prioridad alta
                      </span>
                    )}
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      En revisión
                    </span>
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">
                  {resena.comentario}
                </p>

                {resena.motivosDeteccion.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--color-subtle)]">
                    Motivo de la retención: {resena.motivosDeteccion.join(" · ")}
                  </p>
                )}

                <div className="mt-3 border-t border-[var(--color-hairline)] pt-3">
                  <label
                    htmlFor={`justificacion-revision-${resena.idResena}`}
                    className="block text-xs font-medium text-[var(--color-subtle)]"
                  >
                    Justificación
                    <textarea
                      id={`justificacion-revision-${resena.idResena}`}
                      value={justificaciones[resena.idResena] ?? ""}
                      onChange={(evento) => {
                        const valor = evento.target.value;
                        setJustificaciones((previas) => ({ ...previas, [resena.idResena]: valor }));
                        if (errorJustificacion === resena.idResena && valor.trim() !== "") {
                          setErrorJustificacion(null);
                        }
                      }}
                      rows={2}
                      maxLength={2000}
                      className={`mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-[var(--color-subtle)]">
                    Obligatoria para rechazar; opcional para aprobar.
                  </p>

                  {errorJustificacion === resena.idResena && (
                    <p
                      role="alert"
                      className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700"
                    >
                      {MENSAJE_JUSTIFICACION_RECHAZO}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => decidir(resena, "aprobar")}
                      disabled={enCurso !== null}
                      aria-label={`Aprobar reseña de ${resena.nombreUsuario ?? "usuario"}`}
                      className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-blue)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                    >
                      {accionActual(resena.idResena, "aprobar") ? "Aprobando…" : "Aprobar y publicar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => decidir(resena, "rechazar")}
                      disabled={enCurso !== null}
                      aria-label={`Rechazar reseña de ${resena.nombreUsuario ?? "usuario"}`}
                      className={`cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                    >
                      {accionActual(resena.idResena, "rechazar") ? "Rechazando…" : "Rechazar"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
