"use client";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 text-slate-900 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <a href="#buscador-principal" aria-label="TecReview, inicio" className="group flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-xl text-white shadow-md shadow-blue-900/15 transition group-hover:-translate-y-0.5" aria-hidden="true">▯</span>
          <span className="min-w-0 text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
            Tec<span className="text-blue-700">Review</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold tracking-wide text-slate-500 sm:block">Compara · Analiza · Decide</span>
          </span>
        </a>
        <nav aria-label="Navegación principal" className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
          <a className="transition hover:text-blue-700" href="#buscador-principal">Inicio</a>
          <a className="transition hover:text-blue-700" href="#catalogo">Productos</a>
          <a className="transition hover:text-blue-700" href="#resenas">Reseñas</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a href="#catalogo" className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 sm:inline-flex">
            Explorar productos <span className="ml-2 text-blue-700" aria-hidden="true">↗</span>
          </a>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 sm:hidden" aria-hidden="true">⌕</span>
        </div>
      </div>
    </header>
  );
}
