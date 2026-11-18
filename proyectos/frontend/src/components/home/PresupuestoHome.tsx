import { useRef, type KeyboardEvent, type SyntheticEvent } from "react";
import { formatearCOP } from "@/data/specsHelper";

export interface PresupuestoHomeProps {
  presupuestoMax: number;
  onCambiarPresupuesto: (valor: number) => void;
  /**
   * Confirma desde el botón o al terminar un ajuste del slider.
   * El valor actual del control está expresado en COP (200.000–6.000.000).
   */
  onConfirmarPresupuesto: (valor: number) => void;
  totalEnPresupuesto: number;
  totalProductos: number;
}

export default function PresupuestoHome({
  presupuestoMax,
  onCambiarPresupuesto,
  onConfirmarPresupuesto,
  totalEnPresupuesto,
  totalProductos,
}: PresupuestoHomeProps) {
  const ultimoConfirmadoRef = useRef<number | null>(null);

  function manejarFinAjuste(evento: SyntheticEvent<HTMLInputElement>) {
    const valor = Number(evento.currentTarget.value);
    // Un gesto puede emitir pointerup y después mouseup/touchend.
    if (ultimoConfirmadoRef.current === valor) return;
    ultimoConfirmadoRef.current = valor;
    onConfirmarPresupuesto(valor);
  }

  function manejarFinTeclado(evento: KeyboardEvent<HTMLInputElement>) {
    if ([
      "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown",
      "Home", "End", "PageUp", "PageDown", "Enter",
    ].includes(evento.key)) {
      manejarFinAjuste(evento);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)] sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-[var(--color-brand-solid)]"
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            Presupuesto máximo
          </h3>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3.5 py-1.5">
          <span className="text-[11px] font-medium text-[var(--color-subtle)]">
            Hasta:
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--color-brand-blue)]">
            {formatearCOP(presupuestoMax)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min="200000"
          max="6000000"
          step="100000"
          value={presupuestoMax}
          onChange={(evento) => {
            ultimoConfirmadoRef.current = null;
            onCambiarPresupuesto(Number(evento.target.value));
          }}
          onPointerUp={manejarFinAjuste}
          onMouseUp={manejarFinAjuste}
          onTouchEnd={manejarFinAjuste}
          onKeyUp={manejarFinTeclado}
          aria-label="Ajustar presupuesto máximo en pesos colombianos"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-hairline)] accent-[var(--color-brand-blue)]"
        />
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-[var(--color-subtle)]">
          <span>Mínimo: $ 200.000 COP</span>
          <span className="font-semibold text-[var(--color-ink)]">
            Límite: {formatearCOP(presupuestoMax)}
          </span>
          <span>Máximo: $ 6.000.000 COP</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-hairline)] pt-4">
        <p className="text-xs text-[var(--color-subtle)]">
          <span className="font-semibold text-[var(--color-ink)]">
            {totalEnPresupuesto}
          </span>{" "}
          de {totalProductos} dentro del presupuesto
        </p>

        <button
          type="button"
          onClick={() => onConfirmarPresupuesto(presupuestoMax)}
          title="Ver productos de todas las categorías dentro de este presupuesto"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)]/40 hover:text-[var(--color-ink)]"
        >
          Filtrar por presupuesto
        </button>
      </div>
    </div>
  );
}
