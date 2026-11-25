"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import { usePaginacionCursor } from "@/hooks/usePaginacionCursor";
import { obtenerPublicacionesComunidad, obtenerPublicacionesProducto } from "@/services/api";
import type { OrdenComunidad, PaginaPublicaciones, PublicacionResumen } from "@/types/comunidad";
import FormularioPublicacion from "./FormularioPublicacion";
import TarjetaPublicacion from "./TarjetaPublicacion";
import { CLASE_BOTON, CLASE_BOTON_PRINCIPAL, CLASE_CAMPO } from "./estilos";
import { mensajeError } from "./errores";

const LIMITE = 20;

/** Foro general o de un producto: lista por cursor, orden y nueva publicación. */
export default function ListaPublicaciones({ idProducto }: { idProducto?: number }) {
  const router = useRouter();
  const { usuario, establecerUsuario } = useSesionTecReview();
  const [orden, setOrden] = useState<OrdenComunidad>("actividad");
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [modalAuth, setModalAuth] = useState(false);

  const paginacion = usePaginacionCursor<PublicacionResumen, PaginaPublicaciones>(
    (cursor) => {
      const opciones = { orden, cursor, limite: LIMITE };
      return idProducto ? obtenerPublicacionesProducto(idProducto, opciones) : obtenerPublicacionesComunidad(opciones);
    },
    `${idProducto ?? "general"}-${orden}`,
  );

  function nuevaPublicacion() {
    if (!usuario) setModalAuth(true);
    else setFormularioAbierto(true);
  }

  return (
    <section aria-labelledby="titulo-publicaciones" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titulo-publicaciones" className="text-lg font-semibold text-[var(--color-ink)]">
          {`Publicaciones${paginacion.ultima ? ` (${paginacion.ultima.total})` : ""}`}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor="orden-publicaciones" className="text-xs font-medium text-[var(--color-subtle)]">
            Ordenar por
            <select
              id="orden-publicaciones"
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenComunidad)}
              className={CLASE_CAMPO}
            >
              <option value="actividad">Actividad reciente</option>
              <option value="recientes">Más nuevas</option>
            </select>
          </label>
          {!formularioAbierto && (
            <button type="button" onClick={nuevaPublicacion} className={CLASE_BOTON_PRINCIPAL}>
              Nueva publicación
            </button>
          )}
        </div>
      </div>

      {formularioAbierto && (
        <FormularioPublicacion
          tipo={idProducto ? "PRODUCTO" : "GENERAL"}
          idProducto={idProducto}
          onCancelar={() => setFormularioAbierto(false)}
          onRequiereSesion={() => setModalAuth(true)}
          onCreada={(creada) => router.push(`/comunidad/publicacion/${creada.idPublicacion}`)}
        />
      )}

      {paginacion.cargando ? (
        <p role="status" aria-busy="true" className="text-sm text-[var(--color-subtle)]">
          Cargando publicaciones…
        </p>
      ) : paginacion.error && paginacion.items.length === 0 ? (
        <EstadoVacio
          tipo="error"
          titulo="No fue posible cargar las publicaciones"
          descripcion={mensajeError(paginacion.error, "Inténtalo de nuevo en unos segundos.")}
          accion={{ etiqueta: "Reintentar", onClick: paginacion.reintentar }}
        />
      ) : paginacion.items.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay publicaciones"
          descripcion="Sé la primera persona en abrir una conversación."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {paginacion.items.map((publicacion) => (
              <li key={publicacion.idPublicacion}>
                <TarjetaPublicacion publicacion={publicacion} />
              </li>
            ))}
          </ul>
          {paginacion.error !== null && (
            <p role="alert" className="text-xs text-red-700">
              {mensajeError(paginacion.error, "No fue posible cargar más publicaciones.")}
            </p>
          )}
          {paginacion.hayMas && (
            <button type="button" onClick={paginacion.cargarMas} disabled={paginacion.cargandoMas} className={CLASE_BOTON}>
              {paginacion.cargandoMas ? "Cargando…" : "Cargar más"}
            </button>
          )}
        </>
      )}

      <AuthModal
        isOpen={modalAuth}
        onClose={() => setModalAuth(false)}
        onLoginSuccess={(usuarioSesion) => {
          establecerUsuario(usuarioSesion);
          setModalAuth(false);
        }}
      />
    </section>
  );
}
