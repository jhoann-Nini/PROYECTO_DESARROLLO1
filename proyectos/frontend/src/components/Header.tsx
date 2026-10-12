export default function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tec<span className="text-blue-700 dark:text-blue-500">Review</span>
        </h1>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Reseñas y Especificaciones Técnicas
        </span>
      </div>
    </header>
  );
}
