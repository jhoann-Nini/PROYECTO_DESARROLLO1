"use client";

import { useEffect, useState } from "react";
import { obtenerResumenOfertas } from "@/services/api";
import type { ResumenOfertasProducto } from "@/types/producto";

/**
 * Fase 4 (H-04): carga una vez el resumen de ofertas disponibles. Devuelve
 * null mientras carga o si la consulta falla: en ese caso la disponibilidad
 * queda sin confirmar y el catálogo sigue funcionando.
 */
export function useResumenOfertas(): ResumenOfertasProducto[] | null {
  const [resumen, setResumen] = useState<ResumenOfertasProducto[] | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerResumenOfertas()
      .then((datos) => {
        if (activo) setResumen(datos);
      })
      .catch(() => {
        if (activo) setResumen(null);
      });
    return () => {
      activo = false;
    };
  }, []);

  return resumen;
}
