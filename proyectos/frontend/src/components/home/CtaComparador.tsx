import Link from "next/link";

export default function CtaComparador() {
  return (
    <section>
      <div className="overflow-hidden rounded-card border border-surface-border-strong bg-surface-2 px-6 py-8 text-ink sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-normal text-text-secondary">
              Compara · Analiza · Decide
            </p>
            <h2 className="mt-2 text-[26px] font-medium uppercase leading-tight tracking-normal">
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
              className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-brand-solid px-5 py-2.5 text-[11px] font-medium uppercase tracking-normal text-on-solid transition-colors hover:bg-brand-hover"
            >
              Explorar catálogo
            </Link>
            <Link
              href="/comparador"
              className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-ink px-5 py-2.5 text-[11px] font-medium uppercase tracking-normal text-ink transition-colors hover:bg-surface-muted"
            >
              Ir al comparador
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
