"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

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
 * La persistencia del reporte queda pendiente de un endpoint de backend; por
 * ahora el envío se resuelve en estado local y el padre marca la reseña como
 * reportada para evitar duplicados.
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

  function enviarReporte(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    if (!motivo) {
      setError("Selecciona un motivo para continuar.");
      return;
    }

    onReportado(resenaId);
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        data-testid="backdrop-reporte"
        aria-hidden="true"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label="Reportar reseña"
        onKeyDown={manejarTeclaDialogo}
        className="relative w-full max-w-md rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
      >
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          Reportar reseña
        </h2>
        <p className="mt-1 text-sm text-[var(--color-subtle)]">
          Cuéntanos por qué esta opinión debería revisarse.
        </p>

        <form onSubmit={enviarReporte}>
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              Motivo
            </legend>
            <ul className="mt-2 space-y-2">
              {MOTIVOS_REPORTE.map((opcion, indice) => (
                <li key={opcion.valor}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-ink)]">
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
                      className="h-4 w-4 accent-[var(--color-brand-blue)]"
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
                className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
              >
                Cuéntanos qué ocurre
              </label>
              <textarea
                id="detalle-reporte"
                rows={3}
                value={detalle}
                onChange={(evento) => setDetalle(evento.target.value)}
                className="mt-1 w-full resize-y rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-1.5 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
            >
              Enviar reporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
