"use client";

import { useState } from "react";
import { analizarComentario } from "@/data/resenas";
import { crearPublicacionComunidad } from "@/services/api";
import { LIMITES_COMUNIDAD, type PublicacionDetalle, type TipoPublicacion } from "@/types/comunidad";
import { CLASE_ALERTA, CLASE_BOTON, CLASE_BOTON_PRINCIPAL, CLASE_CAMPO } from "./estilos";
import { esSinSesion, mensajeError } from "./errores";

interface FormularioPublicacionProps {
  tipo: TipoPublicacion;
  idProducto?: number;
  onCreada: (publicacion: PublicacionDetalle) => void;
  onCancelar?: () => void;
  onRequiereSesion: () => void;
}

/**
 * Nueva publicación. El aviso previo usa el mismo filtro que las reseñas; el
 * backend decide de verdad y puede dejarla en revisión.
 */
export default function FormularioPublicacion({ tipo, idProducto, onCreada, onCancelar, onRequiereSesion }: FormularioPublicacionProps) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const riesgo = analizarComentario(`${titulo}\n${contenido}`).riesgo;
  const quedaraEnRevision = riesgo === "medio" || riesgo === "alto";

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const tituloLimpio = titulo.trim();
    if (tituloLimpio.length < LIMITES_COMUNIDAD.tituloMin || tituloLimpio.length > LIMITES_COMUNIDAD.tituloMax) {
      setError(`El título debe tener entre ${LIMITES_COMUNIDAD.tituloMin} y ${LIMITES_COMUNIDAD.tituloMax} caracteres.`);
      return;
    }
    if (!contenido.trim()) {
      setError("Escribe el contenido de la publicación.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const creada = await crearPublicacionComunidad({
        tipo,
        idProducto: tipo === "PRODUCTO" ? idProducto : null,
        titulo: tituloLimpio,
        contenido: contenido.trim(),
      });
      onCreada(creada);
    } catch (err) {
      if (esSinSesion(err)) onRequiereSesion();
      else setError(mensajeError(err, "No fue posible publicar. Inténtalo de nuevo."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-4">
      <label htmlFor="publicacion-titulo" className="block text-xs font-medium text-[var(--color-subtle)]">
        Título
        <input
          id="publicacion-titulo"
          type="text"
          value={titulo}
          maxLength={LIMITES_COMUNIDAD.tituloMax}
          onChange={(e) => setTitulo(e.target.value)}
          className={CLASE_CAMPO}
        />
        <span className="mt-1 block text-right">{`${titulo.length}/${LIMITES_COMUNIDAD.tituloMax}`}</span>
      </label>
      <label htmlFor="publicacion-contenido" className="block text-xs font-medium text-[var(--color-subtle)]">
        Contenido
        <textarea
          id="publicacion-contenido"
          rows={5}
          value={contenido}
          maxLength={LIMITES_COMUNIDAD.publicacionMax}
          onChange={(e) => setContenido(e.target.value)}
          className={CLASE_CAMPO}
        />
        <span className="mt-1 block text-right">{`${contenido.length}/${LIMITES_COMUNIDAD.publicacionMax}`}</span>
      </label>
      <p className="text-xs text-[var(--color-subtle)]">Solo texto: los enlaces se muestran como texto y no se pueden abrir.</p>
      {quedaraEnRevision && (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Tu texto contiene palabras que el filtro marca: la publicación quedará en revisión hasta que un moderador la apruebe.
        </p>
      )}
      {error && <p role="alert" className={CLASE_ALERTA}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className={CLASE_BOTON_PRINCIPAL}>
          {enviando ? "Publicando…" : "Publicar"}
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
