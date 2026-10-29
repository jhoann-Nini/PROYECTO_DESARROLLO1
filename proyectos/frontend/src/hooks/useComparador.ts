"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLAVE_COMPARADOR,
  agregarIdComparador,
  guardarIdsComparador,
  leerIdsComparador,
  quitarIdComparador,
  type ResultadoAgregarComparador,
} from "@/data/comparador";

function obtenerStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseComparadorResultado {
  ids: number[];
  hidratado: boolean;
  agregar: (id: number) => ResultadoAgregarComparador;
  quitar: (id: number) => void;
  limpiar: () => void;
  contiene: (id: number) => boolean;
}

/**
 * Mantiene la selección del comparador en localStorage.
 * El ref evita perder clics rápidos antes de que React aplique el estado.
 */
export function useComparador(): UseComparadorResultado {
  const [ids, setIds] = useState<number[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const idsRef = useRef<number[]>([]);

  const aplicar = useCallback((nuevos: number[]) => {
    idsRef.current = nuevos;
    setIds(nuevos);
    guardarIdsComparador(obtenerStorage(), nuevos);
  }, []);

  useEffect(() => {
    let montado = true;
    const inicial = leerIdsComparador(obtenerStorage());
    idsRef.current = inicial;

    queueMicrotask(() => {
      if (!montado) return;
      setIds(inicial);
      setHidratado(true);
    });

    const alCambiarStorage = (event: StorageEvent) => {
      if (event.key !== CLAVE_COMPARADOR && event.key !== null) return;

      const actualizados = leerIdsComparador(obtenerStorage());
      idsRef.current = actualizados;
      setIds(actualizados);
    };

    window.addEventListener("storage", alCambiarStorage);
    return () => {
      montado = false;
      window.removeEventListener("storage", alCambiarStorage);
    };
  }, []);

  const agregar = useCallback(
    (id: number) => {
      const resultado = agregarIdComparador(idsRef.current, id);
      if (resultado.agregado) aplicar(resultado.ids);
      return resultado;
    },
    [aplicar],
  );

  const quitar = useCallback(
    (id: number) => aplicar(quitarIdComparador(idsRef.current, id)),
    [aplicar],
  );

  const limpiar = useCallback(() => aplicar([]), [aplicar]);

  const contiene = useCallback((id: number) => idsRef.current.includes(id), []);

  return { ids, hidratado, agregar, quitar, limpiar, contiene };
}
