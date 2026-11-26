"use client";

import { useState } from "react";
import { editarRespuestaComunidad, eliminarRespuestaComunidad } from "@/services/api";
import { LIMITES_COMUNIDAD, type RespuestaComunidad } from "@/types/comunidad";
import BotonMeGusta from "./BotonMeGusta";
import ContenidoNoVisible from "./ContenidoNoVisible";
import FormularioRespuesta from "./FormularioRespuesta";
import ReportarContenidoModal from "./ReportarContenidoModal";
import TextoPlano from "./TextoPlano";
import { CLASE_ALERTA, CLASE_BOTON, CLASE_CAMPO } from "./estilos";
import { esSinSesion, formatearFecha, mensajeError } from "./errores";

interface RespuestaItemProps {
  idPublicacion: number;
  respuesta: RespuestaComunidad;
  puedeResponder: boolean;
  autenticado: boolean;
  onRequiereSesion: () => void;
  onCambio: (respuesta: RespuestaComunidad) => void;
  onRespuestaCreada: (respuesta: RespuestaComunidad) => void;
}

/** Una respuesta: texto o aviso, «Me gusta», responder, y editar o eliminar si es propia. */
export default function RespuestaItem({
  idPublicacion, respuesta, puedeResponder, autenticado, onRequiereSesion, onCambio, onRespuestaCreada,
}: RespuestaItemProps) {
  const [respondiendo, setRespondiendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(respuesta.contenido ?? "");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportando, setReportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const visible = respuesta.estadoVisible === "VISIBLE";

  function manejar(err: unknown, generico: string) {
    if (esSinSesion(err)) onRequiereSesion();
    else setError(mensajeError(err, generico));
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!texto.trim()) {
      setError("Escribe tu respuesta.");
      return;
    }
    try {
      const editada = await editarRespuestaComunidad(respuesta.idRespuesta, texto.trim());
      onCambio(editada);
      setEditando(false);
      setError(null);
    } catch (err) {
      manejar(err, "No fue posible guardar los cambios.");
    }
  }

  async function eliminar() {
    try {
      await eliminarRespuestaComunidad(respuesta.idRespuesta);
      onCambio({ ...respuesta, estadoVisible: "ELIMINADA", contenido: null, autor: null, esAutor: false, estadoModeracion: null });
      setConfirmando(false);
    } catch (err) {
      manejar(err, "No fue posible eliminar la respuesta.");
    }
  }

  function abrirRespuesta() {
    if (!autenticado) onRequiereSesion();
    else setRespondiendo(true);
  }

  return (
    <article className="rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] p-3">
      {visible && (
        <p className="text-xs text-[var(--color-subtle)]">
          <span className="font-semibold text-[var(--color-ink)]">{respuesta.autor}</span>
          {` · ${formatearFecha(respuesta.fechaCreacion)}`}
          {respuesta.fechaEdicion && " · editada"}
          {respuesta.estadoModeracion === "PENDIENTE" && " · En revisión: solo tú y los moderadores la ven"}
        </p>
      )}
      {visible && respuesta.estadoModeracion === "RECHAZADA" && (
        <p className="mt-1 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          Esta respuesta fue rechazada por moderación: solo tú y los moderadores pueden verla.
        </p>
      )}
      {respuesta.enRespuestaA && (
        <p className="mt-1 text-xs text-[var(--color-subtle)]">{`En respuesta a @${respuesta.enRespuestaA}`}</p>
      )}

      {!visible ? (
        <ContenidoNoVisible estado={respuesta.estadoVisible} />
      ) : editando ? (
        <form onSubmit={guardar} noValidate className="mt-2 space-y-2">
          <label htmlFor={`editar-${respuesta.idRespuesta}`} className="block text-xs font-medium text-[var(--color-subtle)]">
            Editar respuesta
            <textarea
              id={`editar-${respuesta.idRespuesta}`}
              rows={3}
              value={texto}
              maxLength={LIMITES_COMUNIDAD.respuestaMax}
              onChange={(e) => setTexto(e.target.value)}
              className={CLASE_CAMPO}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={CLASE_BOTON}>Guardar</button>
            <button type="button" onClick={() => setEditando(false)} className={CLASE_BOTON}>Cancelar</button>
          </div>
        </form>
      ) : (
        <TextoPlano texto={respuesta.contenido ?? ""} className="mt-1" />
      )}

      {error && <p role="alert" className={`mt-2 ${CLASE_ALERTA}`}>{error}</p>}

      {visible && !editando && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BotonMeGusta
            tipo="respuestas"
            id={respuesta.idRespuesta}
            meGusta={respuesta.meGusta}
            meGustaPropio={respuesta.meGustaPropio}
            autenticado={autenticado}
            onRequiereSesion={onRequiereSesion}
          />
          {puedeResponder && (
            <button type="button" onClick={abrirRespuesta} aria-label={`Responder a ${respuesta.autor}`} className={CLASE_BOTON}>
              Responder
            </button>
          )}
          {!respuesta.esAutor && (
            <button
              type="button"
              onClick={() => (autenticado ? setReportando(true) : onRequiereSesion())}
              aria-label={`Reportar la respuesta de ${respuesta.autor}`}
              className={CLASE_BOTON}
            >
              Reportar
            </button>
          )}
          {aviso && <span role="status" className="text-xs text-emerald-700">{aviso}</span>}
          {respuesta.esAutor && (
            <>
              <button type="button" onClick={() => { setTexto(respuesta.contenido ?? ""); setEditando(true); }} className={CLASE_BOTON}>
                Editar
              </button>
              {confirmando ? (
                <span className="inline-flex items-center gap-2 text-xs text-[var(--color-ink)]">
                  ¿Eliminar esta respuesta?
                  <button type="button" onClick={eliminar} className={CLASE_BOTON}>Sí, eliminar</button>
                  <button type="button" onClick={() => setConfirmando(false)} className={CLASE_BOTON}>No</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmando(true)} className={CLASE_BOTON}>Eliminar</button>
              )}
            </>
          )}
        </div>
      )}

      {reportando && (
        <ReportarContenidoModal
          tipo="respuestas"
          id={respuesta.idRespuesta}
          onCerrar={() => setReportando(false)}
          onPedirLogin={() => { setReportando(false); onRequiereSesion(); }}
          onReportado={() => { setReportando(false); setAviso("Gracias, un moderador lo revisará."); }}
        />
      )}

      {respondiendo && (
        <div className="mt-3">
          <FormularioRespuesta
            idPublicacion={idPublicacion}
            idPadre={respuesta.idRespuesta}
            enfocar
            onRequiereSesion={onRequiereSesion}
            onCancelar={() => setRespondiendo(false)}
            onCreada={(creada) => {
              setRespondiendo(false);
              onRespuestaCreada(creada);
            }}
          />
        </div>
      )}
    </article>
  );
}
