"use client";

import { useEffect, useState } from "react";
import { obtenerMiReincidencia } from "@/services/api";
import type { EstadoReincidencia } from "@/types/moderacion";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatear(valor: string | null, formato: Intl.DateTimeFormat): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : formato.format(fecha);
}

function mensajeNivel(estado: EstadoReincidencia): string {
  switch (estado.nivel) {
    case "BLOQUEO":
      return `No puedes publicar ni reportar hasta el ${formatear(estado.bloqueoHasta, FORMATO_FECHA_HORA)}.`;
    case "REVISION_PREVIA":
      return `Tus reseñas pasarán por revisión antes de publicarse hasta el ${formatear(estado.revisionPreviaHasta, FORMATO_FECHA_HORA)}.`;
    default:
      return "Una de tus reseñas fue rechazada por moderación. Si se acumulan más, tus próximas reseñas pasarán por revisión antes de publicarse.";
  }
}

/**
 * Caso 6: estado de la cuenta por reincidencia en el perfil. Solo aparece
 * cuando hay faltas; si la consulta falla no muestra nada.
 */
export default function EstadoCuentaReincidencia({
  idUsuario,
}: {
  idUsuario: number | null | undefined;
}) {
  const [estado, setEstado] = useState<EstadoReincidencia | null>(null);

  useEffect(() => {
    if (!idUsuario) return;
    let activo = true;
    obtenerMiReincidencia()
      .then((datos) => {
        if (activo) setEstado(datos);
      })
      .catch(() => {
        if (activo) setEstado(null);
      });
    return () => {
      activo = false;
    };
  }, [idUsuario]);

  if (!idUsuario || !estado || estado.nivel === "NINGUNO" || estado.faltas <= 0) {
    return null;
  }

  const restrictivo = estado.nivel === "BLOQUEO" || estado.nivel === "REVISION_PREVIA";
  return (
    <section
      role="status"
      aria-label="Estado de tu cuenta"
      className={`mt-4 rounded-xl border p-4 text-sm ${
        restrictivo
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <h2 className="font-semibold">Estado de tu cuenta</h2>
      <p className="mt-1">{mensajeNivel(estado)}</p>
      <p className="mt-1 text-xs">
        {`Faltas en los últimos 90 días: ${estado.faltas}. La más antigua deja de contar el ${formatear(estado.proximaCaducidad, FORMATO_FECHA)}.`}
      </p>
    </section>
  );
}
