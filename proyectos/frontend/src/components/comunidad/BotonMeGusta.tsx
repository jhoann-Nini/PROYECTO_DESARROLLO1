"use client";

import { useState } from "react";
import { darMeGustaComunidad, retirarMeGustaComunidad, type ContenidoReaccionable } from "@/services/api";
import { CLASE_FOCO } from "@/components/ui/foco";
import { esSinSesion, mensajeError } from "./errores";

interface BotonMeGustaProps {
  tipo: ContenidoReaccionable;
  id: number;
  meGusta: number;
  meGustaPropio: boolean;
  autenticado: boolean;
  onRequiereSesion: () => void;
}

/** «Me gusta» optimista: cambia al instante y vuelve atrás si el servidor lo rechaza. */
export default function BotonMeGusta({ tipo, id, meGusta, meGustaPropio, autenticado, onRequiereSesion }: BotonMeGustaProps) {
  const [estado, setEstado] = useState({ conteo: meGusta, propio: meGustaPropio });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternar() {
    if (!autenticado) {
      onRequiereSesion();
      return;
    }
    if (enviando) return;
    const anterior = estado;
    const dar = !anterior.propio;
    setEstado({ conteo: Math.max(0, anterior.conteo + (dar ? 1 : -1)), propio: dar });
    setEnviando(true);
    setError(null);
    try {
      const respuesta = dar ? await darMeGustaComunidad(tipo, id) : await retirarMeGustaComunidad(tipo, id);
      setEstado({ conteo: respuesta.meGusta, propio: respuesta.meGustaPropio });
    } catch (err) {
      setEstado(anterior);
      if (esSinSesion(err)) onRequiereSesion();
      else setError(mensajeError(err, "No fue posible registrar tu «Me gusta»."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={alternar}
        aria-pressed={estado.propio}
        aria-label={estado.propio ? "Quitar Me gusta" : "Me gusta"}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${CLASE_FOCO} ${
          estado.propio
            ? "border-[var(--color-brand-blue)] text-[var(--color-brand-blue)]"
            : "border-[var(--color-hairline)] text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill={estado.propio ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
        <span>{estado.conteo}</span>
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
