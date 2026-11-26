"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ResenaResponse } from "@/services/api";
import { analizarComentario } from "@/data/resenas";
import EditarResena from "@/app/resenas/EditarResena";
import ReportarResenaModal from "@/app/resenas/ReportarResenaModal";
import AvisoTerminosResena from "@/components/ui/AvisoTerminosResena";
import type { Producto, UsuarioSesion } from "@/types/producto";

export interface OpinionesHomeProps {
  usuario: UsuarioSesion | null;
  resenas: ResenaResponse[];
  resenasFiltradas: ResenaResponse[];
  cargando: boolean;
  filtro: string;
  onCambiarFiltro: (valor: string) => void;
  onActualizar: () => void;
  comentario: string;
  onCambiarComentario: (valor: string) => void;
  idProducto: number | "";
  onCambiarProducto: (id: number) => void;
  productos: Producto[];
  enviando: boolean;
  error: string | null;
  /** Mensaje informativo tras publicar o editar (por ejemplo, reseña en revisión). */
  aviso?: string | null;
  onPublicar: (evento: FormEvent<HTMLFormElement>) => void;
  onPedirLogin: () => void;
  onResenaEditada: (resena: ResenaResponse) => void;
  onResenaEliminada: (idResena: number) => void;
}

export default function OpinionesHome({
  usuario,
  resenas,
  resenasFiltradas,
  cargando,
  filtro,
  onCambiarFiltro,
  onActualizar,
  comentario,
  onCambiarComentario,
  idProducto,
  onCambiarProducto,
  productos,
  enviando,
  error,
  aviso = null,
  onPublicar,
  onPedirLogin,
  onResenaEditada,
  onResenaEliminada,
}: OpinionesHomeProps) {
  const [resenaAReportar, setResenaAReportar] = useState<number | null>(null);
  const [resenasReportadas, setResenasReportadas] = useState<Set<number>>(
    () => new Set(),
  );
  // Aviso preventivo (TEC-98): informa mientras se escribe, sin borrar texto.
  const riesgoComentario = useMemo(
    () => analizarComentario(comentario).riesgo,
    [comentario],
  );

  return (
    <section
      aria-labelledby="seccion-opiniones"
    >
      <div>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              id="seccion-opiniones"
              className="flex items-center gap-2 text-[28px] font-medium uppercase leading-none tracking-normal text-ink"
            >
              <span className="text-brand-blue">/</span>{" "}
              Opiniones de la comunidad ({resenas.length}).
            </h2>
            <p className="mt-1 text-sm text-subtle">
              Comparte tu experiencia, dudas o recomendaciones sobre
              dispositivos con otros usuarios.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="input-filtro-opiniones" className="sr-only">
            Filtrar opiniones de la comunidad
          </label>
          <input
            id="input-filtro-opiniones"
            type="search"
            value={filtro}
            onChange={(evento) => onCambiarFiltro(evento.target.value)}
            placeholder="Buscar por comentario, autor o producto..."
            className="min-h-10 min-w-0 flex-1 rounded-card border border-hairline bg-paper px-4 py-2.5 text-xs text-ink transition-colors placeholder:text-subtle focus:border-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:w-64"
          />
          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            className="min-h-10 cursor-pointer rounded-pill border border-ink bg-canvas px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-line hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
            title="Actualizar listado de opiniones desde el servidor"
          >
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
          </div>
        </div>

        {!usuario && (
          <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-card border border-line bg-surface-2 p-4 text-xs sm:flex-row">
            <p className="text-ink">
              <span className="font-medium">
                ¿Tienes experiencia con algún dispositivo?
              </span>{" "}
              Inicia sesión con tu cuenta para publicar tu opinión.
            </p>
            <button
              type="button"
              onClick={onPedirLogin}
              className="shrink-0 cursor-pointer rounded-card bg-brand-solid px-4 py-2 text-xs font-medium text-on-solid transition-colors hover:bg-brand-solid"
            >
              Identificarse para opinar
            </button>
          </div>
        )}

        <form onSubmit={onPublicar} className="mb-8">
          <label htmlFor="input-comentario" className="sr-only">
            Escribe tu opinión
          </label>
          <div className="flex flex-col gap-3">
            {productos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                <label htmlFor="select-producto-comentario" className="font-medium">
                  Dispositivo a reseñar:
                </label>
                <select
                  id="select-producto-comentario"
                  value={idProducto}
                  onChange={(evento) =>
                    onCambiarProducto(Number(evento.target.value))
                  }
                  className="max-w-full min-w-0 rounded-card border border-hairline bg-canvas px-3 py-1.5 text-xs text-ink transition-colors focus:border-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                >
                  {productos.map((producto) => (
                    <option key={producto.idProducto} value={producto.idProducto}>
                      Dispositivo: {producto.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="input-comentario"
                type="text"
                value={comentario}
                onChange={(evento) => onCambiarComentario(evento.target.value)}
                placeholder={
                  usuario
                    ? `Comentar como ${usuario.nombre}...`
                    : "Inicia sesión para publicar tu opinión aquí..."
                }
                className="flex-1 rounded-card border border-hairline bg-canvas px-4 py-3 text-sm text-ink transition-colors placeholder:text-subtle focus:border-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              />
              <button
                type="submit"
                disabled={enviando}
                className="cursor-pointer rounded-card bg-brand-solid px-6 py-3 text-xs font-medium text-on-solid transition-colors hover:bg-brand-solid disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando ? "Publicando..." : "Publicar opinión"}
              </button>
            </div>
          </div>
          <AvisoTerminosResena riesgo={riesgoComentario} className="mt-2" />
          {error && (
            <p className="mt-2 text-xs text-ink" role="alert">
              ⚠️ {error}
            </p>
          )}
          {aviso && !error && (
            <p className="mt-2 text-xs text-ink" role="status">
              {aviso}
            </p>
          )}
        </form>

        {cargando && resenas.length === 0 ? (
          <div className="py-8 text-center text-xs text-subtle">
            Cargando opiniones de la comunidad...
          </div>
        ) : resenasFiltradas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resenasFiltradas.map((resena) => (
              <div
                key={resena.idResena}
                className="rounded-card border border-hairline bg-paper p-5 text-xs transition-colors hover:border-line"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-subtle">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-brand-blue">
                      @{resena.nombreUsuario || "Usuario"}
                    </span>
                    {resena.puntuacion && (
                      <span
                        className="text-[11px] text-star"
                        aria-label={`${resena.puntuacion} de 5 estrellas`}
                      >
                        {"★".repeat(resena.puntuacion)}
                      </span>
                    )}
                    {resena.nombreProducto && (
                      <span className="rounded-card border border-hairline bg-paper px-2 py-0.5 text-[10px] font-medium text-subtle">
                        {resena.nombreProducto}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px]">
                    {new Date(resena.fechaCreacion).toLocaleDateString("es-CO")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink">
                  {resena.comentario}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dotted border-line pt-2">
                  {usuario && resena.idUsuario === usuario.idUsuario ? (
                    <EditarResena
                      resena={resena}
                      onEditada={onResenaEditada}
                      onEliminada={onResenaEliminada}
                    />
                  ) : resenasReportadas.has(resena.idResena) ? (
                    <span className="text-[11px] text-subtle">
                      Reporte enviado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!usuario) {
                          onPedirLogin();
                          return;
                        }
                        setResenaAReportar(resena.idResena);
                      }}
                      aria-label="Reportar reseña"
                      className="cursor-pointer rounded-card border border-hairline px-3 py-1.5 text-[11px] font-medium text-subtle transition-colors hover:border-status-error hover:text-status-error"
                    >
                      Reportar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-hairline bg-canvas p-8 text-center text-xs text-subtle">
            {filtro.trim()
              ? `No se encontraron opiniones que coincidan con "${filtro}".`
              : "Aún no hay opiniones registradas. ¡Sé el primero en compartir tu experiencia!"}
          </div>
        )}
      </div>
      {resenaAReportar !== null && (
        <ReportarResenaModal
          resenaId={resenaAReportar}
          abierto
          onCerrar={() => setResenaAReportar(null)}
          onReportado={(idResena) =>
            setResenasReportadas((previas) => {
              const siguientes = new Set(previas);
              siguientes.add(idResena);
              return siguientes;
            })
          }
        />
      )}
    </section>
  );
}
