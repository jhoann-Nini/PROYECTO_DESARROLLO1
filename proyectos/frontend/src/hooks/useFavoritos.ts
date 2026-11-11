"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLAVE_FAVORITOS,
  EVENTO_FAVORITOS,
  alternarIdFavorito,
  emitirCambioFavoritos,
  guardarIdsFavoritos,
  leerIdsFavoritos,
  normalizarIdsFavoritos,
  quitarIdFavorito,
  type DetalleEventoFavoritos,
  type ResultadoAlternarFavorito,
} from "@/data/favoritos";

function obtenerStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseFavoritosResultado {
  ids: number[];
  hidratado: boolean;
  alternar: (id: number) => ResultadoAlternarFavorito;
  quitar: (id: number) => void;
  limpiar: () => void;
  contiene: (id: number) => boolean;
}

/**
 * Mantiene los favoritos en localStorage y los sincroniza entre pestañas.
 * El ref evita perder clics rápidos antes de que React aplique el estado.
 */
export function useFavoritos(): UseFavoritosResultado {
  const [ids, setIds] = useState<number[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const idsRef = useRef<number[]>([]);

  const aplicar = useCallback((nuevos: number[]) => {
    idsRef.current = nuevos;
    setIds(nuevos);
    guardarIdsFavoritos(obtenerStorage(), nuevos);
    emitirCambioFavoritos(nuevos);
  }, []);

  useEffect(() => {
    let montado = true;
    const inicial = leerIdsFavoritos(obtenerStorage());
    idsRef.current = inicial;

    queueMicrotask(() => {
      if (!montado) return;
      setIds(inicial);
      setHidratado(true);
    });

    const alCambiarStorage = (event: StorageEvent) => {
      if (event.key !== CLAVE_FAVORITOS && event.key !== null) return;

      const actualizados = leerIdsFavoritos(obtenerStorage());
      idsRef.current = actualizados;
      setIds(actualizados);
    };

    const alCambiarEnLaPestana = (event: Event) => {
      const detalle = (event as CustomEvent<DetalleEventoFavoritos>).detail;
      const actualizados = normalizarIdsFavoritos(detalle?.ids);
      const sinCambios =
        actualizados.length === idsRef.current.length &&
        actualizados.every((id, indice) => id === idsRef.current[indice]);

      if (sinCambios) return;

      idsRef.current = actualizados;
      setIds(actualizados);
    };

    window.addEventListener("storage", alCambiarStorage);
    window.addEventListener(EVENTO_FAVORITOS, alCambiarEnLaPestana);
    return () => {
      montado = false;
      window.removeEventListener("storage", alCambiarStorage);
      window.removeEventListener(EVENTO_FAVORITOS, alCambiarEnLaPestana);
    };
  }, []);

  const alternar = useCallback(
    (id: number) => {
      const resultado = alternarIdFavorito(idsRef.current, id);
      if (resultado.motivo === "agregado" || resultado.motivo === "quitado") {
        aplicar(resultado.ids);
      }
      return resultado;
    },
    [aplicar],
  );

  const quitar = useCallback(
    (id: number) => aplicar(quitarIdFavorito(idsRef.current, id)),
    [aplicar],
  );

  const limpiar = useCallback(() => aplicar([]), [aplicar]);

  const contiene = useCallback(
    (id: number) => idsRef.current.includes(id),
    [],
  );

  return { ids, hidratado, alternar, quitar, limpiar, contiene };
}
