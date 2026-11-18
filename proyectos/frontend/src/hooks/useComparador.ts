"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CLAVE_COMPARADOR,
  agregarIdComparador,
  guardarIdsComparador,
  leerIdsComparador,
  quitarIdComparador,
  validarSeleccionComparador,
  type ProductoComparable,
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
  validado: boolean;
  idCategoria: number | null;
  seleccionDepurada: boolean;
  agregar: (id: number) => ResultadoAgregarComparador;
  quitar: (id: number) => void;
  limpiar: () => void;
  contiene: (id: number) => boolean;
}

/**
 * Mantiene la selección del comparador en localStorage.
 * El ref evita perder clics rápidos antes de que React aplique el estado.
 */
export function useComparador(
  catalogo?: readonly ProductoComparable[] | null,
): UseComparadorResultado {
  const [ids, setIds] = useState<number[]>([]);
  const [recientes, setRecientes] = useState<number[]>([]);
  const [hidratado, setHidratado] = useState(false);
  const [seleccionDepurada, setSeleccionDepurada] = useState(false);
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

    return () => {
      montado = false;
    };
  }, []);

  const reconciliar = useCallback((actuales: number[]) => {
    if (!catalogo) return actuales;
    const validos = validarSeleccionComparador(actuales, catalogo);
    if (actuales.join(",") !== validos.join(",")) {
      guardarIdsComparador(obtenerStorage(), validos);
      setSeleccionDepurada(true);
    }
    return validos;
  }, [catalogo]);

  useEffect(() => {
    if (!hidratado || !catalogo) return;
    let activo = true;
    queueMicrotask(() => {
      if (!activo) return;
      const validos = reconciliar(idsRef.current);
      idsRef.current = validos;
      setIds(validos);
    });
    return () => { activo = false; };
  }, [catalogo, hidratado, reconciliar]);

  useEffect(() => {
    const alCambiarStorage = (event: StorageEvent) => {
      if (event.key === CLAVE_COMPARADOR || event.key === null) {
        const actualizados = reconciliar(leerIdsComparador(obtenerStorage()));
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
      window.removeEventListener("storage", alCambiarStorage);
    };
  }, [reconciliar]);

  // Filtrar durante el render evita mostrar columnas incompatibles incluso
  // antes de que la depuración persistida termine su microtarea.
  const idsValidos = useMemo(
    () => catalogo ? validarSeleccionComparador(ids, catalogo) : ids,
    [catalogo, ids],
  );
  const idCategoria = catalogo?.find(
    (producto) => producto.idProducto === idsValidos[0],
  )?.idCategoria ?? null;

  const agregar = useCallback(
    (id: number) => {
      if (!catalogo) {
        return { ids: idsRef.current, agregado: false, motivo: "sin-validar" as const };
      }
      const resultado = agregarIdComparador(idsRef.current, id, catalogo);
      if (resultado.agregado) {
        aplicar(resultado.ids);
        aplicarRecientes(registrarComparado(recientesRef.current, id));
      }
      return resultado;
    },
    [aplicar, aplicarRecientes, catalogo],
  );

  const quitar = useCallback(
    (id: number) => aplicar(quitarIdComparador(reconciliar(idsRef.current), id)),
    [aplicar, reconciliar],
  );

  const limpiar = useCallback(() => aplicar([]), [aplicar]);

  const contiene = useCallback((id: number) => idsValidos.includes(id), [idsValidos]);

  return {
    ids: idsValidos,
    recientes,
    hidratado,
    validado: hidratado && catalogo != null,
    idCategoria,
    seleccionDepurada,
    agregar,
    quitar,
    limpiar,
    contiene,
  };
}
