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
    <div className="rounded-card border border-hairline bg-paper p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-brand-solid"
            aria-hidden="true"
          />
          <h3 className="text-sm font-medium text-ink">
            Presupuesto máximo
          </h3>
        </div>

        <div className="inline-flex items-center gap-2 rounded-card border border-hairline bg-canvas px-3.5 py-1.5">
          <span className="text-[11px] font-medium text-subtle">
            Hasta:
          </span>
          <span className="text-sm font-medium tracking-normal text-brand-blue">
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
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hairline accent-brand-blue"
        />
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-subtle">
          <span>Mínimo: $ 200.000 COP</span>
          <span className="font-medium text-ink">
            Límite: {formatearCOP(presupuestoMax)}
          </span>
          <span>Máximo: $ 6.000.000 COP</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dotted border-line pt-4">
        <p className="text-xs text-subtle">
          <span className="font-medium text-ink">
            {totalEnPresupuesto}
          </span>{" "}
          de {totalProductos} dentro del presupuesto
        </p>

        <button
          type="button"
          onClick={() => onConfirmarPresupuesto(presupuestoMax)}
          title="Ver productos de todas las categorías dentro de este presupuesto"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-card border border-hairline bg-canvas px-3 py-1.5 text-xs font-medium text-subtle transition-colors hover:border-line hover:text-ink"
        >
          Filtrar por presupuesto
        </button>
      </div>
    </div>
  );
}
