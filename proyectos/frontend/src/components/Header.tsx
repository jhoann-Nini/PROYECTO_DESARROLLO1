"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-dotted border-line bg-paper px-4 py-3 text-ink sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <a href="#buscador-principal" aria-label="TecReview, inicio" className="group flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-surface-2 text-xl text-ink" aria-hidden="true">▯</span>
          <span className="min-w-0 text-lg font-medium uppercase tracking-normal text-ink sm:text-xl">
            Tec<span className="text-brand-blue">Review</span>
            <span className="mt-0.5 hidden text-[10px] font-medium tracking-normal text-subtle sm:block">Compara · Analiza · Decide</span>
          </span>
        </a>
        <nav aria-label="Navegación principal" className="hidden items-center gap-6 text-sm font-medium uppercase text-subtle lg:flex">
          <a className="transition hover:text-brand-blue" href="#buscador-principal">Inicio</a>
          <a className="transition hover:text-brand-blue" href="#catalogo">Productos</a>
          <a className="transition hover:text-brand-blue" href="#resenas">Reseñas</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a href="#catalogo" className="hidden min-h-11 items-center rounded-ghost border border-ink bg-transparent px-4 text-label font-medium uppercase text-ink transition hover:bg-surface-muted sm:inline-flex">
            Explorar productos <span className="ml-2 text-brand-blue" aria-hidden="true">↗</span>
          </a>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-brand-blue sm:hidden" aria-hidden="true">⌕</span>
        </div>
      </div>
    </header>
  );
}
