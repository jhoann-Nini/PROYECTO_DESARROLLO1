"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Establecimiento } from "@/types/establecimiento";
import type { RolAdmin, UsuarioAdmin } from "@/types/administracion";
import {
  ApiError,
  asignarRepresentante,
  asignarRolUsuario,
  cambiarEstadoCuenta,
  obtenerEstablecimientos,
  obtenerRolesAdmin,
  obtenerUsuariosAdmin,
  revocarRepresentante,
  revocarRolUsuario,
} from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(fecha);
}

function motivoOpcional(valor: string): string | undefined {
  const limpio = valor.trim();
  return limpio === "" ? undefined : limpio;
}

/**
 * Administración de cuentas: consulta, asignación y revocación de roles y
 * representaciones. El backend sigue siendo la autoridad de autorización y
 * valida cada operación con el JWT del administrador.
 */
export default function AdminUsuariosRoles() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [roles, setRoles] = useState<RolAdmin[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [correoBusqueda, setCorreoBusqueda] = useState("");
  const [correoAplicado, setCorreoAplicado] = useState("");
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);

  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  const [establecimientoSeleccionado, setEstablecimientoSeleccionado] =
    useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoEstado, setMotivoEstado] = useState("");

  const [operacionEnCurso, setOperacionEnCurso] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const seleccionado = useMemo(
    () =>
      usuarios.find((usuario) => usuario.idUsuario === seleccionadoId) ?? null,
    [usuarios, seleccionadoId],
  );

  const rolesDisponibles = useMemo(
    () => roles.filter((rol) => !(seleccionado?.roles ?? []).includes(rol.nombre)),
    [roles, seleccionado],
  );

  const rolSeleccionadoEfectivo = rolesDisponibles.some(
    (rol) => String(rol.idRol) === rolSeleccionado,
  )
    ? rolSeleccionado
    : rolesDisponibles.length > 0
      ? String(rolesDisponibles[0].idRol)
      : "";

  useEffect(() => {
    let activo = true;

    Promise.all([
      obtenerUsuariosAdmin(),
      obtenerRolesAdmin(),
      obtenerEstablecimientos(),
    ])
      .then(([cuentas, catalogoRoles, catalogoEstablecimientos]) => {
        if (!activo) return;
        setUsuarios(cuentas);
        setRoles(catalogoRoles);
        setEstablecimientos(catalogoEstablecimientos);
        setCorreoAplicado("");
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(
          err instanceof Error
            ? err.message
            : "No fue posible cargar las cuentas y los roles.",
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

  const recargarUsuarios = useCallback(async () => {
    const cuentas = await obtenerUsuariosAdmin(
      correoAplicado || undefined,
    );
    setUsuarios(cuentas);
    setSeleccionadoId((previo) =>
      previo !== null &&
      cuentas.some((cuenta) => cuenta.idUsuario === previo)
        ? previo
        : null,
    );
  }, [correoAplicado]);

  async function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (cargandoUsuarios) return;

    const filtro = correoBusqueda.trim();
    setCargandoUsuarios(true);
    setErrorUsuarios(null);
    setErrorAccion(null);
    setMensajeExito(null);

    try {
      const cuentas = await obtenerUsuariosAdmin(filtro || undefined);
      setUsuarios(cuentas);
      setCorreoAplicado(filtro);
      setSeleccionadoId(null);
    } catch (err) {
      setErrorUsuarios(
        err instanceof ApiError
          ? err.message
          : "No fue posible buscar las cuentas.",
      );
    } finally {
      setCargandoUsuarios(false);
    }
  }

  async function ejecutarAccion(
    accion: () => Promise<void>,
    mensaje: string,
  ) {
    if (operacionEnCurso) return;

    setOperacionEnCurso(true);
    setErrorAccion(null);
    setMensajeExito(null);

    try {
      await accion();
      try {
        await recargarUsuarios();
      } catch {
        setErrorAccion(
          "La operación se completó, pero no fue posible actualizar la lista de cuentas.",
        );
        return;
      }
      setMensajeExito(mensaje);
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No fue posible completar la operación administrativa.",
      );
    } finally {
      setOperacionEnCurso(false);
    }
  }

  // Caso 6: suspender o reactivar la cuenta, con motivo obligatorio.
  function cambiarEstado() {
    if (!seleccionado) return;
    if (!motivoEstado.trim()) {
      setMensajeExito(null);
      setErrorAccion(
        seleccionado.activo
          ? "Escribe el motivo de la suspensión."
          : "Escribe el motivo de la reactivación.",
      );
      return;
    }
    const activar = !seleccionado.activo;
    void ejecutarAccion(async () => {
      await cambiarEstadoCuenta(seleccionado.idUsuario, activar, motivoEstado);
      setMotivoEstado("");
    }, activar ? "Cuenta reactivada." : "Cuenta suspendida.");
  }

  function asignarRol() {
    if (!seleccionado || !rolSeleccionadoEfectivo) return;
    const rolId = Number(rolSeleccionadoEfectivo);
    void ejecutarAccion(
      () => asignarRolUsuario(seleccionado.idUsuario, rolId, motivoOpcional(motivo)),
      "Rol asignado correctamente.",
    );
  }

  function revocarRol(nombreRol: string) {
    if (!seleccionado) return;
    const rol = roles.find((item) => item.nombre === nombreRol);
    if (!rol) {
      setErrorAccion(
        "No fue posible identificar el rol en el catálogo del backend.",
      );
      return;
    }
    void ejecutarAccion(
      () =>
        revocarRolUsuario(
          seleccionado.idUsuario,
          rol.idRol,
          motivoOpcional(motivo),
        ),
      "Rol revocado correctamente.",
    );
  }

  function asignarRepresentacion() {
    if (!seleccionado || !establecimientoSeleccionado) {
      setErrorAccion("Selecciona un establecimiento activo.");
      return;
    }
    const establecimientoId = Number(establecimientoSeleccionado);
    void ejecutarAccion(
      () =>
        asignarRepresentante(
          seleccionado.idUsuario,
          establecimientoId,
          motivoOpcional(motivo),
        ),
      "Representación asignada correctamente.",
    );
  }

  function revocarRepresentacion() {
    if (!seleccionado || !establecimientoSeleccionado) {
      setErrorAccion("Selecciona un establecimiento activo.");
      return;
    }
    const establecimientoId = Number(establecimientoSeleccionado);
    void ejecutarAccion(
      () =>
        revocarRepresentante(
          seleccionado.idUsuario,
          establecimientoId,
          motivoOpcional(motivo),
        ),
      "Representación revocada correctamente.",
    );
  }

  if (cargando) {
    return (
      <p
        role="status"
        aria-busy="true"
        className="py-10 text-center text-sm text-[var(--color-subtle)]"
      >
        Cargando usuarios y roles…
      </p>
    );
  }

  if (errorCarga) {
    return (
      <EstadoVacio
        tipo="error"
        titulo="No pudimos cargar la administración de cuentas"
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
      <p className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-3 text-xs text-[var(--color-subtle)]">
        El backend no expone todavía el listado de representaciones activas por
        cuenta. Tampoco está disponible la lectura del historial de auditoría;
        esta vista solo muestra los roles activos confirmados.
      </p>

      <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
        <label
          htmlFor="admin-buscar-correo"
          className="text-xs font-medium text-[var(--color-subtle)]"
        >
          Buscar por correo
          <input
            id="admin-buscar-correo"
            type="search"
            value={correoBusqueda}
            onChange={(evento) => setCorreoBusqueda(evento.target.value)}
            placeholder="usuario@ejemplo.com"
            className={`mt-1 block rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
          />
        </label>
        <button
          type="submit"
          disabled={cargandoUsuarios}
          className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
        >
          {cargandoUsuarios ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {errorUsuarios && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {errorUsuarios}
        </p>
      )}

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

      {usuarios.length === 0 ? (
        <EstadoVacio
          titulo="No hay cuentas para mostrar"
          descripcion="No se encontraron cuentas con el correo consultado."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section aria-label="Cuentas registradas">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-subtle)]">
              Cuentas
            </h3>
            <ul className="mt-2 space-y-2">
              {usuarios.map((usuario) => {
                const activo = usuario.idUsuario === seleccionadoId;
                return (
                  <li
                    key={usuario.idUsuario}
                    className={`rounded-lg border p-3 ${
                      activo
                        ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/5"
                        : "border-[var(--color-hairline)]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {usuario.nombre}
                    </p>
                    <p className="mt-0.5 break-all text-xs text-[var(--color-subtle)]">
                      {usuario.correo}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-subtle)]">
                      {usuario.rol || "Sin rol principal"}
                    </p>
                    <p className="text-xs text-[var(--color-subtle)]">
                      {usuario.activo ? "Cuenta activa" : "Cuenta suspendida"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSeleccionadoId(usuario.idUsuario);
                        setRolSeleccionado("");
                        setErrorAccion(null);
                        setMensajeExito(null);
                      }}
                      aria-label={`Gestionar ${usuario.nombre}`}
                      className={`mt-2 cursor-pointer rounded-md border border-[var(--color-hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    >
                      Gestionar
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Gestión de la cuenta">
            {seleccionado ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    Gestionar {seleccionado.nombre}
                  </h3>
                  <p className="text-xs text-[var(--color-subtle)]">
                    {seleccionado.correo} · Registro:{" "}
                    {formatearFecha(seleccionado.fechaRegistro)}
                  </p>
                  {seleccionado.activo === false && (
                    <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      La cuenta está inactiva. El backend rechazará las
                      asignaciones hasta que sea reactivada por un
                      administrador.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--color-hairline)] p-3">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">
                    Roles activos:
                  </p>
                  {(seleccionado.roles ?? []).length === 0 ? (
                    <p className="mt-1 text-xs text-[var(--color-subtle)]">
                      Sin roles activos.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {(seleccionado.roles ?? []).map((nombreRol) => (
                        <li
                          key={nombreRol}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <span className="rounded-full bg-[var(--color-brand-blue)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand-blue)]">
                            {nombreRol}
                          </span>
                          <button
                            type="button"
                            onClick={() => revocarRol(nombreRol)}
                            disabled={operacionEnCurso}
                            aria-label={`Revocar rol ${nombreRol}`}
                            className={`cursor-pointer rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                          >
                            Revocar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--color-hairline)] p-3">
                  <p className="mb-3 text-xs text-[var(--color-subtle)]">
                    El historial y las representaciones activas todavía no se pueden consultar desde esta API. Las asignaciones y revocaciones se confirman con la respuesta del backend.
                  </p>
                  <label
                    htmlFor="admin-rol-asignar"
                    className="block text-xs font-medium text-[var(--color-subtle)]"
                  >
                    Rol a asignar
                    <select
                      id="admin-rol-asignar"
                      value={rolSeleccionadoEfectivo}
                      onChange={(evento) =>
                        setRolSeleccionado(evento.target.value)
                      }
                      className={`mt-1 block w-full cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    >
                      {rolesDisponibles.length === 0 ? (
                        <option value="">Sin roles disponibles</option>
                      ) : (
                        rolesDisponibles.map((rol) => (
                          <option key={rol.idRol} value={String(rol.idRol)}>
                            {rol.nombre}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label
                    htmlFor="admin-motivo"
                    className="mt-3 block text-xs font-medium text-[var(--color-subtle)]"
                  >
                    Motivo (opcional)
                    <input
                      id="admin-motivo"
                      type="text"
                      value={motivo}
                      onChange={(evento) => setMotivo(evento.target.value)}
                      maxLength={500}
                      placeholder="Motivo de la asignación o revocación"
                      className={`mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={asignarRol}
                    disabled={operacionEnCurso || !rolSeleccionadoEfectivo}
                    className={`mt-3 cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-solid)] transition-colors hover:bg-[var(--color-brand-solid)]/90 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                  >
                    Asignar rol
                  </button>
                </div>

                <div className="rounded-lg border border-[var(--color-hairline)] p-3">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">
                    Estado de la cuenta: {seleccionado.activo ? "activa" : "suspendida"}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-subtle)]">
                    Una cuenta suspendida no puede publicar reseñas, reportar ni moderar.
                    Para suspender a un administrador, primero retira su rol.
                  </p>
                  <label
                    htmlFor="admin-motivo-estado"
                    className="mt-3 block text-xs font-medium text-[var(--color-subtle)]"
                  >
                    Motivo (obligatorio)
                    <input
                      id="admin-motivo-estado"
                      type="text"
                      value={motivoEstado}
                      onChange={(evento) => setMotivoEstado(evento.target.value)}
                      maxLength={2000}
                      placeholder={seleccionado.activo ? "Por qué se suspende la cuenta" : "Por qué se reactiva la cuenta"}
                      className={`mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={cambiarEstado}
                    disabled={operacionEnCurso}
                    className={`mt-3 cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      seleccionado.activo
                        ? "border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50"
                        : "border-[var(--color-hairline)] text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)]"
                    } ${CLASE_FOCO}`}
                  >
                    {seleccionado.activo ? "Suspender cuenta" : "Reactivar cuenta"}
                  </button>
                </div>

                <div className="rounded-lg border border-[var(--color-hairline)] p-3">
                  <label
                    htmlFor="admin-establecimiento"
                    className="block text-xs font-medium text-[var(--color-subtle)]"
                  >
                    Establecimiento
                    <select
                      id="admin-establecimiento"
                      value={establecimientoSeleccionado}
                      onChange={(evento) =>
                        setEstablecimientoSeleccionado(evento.target.value)
                      }
                      className={`mt-1 block w-full cursor-pointer rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`}
                    >
                      <option value="">Selecciona un establecimiento</option>
                      {establecimientos.map((establecimiento) => (
                        <option
                          key={establecimiento.idEstablecimiento}
                          value={String(establecimiento.idEstablecimiento)}
                        >
                          {establecimiento.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={asignarRepresentacion}
                      disabled={
                        operacionEnCurso || !establecimientoSeleccionado
                      }
                      className={`cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-blue)] transition-colors hover:border-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                    >
                      Asignar representación
                    </button>
                    <button
                      type="button"
                      onClick={revocarRepresentacion}
                      disabled={
                        operacionEnCurso || !establecimientoSeleccionado
                      }
                      className={`cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`}
                    >
                      Revocar representación
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] text-[var(--color-subtle)]">
                    La revocación se envía al backend para el establecimiento
                    seleccionado. Si la cuenta no tenía esa representación
                    activa, el backend responderá con el error correspondiente.
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--color-hairline)] p-6 text-center text-sm text-[var(--color-subtle)]">
                Selecciona una cuenta para gestionar sus roles y
                representaciones.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
