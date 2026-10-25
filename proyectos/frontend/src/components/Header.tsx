export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a href="#inicio" aria-label="TecnoReview, inicio" className="group flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-700 text-lg font-black text-white shadow-md shadow-violet-900/20 transition-transform group-hover:-rotate-3 dark:bg-violet-600">
            T
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Tecno<span className="text-violet-700 dark:text-violet-400">Review</span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block dark:text-slate-400">
              Tecnología, opiniones y comparativas
            </span>
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 md:inline-flex dark:border-violet-900 dark:bg-violet-950/70 dark:text-violet-300">
            Encuentra tu próximo dispositivo
          </span>
          <a
            href="#catalogo"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:px-4 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            Explorar catálogo <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </header>
  );
}
