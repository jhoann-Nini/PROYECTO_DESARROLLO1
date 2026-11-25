import Link from "next/link";

export default function CtaComparador() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-card border border-surface-border-strong bg-surface-2 px-6 py-8 text-ink sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-normal text-text-secondary">
              Compara · Analiza · Decide
            </p>
            <h2 className="mt-2 text-2xl font-medium uppercase tracking-normal sm:text-3xl">
              ¿Dos candidatos? Compáralos lado a lado.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Revisa especificaciones, precios de referencia y diferencias
              clave antes de decidir tu próxima compra.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 rounded-card bg-brand-solid px-4 py-2.5 text-sm font-medium text-on-solid transition-colors hover:bg-brand-solid"
            >
              Explorar catálogo
            </Link>
            <Link
              href="/comparador"
              className="inline-flex items-center gap-2 rounded-card border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-surface-muted"
            >
              Ir al comparador
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
