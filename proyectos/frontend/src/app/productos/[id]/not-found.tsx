import Link from "next/link";

export default function ProductoNoEncontrado() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <span className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-subtle)]">
        Error 404
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
        Producto no encontrado
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-subtle)]">
        El producto que buscas no existe o ya no está disponible en el catálogo
        de TecReview.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/productos"
          className="inline-flex rounded-lg bg-[var(--color-brand-solid)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
        >
          Volver al catálogo
        </Link>
        <Link
          href="/"
          className="inline-flex rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
