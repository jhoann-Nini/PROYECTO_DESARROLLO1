"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  CLAVE_TEMA,
  EVENTO_TEMA,
  aplicarTema,
  guardarTema,
  leerTemaGuardado,
  obtenerTemaDelDocumento,
  obtenerTemaInicial,
  type Tema,
} from "@/lib/tema";

function obtenerInstantanea(): Tema {
  return obtenerTemaDelDocumento();
}

function obtenerInstantaneaServidor(): Tema {
  return "claro";
}

/**
 * Mantiene sincronizado el tema de la aplicación con el DOM y localStorage.
 * El script anti-destello ya aplicó la clase antes de la hidratación; este
 * hook solo observa cambios y permite alternarlos.
 */
export function useTema() {
  const suscribir = useCallback((alCambiar: () => void) => {
    const alCambiarAlmacenamiento = (evento: StorageEvent) => {
      if (evento.key !== CLAVE_TEMA) {
        return;
      }

      // Otra pestaña cambió la preferencia: aplicarla también aquí.
      const siguiente = leerTemaGuardado() ?? obtenerTemaInicial();
      aplicarTema(siguiente);
      alCambiar();
    };

    const consultaSistema =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const alCambiarSistema = (evento: MediaQueryListEvent) => {
      // La preferencia del sistema solo manda mientras el usuario no haya
      // elegido un tema de forma explícita.
      if (leerTemaGuardado() !== null) {
        return;
      }

      aplicarTema(evento.matches ? "oscuro" : "claro");
      alCambiar();
    };

    window.addEventListener(EVENTO_TEMA, alCambiar);
    window.addEventListener("storage", alCambiarAlmacenamiento);
    consultaSistema?.addEventListener("change", alCambiarSistema);

    return () => {
      window.removeEventListener(EVENTO_TEMA, alCambiar);
      window.removeEventListener("storage", alCambiarAlmacenamiento);
      consultaSistema?.removeEventListener("change", alCambiarSistema);
    };
  }, []);

  const tema = useSyncExternalStore(
    suscribir,
    obtenerInstantanea,
    obtenerInstantaneaServidor,
  );

  useEffect(() => {
    // Si el script inicial no llegó a ejecutarse (por ejemplo, en pruebas o
    // con JavaScript bloqueado), aplicamos la preferencia al montar.
    aplicarTema(obtenerTemaInicial());
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }, []);

  const alternarTema = useCallback(() => {
    const siguiente: Tema =
      obtenerTemaDelDocumento() === "oscuro" ? "claro" : "oscuro";

    aplicarTema(siguiente);
    guardarTema(siguiente);
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }, []);

  return { tema, alternarTema };
}
