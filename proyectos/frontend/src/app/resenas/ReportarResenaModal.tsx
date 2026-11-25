"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { CLASE_FOCO } from "@/components/ui/foco";
import { buttonClassName } from "@/components/ui/Button";
import { crearReporteResena } from "@/services/api";

const SELECTOR_ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const MOTIVOS_REPORTE = [
  { valor: "spam", etiqueta: "Spam" },
  { valor: "lenguaje-ofensivo", etiqueta: "Lenguaje ofensivo" },
  { valor: "falso", etiqueta: "Falso" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

type MotivoReporte = (typeof MOTIVOS_REPORTE)[number]["valor"];

interface ReportarResenaModalProps {
  resenaId: number;
  abierto: boolean;
  onCerrar: () => void;
  onReportado: (resenaId: number) => void;
}

/**
 * Modal accesible para reportar una reseña ajena (TEC-103).
 * El reporte se persiste en el backend y solo se confirma en la interfaz
 * cuando el servidor responde correctamente.
 */
export default function ReportarResenaModal({
  resenaId,
  abierto,
  onCerrar,
  onReportado,
}: ReportarResenaModalProps) {
  const [motivo, setMotivo] = useState<MotivoReporte | "">("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const primerRadioRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primerRadioRef.current?.focus();

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
      }
    }

    window.addEventListener("keydown", manejarEscape);
    return () => {
      window.removeEventListener("keydown", manejarEscape);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  function manejarTeclaDialogo(evento: ReactKeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Tab") return;

    const contenedor = dialogoRef.current;
    if (!contenedor) return;

    const enfocables = Array.from(
      contenedor.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
    ).filter((elemento) => elemento.tabIndex >= 0);

    if (enfocables.length === 0) {
      evento.preventDefault();
      contenedor.focus();
      return;
    }

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = document.activeElement;

    if (evento.shiftKey && activo === primero) {
      evento.preventDefault();
      ultimo.focus();
      return;
    }

    if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
      return;
    }

    if (!contenedor.contains(activo)) {
      evento.preventDefault();
      primero.focus();
    }
  }

  async function enviarReporte(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    if (!motivo) {
      setError("Selecciona un motivo para continuar.");
      return;
    }

    if (motivo === "otro" && !detalle.trim()) {
      setError("La descripción es obligatoria cuando el motivo es 'otro'.");
      return;
    }

    if (detalle.trim().length > 2000) {
      setError("La descripción no puede superar los 2000 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      await crearReporteResena(resenaId, {
        motivo,
        ...(detalle.trim() ? { descripcion: detalle.trim() } : {}),
      });
      onReportado(resenaId);
      onCerrar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible enviar el reporte. Inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        data-testid="backdrop-reporte"
        aria-hidden="true"
        onClick={() => {
          if (!enviando) onCerrar();
        }}
        className="absolute inset-0 bg-inverse/50"
      />
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label="Reportar reseña"
        onKeyDown={manejarTeclaDialogo}
        className="relative w-full max-w-md rounded-card border border-line bg-paper p-5"
      >
        <h2 className="text-base font-medium uppercase text-ink">
          Reportar reseña
        </h2>
        <p className="mt-1 text-sm text-subtle">
          Cuéntanos por qué esta opinión debería revisarse.
        </p>

        <form onSubmit={enviarReporte}>
          <fieldset className="mt-4">
            <legend className="text-xs font-medium uppercase tracking-normal text-subtle">
              Motivo
            </legend>
            <ul className="mt-2 space-y-2">
              {MOTIVOS_REPORTE.map((opcion, indice) => (
                <li key={opcion.valor}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input
                      ref={indice === 0 ? primerRadioRef : undefined}
                      type="radio"
                      name="motivo-reporte"
                      value={opcion.valor}
                      checked={motivo === opcion.valor}
                      onChange={() => {
                        setMotivo(opcion.valor);
                        setError("");
                      }}
                      className={`h-4 w-4 accent-brand-blue ${CLASE_FOCO}`}
                    />
                    {opcion.etiqueta}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          {motivo === "otro" && (
            <div className="mt-3">
              <label
                htmlFor="detalle-reporte"
                className="block text-xs font-medium uppercase tracking-normal text-subtle"
              >
                Cuéntanos qué ocurre
              </label>
              <textarea
                id="detalle-reporte"
                rows={3}
                value={detalle}
                onChange={(evento) => setDetalle(evento.target.value)}
                className={`mt-1 min-h-24 w-full resize-y rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink ${CLASE_FOCO}`}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-status-error">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className={buttonClassName("secondary", "text-sm")}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className={buttonClassName("primary", "text-sm")}
            >
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
