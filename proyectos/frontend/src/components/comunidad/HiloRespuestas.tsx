"use client";

import { useState } from "react";
import { usePaginacionCursor } from "@/hooks/usePaginacionCursor";
import { obtenerRespuestasComunidad } from "@/services/api";
import type { RespuestaComunidad } from "@/types/comunidad";
import RespuestaItem from "./RespuestaItem";
import { CLASE_BOTON } from "./estilos";
import { mensajeError } from "./errores";

interface HiloRespuestasProps {
  idPublicacion: number;
  /** Nulo para las respuestas directas. */
  padre: number | null;
  /** 0 a 2: profundidad de las respuestas de esta lista. */
  nivel: number;
  puedeResponder: boolean;
  autenticado: boolean;
  onRequiereSesion: () => void;
  autorPadre?: string | null;
  /** Respuestas directas creadas en esta visita, para mostrarlas sin recargar. */
  nuevas?: RespuestaComunidad[];
}

/**
 * Un nivel del árbol (un nivel por petición). Al abrir la publicación se ven
 * dos niveles; el tercero se carga con «Ver N respuestas».
 */
export default function HiloRespuestas({
  idPublicacion, padre, nivel, puedeResponder, autenticado, onRequiereSesion, autorPadre, nuevas = [],
}: HiloRespuestasProps) {
  const paginacion = usePaginacionCursor<RespuestaComunidad>(
    (cursor) => obtenerRespuestasComunidad(idPublicacion, { padre, cursor }),
    `${idPublicacion}-${padre ?? "raiz"}`,
  );
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const [recargas, setRecargas] = useState<Record<number, number>>({});
  // Sin duplicados: una respuesta creada aquí puede volver a llegar con «Cargar más».
  const vistos = new Set<number>();
  const items = [...paginacion.items, ...nuevas].filter((r) => {
    if (vistos.has(r.idRespuesta)) return false;
    vistos.add(r.idRespuesta);
    return true;
  });

  function reemplazar(cambiada: RespuestaComunidad) {
    paginacion.setItems((previos) => previos.map((r) => (r.idRespuesta === cambiada.idRespuesta ? cambiada : r)));
  }

  function alCrear(creada: RespuestaComunidad, desde: RespuestaComunidad) {
    if (creada.idRespuestaPadre === padre) {
      // Hermana de nivel 2 que cita a la respuesta: va en esta misma lista.
      paginacion.setItems((previos) => [...previos, creada]);
      return;
    }
    paginacion.setItems((previos) => previos.map((r) =>
      r.idRespuesta === desde.idRespuesta ? { ...r, respuestasHijas: r.respuestasHijas + 1 } : r));
    setAbiertas((previas) => new Set(previas).add(desde.idRespuesta));
    setRecargas((previas) => ({ ...previas, [desde.idRespuesta]: (previas[desde.idRespuesta] ?? 0) + 1 }));
  }

  if (paginacion.cargando) {
    return <p role="status" aria-busy="true" className="text-xs text-[var(--color-subtle)]">Cargando respuestas…</p>;
  }
  if (paginacion.error && items.length === 0) {
    return (
      <div role="alert" className="text-xs text-red-700">
        <p>{mensajeError(paginacion.error, "No fue posible cargar las respuestas.")}</p>
        <button type="button" onClick={paginacion.reintentar} className={`mt-1 ${CLASE_BOTON}`}>Reintentar</button>
      </div>
    );
  }
  if (items.length === 0) {
    return nivel === 0 ? <p className="text-sm text-[var(--color-subtle)]">Todavía no hay respuestas.</p> : null;
  }

  return (
    <div>
      <ul
        role="list"
        aria-label={nivel === 0 ? "Respuestas" : `Hilo de la respuesta de ${autorPadre ?? "un usuario"}`}
        className={nivel === 0 ? "space-y-3" : "mt-3 space-y-3 border-l border-[var(--color-hairline)] pl-4"}
      >
        {items.map((respuesta) => {
          const hijas = respuesta.respuestasHijas;
          const mostrarHijas = hijas > 0 && (respuesta.profundidad === 0 || abiertas.has(respuesta.idRespuesta));
          return (
            <li key={respuesta.idRespuesta} aria-level={nivel + 1}>
              <RespuestaItem
                idPublicacion={idPublicacion}
                respuesta={respuesta}
                puedeResponder={puedeResponder}
                autenticado={autenticado}
                onRequiereSesion={onRequiereSesion}
                onCambio={reemplazar}
                onRespuestaCreada={(creada) => alCrear(creada, respuesta)}
              />
              {hijas > 0 && respuesta.profundidad === 1 && !abiertas.has(respuesta.idRespuesta) && (
                <button
                  type="button"
                  onClick={() => setAbiertas((previas) => new Set(previas).add(respuesta.idRespuesta))}
                  className={`mt-2 ${CLASE_BOTON}`}
                >
                  {`Ver ${hijas} ${hijas === 1 ? "respuesta" : "respuestas"}`}
                </button>
              )}
              {mostrarHijas && respuesta.profundidad < 2 && (
                <HiloRespuestas
                  key={`${respuesta.idRespuesta}-${recargas[respuesta.idRespuesta] ?? 0}`}
                  idPublicacion={idPublicacion}
                  padre={respuesta.idRespuesta}
                  nivel={nivel + 1}
                  puedeResponder={puedeResponder}
                  autenticado={autenticado}
                  onRequiereSesion={onRequiereSesion}
                  autorPadre={respuesta.autor}
                />
              )}
            </li>
          );
        })}
      </ul>
      {paginacion.hayMas && (
        <button type="button" onClick={paginacion.cargarMas} disabled={paginacion.cargandoMas} className={`mt-3 ${CLASE_BOTON}`}>
          {paginacion.cargandoMas ? "Cargando…" : "Cargar más respuestas"}
        </button>
      )}
    </div>
  );
}
