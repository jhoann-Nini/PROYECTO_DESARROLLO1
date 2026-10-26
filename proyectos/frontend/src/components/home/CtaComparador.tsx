import Link from "next/link";

export default function CtaComparador() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-xl bg-[var(--color-inverse)] px-6 py-8 text-white shadow-[var(--shadow-paper-hover)] sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Compara · Analiza · Decide
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              ¿Dos candidatos? Compáralos lado a lado.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Revisa especificaciones, precios de referencia y diferencias
              clave antes de decidir tu próxima compra.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand-solid)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-solid)]/90"
            >
              Explorar catálogo
            </Link>
            <Link
              href="/comparador"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
            >
              Ir al comparador
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
