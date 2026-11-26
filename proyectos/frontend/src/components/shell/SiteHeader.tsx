"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PanelBusquedaModal from "@/components/busqueda/PanelBusquedaModal";
import { CLASE_FOCO } from "@/components/ui/foco";
import { buttonClassName } from "@/components/ui/Button";
import BotonTema from "./BotonTema";
import BotonBusquedaGlobal from "./BotonBusquedaGlobal";

interface EnlaceNavegacion {
  href?: string;
  etiqueta: string;
}

const ENLACES: EnlaceNavegacion[] = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/productos", etiqueta: "Productos" },
  { href: "/comparador", etiqueta: "Comparador" },
  { href: "/resenas", etiqueta: "Reseñas" },
  { href: "/comunidad", etiqueta: "Comunidad" },
  { href: "/blog", etiqueta: "Blog" },
  { href: "/favoritos", etiqueta: "Favoritos" },
];

interface SiteHeaderProps {
  children?: ReactNode;
  busquedaAbierta?: boolean;
  onBusquedaAbiertaCambiar?: (abierta: boolean) => void;
  busqueda?: string;
  onBusquedaCambiar?: (busqueda: string) => void;
  productosBusqueda?: ComponentProps<typeof PanelBusquedaModal>["productos"];
  cargandoBusqueda?: boolean;
}

export default function SiteHeader({
  children,
  busquedaAbierta: busquedaControlada,
  onBusquedaAbiertaCambiar,
  busqueda,
  onBusquedaCambiar,
  productosBusqueda,
  cargandoBusqueda,
}: SiteHeaderProps) {
  const rutaActual = usePathname();
  const esInicio = rutaActual === "/";
  const [busquedaInternaAbierta, setBusquedaInternaAbierta] = useState(false);
  const busquedaAbierta = busquedaControlada ?? busquedaInternaAbierta;

  function cambiarBusquedaAbierta(abierta: boolean) {
    if (onBusquedaAbiertaCambiar) onBusquedaAbiertaCambiar(abierta);
    else setBusquedaInternaAbierta(abierta);
  }

  useEffect(() => {
    function manejarAtajo(evento: KeyboardEvent) {
      if (
        (evento.ctrlKey || evento.metaKey) &&
        evento.key.toLowerCase() === "k"
      ) {
        evento.preventDefault();
        if (onBusquedaAbiertaCambiar) onBusquedaAbiertaCambiar(true);
        else setBusquedaInternaAbierta(true);
      }
    }

    window.addEventListener("keydown", manejarAtajo);
    return () => window.removeEventListener("keydown", manejarAtajo);
  }, [onBusquedaAbiertaCambiar]);

  return (
    <>
      <header className={`sticky top-0 z-40 border-b border-line bg-paper ${esInicio ? "border-dashed" : "border-dotted"}`}>
        <div className={esInicio
          ? "mx-auto flex min-h-[60px] max-w-[1360px] flex-nowrap items-center gap-3 px-4 py-2 sm:px-6 lg:gap-5 lg:px-8"
          : "mx-auto flex min-h-16 max-w-[1440px] flex-nowrap items-center gap-3 px-4 py-2 sm:px-6 lg:gap-5 lg:px-8"}>
          <Link
            href="/"
            className={`group flex shrink-0 items-center gap-2 text-sub font-medium uppercase tracking-normal ${esInicio ? "min-h-10" : "min-h-11"} ${CLASE_FOCO}`}
            aria-label="TecReview, ir al inicio"
          >
            <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-paper transition-transform duration-200 group-hover:scale-105 ${esInicio ? "h-6 w-6" : "h-7 w-7"}`}>
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
            className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ENLACES.map((enlace) =>
              enlace.href ? (
                <Link
                  key={enlace.etiqueta}
                  href={enlace.href}
                  aria-current={
                    rutaActual === enlace.href ? "page" : undefined
                  }
                  className={`inline-flex items-center rounded-full py-2 font-medium uppercase tracking-normal transition-colors ${esInicio ? "min-h-10 px-2.5 text-[11px]" : "min-h-11 px-3 text-label"} ${CLASE_FOCO} ${
                    rutaActual === enlace.href
                      ? esInicio ? "text-brand-blue" : "bg-surface-2 text-ink"
                      : esInicio ? "text-subtle hover:text-ink" : "text-subtle hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {enlace.etiqueta}
                </Link>
              ) : (
                <span
                  key={enlace.etiqueta}
                  aria-disabled="true"
                  title="Próximamente"
                  className={`cursor-not-allowed inline-flex items-center rounded-full py-2 font-medium uppercase tracking-normal text-subtle ${esInicio ? "min-h-10 px-2.5 text-[11px]" : "min-h-11 px-3 text-label"}`}
                >
                  {enlace.etiqueta}
                </span>
              )
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <BotonBusquedaGlobal
              variante={esInicio ? "icono" : "encabezado"}
              abierto={busquedaAbierta}
              onAbrir={() => cambiarBusquedaAbierta(true)}
            />

            <BotonTema compacto={esInicio} />
            {children}
            {!children && (
              <Link
                href="/perfil"
                aria-label="Iniciar sesión o ver mi perfil"
                title="Iniciar sesión o ver mi perfil"
                className={`inline-flex shrink-0 items-center justify-center rounded-full border bg-transparent text-ink transition-colors hover:bg-surface-muted ${esInicio ? "h-10 w-10 border-line" : "h-11 w-11 border-ink"} ${CLASE_FOCO}`}
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
              className={buttonClassName(
                "primary",
                esInicio ? "max-2xl:hidden! h-10 min-h-10 shrink-0 px-4 py-2 2xl:inline-flex" : "max-2xl:hidden! shrink-0 2xl:inline-flex",
              )}
            >
              Explorar catálogo
            </Link>
          </div>
        </div>
      </header>

      <PanelBusquedaModal
        abierto={busquedaAbierta}
        onCerrar={() => cambiarBusquedaAbierta(false)}
        busqueda={busqueda}
        onBusquedaCambiar={onBusquedaCambiar}
        productos={productosBusqueda}
        cargando={cargandoBusqueda}
      />
    </>
  );
}
