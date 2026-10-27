"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  editarResena,
  eliminarResena,
  type ResenaResponse,
} from "@/services/api";

const SELECTOR_ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const MENSAJE_ERROR =
  "No fue posible completar la acción. Inténtalo de nuevo más tarde.";

interface EditarResenaProps {
  resena: ResenaResponse;
  onEditada: (resena: ResenaResponse) => void;
  onEliminada: (idResena: number) => void;
}

type DialogoAbierto = "editar" | "eliminar" | null;

/**
 * Acciones de edición y eliminación para reseñas propias (TEC-75).
 * Los endpoints `PUT`/`DELETE /api/resenas/{id}` quedan a la espera de los
 * contratos de MG (TEC-76/77/78); si aún no existen, el error del backend se
 * muestra de forma controlada sin bloquear la interfaz.
 */
export default function EditarResena({
  resena,
  onEditada,
  onEliminada,
}: EditarResenaProps) {
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);
  const [comentario, setComentario] = useState(resena.comentario);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const dialogoRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!dialogo) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (dialogo === "editar") {
      areaRef.current?.focus();
      areaRef.current?.setSelectionRange(
        areaRef.current.value.length,
        areaRef.current.value.length
      );
    }

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) {
        evento.preventDefault();
        setDialogo(null);
      }
    }

    window.addEventListener("keydown", manejarEscape);
    return () => {
      window.removeEventListener("keydown", manejarEscape);
      document.body.style.overflow = overflowPrevio;
    };
  }, [dialogo, enviando]);

  function abrirEdicion() {
    setComentario(resena.comentario);
    setError("");
    setDialogo("editar");
  }

  function abrirEliminacion() {
    setError("");
    setDialogo("eliminar");
  }

  function cerrar() {
    if (enviando) return;
    setDialogo(null);
  }

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

  async function confirmarEliminacion() {
    setError("");
    setEnviando(true);

    try {
      await eliminarResena(resena.idResena);
      onEliminada(resena.idResena);
      setDialogo(null);
    } catch {
      setError(MENSAJE_ERROR);
    } finally {
      setEnviando(false);
    }
  }

  async function guardarEdicion(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    const texto = comentario.trim();
    if (!texto) {
      setError("Escribe tu opinión antes de guardar.");
      return;
    }

    setEnviando(true);
    try {
      const actualizada = await editarResena(resena.idResena, texto);
      onEditada(actualizada);
      setDialogo(null);
    } catch {
      setError(MENSAJE_ERROR);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-1">
        <button
          type="button"
          onClick={abrirEdicion}
          aria-label="Editar reseña"
          className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-brand-blue)]"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={abrirEliminacion}
          aria-label="Eliminar reseña"
          className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-[var(--color-subtle)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-status-error)]"
        >
          Eliminar
        </button>
      </div>

      {dialogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            onClick={cerrar}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              dialogo === "editar" ? "Editar reseña" : "Eliminar reseña"
            }
            onKeyDown={manejarTeclaDialogo}
            className="relative w-full max-w-md rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
          >
            {dialogo === "eliminar" ? (
              <>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">
                  ¿Deseas eliminar tu opinión?
                </h2>
                <p className="mt-1 text-sm text-[var(--color-subtle)]">
                  Esta acción no se puede deshacer.
                </p>
                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cerrar}
                    className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarEliminacion}
                    disabled={enviando}
                    className="cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando ? "Eliminando…" : "Eliminar"}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={guardarEdicion}>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">
                  Editar reseña
                </h2>
                <label
                  htmlFor="editar-comentario-resena"
                  className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]"
                >
                  Tu reseña actualizada
                </label>
                <textarea
                  ref={areaRef}
                  id="editar-comentario-resena"
                  rows={4}
                  value={comentario}
                  onChange={(evento) => setComentario(evento.target.value)}
                  className="mt-1 w-full resize-y rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]"
                />
                {error && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cerrar}
                    className="cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-1.5 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {enviando ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
