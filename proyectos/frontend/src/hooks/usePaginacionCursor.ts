"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PaginaCursor<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Paginación por cursor («Cargar más»). Vuelve a la primera página cuando
 * cambia {@code clave} (por ejemplo, el orden) y descarta respuestas viejas.
 * «Cargando» se deriva de qué solicitud terminó, sin setState síncrono en el efecto.
 */
export function usePaginacionCursor<T, P extends PaginaCursor<T> = PaginaCursor<T>>(
  cargar: (cursor: string | null) => Promise<P>,
  clave: string,
) {
  const [intento, setIntento] = useState(0);
  const solicitud = `${clave}#${intento}`;
  const [items, setItems] = useState<T[]>([]);
  const [ultima, setUltima] = useState<P | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [terminada, setTerminada] = useState<{ solicitud: string; error: unknown } | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState<unknown>(null);
  const cargarRef = useRef(cargar);
  const vigente = useRef(solicitud);

  // Siempre la última función de carga, sin reiniciar la paginación por ello.
  useEffect(() => {
    cargarRef.current = cargar;
  });

  useEffect(() => {
    vigente.current = solicitud;
    cargarRef.current(null)
      .then((pagina) => {
        if (vigente.current !== solicitud) return;
        setItems(pagina.items);
        setUltima(pagina);
        setCursor(pagina.nextCursor);
        setErrorMas(null);
        setTerminada({ solicitud, error: null });
      })
      .catch((err: unknown) => {
        if (vigente.current === solicitud) setTerminada({ solicitud, error: err });
      });
  }, [solicitud]);

  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas) return;
    const esta = vigente.current;
    setCargandoMas(true);
    setErrorMas(null);
    try {
      const pagina = await cargarRef.current(cursor);
      if (esta !== vigente.current) return;
      setItems((previos) => [...previos, ...pagina.items]);
      setUltima(pagina);
      setCursor(pagina.nextCursor);
    } catch (err) {
      if (esta === vigente.current) setErrorMas(err);
    } finally {
      setCargandoMas(false);
    }
  }, [cursor, cargandoMas]);

  const cargando = terminada?.solicitud !== solicitud;
  const errorInicial = !cargando ? terminada?.error ?? null : null;

  return {
    items,
    setItems,
    ultima,
    cargando,
    cargandoMas,
    error: errorInicial ?? errorMas,
    hayMas: !cargando && errorInicial === null && cursor !== null,
    cargarMas,
    reintentar: () => setIntento((valor) => valor + 1),
  };
}
