"use client";

import { useEffect, useState } from "react";
import type { UsuarioSesion } from "@/types/producto";
import {
  crearValoracion,
  obtenerMiValoracion,
  type ValoracionPublicaStats,
} from "@/services/api";
import RatingStars from "@/components/catalogo/RatingStars";

interface ValoracionProductoProps {
  idProducto: number;
  usuario: UsuarioSesion | null;
  cargandoSesion: boolean;
  stats: ValoracionPublicaStats | null;
  onPedirLogin: () => void;
  onActualizarStats: () => void;
}

const ESTRELLAS = [1, 2, 3, 4, 5];

export default function ValoracionProducto({
  idProducto,
  usuario,
  cargandoSesion,
  stats,
  onPedirLogin,
  onActualizarStats,
}: ValoracionProductoProps) {
  const [seleccion, setSeleccion] = useState(0);
  const [miValoracion, setMiValoracion] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let activo = true;

    if (!usuario) return;

    obtenerMiValoracion(idProducto)
      .then((valoracion) => {
        if (!activo) return;
        setMiValoracion(valoracion?.puntuacion ?? null);
        setSeleccion(valoracion?.puntuacion ?? 0);
      })
      .catch(() => {
        // La valoración previa es opcional; no bloquea el detalle.
      });

    return () => {
      activo = false;
    };
  }, [idProducto, usuario]);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!usuario) {
      setError("Debes iniciar sesión para valorar este dispositivo.");
      onPedirLogin();
      return;
    }

    if (seleccion < 1 || seleccion > 5) {
      setError("Selecciona una puntuación entre 1 y 5 estrellas.");
      return;
    }

    setEnviando(true);
    setError("");
    setExito("");

    try {
      const guardada = await crearValoracion({
        idProducto,
        puntuacion: seleccion,
      });
      setMiValoracion(guardada.puntuacion);
      setSeleccion(guardada.puntuacion);
      setExito(
        `Tu valoración de ${guardada.puntuacion} ${
          guardada.puntuacion === 1 ? "estrella" : "estrellas"
        } fue guardada.`,
      );
      onActualizarStats();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar tu valoración. Inténtalo más tarde.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const promedio = stats?.promedioPuntuacion ?? null;
  const hayPromedio = promedio !== null && (stats?.cantidadValoraciones ?? 0) > 0;

  return (
    <section
      aria-labelledby="titulo-valoracion"
      className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-paper)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="titulo-valoracion"
            className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Valoración de la comunidad
          </h2>
          <p className="mt-1 text-sm text-[var(--color-subtle)]">
            Estrellas otorgadas por usuarios registrados.
          </p>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          {hayPromedio ? (
            <>
              <p className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                {promedio.toFixed(1).replace(".", ",")}
                <span className="ml-1 text-sm font-medium text-[var(--color-subtle)]">
                  / 5
                </span>
              </p>
              <div className="mt-1">
                <RatingStars
                  rating={promedio}
                  cantidadResenas={stats?.cantidadValoraciones ?? null}
                  tamano="md"
                  etiquetaCantidad="valoraciones"
                />
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-[var(--color-subtle)]">
              Sin valoraciones todavía
            </p>
          )}
        </div>
      </div>

      <form onSubmit={manejarEnvio} className="mt-5 border-t border-[var(--color-hairline)] pt-4">
        <fieldset>
          <legend className="text-sm font-semibold text-[var(--color-ink)]">
            {usuario && miValoracion
              ? `Tu valoración actual: ${miValoracion} ${
                  miValoracion === 1 ? "estrella" : "estrellas"
                }`
              : "Valora este producto"}
          </legend>

          <div
            role="group"
            aria-label="Selecciona una puntuación de 1 a 5 estrellas"
            className="mt-2 flex items-center gap-1"
          >
            {ESTRELLAS.map((estrella) => (
              <button
                key={estrella}
                type="button"
                disabled={!usuario || cargandoSesion || enviando}
                aria-label={`Valorar con ${estrella} ${
                  estrella === 1 ? "estrella" : "estrellas"
                }`}
                aria-pressed={seleccion === estrella}
                onClick={() => {
                  setSeleccion(estrella);
                  setError("");
                  setExito("");
                }}
                className="cursor-pointer rounded-md p-1 text-2xl leading-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className={
                    estrella <= seleccion
                      ? "text-[var(--color-star)]"
                      : "text-[var(--color-hairline)]"
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {usuario ? (
            <button
              type="submit"
              disabled={seleccion === 0 || enviando}
              className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? "Guardando…" : "Guardar valoración"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError("Debes iniciar sesión para valorar este dispositivo.");
                onPedirLogin();
              }}
              className="cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90"
            >
              Inicia sesión para valorar
            </button>
          )}

          {cargandoSesion && (
            <span className="text-xs text-[var(--color-subtle)]">
              Verificando sesión…
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {exito && (
          <p role="status" className="mt-3 text-sm font-medium text-[var(--color-positive)]">
            {exito}
          </p>
        )}
      </form>
    </section>
  );
}
