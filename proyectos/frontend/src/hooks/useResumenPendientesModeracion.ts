"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerResumenPendientesModeracion } from "@/services/api";
import type { ResumenPendientesModeracion } from "@/types/moderacion";

/** Cada cuánto se actualiza el contador mientras está habilitado. */
export const INTERVALO_RESUMEN_PENDIENTES_MS = 60_000;

/**
 * Caso 6: contador de pendientes para moderadores. Se consulta al habilitarse,
 * cada minuto y cuando se llama a `recargar` (por ejemplo, tras una decisión).
 * Devuelve null mientras carga, si falla o si está deshabilitado: el contador
 * es una ayuda y su fallo no debe bloquear el panel.
 */
export function useResumenPendientesModeracion(habilitado: boolean): {
  resumen: ResumenPendientesModeracion | null;
  recargar: () => void;
} {
  const [resumen, setResumen] = useState<ResumenPendientesModeracion | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!habilitado) return;
    let activo = true;
    obtenerResumenPendientesModeracion()
      .then((datos) => {
        if (activo) setResumen(datos);
      })
      .catch(() => {
        if (activo) setResumen(null);
      });
    return () => {
      activo = false;
    };
  }, [habilitado, version]);

  useEffect(() => {
    if (!habilitado) return;
    const id = setInterval(recargar, INTERVALO_RESUMEN_PENDIENTES_MS);
    return () => clearInterval(id);
  }, [habilitado, recargar]);

  return { resumen: habilitado ? resumen : null, recargar };
}
