"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVENTO_FAVORITOS,
  alternarIdFavorito,
  claveFavoritos,
  eliminarFavoritosLegados,
  emitirCambioFavoritos,
  guardarIdsFavoritos,
  leerIdsFavoritos,
  normalizarIdsFavoritos,
  quitarIdFavorito,
  type DetalleEventoFavoritos,
  type ResultadoAlternarFavorito,
} from "@/data/favoritos";
import { createClient } from "@/lib/supabase/client";

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
  autenticado: boolean;
  alternar: (id: number) => ResultadoAlternarFavorito;
  quitar: (id: number) => void;
  limpiar: () => void;
  contiene: (id: number) => boolean;
}

/**
 * Mantiene los favoritos de la cuenta autenticada en localStorage.
 * Sin sesión no se hidrata ni se escribe nada: los visitantes solo pueden
 * iniciar sesión para usar favoritos. La clave es propia de cada cuenta y la
 * clave histórica anónima se elimina al montar.
 */
export function useFavoritos(): UseFavoritosResultado {
  const [ids, setIds] = useState<number[]>([]);
  const [idSesion, setIdSesion] = useState<string | null>(null);
  const [idCargado, setIdCargado] = useState<string | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [hidratado, setHidratado] = useState(false);
  const idsRef = useRef<number[]>([]);

  useEffect(() => {
    let montado = true;

    try {
      const supabase = createClient();

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_evento, session) => {
          if (!montado) return;
          setIdSesion(session?.user?.id ?? null);
          setSesionLista(true);
        },
      );

      supabase.auth
        .getSession()
        .then(({ data: { session }, error }) => {
          if (!montado || error) return;
          setIdSesion(session?.user?.id ?? null);
          setSesionLista(true);
        })
        .catch(() => {
          if (montado) setSesionLista(true);
        });

      return () => {
        montado = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      queueMicrotask(() => {
        if (montado) setSesionLista(true);
      });

      return () => {
        montado = false;
      };
    }
  }, []);

  useEffect(() => {
    if (!sesionLista) return;

    const storage = obtenerStorage();
    eliminarFavoritosLegados(storage);
    let montado = true;

    if (!idSesion) {
      idsRef.current = [];
      queueMicrotask(() => {
        if (!montado) return;
        setIds([]);
        setIdCargado(null);
        setHidratado(true);
      });

      return () => {
        montado = false;
      };
    }

    const clave = claveFavoritos(idSesion);
    const inicial = leerIdsFavoritos(storage, clave);
    idsRef.current = inicial;

    queueMicrotask(() => {
      if (!montado) return;
      setIds(inicial);
      setIdCargado(idSesion);
      setHidratado(true);
    });

    const alCambiarStorage = (event: StorageEvent) => {
      if (event.key !== clave && event.key !== null) return;

      const actualizados = leerIdsFavoritos(obtenerStorage(), clave);
      idsRef.current = actualizados;
      setIds(actualizados);
      setIdCargado(idSesion);
    };

    const alCambiarEnLaPestana = (event: Event) => {
      const detalle = (event as CustomEvent<DetalleEventoFavoritos>).detail;
      if (detalle?.clave && detalle.clave !== clave) return;

      const actualizados = normalizarIdsFavoritos(detalle?.ids);
      const sinCambios =
        actualizados.length === idsRef.current.length &&
        actualizados.every((id, indice) => id === idsRef.current[indice]);

      if (sinCambios) return;

      idsRef.current = actualizados;
      setIds(actualizados);
      setIdCargado(idSesion);
    };

    window.addEventListener("storage", alCambiarStorage);
    window.addEventListener(EVENTO_FAVORITOS, alCambiarEnLaPestana);
    return () => {
      montado = false;
      window.removeEventListener("storage", alCambiarStorage);
      window.removeEventListener(EVENTO_FAVORITOS, alCambiarEnLaPestana);
    };
  }, [idSesion, sesionLista]);

  const aplicar = useCallback(
    (nuevos: number[]) => {
      if (!idSesion) return;

      const clave = claveFavoritos(idSesion);
      idsRef.current = nuevos;
      setIds(nuevos);
      setIdCargado(idSesion);
      guardarIdsFavoritos(obtenerStorage(), nuevos, clave);
      emitirCambioFavoritos(nuevos, clave);
    },
    [idSesion],
  );

  const alternar = useCallback(
    (id: number) => {
      if (!idSesion) {
        return {
          ids: [],
          agregado: false,
          motivo: "sin-sesion",
        } satisfies ResultadoAlternarFavorito;
      }

      if (idCargado !== idSesion) {
        return {
          ids: [],
          agregado: false,
          motivo: "invalido",
        } satisfies ResultadoAlternarFavorito;
      }

      const resultado = alternarIdFavorito(idsRef.current, id);
      if (resultado.motivo === "agregado" || resultado.motivo === "quitado") {
        aplicar(resultado.ids);
      }
      return resultado;
    },
    [aplicar, idCargado, idSesion],
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

  const datosListos = Boolean(idSesion) && idCargado === idSesion;

  return {
    ids: datosListos ? ids : [],
    hidratado: hidratado && (idSesion === null || datosListos),
    autenticado: Boolean(idSesion),
    alternar,
    quitar,
    limpiar,
    contiene,
  };
}
