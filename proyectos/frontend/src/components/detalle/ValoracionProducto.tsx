"use client";

import type { UsuarioSesion } from "@/types/producto";
import type { ValoracionPublicaStats } from "@/services/api";
import RatingStars from "@/components/catalogo/RatingStars";

interface ValoracionProductoProps {
  idProducto: number;
  usuario?: UsuarioSesion | null;
  cargandoSesion?: boolean;
  stats: ValoracionPublicaStats | null;
  onPedirLogin?: () => void;
  onActualizarStats?: () => void;
}

export default function ValoracionProducto({
  stats,
}: ValoracionProductoProps) {
  const promedio = stats?.promedioPuntuacion ?? null;
  const hayPromedio = promedio !== null && (stats?.cantidadValoraciones ?? 0) > 0;

  return (
    <section
      aria-labelledby="titulo-valoracion"
      className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="titulo-valoracion"
            className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Valoración de la comunidad
          </h2>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">
            Estrellas otorgadas por usuarios registrados a través de sus opiniones.
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          {hayPromedio ? (
            <>
              <p className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                {promedio.toFixed(1).replace(".", ",")}
                <span className="ml-1 text-sm font-medium text-[var(--color-subtle)]">
                  / 5
                </span>
              </p>
              <div className="mt-1">
                <RatingStars
                  rating={promedio}
                  cantidadResenas={stats?.cantidadValoraciones ?? null}
                  tamano="md"
                  etiquetaCantidad="opiniones"
                />
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-[var(--color-subtle)]">
              Sin valoraciones todavía
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
