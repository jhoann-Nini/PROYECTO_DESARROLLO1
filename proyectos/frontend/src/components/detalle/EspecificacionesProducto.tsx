import type { Producto } from "@/types/producto";
import { normalizarFichaProducto } from "@/data/specsHelper";

interface EspecificacionesProductoProps {
  producto: Producto;
}

export default function EspecificacionesProducto({
  producto,
}: EspecificacionesProductoProps) {
  const ficha = normalizarFichaProducto(producto);
  const tieneSecciones = ficha.secciones.length > 0;

  return (
    <section aria-labelledby="titulo-especificaciones" className="space-y-5">
      <div>
        <h2
          id="titulo-especificaciones"
          className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Especificaciones
        </h2>
        <p className="mt-1 text-sm text-[var(--color-subtle)]">
          Datos registrados por el fabricante o la comunidad. Los campos sin
          información no se muestran.
        </p>
      </div>

      {tieneSecciones ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {ficha.secciones.map((seccion, indice) => (
            <article
              key={`${seccion.titulo}-${indice}`}
              className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-paper)]"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-canvas)] text-base"
                >
                  {seccion.icono}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    {seccion.titulo}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-subtle)]">
                    {seccion.descripcion}
                  </p>
                  {seccion.detalleExtra && (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-subtle)]">
                      {seccion.detalleExtra}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-lg border border-dashed border-[var(--color-hairline)] bg-[var(--color-paper)] p-8 text-center"
        >
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            Aún no hay especificaciones registradas para este producto.
          </p>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">
            Cuando el fabricante o la comunidad aporten los datos, aparecerán
            aquí sin valores inventados.
          </p>
        </div>
      )}

      {ficha.benchmark && ficha.benchmark.valor !== "N/A" && (
        <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
            {ficha.benchmark.etiqueta}
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">
            {ficha.benchmark.valor}
          </p>
        </div>
      )}

      {ficha.metricas.length > 0 && (
        <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            Puntuaciones registradas
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {ficha.metricas.map((metrica) => (
              <div key={metrica.nombre}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <dt className="text-[var(--color-subtle)]">
                    {metrica.nombre}
                  </dt>
                  <dd className="font-semibold text-[var(--color-ink)]">
                    {metrica.puntos.toFixed(1).replace(".", ",")} / 10
                  </dd>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-hairline)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--color-brand-blue)]"
                    style={{
                      width: `${Math.min(100, Math.max(0, metrica.puntos * 10))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
