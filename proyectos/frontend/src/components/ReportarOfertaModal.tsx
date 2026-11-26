"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CLASE_FOCO } from "@/components/ui/foco";
import Button from "@/components/ui/Button";
import { ApiError, crearReporteOferta } from "@/services/api";
import type { CrearReporteOfertaRequest } from "@/types/reporteOferta";

export interface OfertaReportable {
  idProducto: number;
  idEstablecimiento: number;
  nombreProducto: string;
  nombreEstablecimiento: string;
}

interface ReportarOfertaModalProps {
  oferta: OfertaReportable;
  onCerrar: () => void;
  onReportado: () => void;
  onPedirLogin: () => void;
}

const ENFOCABLES = 'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]';

export default function ReportarOfertaModal({
  oferta, onCerrar, onReportado, onPedirLogin,
}: ReportarOfertaModalProps) {
  const [motivo, setMotivo] = useState<CrearReporteOfertaRequest["motivo"] | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [sinSesion, setSinSesion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const motivoRef = useRef<HTMLSelectElement>(null);
  const tituloId = useId();
  const descripcionId = useId();

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    motivoRef.current?.focus();
    return () => {
      document.body.style.overflow = overflowPrevio;
      anterior?.focus();
    };
  }, []);

  useEffect(() => {
    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviandoRef.current) {
        evento.preventDefault();
        onCerrar();
      }
    }
    window.addEventListener("keydown", manejarEscape);
    return () => window.removeEventListener("keydown", manejarEscape);
  }, [onCerrar]);

  function manejarTab(evento: ReactKeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Tab" || !dialogoRef.current) return;
    const elementos = Array.from(dialogoRef.current.querySelectorAll<HTMLElement>(ENFOCABLES));
    if (!elementos.length) {
      evento.preventDefault();
      dialogoRef.current.focus();
      return;
    }
    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];
    if (evento.shiftKey && (document.activeElement === primero || !dialogoRef.current.contains(document.activeElement))) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && (document.activeElement === ultimo || !dialogoRef.current.contains(document.activeElement))) {
      evento.preventDefault();
      primero.focus();
    }
  }

  async function enviarReporte(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    setError("");
    setSinSesion(false);
    if (!motivo) {
      setError("Selecciona un motivo para continuar.");
      motivoRef.current?.focus();
      return;
    }
    if (descripcion.length > 2000) {
      setError("La descripción no puede superar los 2000 caracteres.");
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      await crearReporteOferta({
        idProducto: oferta.idProducto,
        idEstablecimiento: oferta.idEstablecimiento,
        motivo,
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
      });
      onReportado();
    } catch (err) {
      const requiereSesion = err instanceof ApiError && err.status === 401;
      setSinSesion(requiereSesion);
      setError(requiereSesion
        ? "Debes iniciar sesión para enviar este reporte."
        : err instanceof Error ? err.message : "No pudimos enviar el reporte. Inténtalo de nuevo.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-ink/50" onClick={() => {
        if (!enviandoRef.current) onCerrar();
      }} />
      <div
        ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby={tituloId}
        onKeyDown={manejarTab} tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-line bg-paper p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={tituloId} className="text-lg font-medium uppercase text-ink">Reportar precio o enlace</h2>
          <button type="button" aria-label="Cerrar" disabled={enviando} onClick={onCerrar}
            className={`min-h-11 min-w-11 cursor-pointer rounded-full text-ink hover:bg-surface-muted ${CLASE_FOCO}`}
          >×</button>
        </div>
        <p className="mt-2 text-sm text-subtle">
          Oferta de {oferta.nombreProducto} en {oferta.nombreEstablecimiento}.
        </p>
        <form onSubmit={enviarReporte} noValidate className="mt-4 space-y-4">
          <div>
            <label htmlFor={`${tituloId}-motivo`} className="block text-sm font-medium text-ink">Motivo</label>
            <select id={`${tituloId}-motivo`} ref={motivoRef} value={motivo} required
              onChange={(evento) => { setMotivo(evento.target.value as typeof motivo); setError(""); }}
              className={`mt-1 min-h-11 w-full rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink ${CLASE_FOCO}`}
            >
              <option value="">Selecciona un motivo</option>
              <option value="precio_incorrecto">Precio incorrecto</option>
              <option value="enlace_incorrecto">Enlace incorrecto</option>
            </select>
          </div>
          <div>
            <label htmlFor={descripcionId} className="block text-sm font-medium text-ink">Descripción (opcional)</label>
            <textarea id={descripcionId} value={descripcion} maxLength={2000} rows={4}
              onChange={(evento) => setDescripcion(evento.target.value)}
              className={`mt-1 min-h-24 w-full resize-y rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-sm text-ink ${CLASE_FOCO}`}
            />
            <p className="text-right text-xs text-subtle" aria-live="polite">{descripcion.length}/2000</p>
          </div>
          {error && <div role="alert" className="text-sm text-status-error">
            <p>{error}</p>
            {sinSesion && <button type="button" onClick={onPedirLogin}
              className={`mt-2 cursor-pointer font-medium text-brand-blue underline ${CLASE_FOCO}`}
            >Iniciar sesión</button>}
          </div>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" type="button" disabled={enviando} onClick={onCerrar}
            >Cancelar</Button>
            <Button variant="primary" type="submit" disabled={enviando}
            >{enviando ? "Enviando…" : "Enviar reporte"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
