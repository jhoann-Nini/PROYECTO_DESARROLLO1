"use client";

import type { UsuarioSesion } from "@/types/producto";

interface ResumenSesionProps {
  cargando: boolean;
  usuario: UsuarioSesion | null;
  error: string | null;
  esAdmin: boolean;
  esRepresentante: boolean;
  onAbrirAuth: () => void;
  onCerrarSesion: () => void;
  onReintentar: () => void;
  onAbrirAdmin: () => void;
}

export default function ResumenSesion({
  cargando,
  usuario,
  error,
  esAdmin,
  esRepresentante,
  onAbrirAuth,
  onCerrarSesion,
  onReintentar,
  onAbrirAdmin,
}: ResumenSesionProps) {
  const colorPunto = esAdmin
    ? "bg-[var(--color-star)]"
    : esRepresentante
      ? "bg-[var(--color-brand-blue)]"
      : "bg-[var(--color-positive)]";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {error && (
        <span
          role="alert"
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-star)]/30 bg-[var(--color-star)]/10 px-2 py-1 text-[11px] font-medium text-[var(--color-ink)]"
        >
          <span className="sr-only lg:not-sr-only lg:max-w-[16rem] lg:truncate">
            ⚠️ {error}
          </span>
          <span aria-hidden="true" className="lg:hidden">
            ⚠️
          </span>
          <button
            type="button"
            onClick={onReintentar}
            title="Reintentar verificación con el servidor"
            className="cursor-pointer font-semibold text-[var(--color-brand-blue)] underline hover:no-underline"
          >
            Reintentar
          </button>
        </span>
      )}

      {esAdmin && (
        <a
          href="#administracion"
          onClick={(evento) => {
            evento.preventDefault();
            onAbrirAdmin();
          }}
          aria-label="Panel de administración"
          title="Panel de administración (Rol verificado en servidor)"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--color-star)]/40 bg-[var(--color-star)]/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-star)]/20"
        >
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-star)]"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Administración</span>
          <span className="sm:hidden">Admin</span>
        </a>
      )}

      {cargando ? (
        <span
          aria-live="polite"
          className="animate-pulse px-2 py-1 text-xs text-[var(--color-subtle)]"
        >
          Verificando...
        </span>
      ) : usuario ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${colorPunto}`}
              aria-hidden="true"
            />
            <span className="max-w-[8rem] truncate">{usuario.nombre}</span>
            {usuario.rol && (
              <span className="hidden text-[10px] font-normal text-[var(--color-subtle)] md:inline">
                • {usuario.rol}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={onCerrarSesion}
            title="Cerrar sesión"
            className="cursor-pointer text-xs text-[var(--color-subtle)] transition-colors hover:text-[var(--color-ink)]"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAbrirAuth}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--color-brand-blue)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-blue)]/90"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 7a4 4 0 11-8 0 4 4 0 018 0zm-3.5 6.5V21m0-4h3m-3-3h3"
            />
          </svg>
          Iniciar sesión
        </button>
      )}
    </div>
  );
}
