"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ProductoResponse, UsuarioSesion } from "@/types/producto";
import {
  actualizarFichaTecnicaProducto,
  ApiError,
  obtenerFichaTecnicaProducto,
} from "@/services/api";
import {
  validarDatosFichaTecnicaV3,
  type CategoriaFichaV3,
  type DatosFichaTecnicaV3,
  type EstadoDatoV3,
  type EstadoVerificacionV3,
  type EspecificacionFichaV3,
  type FuenteFichaV3,
  type VarianteFichaV3,
} from "@/types/fichaTecnicaV3";
import { CLASE_FOCO } from "@/components/ui/foco";

interface AdminFichaTecnicaModalProps {
  producto: ProductoResponse | null;
  abierto: boolean;
  onCerrar: () => void;
  onFichaGuardada?: (productoActualizado: ProductoResponse) => void;
  /** Administrador de la sesión; se guarda como `verificado_por` (Fase 3, H-03). */
  responsable?: Pick<UsuarioSesion, "nombre" | "idUsuario"> | null;
}

/**
 * Identifica a quien verifica una especificación. Sin sesión conserva el
 * valor genérico anterior para no romper la compatibilidad.
 */
export function describirResponsable(
  responsable?: Pick<UsuarioSesion, "nombre" | "idUsuario"> | null,
): string {
  const nombre = responsable?.nombre?.trim();
  if (!nombre) return "administrador";
  return typeof responsable?.idUsuario === "number"
    ? `${nombre} (id ${responsable.idUsuario})`
    : nombre;
}

type TabFicha = "especificaciones" | "variantes" | "fuentes_evidencias" | "json";

function inferirCategoriaV3(idCategoria?: number | null): CategoriaFichaV3 {
  switch (idCategoria) {
    case 1:
      return "celulares";
    case 2:
      return "tablets";
    case 3:
      return "portatiles";
    case 4:
      return "auriculares";
    default:
      return "celulares";
  }
}

function plantillaFichaV3Inicial(
  producto: ProductoResponse,
): DatosFichaTecnicaV3 {
  const categoria = inferirCategoriaV3(producto.idCategoria);
  return {
    version_esquema: 3,
    categoria,
    variantes: [
      {
        id: "var-principal",
        modelo: producto.nombre,
        sku: null,
        mercado: null,
        identificadores: {},
      },
    ],
    especificaciones: [],
    fuentes: [],
    evidencias: [],
    benchmarks: [],
  };
}

export default function AdminFichaTecnicaModal({
  producto,
  abierto,
  onCerrar,
  onFichaGuardada,
  responsable,
}: AdminFichaTecnicaModalProps) {
  if (!abierto || !producto) {
    return null;
  }

  return (
    <AdminFichaTecnicaDialog
      key={producto.idProducto}
      producto={producto}
      onCerrar={onCerrar}
      onFichaGuardada={onFichaGuardada}
      responsable={responsable}
    />
  );
}

interface AdminFichaTecnicaDialogProps {
  producto: ProductoResponse;
  onCerrar: () => void;
  onFichaGuardada?: (productoActualizado: ProductoResponse) => void;
  responsable?: Pick<UsuarioSesion, "nombre" | "idUsuario"> | null;
}

function AdminFichaTecnicaDialog({
  producto,
  onCerrar,
  onFichaGuardada,
  responsable,
}: AdminFichaTecnicaDialogProps) {
  const [tab, setTab] = useState<TabFicha>("especificaciones");
  const [ficha, setFicha] = useState<DatosFichaTecnicaV3 | null>(null);
  const [fichaRawJson, setFichaRawJson] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Filtros de atributos
  const [filtroEstadoVerificacion, setFiltroEstadoVerificacion] =
    useState<string>("todos");

  // Formulario rápido para nueva especificación
  const [mostrarFormNuevaSpec, setMostrarFormNuevaSpec] = useState(false);
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoGrupo, setNuevoGrupo] = useState("general");
  const [nuevoEstadoDato, setNuevoEstadoDato] =
    useState<EstadoDatoV3>("conocido");
  const [nuevoValorTexto, setNuevoValorTexto] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("");
  const [nuevaJustificacion, setNuevaJustificacion] = useState("");
  const [nuevoEstadoVerif, setNuevoEstadoVerif] =
    useState<EstadoVerificacionV3>("pendiente");

  // Formulario para nueva variante
  const [nuevoModeloVar, setNuevoModeloVar] = useState("");
  const [nuevoSkuVar, setNuevoSkuVar] = useState("");

  // Formulario para nueva fuente
  const [nuevoNombreFuente, setNuevoNombreFuente] = useState("");
  const [nuevoTipoFuente, setNuevoTipoFuente] = useState<
    FuenteFichaV3["tipo"]
  >("fabricante");
  const [nuevaUrlFuente, setNuevaUrlFuente] = useState("");

  const idTitulo = useId();

  useEffect(() => {
    let activo = true;

    obtenerFichaTecnicaProducto(producto.idProducto)
      .then((datos) => {
        if (!activo) return;
        if (datos && datos.version_esquema === 3) {
          const v3 = datos as unknown as DatosFichaTecnicaV3;
          setFicha(v3);
          setFichaRawJson(JSON.stringify(v3, null, 2));
        } else {
          setFicha(null);
          setFichaRawJson(JSON.stringify(datos ?? {}, null, 2));
        }
      })
      .catch((err) => {
        if (!activo) return;
        setErrorCarga(
          err instanceof Error
            ? err.message
            : "No se pudo consultar la ficha técnica del producto.",
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [producto.idProducto]);

  const validacionContrato = useMemo(() => {
    if (!ficha) return { valido: false, errores: ["No se ha inicializado una ficha V3."] };
    return validarDatosFichaTecnicaV3(ficha);
  }, [ficha]);

  const metricasFicha = useMemo(() => {
    if (!ficha) return { total: 0, verificadas: 0, pendientes: 0, revision: 0, desconocido: 0 };
    const specs = ficha.especificaciones;
    return {
      total: specs.length,
      verificadas: specs.filter((s) => s.verificacion?.estado === "verificado").length,
      pendientes: specs.filter((s) => s.verificacion?.estado === "pendiente").length,
      revision: specs.filter((s) => s.verificacion?.estado === "requiere_revision").length,
      desconocido: specs.filter((s) => s.estado_dato === "desconocido" || s.estado_dato === "no_publicado").length,
    };
  }, [ficha]);

  const especificacionesFiltradas = useMemo(() => {
    if (!ficha) return [];
    if (filtroEstadoVerificacion === "todos") return ficha.especificaciones;
    return ficha.especificaciones.filter(
      (s) => s.verificacion?.estado === filtroEstadoVerificacion,
    );
  }, [ficha, filtroEstadoVerificacion]);

  const iniciarPlantilla = () => {
    if (!producto) return;
    const inicial = plantillaFichaV3Inicial(producto);
    setFicha(inicial);
    setFichaRawJson(JSON.stringify(inicial, null, 2));
    setMensajeExito("Plantilla V3 inicializada en modo borrador. Agrega especificaciones y fuentes antes de guardar.");
  };

  const aplicarJsonCrudo = () => {
    try {
      const parsed = JSON.parse(fichaRawJson);
      if (typeof parsed !== "object" || parsed === null) {
        setErrorAccion("El JSON ingresado debe ser un objeto.");
        return;
      }
      setFicha(parsed as DatosFichaTecnicaV3);
      setErrorAccion(null);
      setMensajeExito("JSON aplicado al formulario correctamente.");
    } catch (err) {
      setErrorAccion(
        err instanceof Error ? `JSON inválido: ${err.message}` : "El JSON no tiene una sintaxis válida.",
      );
    }
  };

  const agregarEspecificacion = () => {
    if (!ficha) return;
    if (!nuevaClave.trim() || !nuevoNombre.trim()) {
      setErrorAccion("La clave y el nombre de la especificación son obligatorios.");
      return;
    }

    if (nuevoEstadoDato === "conocido" && !nuevoValorTexto.trim()) {
      setErrorAccion("Un dato en estado 'conocido' requiere un valor de texto.");
      return;
    }

    if (nuevoEstadoDato === "no_aplica" && !nuevaJustificacion.trim()) {
      setErrorAccion("Un dato en estado 'no_aplica' requiere una justificación.");
      return;
    }

    const idSpec = `${nuevaClave.trim().replace(/\s+/g, "_")}.${Date.now()}`;
    const nuevaSpec: EspecificacionFichaV3 = {
      id: idSpec,
      clave: nuevaClave.trim(),
      nombre: nuevoNombre.trim(),
      grupo: nuevoGrupo.trim() || "general",
      variante_id: null,
      estado_dato: nuevoEstadoDato,
      justificacion_estado: nuevoEstadoDato === "no_aplica" ? nuevaJustificacion.trim() : null,
      valor_original:
        nuevoEstadoDato === "conocido"
          ? { texto: nuevoValorTexto.trim(), unidad: nuevaUnidad.trim() || null }
          : null,
      normalizacion:
        nuevoEstadoDato === "conocido"
          ? {
              estado: "normalizada",
              valor: { tipo: "texto", valor: nuevoValorTexto.trim() },
              regla_conversion_id: null,
              precision: null,
            }
          : { estado: "no_procesada", valor: null, regla_conversion_id: null, precision: null },
      evidencia_ids: [],
      revision_conflicto: {
        estado: "sin_conflicto",
        resuelto_en: null,
        resuelto_por: null,
        resolucion: null,
      },
      verificacion: {
        estado: nuevoEstadoVerif,
        verificado_en: nuevoEstadoVerif === "verificado" ? new Date().toISOString() : null,
        verificado_por: nuevoEstadoVerif === "verificado" ? describirResponsable(responsable) : null,
        evento_auditoria_id: null,
        motivo_revision: null,
      },
      comparacion: { habilitada: false },
    };

    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      especificaciones: [...ficha.especificaciones, nuevaSpec],
    };

    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
    setNuevaClave("");
    setNuevoNombre("");
    setNuevoValorTexto("");
    setNuevaUnidad("");
    setNuevaJustificacion("");
    setMostrarFormNuevaSpec(false);
    setErrorAccion(null);
    setMensajeExito("Especificación agregada correctamente.");
  };

  const eliminarEspecificacion = (id: string) => {
    if (!ficha) return;
    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      especificaciones: ficha.especificaciones.filter((s) => s.id !== id),
    };
    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
  };

  const cambiarEstadoVerificacionSpec = (
    id: string,
    nuevoEstado: EstadoVerificacionV3,
  ) => {
    if (!ficha) return;
    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      especificaciones: ficha.especificaciones.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          verificacion: {
            ...s.verificacion,
            estado: nuevoEstado,
            verificado_en: nuevoEstado === "verificado" ? new Date().toISOString() : null,
            verificado_por: nuevoEstado === "verificado" ? describirResponsable(responsable) : null,
          },
        };
      }),
    };
    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
  };

  const agregarVariante = () => {
    if (!ficha) return;
    const idVar = `var-${Date.now()}`;
    const nuevaVar: VarianteFichaV3 = {
      id: idVar,
      modelo: nuevoModeloVar.trim() || null,
      sku: nuevoSkuVar.trim() || null,
      mercado: null,
      identificadores: {},
    };
    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      variantes: [...ficha.variantes, nuevaVar],
    };
    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
    setNuevoModeloVar("");
    setNuevoSkuVar("");
    setMensajeExito("Variante agregada.");
  };

  const eliminarVariante = (id: string) => {
    if (!ficha) return;
    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      variantes: ficha.variantes.filter((v) => v.id !== id),
    };
    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
  };

  const agregarFuente = () => {
    if (!ficha) return;
    if (!nuevoNombreFuente.trim()) {
      setErrorAccion("El nombre de la fuente es obligatorio.");
      return;
    }
    const idSrc = `src-${Date.now()}`;
    const nuevaFuente: FuenteFichaV3 = {
      id: idSrc,
      nombre: nuevoNombreFuente.trim(),
      tipo: nuevoTipoFuente,
      url: nuevaUrlFuente.trim() || null,
      localizador: null,
      consultada_en: new Date().toISOString().slice(0, 10),
      variante_id: null,
      mercado: null,
    };
    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      fuentes: [...ficha.fuentes, nuevaFuente],
    };
    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
    setNuevoNombreFuente("");
    setNuevaUrlFuente("");
    setMensajeExito("Fuente agregada.");
  };

  const eliminarFuente = (id: string) => {
    if (!ficha) return;
    const actualizada: DatosFichaTecnicaV3 = {
      ...ficha,
      fuentes: ficha.fuentes.filter((f) => f.id !== id),
    };
    setFicha(actualizada);
    setFichaRawJson(JSON.stringify(actualizada, null, 2));
  };

  const guardarFicha = async () => {
    if (!producto || !ficha) return;

    // Validación estricta en cliente antes de persistir
    const val = validarDatosFichaTecnicaV3(ficha);
    if (!val.valido) {
      setErrorAccion(
        `No se puede guardar: el payload no cumple el contrato V3. Errores: ${val.errores.join("; ")}`,
      );
      return;
    }

    setGuardando(true);
    setErrorAccion(null);
    setMensajeExito(null);

    try {
      const respuesta = await actualizarFichaTecnicaProducto(
        producto.idProducto,
        ficha as unknown as Record<string, unknown>,
      );
      setMensajeExito("Ficha técnica V3 actualizada exitosamente en el servidor.");
      if (onFichaGuardada) {
        onFichaGuardada(respuesta);
      }
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Error desconocido al guardar la ficha técnica.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-xl border border-[var(--color-hairline)] bg-[var(--color-paper)] text-[var(--color-ink)] shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Ficha Técnica V3
              </span>
              <span className="text-xs text-[var(--color-subtle)]">
                Producto #{producto.idProducto}
              </span>
            </div>
            <h2 id={idTitulo} className="text-lg font-bold text-[var(--color-ink)] mt-0.5">
              {producto.nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className={`p-2 rounded-lg text-[var(--color-subtle)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors ${CLASE_FOCO}`}
            aria-label="Cerrar modal de ficha técnica"
          >
            ✕
          </button>
        </header>

        {/* Resumen de Estado */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[var(--color-hairline)] bg-[var(--color-paper)] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Estado:</span>
            {ficha ? (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                  validacionContrato.valido
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {validacionContrato.valido
                  ? "✓ Contrato V3 Válido"
                  : `⚠ V3 con advertencias (${validacionContrato.errores.length})`}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
                Sin Ficha V3 (Pendiente o Legacy)
              </span>
            )}
            {ficha && (
              <span className="text-[var(--color-subtle)]">
                Categoría V3: <strong>{ficha.categoria}</strong>
              </span>
            )}
          </div>

          {ficha && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800" title="Total especificaciones">
                Total: {metricasFicha.total}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800" title="Verificadas">
                ✓ {metricasFicha.verificadas}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Pendientes">
                ⏳ {metricasFicha.pendientes}
              </span>
              {metricasFicha.revision > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800" title="Requieren revisión">
                  ⚠ {metricasFicha.revision}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mensajes de Alerta / Éxito */}
        {errorCarga && (
          <div role="alert" className="mx-6 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {errorCarga}
          </div>
        )}
        {errorAccion && (
          <div role="alert" className="mx-6 mt-3 p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900">
            {errorAccion}
          </div>
        )}
        {mensajeExito && (
          <div role="status" className="mx-6 mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900">
            {mensajeExito}
          </div>
        )}

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cargando ? (
            <div className="py-16 text-center text-sm text-[var(--color-subtle)]">
              Consultando ficha técnica desde la API...
            </div>
          ) : !ficha ? (
            <div className="py-12 text-center space-y-4 border border-dashed border-[var(--color-hairline)] rounded-xl bg-[var(--color-canvas)]">
              <div className="text-3xl">📋</div>
              <div>
                <h3 className="text-base font-semibold text-[var(--color-ink)]">
                  Este producto no cuenta con ficha técnica V3
                </h3>
                <p className="mt-1 text-xs text-[var(--color-subtle)] max-w-md mx-auto">
                  Actualmente no tiene especificaciones registradas bajo el esquema canónico V3.
                  Puedes iniciar un borrador estructurado para documentar sus especificaciones con fuentes verificables.
                </p>
              </div>
              <button
                type="button"
                onClick={iniciarPlantilla}
                className={`px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer ${CLASE_FOCO}`}
              >
                + Iniciar Ficha V3 (Borrador Pendiente)
              </button>
            </div>
          ) : (
            <>
              {/* Barra de pestañas */}
              <div className="flex border-b border-[var(--color-hairline)] gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTab("especificaciones")}
                  className={`pb-2 transition-colors cursor-pointer ${
                    tab === "especificaciones"
                      ? "border-b-2 border-emerald-600 text-emerald-600"
                      : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  Especificaciones ({ficha.especificaciones.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("variantes")}
                  className={`pb-2 transition-colors cursor-pointer ${
                    tab === "variantes"
                      ? "border-b-2 border-emerald-600 text-emerald-600"
                      : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  Variantes ({ficha.variantes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("fuentes_evidencias")}
                  className={`pb-2 transition-colors cursor-pointer ${
                    tab === "fuentes_evidencias"
                      ? "border-b-2 border-emerald-600 text-emerald-600"
                      : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  Fuentes ({ficha.fuentes.length}) & Evidencias ({ficha.evidencias.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("json")}
                  className={`pb-2 transition-colors cursor-pointer ${
                    tab === "json"
                      ? "border-b-2 border-emerald-600 text-emerald-600"
                      : "text-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  JSON Crudo & Validación
                </button>
              </div>

              {/* Pestaña: Especificaciones */}
              {tab === "especificaciones" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="filtro-verif" className="text-xs text-[var(--color-subtle)]">
                        Filtrar:
                      </label>
                      <select
                        id="filtro-verif"
                        value={filtroEstadoVerificacion}
                        onChange={(e) => setFiltroEstadoVerificacion(e.target.value)}
                        className="text-xs p-1 rounded border border-[var(--color-hairline)] bg-[var(--color-paper)]"
                      >
                        <option value="todos">Todos los estados</option>
                        <option value="pendiente">Solo Pendientes</option>
                        <option value="con_fuente">Con Fuente</option>
                        <option value="verificado">Verificados</option>
                        <option value="requiere_revision">Requieren Revisión</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostrarFormNuevaSpec(!mostrarFormNuevaSpec)}
                      className={`px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer ${CLASE_FOCO}`}
                    >
                      {mostrarFormNuevaSpec ? "✕ Cancelar" : "+ Nueva Especificación"}
                    </button>
                  </div>

                  {mostrarFormNuevaSpec && (
                    <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-3 text-xs">
                      <h4 className="font-semibold text-emerald-900">Agregar Especificación Técnica</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Clave (ID canónico):</label>
                          <input
                            type="text"
                            placeholder="ej. display.diagonal"
                            value={nuevaClave}
                            onChange={(e) => setNuevaClave(e.target.value)}
                            className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Nombre legible:</label>
                          <input
                            type="text"
                            placeholder="ej. Tamaño de Pantalla"
                            value={nuevoNombre}
                            onChange={(e) => setNuevoNombre(e.target.value)}
                            className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Grupo:</label>
                          <input
                            type="text"
                            placeholder="ej. pantalla, procesador, etc."
                            value={nuevoGrupo}
                            onChange={(e) => setNuevoGrupo(e.target.value)}
                            className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Estado del Dato:</label>
                          <select
                            value={nuevoEstadoDato}
                            onChange={(e) => setNuevoEstadoDato(e.target.value as EstadoDatoV3)}
                            className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                          >
                            <option value="conocido">Conocido</option>
                            <option value="desconocido">Desconocido</option>
                            <option value="no_publicado">No publicado</option>
                            <option value="no_aplica">No aplica</option>
                          </select>
                        </div>

                        {nuevoEstadoDato === "conocido" ? (
                          <>
                            <div>
                              <label className="block text-[11px] font-medium mb-1">Valor Original (texto):</label>
                              <input
                                type="text"
                                placeholder="ej. 6.7 pulgadas"
                                value={nuevoValorTexto}
                                onChange={(e) => setNuevoValorTexto(e.target.value)}
                                className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium mb-1">Unidad (opcional):</label>
                              <input
                                type="text"
                                placeholder="ej. in, mm, mAh, GB"
                                value={nuevaUnidad}
                                onChange={(e) => setNuevaUnidad(e.target.value)}
                                className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                              />
                            </div>
                          </>
                        ) : nuevoEstadoDato === "no_aplica" ? (
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-medium mb-1">Justificación (requerida):</label>
                            <input
                              type="text"
                              placeholder="Motivo por el cual no aplica a este dispositivo"
                              value={nuevaJustificacion}
                              onChange={(e) => setNuevaJustificacion(e.target.value)}
                              className="w-full p-2 rounded border border-[var(--color-hairline)] bg-white text-xs"
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium">Estado Verificación:</label>
                          <select
                            value={nuevoEstadoVerif}
                            onChange={(e) => setNuevoEstadoVerif(e.target.value as EstadoVerificacionV3)}
                            className="p-1 rounded border border-[var(--color-hairline)] bg-white text-xs"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="con_fuente">Con fuente</option>
                            <option value="verificado">Verificado</option>
                            <option value="requiere_revision">Requiere revisión</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={agregarEspecificacion}
                          className="px-4 py-1.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                        >
                          Confirmar Especificación
                        </button>
                      </div>
                    </div>
                  )}

                  {especificacionesFiltradas.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--color-subtle)] border border-dashed border-[var(--color-hairline)] rounded-lg">
                      No hay especificaciones en esta categoría o filtro.
                    </div>
                  ) : (
                    <div className="border border-[var(--color-hairline)] rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs divide-y divide-[var(--color-hairline)]">
                        <thead className="bg-[var(--color-canvas)] text-[var(--color-subtle)] uppercase text-[10px] font-semibold">
                          <tr>
                            <th className="py-2 px-3">Clave / Nombre</th>
                            <th className="py-2 px-3">Grupo</th>
                            <th className="py-2 px-3">Estado Dato</th>
                            <th className="py-2 px-3">Valor</th>
                            <th className="py-2 px-3">Verificación</th>
                            <th className="py-2 px-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-hairline)] bg-[var(--color-paper)]">
                          {especificacionesFiltradas.map((spec) => (
                            <tr key={spec.id} className="hover:bg-[var(--color-canvas)] transition-colors">
                              <td className="py-2 px-3 font-mono text-[11px]">
                                <div className="font-semibold text-[var(--color-ink)] font-sans">{spec.nombre}</div>
                                <span className="text-[var(--color-subtle)] text-[10px]">{spec.clave}</span>
                              </td>
                              <td className="py-2 px-3 text-[var(--color-subtle)]">{spec.grupo}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    spec.estado_dato === "conocido"
                                      ? "bg-blue-50 text-blue-700"
                                      : spec.estado_dato === "no_aplica"
                                        ? "bg-gray-100 text-gray-700"
                                        : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {spec.estado_dato}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {spec.valor_original ? (
                                  <span>
                                    {spec.valor_original.texto}
                                    {spec.valor_original.unidad ? ` (${spec.valor_original.unidad})` : ""}
                                  </span>
                                ) : spec.justificacion_estado ? (
                                  <span className="italic text-[var(--color-subtle)]">{spec.justificacion_estado}</span>
                                ) : (
                                  <span className="text-[var(--color-subtle)]">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={spec.verificacion?.estado ?? "pendiente"}
                                  onChange={(e) =>
                                    cambiarEstadoVerificacionSpec(
                                      spec.id,
                                      e.target.value as EstadoVerificacionV3,
                                    )
                                  }
                                  className="text-[11px] p-1 rounded border border-[var(--color-hairline)] bg-[var(--color-paper)]"
                                >
                                  <option value="pendiente">⏳ Pendiente</option>
                                  <option value="con_fuente">📖 Con fuente</option>
                                  <option value="verificado">✓ Verificado</option>
                                  <option value="requiere_revision">⚠ Requiere revisión</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => eliminarEspecificacion(spec.id)}
                                  className="text-rose-600 hover:text-rose-800 text-[11px] font-medium p-1 cursor-pointer"
                                  aria-label={`Eliminar especificación ${spec.nombre}`}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña: Variantes */}
              {tab === "variantes" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] flex flex-wrap items-center gap-3 text-xs">
                    <input
                      type="text"
                      placeholder="Modelo de la variante (ej. A063)"
                      value={nuevoModeloVar}
                      onChange={(e) => setNuevoModeloVar(e.target.value)}
                      className="p-1.5 rounded border border-[var(--color-hairline)] bg-white text-xs flex-1 min-w-[150px]"
                    />
                    <input
                      type="text"
                      placeholder="SKU o MTM"
                      value={nuevoSkuVar}
                      onChange={(e) => setNuevoSkuVar(e.target.value)}
                      className="p-1.5 rounded border border-[var(--color-hairline)] bg-white text-xs flex-1 min-w-[120px]"
                    />
                    <button
                      type="button"
                      onClick={agregarVariante}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer text-xs"
                    >
                      + Agregar Variante
                    </button>
                  </div>

                  {ficha.variantes.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--color-subtle)]">
                      No hay variantes declaradas. Se recomienda registrar al menos la variante base del modelo.
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--color-hairline)] border border-[var(--color-hairline)] rounded-lg text-xs">
                      {ficha.variantes.map((v) => (
                        <li key={v.id} className="p-3 flex items-center justify-between hover:bg-[var(--color-canvas)]">
                          <div>
                            <span className="font-mono text-emerald-700 font-semibold">{v.id}</span>
                            <span className="ml-2 font-medium text-[var(--color-ink)]">
                              {v.modelo ?? "Sin modelo específico"}
                            </span>
                            {v.sku && <span className="ml-2 text-[var(--color-subtle)]">(SKU: {v.sku})</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarVariante(v.id)}
                            className="text-rose-600 hover:text-rose-800 font-medium text-[11px] cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Pestaña: Fuentes y Evidencias */}
              {tab === "fuentes_evidencias" && (
                <div className="space-y-6">
                  {/* Fuentes */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-subtle)]">
                      Fuentes Documentales ({ficha.fuentes.length})
                    </h4>
                    <div className="p-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] flex flex-wrap items-center gap-3 text-xs">
                      <input
                        type="text"
                        placeholder="Nombre de la fuente (ej. Fabricante Oficial)"
                        value={nuevoNombreFuente}
                        onChange={(e) => setNuevoNombreFuente(e.target.value)}
                        className="p-1.5 rounded border border-[var(--color-hairline)] bg-white text-xs flex-1 min-w-[150px]"
                      />
                      <select
                        value={nuevoTipoFuente}
                        onChange={(e) => setNuevoTipoFuente(e.target.value as FuenteFichaV3["tipo"])}
                        className="p-1.5 rounded border border-[var(--color-hairline)] bg-white text-xs"
                      >
                        <option value="fabricante">Fabricante</option>
                        <option value="organismo">Organismo</option>
                        <option value="comercio">Comercio</option>
                        <option value="analisis">Análisis</option>
                        <option value="benchmark">Benchmark</option>
                        <option value="otro">Otro</option>
                      </select>
                      <input
                        type="url"
                        placeholder="URL de la fuente oficial"
                        value={nuevaUrlFuente}
                        onChange={(e) => setNuevaUrlFuente(e.target.value)}
                        className="p-1.5 rounded border border-[var(--color-hairline)] bg-white text-xs flex-1 min-w-[150px]"
                      />
                      <button
                        type="button"
                        onClick={agregarFuente}
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer text-xs"
                      >
                        + Agregar Fuente
                      </button>
                    </div>

                    <ul className="divide-y divide-[var(--color-hairline)] border border-[var(--color-hairline)] rounded-lg text-xs">
                      {ficha.fuentes.map((f) => (
                        <li key={f.id} className="p-3 flex items-center justify-between hover:bg-[var(--color-canvas)]">
                          <div>
                            <span className="font-mono text-emerald-700 font-semibold">{f.id}</span>
                            <span className="ml-2 font-semibold text-[var(--color-ink)]">{f.nombre}</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] uppercase font-mono">
                              {f.tipo}
                            </span>
                            {f.url && (
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-blue-600 hover:underline truncate max-w-xs inline-block align-bottom"
                              >
                                {f.url}
                              </a>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarFuente(f.id)}
                            className="text-rose-600 hover:text-rose-800 font-medium text-[11px] cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Evidencias */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-subtle)]">
                      Evidencias Registradas ({ficha.evidencias.length})
                    </h4>
                    {ficha.evidencias.length === 0 ? (
                      <p className="text-xs text-[var(--color-subtle)] italic">
                        No hay evidencias vinculadas. Puedes asociar extractos de fuentes oficiales para respaldar especificaciones clave.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[var(--color-hairline)] border border-[var(--color-hairline)] rounded-lg text-xs">
                        {ficha.evidencias.map((ev) => (
                          <li key={ev.id} className="p-3 flex items-start justify-between hover:bg-[var(--color-canvas)]">
                            <div>
                              <span className="font-mono text-cyan-700 font-semibold">{ev.id}</span>
                              <span className="ml-2 text-[var(--color-subtle)]">Fuente: {ev.fuente_id}</span>
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px]">
                                {ev.postura}
                              </span>
                              <p className="mt-1 text-xs text-[var(--color-ink)]">
                                {ev.extracto ?? ev.localizador ?? "Evidencia sin extracto"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Pestaña: JSON Crudo & Validación */}
              {tab === "json" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--color-ink)]">
                      Editor Directo de Payload JSON
                    </span>
                    <button
                      type="button"
                      onClick={aplicarJsonCrudo}
                      className="px-3 py-1 rounded bg-slate-700 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                    >
                      Aplicar cambios del JSON
                    </button>
                  </div>

                  {!validacionContrato.valido && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1">
                      <span className="font-semibold block">Errores de validación del contrato V3:</span>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {validacionContrato.errores.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <textarea
                    rows={16}
                    value={fichaRawJson}
                    onChange={(e) => setFichaRawJson(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-lg border border-[var(--color-hairline)] bg-slate-900 text-slate-100"
                    placeholder="JSON de la ficha técnica..."
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie de modal */}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-[var(--color-hairline)] bg-[var(--color-canvas)]">
          <div className="text-xs text-[var(--color-subtle)]">
            {ficha
              ? "Los cambios en la ficha técnica se guardan independientemente de los datos del producto."
              : "Inicia una plantilla para comenzar a registrar especificaciones V3."}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className={`px-4 py-2 rounded-lg border border-[var(--color-hairline)] text-xs font-semibold hover:bg-[var(--color-paper)] transition-colors cursor-pointer ${CLASE_FOCO}`}
            >
              Cerrar
            </button>
            {ficha && (
              <button
                type="button"
                onClick={guardarFicha}
                disabled={guardando}
                className={`px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 ${CLASE_FOCO}`}
              >
                {guardando ? "Guardando ficha..." : "Guardar Ficha Técnica"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
