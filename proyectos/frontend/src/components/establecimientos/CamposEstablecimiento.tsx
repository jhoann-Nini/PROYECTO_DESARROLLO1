"use client";

import { CLASE_FOCO } from "@/components/ui/foco";
import type { FormularioEstablecimiento } from "@/data/establecimientoForm";

interface CamposEstablecimientoProps {
  idBase: string;
  formulario: FormularioEstablecimiento;
  onCambiar: (campo: keyof FormularioEstablecimiento, valor: string) => void;
}

const CLASE_CAMPO = `mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`;

const CLASE_ETIQUETA = "block text-xs font-medium text-[var(--color-subtle)]";

/**
 * Campos editables compartidos por el panel de representante y la
 * administración de establecimientos.
 */
export default function CamposEstablecimiento({
  idBase,
  formulario,
  onCambiar,
}: CamposEstablecimientoProps) {
  return (
    <div className="space-y-3">
      <label htmlFor={`${idBase}-nombre`} className={CLASE_ETIQUETA}>
        Nombre del establecimiento
        <input
          id={`${idBase}-nombre`}
          type="text"
          value={formulario.nombre}
          onChange={(evento) => onCambiar("nombre", evento.target.value)}
          maxLength={150}
          className={CLASE_CAMPO}
        />
      </label>

      <label htmlFor={`${idBase}-direccion`} className={CLASE_ETIQUETA}>
        Dirección
        <input
          id={`${idBase}-direccion`}
          type="text"
          value={formulario.direccion}
          onChange={(evento) => onCambiar("direccion", evento.target.value)}
          maxLength={255}
          className={CLASE_CAMPO}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${idBase}-telefono`} className={CLASE_ETIQUETA}>
          Teléfono
          <input
            id={`${idBase}-telefono`}
            type="tel"
            value={formulario.telefono}
            onChange={(evento) => onCambiar("telefono", evento.target.value)}
            maxLength={30}
            className={CLASE_CAMPO}
          />
        </label>

        <label htmlFor={`${idBase}-correo`} className={CLASE_ETIQUETA}>
          Correo electrónico
          <input
            id={`${idBase}-correo`}
            type="email"
            value={formulario.correo}
            onChange={(evento) => onCambiar("correo", evento.target.value)}
            maxLength={150}
            className={CLASE_CAMPO}
          />
        </label>
      </div>

      <label htmlFor={`${idBase}-descripcion`} className={CLASE_ETIQUETA}>
        Descripción
        <textarea
          id={`${idBase}-descripcion`}
          value={formulario.descripcion}
          onChange={(evento) => onCambiar("descripcion", evento.target.value)}
          rows={3}
          className={CLASE_CAMPO}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${idBase}-latitud`} className={CLASE_ETIQUETA}>
          Latitud
          <input
            id={`${idBase}-latitud`}
            type="number"
            step="any"
            value={formulario.latitud}
            onChange={(evento) => onCambiar("latitud", evento.target.value)}
            className={CLASE_CAMPO}
          />
        </label>

        <label htmlFor={`${idBase}-longitud`} className={CLASE_ETIQUETA}>
          Longitud
          <input
            id={`${idBase}-longitud`}
            type="number"
            step="any"
            value={formulario.longitud}
            onChange={(evento) => onCambiar("longitud", evento.target.value)}
            className={CLASE_CAMPO}
          />
        </label>
      </div>
    </div>
  );
}
