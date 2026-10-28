"use client";

import { useEffect, useRef, useState } from "react";
import { CLASE_FOCO } from "@/components/ui/foco";

interface BotonCompartirProps {
  titulo: string;
  texto?: string;
  url?: string;
}

const MENSAJE_COMPARTIDO = "Enlace compartido.";
const MENSAJE_COPIADO = "Enlace copiado.";
const MENSAJE_ERROR =
  "No pudimos copiar el enlace. Copia la URL del navegador.";
const DURACION_AVISO_MS = 4000;

/**
 * Comparte el enlace del producto con Web Share y, si no está disponible,
 * copia la URL al portapapeles. Nunca deja una promesa rechazada sin capturar.
 */
export default function BotonCompartir({
  titulo,
  texto,
  url,
}: BotonCompartirProps) {
  const [aviso, setAviso] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function anunciar(mensaje: string) {
    setAviso(mensaje);

    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(""), DURACION_AVISO_MS);
  }

  async function copiarEnlace(enlace: string) {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Portapapeles no disponible");
      }

      await navigator.clipboard.writeText(enlace);
      anunciar(MENSAJE_COPIADO);
    } catch {
      anunciar(MENSAJE_ERROR);
    }
  }

  async function compartir() {
    const enlace =
      url ?? (typeof window !== "undefined" ? window.location.href : "");

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: titulo,
          text: texto ?? titulo,
          url: enlace,
        });
        anunciar(MENSAJE_COMPARTIDO);
        return;
      } catch (error) {
        // El usuario canceló la hoja nativa: no es un error.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Cualquier otro fallo de Web Share pasa al portapapeles.
      }
    }

    await copiarEnlace(enlace);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={compartir}
        aria-label="Compartir producto"
        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75 12 3l3.75 3.75M12 3v12m-6.75 2.25v3a.75.75 0 0 0 .75.75h12a.75.75 0 0 0 .75-.75v-3"
          />
        </svg>
        Compartir
      </button>

      <p
        role="status"
        aria-live="polite"
        className="min-h-4 text-xs text-[var(--color-subtle)]"
      >
        {aviso}
      </p>
    </div>
  );
}
