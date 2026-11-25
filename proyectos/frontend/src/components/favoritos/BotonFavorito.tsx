"use client";

import { useId, useState } from "react";
import { MAX_FAVORITOS } from "@/data/favoritos";
import { useFavoritos } from "@/hooks/useFavoritos";
import { CLASE_FOCO } from "@/components/ui/foco";
import AuthModal from "@/components/AuthModal";

interface BotonFavoritoProps {
  idProducto: number;
  nombreProducto: string;
  compacto?: boolean;
  className?: string;
}

/**
 * Alterna un producto en la lista de favoritos de la cuenta autenticada.
 * Sin sesión abre el acceso y no escribe nada en el navegador.
 */
export default function BotonFavorito({
  idProducto,
  nombreProducto,
  compacto = false,
  className = "",
}: BotonFavoritoProps) {
  const { ids, hidratado, autenticado, alternar } = useFavoritos();
  const [aviso, setAviso] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const idAviso = useId();
  const esFavorito = autenticado && ids.includes(idProducto);
  const lleno =
    autenticado && ids.length >= MAX_FAVORITOS && !esFavorito;
  const etiqueta = esFavorito
    ? `Quitar ${nombreProducto} de favoritos`
    : `Guardar ${nombreProducto} en favoritos`;

  function pedirSesion() {
    setAviso("Inicia sesión para guardar productos en favoritos.");
    setModalAbierto(true);
  }

  function manejarClick(evento: React.MouseEvent<HTMLButtonElement>) {
    evento.stopPropagation();

    if (!autenticado) {
      pedirSesion();
      return;
    }

    const resultado = alternar(idProducto);

    if (resultado.motivo === "sin-sesion") {
      pedirSesion();
      return;
    }

    if (resultado.motivo === "lleno") {
      setAviso(
        `Favoritos admite hasta ${MAX_FAVORITOS} productos. Quita uno para guardar otro.`,
      );
      return;
    }

    if (resultado.motivo === "invalido") {
      setAviso("No pudimos guardar este producto en favoritos.");
      return;
    }

    if (resultado.motivo === "agregado") {
      setAviso(`${nombreProducto} se guardó en favoritos.`);
      return;
    }

    if (resultado.motivo === "quitado") {
      setAviso(`${nombreProducto} se quitó de favoritos.`);
    }
  }

  if (compacto) {
    return (
      <>
        <button
          type="button"
          onClick={manejarClick}
          disabled={!hidratado}
          aria-describedby={idAviso}
          aria-pressed={esFavorito}
          aria-label={etiqueta}
          title={
            esFavorito
              ? "Quitar de favoritos"
              : lleno
                ? `Favoritos llenos (${ids.length}/${MAX_FAVORITOS})`
                : autenticado
                  ? "Guardar en favoritos"
                  : "Inicia sesión para guardar en favoritos"
          }
          className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-subtle transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-wait disabled:opacity-60 ${CLASE_FOCO} ${
            esFavorito ? "text-brand-blue" : ""
          } ${className}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={esFavorito ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
            />
          </svg>
        </button>
        <span
          id={idAviso}
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {aviso}
        </span>
        {modalAbierto && (
          <AuthModal
            isOpen
            onClose={() => setModalAbierto(false)}
            onLoginSuccess={() => setModalAbierto(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={manejarClick}
          disabled={!hidratado}
          aria-describedby={idAviso}
          aria-pressed={esFavorito}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-ghost px-4 py-2.5 text-sm font-medium uppercase transition-colors disabled:cursor-wait disabled:opacity-60 ${CLASE_FOCO} ${
            esFavorito
              ? "border border-brand-blue bg-surface-2 text-ink hover:bg-surface-muted"
              : "border border-ink bg-transparent text-ink hover:bg-surface-muted"
          } ${className}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={esFavorito ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20.25s-7.5-4.5-7.5-9.75A4.5 4.5 0 0 1 12 7.5a4.5 4.5 0 0 1 7.5 3c0 5.25-7.5 9.75-7.5 9.75Z"
            />
          </svg>
          {!hidratado
            ? "Cargando favoritos…"
            : esFavorito
              ? "Guardado en favoritos"
              : lleno
                ? `Favoritos llenos (${ids.length}/${MAX_FAVORITOS})`
                : "Guardar en favoritos"}
        </button>
        <p
          id={idAviso}
          role="status"
          aria-live="polite"
          className="min-h-4 text-xs text-subtle"
        >
          {aviso}
        </p>
      </div>
      {modalAbierto && (
        <AuthModal
          isOpen
          onClose={() => setModalAbierto(false)}
          onLoginSuccess={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}
