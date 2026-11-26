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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-dotted border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-stretch gap-1 px-2 py-2">
        {ITEMS.map((item) => (
          <li key={item.etiqueta} className="min-w-0">
            {item.href ? (
              <Link
                href={item.href}
                aria-current={rutaActual === item.href ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-card px-1 py-2 text-center text-micro font-medium uppercase tracking-normal [overflow-wrap:anywhere] transition-colors ${CLASE_FOCO} ${
                  rutaActual === item.href
                    ? "bg-surface-2 text-ink"
                    : "text-subtle hover:bg-surface-muted hover:text-ink"
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
                className="flex cursor-not-allowed flex-col items-center gap-1 py-2.5 text-micro font-medium uppercase tracking-normal text-subtle"
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
