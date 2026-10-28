"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLASE_FOCO } from "@/components/ui/foco";

const ICONO_INICIO = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M3 10.5 12 3l9 7.5M5.25 9.75V20.25h5.25v-5.25h3v5.25h5.25V9.75"
  />
);

const ICONO_CATALOGO = (
  <>
    <rect x="3.75" y="3.75" width="7" height="7" rx="1.5" />
    <rect x="13.25" y="3.75" width="7" height="7" rx="1.5" />
    <rect x="3.75" y="13.25" width="7" height="7" rx="1.5" />
    <rect x="13.25" y="13.25" width="7" height="7" rx="1.5" />
  </>
);

const ICONO_COMPARADOR = (
  <>
    <path strokeLinecap="round" d="M12 3.75v16.5" />
    <path strokeLinecap="round" d="M4.5 8.25h15" />
    <path strokeLinecap="round" d="M4.5 15.75h15" />
  </>
);

const ICONO_PERFIL = (
  <>
    <circle cx="12" cy="8.25" r="3.75" />
    <path strokeLinecap="round" d="M4.5 20.25a7.5 7.5 0 0 1 15 0" />
  </>
);

const ICONO_FAVORITOS = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
  />
);

interface ItemNavegacion {
  href?: string;
  etiqueta: string;
  icono: React.ReactNode;
}

const ITEMS: ItemNavegacion[] = [
  { href: "/", etiqueta: "Inicio", icono: ICONO_INICIO },
  { href: "/productos", etiqueta: "Catálogo", icono: ICONO_CATALOGO },
  { href: "/comparador", etiqueta: "Comparador", icono: ICONO_COMPARADOR },
  { href: "/favoritos", etiqueta: "Favoritos", icono: ICONO_FAVORITOS },
  { href: "/perfil", etiqueta: "Perfil", icono: ICONO_PERFIL },
];

export default function BottomNav() {
  const rutaActual = usePathname();

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-hairline)] bg-[var(--color-paper)]/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map((item) => (
          <li key={item.etiqueta} className="flex-1">
            {item.href ? (
              <Link
                href={item.href}
                aria-current={rutaActual === item.href ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${CLASE_FOCO} ${
                  rutaActual === item.href
                    ? "text-[var(--color-brand-blue)]"
                    : "text-[var(--color-subtle)]"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-5 w-5"
                >
                  {item.icono}
                </svg>
                {item.etiqueta}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="Próximamente"
                className="flex cursor-not-allowed flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-[var(--color-subtle)]/50"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-5 w-5"
                >
                  {item.icono}
                </svg>
                {item.etiqueta}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
