"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PanelBusquedaModal from "@/components/busqueda/PanelBusquedaModal";
import { CLASE_FOCO } from "@/components/ui/foco";
import BotonTema from "./BotonTema";

interface EnlaceNavegacion {
  href?: string;
  etiqueta: string;
}

const ENLACES: EnlaceNavegacion[] = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/productos", etiqueta: "Productos" },
  { href: "/comparador", etiqueta: "Comparador" },
  { href: "/resenas", etiqueta: "Reseñas" },
  { href: "/blog", etiqueta: "Blog" },
  { href: "/favoritos", etiqueta: "Favoritos" },
];

export default function SiteHeader({ children }: { children?: ReactNode }) {
  const rutaActual = usePathname();
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  useEffect(() => {
    function manejarAtajo(evento: KeyboardEvent) {
      if (
        (evento.ctrlKey || evento.metaKey) &&
        evento.key.toLowerCase() === "k"
      ) {
        evento.preventDefault();
        setBusquedaAbierta(true);
      }
    }

    window.addEventListener("keydown", manejarAtajo);
    return () => window.removeEventListener("keydown", manejarAtajo);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-hairline)] bg-[var(--color-paper)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={`group flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight ${CLASE_FOCO}`}
            aria-label="TecReview, ir al inicio"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-hairline)] bg-[var(--color-paper)] shadow-xs transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/kiwi-logo.jpg"
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="flex items-baseline">
              <span className="text-[var(--color-ink)]">Tec</span>
              <span className="text-[var(--color-brand-blue)]">Review</span>
            </span>
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
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${CLASE_FOCO} ${
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setBusquedaAbierta(true)}
              aria-label="Abrir búsqueda (Ctrl+K o Cmd+K)"
              aria-haspopup="dialog"
              aria-expanded={busquedaAbierta}
              aria-keyshortcuts="Control+K Meta+K"
              title="Buscar dispositivos (Ctrl+K)"
              className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-2.5 text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <span className="hidden text-xs font-medium sm:inline">
                Buscar
              </span>
              <kbd className="inline rounded border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-1 py-0.5 text-[9px] font-semibold text-[var(--color-subtle)] sm:px-1.5 sm:text-[10px]">
                Ctrl K
              </kbd>
            </button>

            <BotonTema />
            {children}

            <Link
              href="/productos"
              className={`hidden shrink-0 items-center gap-2 rounded-md bg-[var(--color-brand-solid)] px-3.5 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 sm:inline-flex ${CLASE_FOCO}`}
            >
              Explorar catálogo
            </Link>
          </div>
        </div>
      </header>

      <PanelBusquedaModal
        abierto={busquedaAbierta}
        onCerrar={() => setBusquedaAbierta(false)}
      />
    </>
  );
}
