import { CLASE_FOCO } from "@/components/ui/foco";

interface BotonBusquedaGlobalProps {
  abierto: boolean;
  onAbrir: () => void;
  variante?: "encabezado" | "inicio" | "icono";
  busqueda?: string;
}

export default function BotonBusquedaGlobal({
  abierto,
  onAbrir,
  variante = "encabezado",
  busqueda = "",
}: BotonBusquedaGlobalProps) {
  const esInicio = variante === "inicio";
  const esIcono = variante === "icono";

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label="Abrir búsqueda (Ctrl+K o Cmd+K)"
      aria-haspopup="dialog"
      aria-expanded={abierto}
      aria-keyshortcuts="Control+K Meta+K"
      title="Buscar dispositivos (Ctrl+K)"
      className={`inline-flex cursor-pointer items-center gap-2 rounded-card border border-line bg-canvas text-subtle transition-colors hover:border-brand-blue hover:text-brand-blue ${
        esInicio
          ? "min-h-14 w-full px-4 text-left"
          : esIcono
            ? "h-10 w-10 shrink-0 justify-center rounded-full p-0"
            : "h-11 w-11 shrink-0 justify-center px-3 xl:w-56 xl:justify-start 2xl:w-64"
      } ${CLASE_FOCO}`}
    >
      <svg
        className={esInicio ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      {esInicio ? (
        <span className={`min-w-0 flex-1 truncate text-sm font-normal normal-case sm:text-base ${busqueda ? "text-ink" : "text-subtle"}`}>
          {busqueda || "Busca por marca o modelo. Ej.: Galaxy S24, iPhone 16"}
        </span>
      ) : !esIcono && (
        <span className="hidden text-label font-medium uppercase tracking-normal xl:inline">
          Buscar
        </span>
      )}
      {!esIcono && (
        <kbd className={`shrink-0 rounded-card border border-line bg-paper px-2 py-1 font-sans font-medium text-micro text-subtle ${
          esInicio ? "hidden sm:inline" : "ml-auto hidden xl:inline"
        }`}>
          Ctrl K
        </kbd>
      )}
    </button>
  );
}
