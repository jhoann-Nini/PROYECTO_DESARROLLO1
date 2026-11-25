"use client";

import { useEffect, useRef, useState } from "react";
import { analizarComentario } from "@/data/resenas";
import { crearRespuestaComunidad } from "@/services/api";
import { LIMITES_COMUNIDAD, type RespuestaComunidad } from "@/types/comunidad";
import { CLASE_ALERTA, CLASE_BOTON, CLASE_BOTON_PRINCIPAL, CLASE_CAMPO } from "./estilos";
import { esSinSesion, mensajeError } from "./errores";

interface FormularioRespuestaProps {
  idPublicacion: number;
  idPadre?: number | null;
  /** Enfoca el campo al abrirse (respuestas en línea). */
  enfocar?: boolean;
  onCreada: (respuesta: RespuestaComunidad) => void;
  onCancelar?: () => void;
  onRequiereSesion: () => void;
}

export default function FormularioRespuesta({
  idPublicacion, idPadre = null, enfocar = false, onCreada, onCancelar, onRequiereSesion,
}: FormularioRespuestaProps) {
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const id = `respuesta-${idPadre ?? "directa"}-${idPublicacion}`;
  const riesgo = analizarComentario(contenido).riesgo;

  useEffect(() => {
    if (enfocar) campo.current?.focus();
  }, [enfocar]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    if (!contenido.trim()) {
      setError("Escribe tu respuesta.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const creada = await crearRespuestaComunidad(idPublicacion, contenido.trim(), idPadre);
      setContenido("");
      onCreada(creada);
    } catch (err) {
      if (esSinSesion(err)) onRequiereSesion();
      else setError(mensajeError(err, "No fue posible enviar la respuesta."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-2">
      <label htmlFor={id} className="block text-xs font-medium text-[var(--color-subtle)]">
        Tu respuesta
        <textarea
          id={id}
          ref={campo}
          rows={3}
          value={contenido}
          maxLength={LIMITES_COMUNIDAD.respuestaMax}
          onChange={(e) => setContenido(e.target.value)}
          className={CLASE_CAMPO}
        />
        <span className="mt-1 block text-right">{`${contenido.length}/${LIMITES_COMUNIDAD.respuestaMax}`}</span>
      </label>
      {(riesgo === "medio" || riesgo === "alto") && (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Tu respuesta quedará en revisión hasta que un moderador la apruebe.
        </p>
      )}
      {error && <p role="alert" className={CLASE_ALERTA}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className={CLASE_BOTON_PRINCIPAL}>
          {enviando ? "Enviando…" : "Responder"}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={CLASE_BOTON}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
