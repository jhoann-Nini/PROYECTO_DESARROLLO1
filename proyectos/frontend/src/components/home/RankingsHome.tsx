"use client";

import type { ReactNode } from "react";
import RankingItem from "@/components/RankingItem";
import type {
  ProductoDeseado,
  ProductoMasComentado,
  ProductoMejorValorado,
} from "@/types/producto";

export interface RankingsHomeProps {
  mejorValorados: ProductoMejorValorado[];
  cargandoMejorValorados: boolean;
  errorMejorValorados: string | null;
  onReintentarMejorValorados: () => void;
  mostrarTodosMejorValorados: boolean;
  onAlternarMejorValorados: () => void;
  masComentados: ProductoMasComentado[];
  cargandoMasComentados: boolean;
  errorMasComentados: string | null;
  onReintentarMasComentados: () => void;
  mostrarTodosComentados: boolean;
  onAlternarComentados: () => void;
  masDeseados: ProductoDeseado[];
  cargandoMasDeseados: boolean;
  errorMasDeseados: string | null;
  onReintentarMasDeseados: () => void;
  onVerDetalle: (
    item: ProductoMejorValorado | ProductoMasComentado | ProductoDeseado,
  ) => void;
  sinValoraciones?: boolean;
  sinComentarios?: boolean;
  sinDeseos?: boolean;
}

interface ColumnaRankingProps {
  titulo: string;
  subtitulo: string;
  cantidad: number;
  cargando: boolean;
  mensajeCargando: string;
  error: string | null;
  onReintentar: () => void;
  etiquetaReintento: string;
  vacio: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
}

function ColumnaRanking({
  titulo,
  subtitulo,
  cantidad,
  cargando,
  mensajeCargando,
  error,
  onReintentar,
  etiquetaReintento,
  vacio,
  pie,
  children,
}: ColumnaRankingProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)] sm:p-6">
      <div className="flex flex-1 flex-col">
        <div className="mb-6 border-b border-[var(--color-hairline)] pb-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)] sm:text-xl">
              <span className="text-[var(--color-brand-blue)]">/</span> {titulo}
            </h3>
            <span className="shrink-0 pt-1 text-[11px] font-medium text-[var(--color-subtle)]">
              ({cantidad} dispositivos)
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-subtle)]">
            {"//"} {subtitulo}
          </p>
          <div className="mt-3 h-0.5 w-12 rounded-full bg-[var(--color-brand-blue)]/70" />
        </div>

        <div className="flex-1 space-y-3.5">
          {cargando ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              aria-live="polite"
              aria-busy="true"
            >
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-hairline)] border-t-[var(--color-brand-blue)]"
                aria-hidden="true"
              />
              <p className="mt-3 text-xs text-[var(--color-subtle)]">
                {mensajeCargando}
              </p>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-md border border-[var(--color-star)]/30 bg-[var(--color-star)]/10 p-6 text-center text-xs"
            >
              <p className="font-medium text-[var(--color-ink)]">⚠️ {error}</p>
              <button
                type="button"
                onClick={onReintentar}
                aria-label={etiquetaReintento}
                className="mt-3 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
              >
                {etiquetaReintento}
              </button>
            </div>
          ) : cantidad > 0 ? (
            children
          ) : (
            vacio
          )}
        </div>
      </div>

      {pie && (
        <div className="mt-6 border-t border-[var(--color-hairline)] pt-4 text-center">
          {pie}
        </div>
      )}
    </div>
  );
}

function BotonListaCompleta({
  mostrarTodos,
  cantidad,
  onAlternar,
}: {
  mostrarTodos: boolean;
  cantidad: number;
  onAlternar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      className="w-full cursor-pointer rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] py-2.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)]/40 hover:text-[var(--color-brand-blue)]"
    >
      {mostrarTodos
        ? "Ocultar listado"
        : `Ver lista completa (${cantidad})`}
    </button>
  );
}

export default function RankingsHome({
  mejorValorados,
  cargandoMejorValorados,
  errorMejorValorados,
  onReintentarMejorValorados,
  mostrarTodosMejorValorados,
  onAlternarMejorValorados,
  masComentados,
  cargandoMasComentados,
  errorMasComentados,
  onReintentarMasComentados,
  mostrarTodosComentados,
  onAlternarComentados,
  masDeseados,
  cargandoMasDeseados,
  errorMasDeseados,
  onReintentarMasDeseados,
  onVerDetalle,
  sinValoraciones,
  sinComentarios,
  sinDeseos,
}: RankingsHomeProps) {
  const vacioValoraciones =
    sinValoraciones ?? mejorValorados.length === 0;
  const vacioComentarios =
    sinComentarios ?? masComentados.length === 0;
  const vacioDeseos = sinDeseos ?? masDeseados.length === 0;

  return (
    <section
      aria-labelledby="seccion-rankings"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mb-6">
        <h2
          id="seccion-rankings"
          className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl"
        >
          Rankings de la comunidad.
        </h2>
        <p className="mt-1 text-sm text-[var(--color-subtle)]">
          Los dispositivos que más puntuación, conversación e interés generan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        <ColumnaRanking
          titulo="Mejor valorados."
          subtitulo="Puntuación real de usuarios registrados"
          cantidad={mejorValorados.length}
          cargando={cargandoMejorValorados}
          mensajeCargando="Cargando valoraciones reales..."
          error={errorMejorValorados}
          onReintentar={onReintentarMejorValorados}
          etiquetaReintento="Reintentar valoraciones"
          vacio={
            <div className="rounded-md border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 text-center text-sm text-[var(--color-subtle)]">
              {vacioValoraciones
                ? "Aún no hay productos con valoraciones registradas en el catálogo."
                : "No se encontraron dispositivos con este filtro."}
            </div>
          }
          pie={
            mejorValorados.length > 4 ? (
              <BotonListaCompleta
                mostrarTodos={mostrarTodosMejorValorados}
                cantidad={mejorValorados.length}
                onAlternar={onAlternarMejorValorados}
              />
            ) : null
          }
        >
          {(mostrarTodosMejorValorados
            ? mejorValorados
            : mejorValorados.slice(0, 4)
          ).map((item) => (
            <RankingItem
              key={`mejor-${item.idProducto}`}
              ranking={item.posicionRanking}
              nombre={item.nombre}
              descripcion={item.descripcion}
              imagen={item.imagen}
              categoria={item.idCategoria}
              precio={item.precioReferencia}
              metricaTipo="valoracion"
              puntuacion={item.promedioPuntuacion}
              cantidadValoraciones={item.cantidadValoraciones}
              onVerDetalle={() => onVerDetalle(item)}
            />
          ))}
        </ColumnaRanking>

        <ColumnaRanking
          titulo="Más comentados."
          subtitulo="Interacción real de reseñas comunitarias"
          cantidad={masComentados.length}
          cargando={cargandoMasComentados}
          mensajeCargando="Cargando reseñas de la comunidad..."
          error={errorMasComentados}
          onReintentar={onReintentarMasComentados}
          etiquetaReintento="Reintentar comentarios"
          vacio={
            <div className="rounded-md border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 text-center text-sm text-[var(--color-subtle)]">
              {vacioComentarios
                ? "Aún no hay reseñas registradas para los productos en la plataforma."
                : "No se encontraron dispositivos con este filtro."}
            </div>
          }
          pie={
            masComentados.length > 4 ? (
              <BotonListaCompleta
                mostrarTodos={mostrarTodosComentados}
                cantidad={masComentados.length}
                onAlternar={onAlternarComentados}
              />
            ) : null
          }
        >
          {(mostrarTodosComentados
            ? masComentados
            : masComentados.slice(0, 4)
          ).map((item) => (
            <RankingItem
              key={`comentado-${item.idProducto}`}
              ranking={item.posicionRanking}
              nombre={item.nombre}
              descripcion={item.descripcion}
              imagen={item.imagen}
              categoria={item.idCategoria}
              precio={item.precioReferencia}
              metricaTipo="comentario"
              cantidadResenas={item.cantidadResenas}
              onVerDetalle={() => onVerDetalle(item)}
            />
          ))}
        </ColumnaRanking>

        <ColumnaRanking
          titulo="Los más deseados."
          subtitulo="Listas de deseos y favoritos de usuarios"
          cantidad={masDeseados.length}
          cargando={cargandoMasDeseados}
          mensajeCargando="Consultando listas de deseos..."
          error={errorMasDeseados}
          onReintentar={onReintentarMasDeseados}
          etiquetaReintento="Reintentar deseos"
          vacio={
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 text-center text-sm text-[var(--color-subtle)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-subtle)]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
                  />
                </svg>
              </div>
              <p className="mb-1 text-xs font-semibold text-[var(--color-ink)]">
                {vacioDeseos
                  ? "Sin listas de deseos registradas"
                  : "No se encontraron dispositivos con este filtro"}
              </p>
              <p className="max-w-xs text-xs leading-relaxed text-[var(--color-subtle)]">
                {vacioDeseos
                  ? "La funcionalidad de listas de deseos y favoritos estará disponible en una fase posterior. Actualmente la plataforma no muestra datos ficticios."
                  : "Prueba con otro término de búsqueda o desactiva el filtro de presupuesto."}
              </p>
            </div>
          }
        >
          {masDeseados.map((item) => (
            <RankingItem
              key={`deseado-${item.idProducto}`}
              ranking={item.posicionRanking}
              nombre={item.nombre}
              descripcion={item.descripcion}
              imagen={item.imagen}
              categoria={item.idCategoria}
              precio={item.precioReferencia}
              metricaTipo="deseo"
              cantidadDeseados={item.cantidadDeseados}
              onVerDetalle={() => onVerDetalle(item)}
            />
          ))}
        </ColumnaRanking>
      </div>
    </section>
  );
}
