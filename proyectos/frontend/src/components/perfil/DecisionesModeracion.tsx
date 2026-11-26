"use client";

import { useEffect, useState } from "react";
import { ApiError, crearApelacion, obtenerMisDecisiones } from "@/services/api";
import type { DecisionApelable, EstadoApelacion } from "@/types/moderacion";
import { CLASE_FOCO } from "@/components/ui/foco";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";

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
      <h2 id="titulo-decisiones-moderacion" className="text-sm font-medium uppercase text-ink">
        Decisiones de moderación
      </h2>
      <p className="mt-1 text-xs text-subtle">
        Decisiones de los últimos 90 días sobre tus reseñas. Si crees que alguna fue un error, puedes
        apelarla durante 15 días; la revisará otra persona.
      </p>
      <ul className="mt-2 space-y-2">
        {decisiones.map((decision) => {
          const idMotivo = `motivo-apelacion-${decision.idAuditoria}`;
          return (
            <li
              key={decision.idAuditoria}
              className="rounded-card border border-line bg-paper p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium uppercase text-ink">
                    {decision.nombreProducto ?? `Reseña #${decision.idResena}`}
                  </p>
                  <p className="text-xs text-subtle">
                    {`${ETIQUETA_ACCION[decision.accion]} el ${formatear(decision.fechaDecision)}: ${decision.motivoDecision}`}
                  </p>
                </div>
                {decision.apelacion && (
                  <Tag variant={decision.apelacion.estado === "PENDIENTE" ? "pending" : "neutral"}>
                    {ETIQUETA_ESTADO[decision.apelacion.estado]}
                  </Tag>
                )}
              </div>
              {decision.comentarioRevisado && (
                <p className="mt-2 whitespace-pre-line rounded-card bg-canvas p-2 text-xs text-text-body">
                  {decision.comentarioRevisado}
                </p>
              )}
              {decision.apelacion?.respuesta && (
                <p className="mt-2 text-xs text-ink">
                  <span className="font-medium">Respuesta de moderación: </span>
                  {decision.apelacion.respuesta}
                </p>
              )}

              {decision.apelable && abierta !== decision.idAuditoria && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => abrir(decision)}
                  aria-label={`Apelar la decisión sobre ${decision.nombreProducto ?? `la reseña #${decision.idResena}`}`}
                  className="mt-2"
                >
                  Apelar
                </Button>
              )}

              {abierta === decision.idAuditoria && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-subtle">
                    {`Puedes apelar hasta el ${formatear(decision.plazoHasta)}. Explica por qué crees que la decisión fue un error.`}
                  </p>
                  <label htmlFor={idMotivo} className="block text-xs font-medium text-subtle">
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
                      className={`mt-1 block min-h-24 w-full resize-y rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink ${CLASE_FOCO}`}
                    />
                  </label>
                  {errorMotivo && (
                    <p id={`${idMotivo}-error`} role="alert" className="text-xs text-status-error">
                      {MENSAJE_MOTIVO_OBLIGATORIO}
                    </p>
                  )}
                  {errorEnvio && (
                    <p role="alert" className="text-xs text-status-error">
                      {errorEnvio}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => enviar(decision)}
                      disabled={enviando}
                    >
                      {enviando ? "Enviando…" : "Enviar apelación"}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setAbierta(null)}
                    >
                      Cancelar
                    </Button>
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
