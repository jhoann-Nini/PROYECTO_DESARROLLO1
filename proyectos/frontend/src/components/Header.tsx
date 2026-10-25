export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-950/50 bg-[#07172f]/95 px-4 py-3 text-white shadow-lg shadow-slate-950/20 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a href="#buscador-principal" aria-label="TecnoReview, inicio" className="group flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-md shadow-blue-900/20 transition-transform group-hover:-rotate-3">
            T
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Tecno<span className="text-blue-400">Review</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/70 sm:block">
              Tecnología, opiniones y comparativas
            </span>
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50 md:inline-flex">
            Encuentra tu próximo dispositivo
          </span>
          <a
            href="#buscador-principal"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 sm:px-4"
          >
            Explorar catálogo <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </header>
  );
}
