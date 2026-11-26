"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  decidirModeracionComunidad,
  obtenerColaRevisionComunidad,
  obtenerReportesComunidad,
  resolverReporteComunidad,
} from "@/services/api";
import type {
  AccionAlAceptarReporte,
  DecisionModeracionComunidad,
  ElementoRevisionComunidad,
  ReporteModeracionComunidad,
} from "@/types/comunidad";
import TextoPlano from "@/components/comunidad/TextoPlano";
import { CLASE_ALERTA, CLASE_BOTON, CLASE_CAMPO } from "@/components/comunidad/estilos";
import { formatearFecha, mensajeError } from "@/components/comunidad/errores";

type Vista = "revision" | "reportes";

const ETIQUETA_RIESGO: Record<ElementoRevisionComunidad["riesgo"], string> = {
  NINGUNO: "Riesgo bajo (revisión previa del autor)",
  BAJO: "Riesgo bajo",
  MEDIO: "Riesgo medio",
  ALTO: "Riesgo alto",
};

const rutaDe = (tipo: "PUBLICACION" | "RESPUESTA") => (tipo === "PUBLICACION" ? "publicaciones" : "respuestas");

/**
 * Pestaña «Comunidad» del panel de moderación: lo retenido por el filtro
 * (aprobar o rechazar) y los reportes (aceptar, con ocultar o eliminar, o
 * rechazar). Toda decisión lleva motivo o justificación y queda auditada.
 */
export default function ColaComunidad({ onCambio }: { onCambio: () => void }) {
  const [vista, setVista] = useState<Vista>("revision");

  return (
    <div className="space-y-3 pt-3">
      <div className="flex gap-2" role="group" aria-label="Colas de la comunidad">
        <button type="button" aria-pressed={vista === "revision"} onClick={() => setVista("revision")} className={CLASE_BOTON}>
          En revisión
        </button>
        <button type="button" aria-pressed={vista === "reportes"} onClick={() => setVista("reportes")} className={CLASE_BOTON}>
          Reportes
        </button>
      </div>
      {vista === "revision" ? <ColaRevision onCambio={onCambio} /> : <ColaReportes onCambio={onCambio} />}
    </div>
  );
}

function ColaRevision({ onCambio }: { onCambio: () => void }) {
  const [elementos, setElementos] = useState<ElementoRevisionComunidad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerColaRevisionComunidad()
      .then((datos) => {
        if (activo) setElementos(datos);
      })
      .catch((err: unknown) => {
        if (activo) setError(mensajeError(err, "No fue posible cargar la cola."));
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  if (error) {
    return (
      <div role="alert" className={CLASE_ALERTA}>
        <p>{error}</p>
        <button type="button" onClick={() => { setError(null); setIntento((v) => v + 1); }} className={`mt-2 ${CLASE_BOTON}`}>
          Reintentar
        </button>
      </div>
    );
  }
  if (elementos === null) return <p role="status" aria-busy="true" className="text-xs text-[var(--color-subtle)]">Cargando…</p>;
  const avisoVisible = aviso && <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{aviso}</p>;
  if (elementos.length === 0) {
    return <>{avisoVisible}<p className="text-xs text-[var(--color-subtle)]">No hay contenido de la comunidad en revisión.</p></>;
  }

  return (
    <>
    {avisoVisible}
    <ul className="space-y-3">
      {elementos.map((e) => (
        <li key={`${e.tipo}-${e.id}`}>
          <TarjetaRevision
            elemento={e}
            onResuelto={() => {
              setElementos((previos) => (previos ?? []).filter((x) => !(x.tipo === e.tipo && x.id === e.id)));
              onCambio();
            }}
            onDesactualizado={(mensaje) => {
              setAviso(mensaje);
              setIntento((v) => v + 1);
              onCambio();
            }}
          />
        </li>
      ))}
    </ul>
    </>
  );
}

function TarjetaRevision({ elemento, onResuelto, onDesactualizado }: {
  elemento: ElementoRevisionComunidad; onResuelto: () => void; onDesactualizado: (mensaje: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const idMotivo = `motivo-${elemento.tipo}-${elemento.id}`;

  async function decidir(decision: DecisionModeracionComunidad) {
    if (!motivo.trim()) {
      setError("Escribe el motivo de la decisión.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await decidirModeracionComunidad(rutaDe(elemento.tipo), elemento.id, decision, motivo.trim());
      onResuelto();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onDesactualizado(err.message);
      else setError(mensajeError(err, "No fue posible registrar la decisión."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 text-sm">
      <p className="text-xs text-[var(--color-subtle)]">
        {`${elemento.tipo === "PUBLICACION" ? "Publicación" : "Respuesta en"} «${elemento.titulo}» · ${elemento.autor} · ${formatearFecha(elemento.fechaCreacion)}`}
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">{ETIQUETA_RIESGO[elemento.riesgo]}</p>
      {elemento.motivos.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs text-[var(--color-subtle)]">
          {elemento.motivos.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <TextoPlano texto={elemento.contenido} className="mt-2" />
      <label htmlFor={idMotivo} className="mt-2 block text-xs font-medium text-[var(--color-subtle)]">
        Motivo de la decisión
        <textarea id={idMotivo} rows={2} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CLASE_CAMPO} />
      </label>
      {error && <p role="alert" className={`mt-2 ${CLASE_ALERTA}`}>{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={enviando} onClick={() => decidir("aprobar")} className={CLASE_BOTON}>Aprobar</button>
        <button type="button" disabled={enviando} onClick={() => decidir("rechazar")} className={CLASE_BOTON}>Rechazar</button>
      </div>
    </article>
  );
}

function ColaReportes({ onCambio }: { onCambio: () => void }) {
  const [reportes, setReportes] = useState<ReporteModeracionComunidad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerReportesComunidad()
      .then((datos) => {
        if (activo) setReportes(datos);
      })
      .catch((err: unknown) => {
        if (activo) setError(mensajeError(err, "No fue posible cargar los reportes."));
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  if (error) {
    return (
      <div role="alert" className={CLASE_ALERTA}>
        <p>{error}</p>
        <button type="button" onClick={() => { setError(null); setIntento((v) => v + 1); }} className={`mt-2 ${CLASE_BOTON}`}>
          Reintentar
        </button>
      </div>
    );
  }
  if (reportes === null) return <p role="status" aria-busy="true" className="text-xs text-[var(--color-subtle)]">Cargando…</p>;
  const avisoVisible = aviso && <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{aviso}</p>;
  if (reportes.length === 0) {
    return <>{avisoVisible}<p className="text-xs text-[var(--color-subtle)]">No hay reportes abiertos de la comunidad.</p></>;
  }

  return (
    <>
    {avisoVisible}
    <ul className="space-y-3">
      {reportes.map((r) => (
        <li key={r.idReporte}>
          <TarjetaReporte
            reporte={r}
            onResuelto={() => {
              setReportes((previos) => (previos ?? []).filter((x) => x.idReporte !== r.idReporte));
              onCambio();
            }}
            onDesactualizado={(mensaje) => {
              setAviso(mensaje);
              setIntento((v) => v + 1);
              onCambio();
            }}
          />
        </li>
      ))}
    </ul>
    </>
  );
}

function TarjetaReporte({ reporte, onResuelto, onDesactualizado }: {
  reporte: ReporteModeracionComunidad; onResuelto: () => void; onDesactualizado: (mensaje: string) => void;
}) {
  const [justificacion, setJustificacion] = useState("");
  const [accion, setAccion] = useState<AccionAlAceptarReporte>("NINGUNA");
  const [motivo, setMotivo] = useState("");
  const [confirmaEliminar, setConfirmaEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const id = `reporte-${reporte.idReporte}`;

  async function resolver(resolucion: "aceptar" | "rechazar") {
    if (!justificacion.trim()) {
      setError("Escribe la justificación.");
      return;
    }
    if (resolucion === "aceptar" && accion === "ELIMINAR" && !confirmaEliminar) {
      setError("Confirma que la eliminación no se puede deshacer.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const datos = resolucion === "rechazar"
        ? { justificacion: justificacion.trim() }
        : { justificacion: justificacion.trim(), accion, ...(accion !== "NINGUNA" && motivo.trim() ? { motivo: motivo.trim() } : {}) };
      await resolverReporteComunidad(reporte.idReporte, resolucion, datos);
      onResuelto();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onDesactualizado(err.message);
      else setError(mensajeError(err, "No fue posible resolver el reporte."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3 text-sm">
      <p className="text-xs text-[var(--color-subtle)]">
        {`${reporte.tipo === "PUBLICACION" ? "Publicación" : "Respuesta en"} «${reporte.titulo}» · autor ${reporte.autorContenido}`}
      </p>
      <p className="mt-1 text-xs text-[var(--color-ink)]">
        {`Reportado por ${reporte.reportante}: ${reporte.motivo}${reporte.descripcion ? ` — ${reporte.descripcion}` : ""}`}
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">
        {`${reporte.reportesActivos} ${reporte.reportesActivos === 1 ? "reporte activo" : "reportes activos"}`}
        {reporte.ocultaPorReportes && " · oculto por reportes"}
        {reporte.ocultaPorModeracion && " · oculto por moderación"}
        {reporte.eliminada && " · eliminado"}
      </p>
      <TextoPlano texto={reporte.contenido} className="mt-2" />
      <label htmlFor={`${id}-justificacion`} className="mt-2 block text-xs font-medium text-[var(--color-subtle)]">
        Justificación
        <textarea id={`${id}-justificacion`} rows={2} maxLength={2000} value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)} className={CLASE_CAMPO} />
      </label>
      <label htmlFor={`${id}-accion`} className="mt-2 block text-xs font-medium text-[var(--color-subtle)]">
        Al aceptar
        <select id={`${id}-accion`} value={accion} onChange={(e) => setAccion(e.target.value as AccionAlAceptarReporte)} className={CLASE_CAMPO}>
          <option value="NINGUNA">No cambiar el contenido</option>
          <option value="OCULTAR" disabled={reporte.ocultaPorModeracion || reporte.eliminada}>Ocultar el contenido</option>
          <option value="ELIMINAR" disabled={reporte.eliminada}>Eliminar el contenido (no se puede deshacer)</option>
        </select>
      </label>
      {accion !== "NINGUNA" && (
        <label htmlFor={`${id}-motivo`} className="mt-2 block text-xs font-medium text-[var(--color-subtle)]">
          Motivo para el autor (hasta 500 caracteres; si lo dejas vacío, se usa la justificación)
          <textarea id={`${id}-motivo`} rows={2} maxLength={500} value={motivo}
            onChange={(e) => setMotivo(e.target.value)} className={CLASE_CAMPO} />
        </label>
      )}
      {accion === "ELIMINAR" && (
        <label className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink)]">
          <input type="checkbox" checked={confirmaEliminar} onChange={(e) => setConfirmaEliminar(e.target.checked)} />
          Confirmo que la eliminación no se puede deshacer
        </label>
      )}
      {error && <p role="alert" className={`mt-2 ${CLASE_ALERTA}`}>{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={enviando} onClick={() => resolver("aceptar")} className={CLASE_BOTON}>Aceptar reporte</button>
        <button type="button" disabled={enviando} onClick={() => resolver("rechazar")} className={CLASE_BOTON}>Rechazar reporte</button>
      </div>
    </article>
  );
}
