"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PanelBusquedaModal from "@/components/busqueda/PanelBusquedaModal";
import { CLASE_FOCO } from "@/components/ui/foco";
import { buttonClassName } from "@/components/ui/Button";
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
      <header className="sticky top-0 z-40 border-b border-dotted border-line bg-paper">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={`group flex min-h-11 shrink-0 items-center gap-2 text-sub font-medium uppercase tracking-normal ${CLASE_FOCO}`}
            aria-label="TecReview, ir al inicio"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-paper transition-transform duration-200 group-hover:scale-105">
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
              <span className="text-ink">Tec</span>
              <span className="text-brand-blue">Review</span>
            </span>
          </Link>

          <nav
            aria-label="Navegación principal"
            className="order-3 hidden w-full items-center justify-center gap-1 md:flex 2xl:order-none 2xl:w-auto"
          >
            {ENLACES.map((enlace) =>
              enlace.href ? (
                <Link
                  key={enlace.etiqueta}
                  href={enlace.href}
                  aria-current={
                    rutaActual === enlace.href ? "page" : undefined
                  }
                  className={`inline-flex min-h-11 items-center rounded-full px-3 py-2 text-label font-medium uppercase tracking-normal transition-colors ${CLASE_FOCO} ${
                    rutaActual === enlace.href
                      ? "bg-surface-2 text-ink"
                      : "text-subtle hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {enlace.etiqueta}
                </Link>
              ) : (
                <span
                  key={enlace.etiqueta}
                  aria-disabled="true"
                  title="Próximamente"
                  className="cursor-not-allowed inline-flex min-h-11 items-center rounded-full px-3 py-2 text-label font-medium uppercase tracking-normal text-subtle"
                >
                  {enlace.etiqueta}
                </span>
              )
            )}
          </nav>

          <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setBusquedaAbierta(true)}
              aria-label="Abrir búsqueda (Ctrl+K o Cmd+K)"
              aria-haspopup="dialog"
              aria-expanded={busquedaAbierta}
              aria-keyshortcuts="Control+K Meta+K"
              title="Buscar dispositivos (Ctrl+K)"
              className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-card border border-line bg-canvas px-3 text-subtle transition-colors hover:border-brand-blue hover:text-brand-blue ${CLASE_FOCO}`}
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
              <span className="hidden text-label font-medium uppercase tracking-normal sm:inline">
                Buscar
              </span>
              <kbd className="inline rounded-card border border-line bg-paper px-2 py-1 font-sans text-micro font-medium text-subtle">
                Ctrl K
              </kbd>
            </button>

            <BotonTema />
            {children}
            {!children && (
              <Link
                href="/perfil"
                aria-label="Iniciar sesión o ver mi perfil"
                title="Iniciar sesión o ver mi perfil"
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink bg-transparent text-ink transition-colors hover:bg-surface-muted ${CLASE_FOCO}`}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
              </Link>
            )}

            <Link
              href="/productos"
              className={buttonClassName("primary", "shrink-0 max-sm:hidden")}
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
