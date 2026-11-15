"use client";

import { useEffect, useId, useState } from "react";
import type { Establecimiento } from "@/types/establecimiento";
import {
  aFormulario,
  aRequest,
  formularioVacio,
  validarFormulario,
  type FormularioEstablecimiento,
} from "@/data/establecimientoForm";
import {
  ApiError,
  actualizarEstablecimiento,
  crearEstablecimiento,
  eliminarEstablecimiento,
  obtenerEstablecimientos,
} from "@/services/api";
import CamposEstablecimiento from "@/components/establecimientos/CamposEstablecimiento";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

type ModoFormularioEstablecimiento = "ninguno" | "crear" | "editar";

function ordenarPorNombre(
  establecimientos: Establecimiento[],
): Establecimiento[] {
  return [...establecimientos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

/**
 * CRUD administrativo de establecimientos. Las lecturas usan el catálogo
 * público de activos; las escrituras requieren rol Administrador.
 */
export default function AdminEstablecimientos() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [modo, setModo] = useState<ModoFormularioEstablecimiento>("ninguno");
  const [editando, setEditando] = useState<Establecimiento | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioEstablecimiento>(formularioVacio);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [establecimientoEliminando, setEstablecimientoEliminando] =
    useState<Establecimiento | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const idBase = useId();

  useEffect(() => {
    let activo = true;

    obtenerEstablecimientos()
      .then((datos) => {
        if (!activo) return;
        setEstablecimientos(ordenarPorNombre(datos));
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(
          err instanceof Error
            ? err.message
            : "No fue posible cargar los establecimientos.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [intento]);

  function reintentarCarga() {
    setCargando(true);
    setErrorCarga(null);
    setIntento((valor) => valor + 1);
  }

  function actualizarCampo(
    campo: keyof FormularioEstablecimiento,
    valor: string,
  ) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  function abrirCrear() {
    setModo("crear");
    setEditando(null);
    setFormulario(formularioVacio());
    setErroresValidacion([]);
    setErrorAccion(null);
    setMensajeExito(null);
  }

  function abrirEditar(establecimiento: Establecimiento) {
    setModo("editar");
    setEditando(establecimiento);
    setFormulario(aFormulario(establecimiento));
    setErroresValidacion([]);
    setErrorAccion(null);
    setMensajeExito(null);
  }

  function cerrarFormulario() {
    setModo("ninguno");
    setEditando(null);
    setFormulario(formularioVacio());
    setErroresValidacion([]);
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (modo === "ninguno" || guardando) return;

    const errores = validarFormulario(formulario);
    if (errores.length > 0) {
      setErroresValidacion(errores);
      setErrorAccion(null);
      setMensajeExito(null);
      return;
    }

    setErroresValidacion([]);
    setErrorAccion(null);
    setMensajeExito(null);
    setGuardando(true);

    try {
      const request = aRequest(formulario);
      if (modo === "crear") {
        const creado = await crearEstablecimiento(request);
        setEstablecimientos((previos) =>
          ordenarPorNombre([...previos, creado]),
        );
        setMensajeExito("Establecimiento creado correctamente.");
      } else if (editando) {
        const actualizado = await actualizarEstablecimiento(
          editando.idEstablecimiento,
          request,
        );
        setEstablecimientos((previos) =>
          ordenarPorNombre(
            previos.map((item) =>
              item.idEstablecimiento === actualizado.idEstablecimiento
                ? actualizado
                : item,
            ),
          ),
        );
        setMensajeExito("Establecimiento actualizado correctamente.");
      }
      cerrarFormulario();
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No fue posible guardar el establecimiento.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarDesactivacion() {
    if (!establecimientoEliminando || eliminando) return;

    setEliminando(true);
    setErrorAccion(null);
    setMensajeExito(null);

    try {
      await eliminarEstablecimiento(
        establecimientoEliminando.idEstablecimiento,
      );
      setEstablecimientos((previos) =>
        previos.filter(
          (item) =>
            item.idEstablecimiento !==
            establecimientoEliminando.idEstablecimiento,
        ),
      );
      setMensajeExito("Establecimiento desactivado correctamente.");
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No fue posible desactivar el establecimiento.",
      );
    } finally {
      setEliminando(false);
      setEstablecimientoEliminando(null);
    }
  }

  if (cargando) {
    return (
      <p
        role="status"
        aria-busy="true"
        className="py-10 text-center text-sm text-[var(--color-subtle)]"
      >
        Cargando establecimientos…
      </p>
    );
  }

  if (errorCarga) {
    return (
      <EstadoVacio
        tipo="error"
        titulo="No pudimos cargar los establecimientos"
        descripcion={errorCarga}
        accion={{
          etiqueta: "Reintentar",
          onClick: reintentarCarga,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
            Establecimientos activos
          </h3>
          <p className="mt-1 text-xs text-[var(--color-subtle)]">
            El catálogo público solo devuelve establecimientos activos. Las
            operaciones de escritura requieren rol Administrador.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className={`cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 ${CLASE_FOCO}`}
        >
          Nuevo establecimiento
        </button>
      </div>

      {mensajeExito && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {mensajeExito}
        </p>
      )}

      {errorAccion && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <p>{errorAccion}</p>
          <button
            type="button"
            onClick={() => setErrorAccion(null)}
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
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <ul className="space-y-1">
            {erroresValidacion.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {modo !== "ninguno" && (
        <form
          onSubmit={guardar}
          noValidate
          className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4"
        >
          <h4 className="text-sm font-semibold text-[var(--color-ink)]">
            {modo === "crear"
              ? "Nuevo establecimiento"
              : `Editar ${editando?.nombre ?? "establecimiento"}`}
          </h4>
          <div className="mt-3">
            <CamposEstablecimiento
              idBase={`${idBase}-${modo}`}
              formulario={formulario}
              onCambiar={actualizarCampo}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={guardando}
              className={`cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
            >
              {guardando
                ? "Guardando…"
                : modo === "crear"
                  ? "Crear establecimiento"
                  : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={cerrarFormulario}
              disabled={guardando}
              className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {establecimientos.length === 0 ? (
        <EstadoVacio
          titulo="No hay establecimientos activos"
          descripcion="Crea el primer establecimiento para que aparezca en el catálogo público."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] text-[var(--color-subtle)]">
                <th scope="col" className="px-2 py-2 font-semibold">
                  Establecimiento
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  Contacto
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  Ubicación
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {establecimientos.map((establecimiento) => (
                <tr
                  key={establecimiento.idEstablecimiento}
                  className="border-b border-[var(--color-hairline)] last:border-0"
                >
                  <td className="px-2 py-3">
                    <p className="font-semibold text-[var(--color-ink)]">
                      {establecimiento.nombre}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-subtle)]">
                      {establecimiento.descripcion || "Sin descripción"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-[var(--color-subtle)]">
                    <p>{establecimiento.correo || "Sin correo"}</p>
                    <p className="mt-0.5">
                      {establecimiento.telefono || "Sin teléfono"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-[var(--color-subtle)]">
                    <p>{establecimiento.direccion || "Sin dirección"}</p>
                    <p className="mt-0.5">
                      {establecimiento.latitud !== null &&
                      establecimiento.longitud !== null
                        ? `${establecimiento.latitud}, ${establecimiento.longitud}`
                        : "Sin coordenadas"}
                    </p>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => abrirEditar(establecimiento)}
                        aria-label={`Editar ${establecimiento.nombre}`}
                        className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEstablecimientoEliminando(establecimiento)
                        }
                        aria-label={`Desactivar ${establecimiento.nombre}`}
                        className={`cursor-pointer rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 ${CLASE_FOCO}`}
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {establecimientoEliminando && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${idBase}-titulo-desactivar`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-inverse)]/45 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-[var(--color-paper)] p-5 text-[var(--color-ink)] shadow-[var(--shadow-paper-hover)]">
            <h4
              id={`${idBase}-titulo-desactivar`}
              className="text-sm font-semibold text-[var(--color-ink)]"
            >
              Confirmar desactivación
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink)]">
              ¿Deseas desactivar{" "}
              <strong>{establecimientoEliminando.nombre}</strong>? Dejará de
              aparecer en el catálogo público; el backend conservará el
              registro para mantener la integridad referencial.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEstablecimientoEliminando(null)}
                disabled={eliminando}
                className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarDesactivacion}
                disabled={eliminando}
                className={`cursor-pointer rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
              >
                {eliminando ? "Desactivando…" : "Desactivar establecimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
