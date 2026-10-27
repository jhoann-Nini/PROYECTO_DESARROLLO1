import type { Metadata } from "next";
import Link from "next/link";
import { ARTICULOS_BLOG, calcularMinutosLectura } from "@/data/blog";

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
          Guías editoriales
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Blog de TecReview
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-subtle)]">
          Explicamos cómo leer una ficha técnica y cómo comparar dispositivos
          sin inventar datos. Las guías son contenido editorial; las
          especificaciones, precios y valoraciones siempre salen del catálogo
          real.
        </p>
      </header>

      {destacado && (
        <article className="mt-8 overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] shadow-[var(--shadow-paper)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full bg-[var(--color-brand-blue)]/10 px-2.5 py-1 text-[var(--color-brand-blue)]">
                  {destacado.categoriaEtiqueta}
                </span>
                <span className="text-[var(--color-subtle)]">
                  {calcularMinutosLectura(destacado)} min de lectura
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-3xl">
                <Link
                  href={`/blog/${destacado.slug}`}
                  className="transition-colors hover:text-[var(--color-brand-blue)]"
                >
                  {destacado.titulo}
                </Link>
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-[var(--color-subtle)]">
                {destacado.extracto}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Link
                  href={`/blog/${destacado.slug}`}
                  className="inline-flex rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
                >
                  Leer guía
                </Link>
                <Link
                  href={`/categorias/${destacado.categoriaSlug}`}
                  className="text-sm font-semibold text-[var(--color-brand-blue)] hover:underline"
                >
                  Ver {destacado.categoriaEtiqueta} en el catálogo →
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-center border-t border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6 lg:border-l lg:border-t-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                En esta guía
              </p>
              <ul className="mt-3 space-y-2">
                {destacado.puntosClave.map((punto) => (
                  <li
                    key={punto}
                    className="flex gap-2 text-sm leading-relaxed text-[var(--color-ink)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-solid)]"
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
          className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Más guías
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resto.map((articulo) => (
            <article
              key={articulo.slug}
              className="flex flex-col rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)] transition-shadow hover:shadow-[var(--shadow-paper-hover)]"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full bg-[var(--color-canvas)] px-2.5 py-1 text-[var(--color-subtle)]">
                  {articulo.categoriaEtiqueta}
                </span>
                <span className="text-[var(--color-subtle)]">
                  {calcularMinutosLectura(articulo)} min
                </span>
              </div>

              <h3 className="mt-3 text-base font-semibold leading-snug text-[var(--color-ink)]">
                <Link
                  href={`/blog/${articulo.slug}`}
                  className="transition-colors hover:text-[var(--color-brand-blue)]"
                >
                  {articulo.titulo}
                </Link>
              </h3>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-subtle)]">
                {articulo.extracto}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
                <span className="text-xs text-[var(--color-subtle)]">
                  {formatearFecha(articulo.fecha)}
                </span>
                <Link
                  href={`/blog/${articulo.slug}`}
                  className="text-xs font-semibold text-[var(--color-brand-blue)] hover:underline"
                >
                  Leer guía →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--color-brand-blue)]/25 bg-[var(--color-brand-blue)]/5 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
          Las guías no sustituyen los datos
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-subtle)]">
          Cuando una especificación no está registrada, TecReview la muestra
          como ausente. No completamos fichas por lógica ni inventamos precios,
          disponibilidad o valoraciones. Para decidir, revisa el producto en el
          catálogo y contrástalo con el fabricante.
        </p>
        <Link
          href="/productos"
          className="mt-4 inline-flex rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
        >
          Explorar catálogo
        </Link>
      </section>
    </main>
  );
}
