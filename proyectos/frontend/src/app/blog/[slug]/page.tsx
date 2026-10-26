import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ARTICULOS_BLOG,
  calcularMinutosLectura,
  obtenerArticuloPorSlug,
} from "@/data/blog";

interface ArticuloPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ARTICULOS_BLOG.map((articulo) => ({ slug: articulo.slug }));
}

export async function generateMetadata({
  params,
}: ArticuloPageProps): Promise<Metadata> {
  const { slug } = await params;
  const articulo = obtenerArticuloPorSlug(slug);

  if (!articulo) {
    return { title: "Guía no encontrada | TecReview" };
  }

  return {
    title: `${articulo.titulo} | Blog de TecReview`,
    description: articulo.extracto,
  };
}

function formatearFecha(valor: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
  }).format(new Date(`${valor}T12:00:00`));
}

export default async function ArticuloBlogPage({ params }: ArticuloPageProps) {
  const { slug } = await params;
  const articulo = obtenerArticuloPorSlug(slug);

  if (!articulo) {
    notFound();
  }

  const relacionados = ARTICULOS_BLOG.filter(
    (item) => item.slug !== articulo.slug,
  ).slice(0, 2);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Migas de pan"
        className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--color-subtle)]"
      >
        <Link
          href="/blog"
          className="transition-colors hover:text-[var(--color-brand-blue)]"
        >
          Blog
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-[var(--color-ink)]">
          {articulo.categoriaEtiqueta}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <article>
          <header>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <Link
                href={`/categorias/${articulo.categoriaSlug}`}
                className="rounded-full bg-[var(--color-brand-blue)]/10 px-2.5 py-1 text-[var(--color-brand-blue)] transition-colors hover:bg-[var(--color-brand-blue)]/15"
              >
                {articulo.categoriaEtiqueta}
              </Link>
              <span className="text-[var(--color-subtle)]">
                {calcularMinutosLectura(articulo)} min de lectura
              </span>
            </div>

            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {articulo.titulo}
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-subtle)]">
              {articulo.extracto}
            </p>

            <p className="mt-4 text-xs text-[var(--color-subtle)]">
              Publicado el {formatearFecha(articulo.fecha)} · Contenido
              editorial de TecReview
            </p>
          </header>

          <aside className="mt-6 rounded-lg border border-[var(--color-brand-blue)]/25 bg-[var(--color-brand-blue)]/5 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-blue)]">
              Puntos clave
            </h2>
            <ul className="mt-2 space-y-2">
              {articulo.puntosClave.map((punto) => (
                <li
                  key={punto}
                  className="flex gap-2 text-sm leading-relaxed text-[var(--color-ink)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-solid)]"
                  />
                  {punto}
                </li>
              ))}
            </ul>
          </aside>

          <div className="mt-8 space-y-8">
            {articulo.secciones.map((seccion) => (
              <section key={seccion.titulo}>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {seccion.titulo}
                </h2>
                <div className="mt-3 space-y-3">
                  {seccion.parrafos.map((parrafo) => (
                    <p
                      key={parrafo}
                      className="text-sm leading-7 text-[var(--color-ink)]"
                    >
                      {parrafo}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-10 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Continúa en el catálogo
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-subtle)]">
              Revisa especificaciones, precio de referencia y disponibilidad de
              los productos registrados.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href={`/categorias/${articulo.categoriaSlug}`}
                className="rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
              >
                Ver {articulo.categoriaEtiqueta}
              </Link>
              <Link
                href="/comparador"
                className="rounded-md border border-[var(--color-hairline)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Abrir comparador
              </Link>
            </div>
          </footer>
        </article>

        <aside className="space-y-4">
          <section className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Más guías
            </h2>
            <ul className="mt-3 space-y-3">
              {relacionados.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/blog/${item.slug}`}
                    className="block rounded-md p-1 transition-colors hover:bg-[var(--color-canvas)]"
                  >
                    <span className="text-sm font-semibold leading-snug text-[var(--color-ink)]">
                      {item.titulo}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-subtle)]">
                      {item.categoriaEtiqueta} ·{" "}
                      {calcularMinutosLectura(item)} min
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Sobre estas guías
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-subtle)]">
              El contenido editorial explica conceptos y criterios. No sustituye
              la ficha del fabricante ni declara un ganador entre productos.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
