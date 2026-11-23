"use client";

import { useEffect, useState } from "react";
import { ApiError, crearApelacion, obtenerMisDecisiones } from "@/services/api";
import type { DecisionApelable, EstadoApelacion } from "@/types/moderacion";
import { CLASE_FOCO } from "@/components/ui/foco";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatear(valor: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : FORMATO_FECHA.format(fecha);
}

const ETIQUETA_ACCION: Record<DecisionApelable["accion"], string> = {
  RECHAZAR: "Rechazada por moderación",
  OCULTAR: "Ocultada por moderación",
};

const ETIQUETA_ESTADO: Record<EstadoApelacion, string> = {
  PENDIENTE: "En revisión",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
};

export const MENSAJE_MOTIVO_OBLIGATORIO = "Explica por qué crees que la decisión fue un error.";

/**
 * Caso 6: decisiones de moderación recientes sobre las reseñas del usuario,
 * con la opción de apelarlas en un plazo de 15 días. Sin decisiones, o si la
 * consulta falla, no muestra nada.
 */
export default function DecisionesModeracion({ idUsuario }: { idUsuario: number | null | undefined }) {
  const [decisiones, setDecisiones] = useState<DecisionApelable[] | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (!idUsuario) return;
    let activo = true;
    obtenerMisDecisiones()
      .then((datos) => {
        if (activo) setDecisiones(datos);
      })
      .catch(() => {
        if (activo) setDecisiones(null);
      });
    return () => {
      activo = false;
    };
  }, [idUsuario]);

  if (!idUsuario || !decisiones || decisiones.length === 0) return null;

  function abrir(decision: DecisionApelable) {
    setAbierta(decision.idAuditoria);
    setMotivo("");
    setErrorMotivo(false);
    setErrorEnvio(null);
  }

  async function enviar(decision: DecisionApelable) {
    if (enviando) return;
    if (motivo.trim() === "") {
      setErrorMotivo(true);
      return;
    }
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const apelacion = await crearApelacion(decision.idResena, motivo);
      setDecisiones((previas) =>
        previas?.map((d) =>
          d.idAuditoria === decision.idAuditoria ? { ...d, apelable: false, apelacion } : d,
        ) ?? previas,
      );
      setAbierta(null);
    } catch (err) {
      setErrorEnvio(err instanceof ApiError ? err.message : "No fue posible enviar la apelación.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-decisiones-moderacion" className="mt-4">
      <h2 id="titulo-decisiones-moderacion" className="text-sm font-semibold text-[var(--color-ink)]">
        Decisiones de moderación
      </h2>
      <p className="mt-1 text-xs text-[var(--color-subtle)]">
        Decisiones de los últimos 90 días sobre tus reseñas. Si crees que alguna fue un error, puedes
        apelarla durante 15 días; la revisará otra persona.
      </p>
      <ul className="mt-2 space-y-2">
        {decisiones.map((decision) => {
          const idMotivo = `motivo-apelacion-${decision.idAuditoria}`;
          return (
            <li
              key={decision.idAuditoria}
              className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {decision.nombreProducto ?? `Reseña #${decision.idResena}`}
                  </p>
                  <p className="text-xs text-[var(--color-subtle)]">
                    {`${ETIQUETA_ACCION[decision.accion]} el ${formatear(decision.fechaDecision)}: ${decision.motivoDecision}`}
                  </p>
                </div>
                {decision.apelacion && (
                  <span className="rounded-full bg-[var(--color-canvas)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink)]">
                    {ETIQUETA_ESTADO[decision.apelacion.estado]}
                  </span>
                )}
              </div>
              {decision.comentarioRevisado && (
                <p className="mt-2 whitespace-pre-line rounded-md bg-[var(--color-canvas)] p-2 text-xs text-[var(--color-ink)]">
                  {decision.comentarioRevisado}
                </p>
              )}
              {decision.apelacion?.respuesta && (
                <p className="mt-2 text-xs text-[var(--color-ink)]">
                  <span className="font-semibold">Respuesta de moderación: </span>
                  {decision.apelacion.respuesta}
                </p>
              )}

              {decision.apelable && abierta !== decision.idAuditoria && (
                <button
                  type="button"
                  onClick={() => abrir(decision)}
                  aria-label={`Apelar la decisión sobre ${decision.nombreProducto ?? `la reseña #${decision.idResena}`}`}
                  className={`mt-2 cursor-pointer rounded-md border border-[var(--color-hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                >
                  Apelar
                </button>
              )}

              {abierta === decision.idAuditoria && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-[var(--color-subtle)]">
                    {`Puedes apelar hasta el ${formatear(decision.plazoHasta)}. Explica por qué crees que la decisión fue un error.`}
                  </p>
                  <label htmlFor={idMotivo} className="block text-xs font-medium text-[var(--color-subtle)]">
                    Motivo de la apelación
                    <textarea
                      id={idMotivo}
                      value={motivo}
                      onChange={(evento) => {
                        setMotivo(evento.target.value);
                        if (evento.target.value.trim() !== "") setErrorMotivo(false);
                      }}
                      rows={3}
                      maxLength={1000}
                      aria-describedby={errorMotivo ? `${idMotivo}-error` : undefined}
                      className={`mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    />
                  </label>
                  {errorMotivo && (
                    <p id={`${idMotivo}-error`} role="alert" className="text-xs text-red-700">
                      {MENSAJE_MOTIVO_OBLIGATORIO}
                    </p>
                  )}
                  {errorEnvio && (
                    <p role="alert" className="text-xs text-red-700">
                      {errorEnvio}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => enviar(decision)}
                      disabled={enviando}
                      className={`cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-solid)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                    >
                      {enviando ? "Enviando…" : "Enviar apelación"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbierta(null)}
                      className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] ${CLASE_FOCO}`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
