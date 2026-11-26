import type { Producto } from "@/types/producto";
import { normalizarFichaProducto } from "@/data/specsHelper";
import FichaTecnicaV3Panel from "@/components/FichaTecnicaV3Panel";
import { clasificarFichaTecnicaProducto } from "@/data/fichaTecnicaProducto";
import FichaTecnicaV2Panel from "@/components/FichaTecnicaV2Panel";

interface EspecificacionesProductoProps {
  producto: Producto;
}

export default function EspecificacionesProducto({
  producto,
}: EspecificacionesProductoProps) {
  const estadoFicha = clasificarFichaTecnicaProducto(producto);
  if (estadoFicha.version === "v3") return <FichaTecnicaV3Panel estado={estadoFicha} />;
  if (estadoFicha.version === "error") return <div role="alert" className="rounded-card border border-status-error bg-paper p-4 text-sm text-status-error">La ficha técnica tiene una versión o estructura no compatible. El contenido original se conservó.</div>;
  if (estadoFicha.version === "v2" && estadoFicha.estado === "valida") return <FichaTecnicaV2Panel ficha={estadoFicha.fichaV2} />;
  const ficha = normalizarFichaProducto(producto);
  const tieneSecciones = ficha.secciones.length > 0;

  return (
    <section aria-labelledby="titulo-especificaciones" className="space-y-5">
      <div>
        <h2
          id="titulo-especificaciones"
          className="text-lg font-medium uppercase tracking-normal text-ink"
        >
          Especificaciones
        </h2>
        <p className="mt-1 text-sm text-subtle">
          Datos registrados por el fabricante o la comunidad. Los campos sin
          información no se muestran.
        </p>
      </div>

      {tieneSecciones ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {ficha.secciones.map((seccion, indice) => (
            <article
              key={`${seccion.titulo}-${indice}`}
              className="rounded-card border border-line bg-paper p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-canvas text-base"
                >
                  {seccion.icono}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium uppercase text-ink">
                    {seccion.titulo}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-subtle">
                    {seccion.descripcion}
                  </p>
                  {seccion.detalleExtra && (
                    <p className="mt-1 text-xs leading-relaxed text-subtle">
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
          className="rounded-card border border-dashed border-line bg-paper p-8 text-center"
        >
          <p className="text-sm font-medium text-ink">
            Aún no hay especificaciones registradas para este producto.
          </p>
          <p className="mt-1 text-sm text-subtle">
            Cuando el fabricante o la comunidad aporten los datos, aparecerán
            aquí sin valores inventados.
          </p>
        </div>
      )}

      {ficha.benchmark && ficha.benchmark.valor !== "N/A" && (
        <div className="rounded-card border border-line bg-paper p-4">
          <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
            {ficha.benchmark.etiqueta}
          </p>
          <p className="mt-1 text-lg font-medium text-ink">
            {ficha.benchmark.valor}
          </p>
        </div>
      )}

      {ficha.metricas.length > 0 && (
        <div className="rounded-card border border-line bg-paper p-4">
          <h3 className="text-sm font-medium uppercase text-ink">
            Puntuaciones registradas
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {ficha.metricas.map((metrica) => (
              <div key={metrica.nombre}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <dt className="text-subtle">
                    {metrica.nombre}
                  </dt>
                  <dd className="font-medium text-ink">
                    {metrica.puntos.toFixed(1).replace(".", ",")} / 10
                  </dd>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"
                >
                  <div
                    className="h-full rounded-full bg-brand-solid"
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
