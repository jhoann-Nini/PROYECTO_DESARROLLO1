import type { Metadata } from "next";
import Link from "next/link";
import { ARTICULOS_BLOG, calcularMinutosLectura } from "@/data/blog";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { buttonClassName } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Blog editorial | TecReview",
  description:
    "Guías para entender fichas técnicas, comparar dispositivos y usar el catálogo de TecReview con criterio.",
};

function formatearFecha(valor: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
  }).format(new Date(`${valor}T12:00:00`));
}

export default function BlogPage() {
  const [destacado, ...resto] = ARTICULOS_BLOG;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
          Guías editoriales
        </p>
        <h1 className="mt-2 text-2xl font-medium uppercase tracking-normal text-ink sm:text-3xl">
          Blog de TecReview
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-subtle">
          Explicamos cómo leer una ficha técnica y cómo comparar dispositivos
          sin inventar datos. Las guías son contenido editorial; las
          especificaciones, precios y valoraciones siempre salen del catálogo
          real.
        </p>
      </header>

      {ARTICULOS_BLOG.length === 0 ? (
        <EstadoVacio
          className="mt-8"
          titulo="Todavía no hay guías publicadas."
          descripcion="Mientras preparamos nuevo contenido editorial, puedes explorar las fichas y comparativas del catálogo."
          accion={{ etiqueta: "Explorar catálogo", href: "/productos" }}
        />
      ) : (
        <>
          {destacado && (
        <article className="mt-8 overflow-hidden rounded-card border border-line bg-paper">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-normal">
                <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-brand-blue">
                  {destacado.categoriaEtiqueta}
                </span>
                <span className="text-subtle">
                  {calcularMinutosLectura(destacado)} min de lectura
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-medium uppercase leading-tight tracking-normal text-ink sm:text-3xl">
                <Link
                  href={`/blog/${destacado.slug}`}
                  className="transition-colors hover:text-brand-blue"
                >
                  {destacado.titulo}
                </Link>
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-subtle">
                {destacado.extracto}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Link
                  href={`/blog/${destacado.slug}`}
                  className={buttonClassName("primary", "text-sm")}
                >
                  Leer guía
                </Link>
                <Link
                  href={`/categorias/${destacado.categoriaSlug}`}
                  className="text-sm font-medium text-brand-blue hover:underline"
                >
                  Ver {destacado.categoriaEtiqueta} en el catálogo →
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-center border-t border-dotted border-line bg-surface-muted p-6 lg:border-l lg:border-t-0">
              <p className="text-[11px] font-medium uppercase tracking-normal text-subtle">
                En esta guía
              </p>
              <ul className="mt-3 space-y-2">
                {destacado.puntosClave.map((punto) => (
                  <li
                    key={punto}
                    className="flex gap-2 text-sm leading-relaxed text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-solid"
                    />
                    {punto}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      )}

      <section aria-labelledby="titulo-mas-guias" className="mt-10">
        <h2
          id="titulo-mas-guias"
          className="text-lg font-medium uppercase tracking-normal text-ink"
        >
          Más guías
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resto.map((articulo) => (
            <article
              key={articulo.slug}
              className="flex flex-col rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-blue"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-normal">
                <span className="rounded-full bg-canvas px-2.5 py-1 text-subtle">
                  {articulo.categoriaEtiqueta}
                </span>
                <span className="text-subtle">
                  {calcularMinutosLectura(articulo)} min
                </span>
              </div>

              <h3 className="mt-3 text-base font-medium uppercase leading-snug text-ink">
                <Link
                  href={`/blog/${articulo.slug}`}
                  className="transition-colors hover:text-brand-blue"
                >
                  {articulo.titulo}
                </Link>
              </h3>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-subtle">
                {articulo.extracto}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-dotted border-line pt-3">
                <span className="text-xs text-subtle">
                  {formatearFecha(articulo.fecha)}
                </span>
                <Link
                  href={`/blog/${articulo.slug}`}
                  className="text-xs font-medium text-brand-blue hover:underline"
                >
                  Leer guía →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-card border border-line bg-paper p-6">
        <h2 className="text-lg font-medium uppercase tracking-normal text-ink">
          Las guías no sustituyen los datos
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-subtle">
          Cuando una especificación no está registrada, el comparador la marca
          como «Sin dato» y la ficha omite el campo. No completamos fichas por
          lógica ni inventamos precios, disponibilidad o valoraciones. Para
          decidir, revisa el producto en el catálogo y contrástalo con el
          fabricante.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/productos"
            className={buttonClassName("primary", "text-sm")}
          >
            Explorar catálogo
          </Link>
          <Link
            href="/comparador"
            className={buttonClassName("secondary", "text-sm")}
          >
            Abrir comparador
          </Link>
        </div>
      </section>
        </>
      )}
    </main>
  );
}
