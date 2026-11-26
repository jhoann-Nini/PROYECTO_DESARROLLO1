"use client";

import { useEffect, useId, useState } from "react";
import type { Establecimiento, OfertaAdmin } from "@/types/establecimiento";
import type { ProductoResponse } from "@/types/producto";
import {
  ApiError,
  eliminarOfertaAdmin,
  guardarOfertaAdmin,
  obtenerEstablecimientos,
  obtenerOfertasAdmin,
  obtenerProductos,
} from "@/services/api";
import EstadoVacio from "@/components/ui/EstadoVacio";
import { CLASE_FOCO } from "@/components/ui/foco";

interface FormularioOferta {
  idProducto: string;
  idEstablecimiento: string;
  precio: string;
  disponibilidad: boolean;
  urlOferta: string;
}

const FORMULARIO_VACIO: FormularioOferta = {
  idProducto: "",
  idEstablecimiento: "",
  precio: "",
  disponibilidad: true,
  urlOferta: "",
};

const formatoPrecio = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(fecha);
}

/** Valida en el cliente lo mismo que el backend; el backend sigue siendo la autoridad. */
export function validarFormularioOferta(formulario: FormularioOferta): string[] {
  const errores: string[] = [];
  if (!formulario.idProducto) errores.push("Selecciona un producto.");
  if (!formulario.idEstablecimiento) errores.push("Selecciona una tienda.");
  const precio = Number(formulario.precio);
  if (formulario.precio.trim() === "" || !Number.isFinite(precio) || precio <= 0) {
    errores.push("El precio debe ser un número mayor que cero.");
  }
  const url = formulario.urlOferta.trim();
  if (url && (!/^https?:\/\/\S+$/i.test(url) || url.length > 2048)) {
    errores.push("El enlace debe empezar por http:// o https://, sin espacios y con máximo 2048 caracteres.");
  }
  return errores;
}

/**
 * Administración de ofertas producto–tienda (Fase 3). Las ofertas son la
 * única fuente de «Dónde comprar»: precio, disponibilidad, enlace y la fecha
 * del último cambio, que fija el servidor.
 */
export default function AdminOfertas() {
  const [ofertas, setOfertas] = useState<OfertaAdmin[] | null>(null);
  const [productos, setProductos] = useState<ProductoResponse[]>([]);
  const [tiendas, setTiendas] = useState<Establecimiento[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const [formulario, setFormulario] = useState<FormularioOferta>(FORMULARIO_VACIO);
  const [editando, setEditando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoClave, setEliminandoClave] = useState<string | null>(null);
  const [confirmandoClave, setConfirmandoClave] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const idBase = useId();

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerOfertasAdmin(), obtenerProductos<ProductoResponse>(), obtenerEstablecimientos()])
      .then(([datosOfertas, datosProductos, datosTiendas]) => {
        if (!activo) return;
        setOfertas(datosOfertas);
        setProductos([...datosProductos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
        setTiendas([...datosTiendas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
        setErrorCarga(null);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setErrorCarga(err instanceof Error ? err.message : "No fue posible cargar las ofertas.");
      });
    return () => {
      activo = false;
    };
  }, [intento]);

  const clave = (oferta: Pick<OfertaAdmin, "idProducto" | "idEstablecimiento">) =>
    `${oferta.idProducto}-${oferta.idEstablecimiento}`;

  function actualizar<K extends keyof FormularioOferta>(campo: K, valor: FormularioOferta[K]) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  function editar(oferta: OfertaAdmin) {
    setFormulario({
      idProducto: String(oferta.idProducto),
      idEstablecimiento: String(oferta.idEstablecimiento),
      precio: oferta.precio !== null ? String(oferta.precio) : "",
      disponibilidad: oferta.disponibilidad,
      urlOferta: oferta.urlOferta ?? "",
    });
    setEditando(true);
    setErrores([]);
    setMensajeExito(null);
    setErrorAccion(null);
  }

  function cancelarEdicion() {
    setFormulario(FORMULARIO_VACIO);
    setEditando(false);
    setErrores([]);
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    const encontrados = validarFormularioOferta(formulario);
    setErrores(encontrados);
    setMensajeExito(null);
    setErrorAccion(null);
    if (encontrados.length > 0) return;

    setGuardando(true);
    try {
      const url = formulario.urlOferta.trim();
      const guardada = await guardarOfertaAdmin(
        Number(formulario.idProducto),
        Number(formulario.idEstablecimiento),
        {
          precio: Number(formulario.precio),
          disponibilidad: formulario.disponibilidad,
          ...(url ? { urlOferta: url } : {}),
        },
      );
      setOfertas((previas) => {
        const lista = previas ?? [];
        const existe = lista.some((o) => clave(o) === clave(guardada));
        return existe ? lista.map((o) => (clave(o) === clave(guardada) ? guardada : o)) : [...lista, guardada];
      });
      setMensajeExito(`Oferta de ${guardada.nombreProducto} en ${guardada.nombreEstablecimiento} guardada.`);
      setFormulario(FORMULARIO_VACIO);
      setEditando(false);
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : "No fue posible guardar la oferta.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(oferta: OfertaAdmin) {
    if (eliminandoClave) return;
    setEliminandoClave(clave(oferta));
    setMensajeExito(null);
    setErrorAccion(null);
    try {
      await eliminarOfertaAdmin(oferta.idProducto, oferta.idEstablecimiento);
      setOfertas((previas) => previas?.filter((o) => clave(o) !== clave(oferta)) ?? previas);
      setMensajeExito(`Oferta de ${oferta.nombreProducto} en ${oferta.nombreEstablecimiento} eliminada.`);
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : "No fue posible eliminar la oferta.");
    } finally {
      setEliminandoClave(null);
      setConfirmandoClave(null);
    }
  }

  const claseCampo = `mt-1 block w-full rounded-card border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brand-blue disabled:opacity-60 ${CLASE_FOCO}`;

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="space-y-4">
      <div>
        <h3 id={`${idBase}-titulo`} className="text-base font-medium text-ink">
          Ofertas por tienda
        </h3>
        <p className="mt-1 text-xs text-subtle">
          Precio, disponibilidad y enlace de cada producto en cada tienda. Es la información que ve el
          público en «Dónde comprar». Registra solo datos comprobados en la tienda; la fecha de
          actualización la fija el servidor.
        </p>
      </div>

      {mensajeExito && (
        <p role="status" className="rounded-card border border-surface-border-strong bg-surface-2 p-3 text-xs text-ink">
          {mensajeExito}
        </p>
      )}
      {errorAccion && (
        <p role="alert" className="rounded-card border border-status-error bg-paper p-3 text-xs text-status-error">
          {errorAccion}
        </p>
      )}

      <form
        onSubmit={guardar}
        noValidate
        aria-label={editando ? "Editar oferta" : "Nueva oferta"}
        className="grid grid-cols-1 gap-3 rounded-card border border-line bg-canvas p-4 sm:grid-cols-2"
      >
        <label className="text-xs font-medium text-subtle">
          Producto
          <select
            value={formulario.idProducto}
            onChange={(e) => actualizar("idProducto", e.target.value)}
            disabled={editando}
            className={claseCampo}
          >
            <option value="">Selecciona un producto</option>
            {productos.map((p) => (
              <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-subtle">
          Tienda
          <select
            value={formulario.idEstablecimiento}
            onChange={(e) => actualizar("idEstablecimiento", e.target.value)}
            disabled={editando}
            className={claseCampo}
          >
            <option value="">Selecciona una tienda</option>
            {tiendas.map((t) => (
              <option key={t.idEstablecimiento} value={t.idEstablecimiento}>{t.nombre}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-subtle">
          Precio (COP)
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={formulario.precio}
            onChange={(e) => actualizar("precio", e.target.value)}
            className={claseCampo}
          />
        </label>
        <label className="text-xs font-medium text-subtle">
          Enlace de la oferta (opcional)
          <input
            type="url"
            value={formulario.urlOferta}
            onChange={(e) => actualizar("urlOferta", e.target.value)}
            maxLength={2048}
            placeholder="https://"
            className={claseCampo}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={formulario.disponibilidad}
            onChange={(e) => actualizar("disponibilidad", e.target.checked)}
            className={CLASE_FOCO}
          />
          Disponible en la tienda
        </label>

        {errores.length > 0 && (
          <ul role="alert" className="list-disc space-y-1 rounded-card border border-status-error bg-paper p-3 pl-6 text-xs text-status-error sm:col-span-2">
            {errores.map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={guardando}
            className={`cursor-pointer rounded-card bg-brand-solid px-4 py-2 text-xs font-medium text-on-solid disabled:cursor-not-allowed disabled:opacity-60 ${CLASE_FOCO}`}
          >
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar oferta"}
          </button>
          {editando && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className={`cursor-pointer rounded-card border border-line px-4 py-2 text-xs font-medium text-subtle ${CLASE_FOCO}`}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {errorCarga ? (
        <EstadoVacio
          tipo="error"
          titulo="No pudimos cargar las ofertas"
          descripcion={errorCarga}
          accion={{ etiqueta: "Reintentar", onClick: () => setIntento((v) => v + 1) }}
        />
      ) : ofertas === null ? (
        <p role="status" aria-busy="true" className="py-6 text-center text-sm text-subtle">
          Cargando ofertas…
        </p>
      ) : ofertas.length === 0 ? (
        <EstadoVacio
          titulo="No hay ofertas registradas"
          descripcion="Registra la primera con el formulario: producto, tienda, precio y, si lo tienes, el enlace."
        />
      ) : (
        <ul className="space-y-3" aria-label="Ofertas registradas">
          {ofertas.map((oferta) => (
            <li
              key={clave(oferta)}
              className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-paper p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {oferta.nombreProducto} · {oferta.nombreEstablecimiento}
                  {oferta.establecimientoVerificado && (
                    <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink">
                      Tienda verificada
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  {oferta.precio !== null ? formatoPrecio.format(oferta.precio) : "Sin precio"}
                  {" · "}
                  {oferta.disponibilidad ? "Disponible" : "No disponible"}
                  {!oferta.establecimientoActivo && " · Tienda inactiva"}
                  {" · Actualizada "}
                  {formatearFecha(oferta.fechaActualizacionPrecio)}
                </p>
                {oferta.urlOferta && (
                  <p className="mt-1 truncate text-xs text-brand-blue">{oferta.urlOferta}</p>
                )}
                {oferta.reportesAbiertos > 0 && (
                  <p className="mt-1 text-xs font-medium text-star">
                    {oferta.reportesAbiertos} {oferta.reportesAbiertos === 1 ? "reporte abierto" : "reportes abiertos"} en moderación
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => editar(oferta)}
                  aria-label={`Editar oferta de ${oferta.nombreProducto} en ${oferta.nombreEstablecimiento}`}
                  className={`cursor-pointer rounded-card border border-line px-3 py-1.5 text-xs font-medium text-brand-blue hover:border-brand-blue ${CLASE_FOCO}`}
                >
                  Editar
                </button>
                {confirmandoClave === clave(oferta) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => eliminar(oferta)}
                      disabled={eliminandoClave !== null}
                      className={`cursor-pointer rounded-card bg-paper px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60 ${CLASE_FOCO}`}
                    >
                      {eliminandoClave === clave(oferta) ? "Eliminando…" : "Confirmar eliminación"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoClave(null)}
                      className={`cursor-pointer rounded-card border border-line px-3 py-1.5 text-xs font-medium text-subtle ${CLASE_FOCO}`}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoClave(clave(oferta))}
                    aria-label={`Eliminar oferta de ${oferta.nombreProducto} en ${oferta.nombreEstablecimiento}`}
                    className={`cursor-pointer rounded-card border border-status-error px-3 py-1.5 text-xs font-medium text-status-error hover:border-status-error hover:bg-paper ${CLASE_FOCO}`}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
