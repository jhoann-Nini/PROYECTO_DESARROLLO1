"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import EstadoVacio from "@/components/ui/EstadoVacio";
import BotonMeGusta from "@/components/comunidad/BotonMeGusta";
import FormularioRespuesta from "@/components/comunidad/FormularioRespuesta";
import HiloRespuestas from "@/components/comunidad/HiloRespuestas";
import TextoPlano from "@/components/comunidad/TextoPlano";
import { CLASE_ALERTA, CLASE_BOTON, CLASE_CAMPO } from "@/components/comunidad/estilos";
import { esSinSesion, formatearFecha, mensajeError } from "@/components/comunidad/errores";
import { CLASE_FOCO } from "@/components/ui/foco";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import {
  ApiError,
  editarPublicacionComunidad,
  eliminarPublicacionComunidad,
  obtenerPublicacionComunidad,
} from "@/services/api";
import { LIMITES_COMUNIDAD, type PublicacionDetalle, type RespuestaComunidad } from "@/types/comunidad";

/** Detalle de una publicación con su árbol de respuestas. */
export default function DetallePublicacionCliente({ idPublicacion }: { idPublicacion: number }) {
  const router = useRouter();
  const { usuario, establecerUsuario } = useSesionTecReview();
  const [publicacion, setPublicacion] = useState<PublicacionDetalle | null>(null);
  const [errorCarga, setErrorCarga] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);
  const [modalAuth, setModalAuth] = useState(false);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [nuevas, setNuevas] = useState<RespuestaComunidad[]>([]);
  const idSesion = usuario?.id ?? null;

  useEffect(() => {
    let activo = true;
    obtenerPublicacionComunidad(idPublicacion)
      .then((datos) => {
        if (!activo) return;
        setPublicacion(datos);
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (activo) setErrorCarga(err);
      });
    return () => {
      activo = false;
    };
  }, [idPublicacion, intento, idSesion]);

  function manejar(err: unknown, generico: string) {
    if (esSinSesion(err)) setModalAuth(true);
    else setErrorAccion(mensajeError(err, generico));
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    try {
      const editada = await editarPublicacionComunidad(idPublicacion, { titulo: titulo.trim(), contenido: contenido.trim() });
      setPublicacion(editada);
      setEditando(false);
      setErrorAccion(null);
    } catch (err) {
      manejar(err, "No fue posible guardar los cambios.");
    }
  }

  async function eliminar() {
    try {
      await eliminarPublicacionComunidad(idPublicacion);
      router.push("/comunidad");
    } catch (err) {
      manejar(err, "No fue posible eliminar la publicación.");
    }
  }

  const modal = (
    <AuthModal
      isOpen={modalAuth}
      onClose={() => setModalAuth(false)}
      onLoginSuccess={(usuarioSesion) => {
        establecerUsuario(usuarioSesion);
        setModalAuth(false);
      }}
    />
  );

  if (errorCarga) {
    const noEncontrada = errorCarga instanceof ApiError && errorCarga.status === 404;
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EstadoVacio
          tipo={noEncontrada ? "vacio" : "error"}
          titulo={noEncontrada ? "Esta publicación no existe o ya no está disponible" : "No fue posible cargar la publicación"}
          descripcion={noEncontrada ? undefined : mensajeError(errorCarga, "Inténtalo de nuevo en unos segundos.")}
          accion={noEncontrada ? { etiqueta: "Volver a la comunidad", href: "/comunidad" } : { etiqueta: "Reintentar", onClick: () => { setErrorCarga(null); setIntento((v) => v + 1); } }}
        />
        {modal}
      </main>
    );
  }

  if (!publicacion) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p role="status" aria-busy="true" className="text-sm text-[var(--color-subtle)]">Cargando publicación…</p>
      </main>
    );
  }

  const volver = publicacion.idProducto ? `/productos/${publicacion.idProducto}/comunidad` : "/comunidad";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={volver} className={`text-xs font-semibold text-[var(--color-brand-blue)] ${CLASE_FOCO}`}>
        {publicacion.nombreProducto ? `← Comunidad de ${publicacion.nombreProducto}` : "← Comunidad"}
      </Link>

      <article className="space-y-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5">
        {editando ? (
          <form onSubmit={guardar} noValidate className="space-y-3">
            <label htmlFor="editar-titulo" className="block text-xs font-medium text-[var(--color-subtle)]">
              Título
              <input id="editar-titulo" type="text" value={titulo} maxLength={LIMITES_COMUNIDAD.tituloMax}
                onChange={(e) => setTitulo(e.target.value)} className={CLASE_CAMPO} />
            </label>
            <label htmlFor="editar-contenido" className="block text-xs font-medium text-[var(--color-subtle)]">
              Contenido
              <textarea id="editar-contenido" rows={6} value={contenido} maxLength={LIMITES_COMUNIDAD.publicacionMax}
                onChange={(e) => setContenido(e.target.value)} className={CLASE_CAMPO} />
            </label>
            <div className="flex gap-2">
              <button type="submit" className={CLASE_BOTON}>Guardar</button>
              <button type="button" onClick={() => setEditando(false)} className={CLASE_BOTON}>Cancelar</button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[var(--color-ink)]">{publicacion.titulo}</h1>
            <p className="text-xs text-[var(--color-subtle)]">
              {`${publicacion.autor} · ${formatearFecha(publicacion.fechaCreacion)}`}
              {publicacion.fechaEdicion && " · editada"}
            </p>
            {publicacion.estadoModeracion === "PENDIENTE" && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                En revisión: solo tú y los moderadores pueden verla hasta que se apruebe.
              </p>
            )}
            {publicacion.estadoModeracion === "RECHAZADA" && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                Esta publicación fue rechazada por moderación y solo tú puedes verla.
              </p>
            )}
            <TextoPlano texto={publicacion.contenido} />
          </>
        )}

        {errorAccion && <p role="alert" className={CLASE_ALERTA}>{errorAccion}</p>}

        {!editando && (
          <div className="flex flex-wrap items-center gap-2">
            <BotonMeGusta
              key={`${publicacion.idPublicacion}-${idSesion}`}
              tipo="publicaciones"
              id={publicacion.idPublicacion}
              meGusta={publicacion.meGusta}
              meGustaPropio={publicacion.meGustaPropio}
              autenticado={usuario !== null}
              onRequiereSesion={() => setModalAuth(true)}
            />
            {publicacion.esAutor && (
              <>
                <button type="button" className={CLASE_BOTON}
                  onClick={() => { setTitulo(publicacion.titulo); setContenido(publicacion.contenido); setEditando(true); }}>
                  Editar
                </button>
                {confirmando ? (
                  <span className="inline-flex items-center gap-2 text-xs text-[var(--color-ink)]">
                    ¿Eliminar la publicación?
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
      </article>

      <section aria-labelledby="titulo-respuestas" className="space-y-4">
        <h2 id="titulo-respuestas" className="text-lg font-semibold text-[var(--color-ink)]">Respuestas</h2>
        {publicacion.cerrada ? (
          <p className="text-sm text-[var(--color-subtle)]">Esta publicación está cerrada y no admite respuestas nuevas.</p>
        ) : usuario ? (
          <FormularioRespuesta
            idPublicacion={idPublicacion}
            onRequiereSesion={() => setModalAuth(true)}
            onCreada={(creada) => setNuevas((previas) => [...previas, creada])}
          />
        ) : (
          <button type="button" onClick={() => setModalAuth(true)} className={CLASE_BOTON}>
            Inicia sesión para responder
          </button>
        )}
        <HiloRespuestas
          key={idSesion ?? "anonimo"}
          idPublicacion={idPublicacion}
          padre={null}
          nivel={0}
          puedeResponder={!publicacion.cerrada}
          autenticado={usuario !== null}
          onRequiereSesion={() => setModalAuth(true)}
          nuevas={nuevas}
        />
      </section>
      {modal}
    </main>
  );
}
