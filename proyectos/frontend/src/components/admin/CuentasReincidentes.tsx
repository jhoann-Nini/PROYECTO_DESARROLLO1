"use client";

import { useEffect, useState } from "react";
import { obtenerCuentasReincidentes } from "@/services/api";
import type { CuentaReincidente } from "@/types/moderacion";
import { CLASE_FOCO } from "@/components/ui/foco";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Caso 6: cuentas activas con 4 faltas o más en los últimos 90 días. La
 * suspensión la decide el administrador con el bloque «Estado de la cuenta»;
 * «Revisar» selecciona la cuenta para eso.
 */
export default function CuentasReincidentes({
  onRevisar,
}: {
  onRevisar: (cuenta: CuentaReincidente) => void;
}) {
  const [cuentas, setCuentas] = useState<CuentaReincidente[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerCuentasReincidentes()
      .then((datos) => {
        if (activo) setCuentas(datos);
      })
      .catch(() => {
        if (activo) setError(true);
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <section
      aria-labelledby="titulo-cuentas-reincidentes"
      className="rounded-card border border-line p-3"
    >
      <h3
        id="titulo-cuentas-reincidentes"
        className="text-xs font-medium uppercase tracking-normal text-subtle"
      >
        Cuentas reincidentes
      </h3>
      <p className="mt-1 text-xs text-subtle">
        Cuentas activas con 4 faltas de moderación o más en los últimos 90 días.
        Decide si suspenderlas.
      </p>
      {error ? (
        <p className="mt-2 text-xs text-status-error">No fue posible cargar las cuentas reincidentes.</p>
      ) : cuentas === null ? (
        <p className="mt-2 text-xs text-subtle">Cargando…</p>
      ) : cuentas.length === 0 ? (
        <p className="mt-2 text-xs text-subtle">No hay cuentas con 4 faltas o más.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {cuentas.map((cuenta) => (
            <li
              key={cuenta.idUsuario}
              className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-status-error bg-paper p-2"
            >
              <div>
                <p className="text-sm font-medium text-ink">{cuenta.nombre}</p>
                <p className="break-all text-xs text-subtle">{cuenta.correo}</p>
                <p className="text-xs text-status-error">
                  {`${cuenta.faltas} faltas · última el ${FORMATO_FECHA.format(new Date(cuenta.ultimaFalta))}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRevisar(cuenta)}
                aria-label={`Revisar la cuenta de ${cuenta.nombre}`}
                className={`cursor-pointer rounded-card border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-blue hover:text-brand-blue ${CLASE_FOCO}`}
              >
                Revisar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
