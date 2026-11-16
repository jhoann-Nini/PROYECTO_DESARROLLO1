"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { UsuarioSesion } from "@/types/producto";
import { esAdministrador, esRepresentante } from "@/types/producto";
import type { Establecimiento } from "@/types/establecimiento";
import {
  aFormulario,
  aRequest,
  validarFormulario,
  type FormularioEstablecimiento,
} from "@/data/establecimientoForm";
import {
  ApiError,
  actualizarMiEstablecimiento,
  obtenerMisEstablecimientos,
} from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import CamposEstablecimiento from "@/components/establecimientos/CamposEstablecimiento";
import { CLASE_FOCO } from "@/components/ui/foco";

interface PanelRepresentanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioSesion: UsuarioSesion | null;
}


export default function PanelRepresentanteModal({
  isOpen,
  onClose,
  usuarioSesion,
}: PanelRepresentanteModalProps) {
  const autorizado =
    esAdministrador(usuarioSesion) || esRepresentante(usuarioSesion);
  const abierto = isOpen && autorizado;

  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioEstablecimiento | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const tituloId = useId();
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const idBase = useId();

  const cerrarPanel = useCallback(() => {
    setEstablecimientos([]);
    setCargando(true);
    setErrorCarga(null);
    setSeleccionadoId(null);
    setFormulario(null);
    setErroresValidacion([]);
    setErrorGuardado(null);
    setMensajeExito(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!abierto) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();

    function manejarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarPanel();
      }
    }

    window.addEventListener("keydown", manejarEscape);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", manejarEscape);
    };
  }, [abierto, cerrarPanel]);

  useEffect(() => {
    if (!abierto) return;

    let activo = true;

    obtenerMisEstablecimientos()
      .then((datos) => {
        if (!activo) return;
        setEstablecimientos(datos);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setEstablecimientos([]);
        setErrorCarga(
          err instanceof Error
            ? err.message
            : "No fue posible cargar tus establecimientos.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [abierto, intento]);

  function reintentarCarga() {
    setCargando(true);
    setErrorCarga(null);
    setIntento((valor) => valor + 1);
  }

  function seleccionarEstablecimiento(establecimiento: Establecimiento) {
    setSeleccionadoId(establecimiento.idEstablecimiento);
    setFormulario(aFormulario(establecimiento));
    setErroresValidacion([]);
    setErrorGuardado(null);
    setMensajeExito(null);
  }

  function actualizarCampo(
    campo: keyof FormularioEstablecimiento,
    valor: string,
  ) {
    setFormulario((previo) =>
      previo ? { ...previo, [campo]: valor } : previo,
    );
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario || seleccionadoId === null || guardando) return;

    const errores = validarFormulario(formulario);
    if (errores.length > 0) {
      setErroresValidacion(errores);
      setErrorGuardado(null);
      setMensajeExito(null);
      return;
    }

    setErroresValidacion([]);
    setErrorGuardado(null);
    setMensajeExito(null);
    setGuardando(true);

    try {
      const actualizado = await actualizarMiEstablecimiento(
        seleccionadoId,
        aRequest(formulario),
      );

      setEstablecimientos((previos) =>
        previos.map((item) =>
          item.idEstablecimiento === actualizado.idEstablecimiento
            ? actualizado
            : item,
        ),
      );
      setSeleccionadoId(actualizado.idEstablecimiento);
      setFormulario(aFormulario(actualizado));
      setMensajeExito("Cambios guardados correctamente.");
    } catch (err) {
      setErrorGuardado(
        err instanceof ApiError
          ? err.message
          : "No fue posible guardar los cambios del establecimiento.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) return null;

  const seleccionado =
    establecimientos.find(
      (item) => item.idEstablecimiento === seleccionadoId,
    ) ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-[var(--color-inverse)]/45 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl animate-scale-in flex-col rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-paper)] p-6 text-[var(--color-ink)] shadow-[var(--shadow-paper-hover)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-hairline)] pb-4">
          <div>
            <h2
              id={tituloId}
              className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Panel de representante
            </h2>
            <p className="mt-1 text-xs text-[var(--color-subtle)]">
              Sesión: {usuarioSesion?.nombre} ({usuarioSesion?.email}) · Rol:{" "}
              {usuarioSesion?.rol}
            </p>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrarPanel}
            aria-label="Cerrar panel de representante"
            className={`cursor-pointer rounded-lg border border-[var(--color-hairline)] px-2.5 py-1.5 text-xs text-[var(--color-subtle)] transition-colors hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] ${CLASE_FOCO}`}
          >
            ✕ Cerrar
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--color-subtle)]">
          Consulta y actualiza los datos básicos de los establecimientos dentro
          de tu alcance autorizado. El backend valida la asignación vigente en
          cada operación.
        </p>

        {mensajeExito && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
          >
            {mensajeExito}
          </p>
        )}

        {errorGuardado && (
          <div
            role="alert"
            className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <p>{errorGuardado}</p>
            <button
              type="button"
              onClick={() => setErrorGuardado(null)}
              aria-label="Cerrar mensaje de error"
              className={`cursor-pointer rounded px-1 text-red-600 hover:text-red-800 ${CLASE_FOCO}`}
            >
              ✕
            </button>
          </div>
        )}

        {erroresValidacion.length > 0 && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <ul className="space-y-1">
              {erroresValidacion.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {cargando ? (
            <p
              role="status"
              aria-busy="true"
              className="py-10 text-center text-sm text-[var(--color-subtle)]"
            >
              Cargando establecimientos asignados…
            </p>
          ) : errorCarga ? (
            <EstadoVacio
              tipo="error"
              titulo="No pudimos cargar tus establecimientos"
              descripcion={errorCarga}
              accion={{
                etiqueta: "Reintentar",
                onClick: reintentarCarga,
              }}
            />
          ) : establecimientos.length === 0 ? (
            <EstadoVacio
              titulo="No tienes establecimientos asignados"
              descripcion="Cuando un administrador te asigne la representación de un establecimiento activo, aparecerá aquí."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <section aria-label="Establecimientos asignados">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                  Establecimientos
                </h3>
                <ul className="mt-2 space-y-2">
                  {establecimientos.map((establecimiento) => {
                    const activo =
                      establecimiento.idEstablecimiento === seleccionadoId;
                    return (
                      <li
                        key={establecimiento.idEstablecimiento}
                        className={`rounded-lg border p-3 ${
                          activo
                            ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/5"
                            : "border-[var(--color-hairline)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {establecimiento.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-subtle)]">
                          {establecimiento.direccion || "Dirección no registrada"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--color-positive)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink)]">
                            Activo
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              seleccionarEstablecimiento(establecimiento)
                            }
                            aria-label={`Editar ${establecimiento.nombre}`}
                            className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                          >
                            Editar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section aria-label="Datos del establecimiento">
                {seleccionado && formulario ? (
                  <form onSubmit={guardar} noValidate>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
                      Editar {seleccionado.nombre}
                    </h3>

                    <div className="mt-2">
                      <CamposEstablecimiento
                        idBase={idBase}
                        formulario={formulario}
                        onCambiar={actualizarCampo}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={guardando}
                      className={`mt-4 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                    >
                      {guardando ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </form>
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--color-hairline)] p-6 text-center text-sm text-[var(--color-subtle)]">
                    Selecciona un establecimiento de la lista para editar sus
                    datos.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
