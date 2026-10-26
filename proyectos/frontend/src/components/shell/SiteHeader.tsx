"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface EnlaceNavegacion {
  href?: string;
  etiqueta: string;
}

const ENLACES: EnlaceNavegacion[] = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/productos", etiqueta: "Productos" },
  { etiqueta: "Comparador" },
  { etiqueta: "Reseñas" },
  { etiqueta: "Blog" },
];

export default function SiteHeader() {
  const rutaActual = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-[var(--color-paper)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-0 text-lg font-bold tracking-tight"
          aria-label="TecnoReview, ir al inicio"
        >
          <span className="text-[var(--color-ink)]">Tecno</span>
          <span className="text-[var(--color-brand-blue)]">Review</span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-1 md:flex"
        >
          {ENLACES.map((enlace) =>
            enlace.href ? (
              <Link
                key={enlace.etiqueta}
                href={enlace.href}
                aria-current={
                  rutaActual === enlace.href ? "page" : undefined
                }
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  rutaActual === enlace.href
                    ? "bg-[var(--color-canvas)] text-[var(--color-ink)]"
                    : "text-[var(--color-subtle)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
                }`}
              >
                {enlace.etiqueta}
              </Link>
            ) : (
              <span
                key={enlace.etiqueta}
                aria-disabled="true"
                title="Próximamente"
                className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-[var(--color-subtle)]/60"
              >
                {enlace.etiqueta}
              </span>
            )
          )}
        </nav>

        <Link
          href="/productos"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[var(--color-brand-blue)] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-blue)]/90"
        >
          Explorar catálogo
        </Link>
      </div>
    </header>
  );
}
