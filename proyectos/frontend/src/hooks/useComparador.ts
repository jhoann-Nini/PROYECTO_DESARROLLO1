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
import {
  CLAVE_COMPARADOS_RECIENTES,
  guardarComparadosRecientes,
  leerComparadosRecientes,
  registrarComparado,
} from "@/data/comparadosRecientes";

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
  recientes: number[];
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
  const [recientes, setRecientes] = useState<number[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const idsRef = useRef<number[]>([]);
  const recientesRef = useRef<number[]>([]);

  const aplicar = useCallback((nuevos: number[]) => {
    idsRef.current = nuevos;
    setIds(nuevos);
    guardarIdsComparador(obtenerStorage(), nuevos);
  }, []);

  const aplicarRecientes = useCallback((nuevos: number[]) => {
    recientesRef.current = nuevos;
    setRecientes(nuevos);
    guardarComparadosRecientes(obtenerStorage(), nuevos);
  }, []);

  useEffect(() => {
    let montado = true;
    const inicial = leerIdsComparador(obtenerStorage());
    const recientesIniciales = leerComparadosRecientes(obtenerStorage());
    idsRef.current = inicial;
    recientesRef.current = recientesIniciales;

    queueMicrotask(() => {
      if (!montado) return;
      // Si el usuario ya interactuó, los refs tienen el estado más reciente.
      setIds(idsRef.current);
      setRecientes(recientesRef.current);
      setHidratado(true);
    });

    const alCambiarStorage = (event: StorageEvent) => {
      if (event.key === CLAVE_COMPARADOR || event.key === null) {
        const actualizados = leerIdsComparador(obtenerStorage());
        idsRef.current = actualizados;
        setIds(actualizados);
      }

      if (event.key === CLAVE_COMPARADOS_RECIENTES || event.key === null) {
        const actualizados = leerComparadosRecientes(obtenerStorage());
        recientesRef.current = actualizados;
        setRecientes(actualizados);
      }
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
      if (resultado.agregado) {
        aplicar(resultado.ids);
        aplicarRecientes(registrarComparado(recientesRef.current, id));
      }
      return resultado;
    },
    [aplicar, aplicarRecientes],
  );

  const quitar = useCallback(
    (id: number) => aplicar(quitarIdComparador(idsRef.current, id)),
    [aplicar],
  );

  const limpiar = useCallback(() => aplicar([]), [aplicar]);

  const contiene = useCallback((id: number) => idsRef.current.includes(id), []);

  return {
    ids,
    recientes,
    hidratado,
    agregar,
    quitar,
    limpiar,
    contiene,
  };
}
