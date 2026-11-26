"use client";

import { useEffect, useId, useRef, useState } from "react";
import { reportarContenidoComunidad, type ContenidoReaccionable } from "@/services/api";
import { MOTIVOS_REPORTE_COMUNIDAD, type MotivoReporteComunidad } from "@/types/comunidad";
import { atraparTabulacion } from "@/components/ui/foco";
import { CLASE_ALERTA, CLASE_BOTON, CLASE_BOTON_PRINCIPAL, CLASE_CAMPO } from "./estilos";
import { esSinSesion, mensajeError } from "./errores";

interface ReportarContenidoModalProps {
  tipo: ContenidoReaccionable;
  id: number;
  onCerrar: () => void;
  onReportado: () => void;
  onPedirLogin: () => void;
}

const DESCRIPCION_MAX = 500;

/**
 * Reportar una publicación o una respuesta. Diálogo modal: foco atrapado,
 * Escape cierra y el foco vuelve al botón que lo abrió.
 */
export default function ReportarContenidoModal({ tipo, id, onCerrar, onReportado, onPedirLogin }: ReportarContenidoModalProps) {
  const [motivo, setMotivo] = useState<MotivoReporteComunidad | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const dialogo = useRef<HTMLDivElement>(null);
  const primerCampo = useRef<HTMLSelectElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primerCampo.current?.focus();
    return () => anterior?.focus();
  }, []);

  useEffect(() => {
    function escape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviandoRef.current) {
        evento.preventDefault();
        onCerrar();
      }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCerrar]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    if (!motivo) {
      setError("Elige el motivo del reporte.");
      return;
    }
    if (motivo === "otro" && !descripcion.trim()) {
      setError("Describe el motivo del reporte.");
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      await reportarContenidoComunidad(tipo, id, motivo, descripcion.trim() || null);
      onReportado();
    } catch (err) {
      if (esSinSesion(err)) onPedirLogin();
      else setError(mensajeError(err, "No fue posible enviar el reporte."));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onKeyDown={(e) => atraparTabulacion(e, dialogo.current)}
        className="w-full max-w-md rounded-lg bg-[var(--color-paper)] p-5 shadow-lg"
      >
        <h2 id={tituloId} className="text-base font-semibold text-[var(--color-ink)]">
          {tipo === "publicaciones" ? "Reportar publicación" : "Reportar respuesta"}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-subtle)]">
          Un moderador revisará el reporte. Con tres reportes, el contenido se oculta hasta la revisión.
        </p>
        <form onSubmit={enviar} noValidate className="mt-4 space-y-3">
          <label htmlFor={`${tituloId}-motivo`} className="block text-xs font-medium text-[var(--color-subtle)]">
            Motivo
            <select
              id={`${tituloId}-motivo`}
              ref={primerCampo}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoReporteComunidad)}
              className={CLASE_CAMPO}
            >
              <option value="">Elige un motivo</option>
              {MOTIVOS_REPORTE_COMUNIDAD.map((m) => (
                <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
              ))}
            </select>
          </label>
          <label htmlFor={`${tituloId}-descripcion`} className="block text-xs font-medium text-[var(--color-subtle)]">
            {motivo === "otro" ? "Descripción (obligatoria)" : "Descripción (opcional)"}
            <textarea
              id={`${tituloId}-descripcion`}
              rows={3}
              value={descripcion}
              maxLength={DESCRIPCION_MAX}
              onChange={(e) => setDescripcion(e.target.value)}
              className={CLASE_CAMPO}
            />
          </label>
          {error && <p role="alert" className={CLASE_ALERTA}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCerrar} disabled={enviando} className={CLASE_BOTON}>Cancelar</button>
            <button type="submit" disabled={enviando} className={CLASE_BOTON_PRINCIPAL}>
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
