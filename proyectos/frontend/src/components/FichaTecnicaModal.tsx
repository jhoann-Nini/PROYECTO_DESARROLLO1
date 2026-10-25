/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil, Producto, UsuarioSesion } from "@/types/producto";
import { useState, useEffect, useMemo } from "react";
import { normalizarFichaProducto, formatearCOP } from "@/data/specsHelper";
import {
  crearValoracion,
  obtenerMiValoracion,
  obtenerResenas,
  crearResena,
  obtenerValoracionStats,
  type ResenaResponse,
  type ValoracionPublicaStats,
} from "@/services/api";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";

interface FichaTecnicaModalProps {
  producto: DispositivoKimovil | Producto | null;
  onClose: () => void;
  usuarioSesion?: UsuarioSesion | null;
  onPedirLogin?: () => void;
  onValoracionGuardada?: () => void;
  onResenaGuardada?: (resena: ResenaResponse) => void;
}

const PALABRAS_MALICIOSAS = [
  "spam",
  "insulto",
  "estafa",
  "odio",
  "tonto",
  "idiota",
  "fraude",
  "mierda",
  "puta",
];

export default function FichaTecnicaModal({
  producto,
  onClose,
  usuarioSesion,
  onPedirLogin,
  onValoracionGuardada,
  onResenaGuardada,
}: FichaTecnicaModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (producto) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [producto, onClose]);

  const [puntuacionSeleccionada, setPuntuacionSeleccionada] = useState<number>(0);
  const [puntuacionActual, setPuntuacionActual] = useState<number | null>(null);
  const [hoverEstrella, setHoverEstrella] = useState<number>(0);
  const [enviandoValoracion, setEnviandoValoracion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [errorValoracion, setErrorValoracion] = useState("");
  const [errorImagenUrl, setErrorImagenUrl] = useState<string | null>(null);

  // Estados para las opiniones/reseñas comunitarias escritas de este producto
  const [resenasProducto, setResenasProducto] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState<boolean>(false);
  const [errorCargaResenas, setErrorCargaResenas] = useState<string>("");
  const [nuevaResenaTexto, setNuevaResenaTexto] = useState<string>("");
  const [enviandoResena, setEnviandoResena] = useState<boolean>(false);
  const [errorResena, setErrorResena] = useState<string>("");
  const [exitoResena, setExitoResena] = useState<string>("");

  // Estadísticas públicas de valoración comunitaria (promedio de estrellas)
  const [valoracionStats, setValoracionStats] = useState<ValoracionPublicaStats | null>(null);

  // Pestaña de navegación seleccionada explícitamente
  const [pestanaSeleccionada, setPestanaSeleccionada] = useState<string | null>(null);

  const idProducto = useMemo(() => {
    if (!producto) return null;
    if ("idProducto" in producto && typeof producto.idProducto === "number") {
      return producto.idProducto;
    }
    if ("id" in producto && typeof (producto as DispositivoKimovil).id === "number") {
      return (producto as DispositivoKimovil).id;
    }
    return null;
  }, [producto]);

  // Resetear estados locales durante el render cuando cambia el producto (patrón recomendado por React)
  const [prevIdProducto, setPrevIdProducto] = useState(idProducto);
  if (idProducto !== prevIdProducto) {
    setPrevIdProducto(idProducto);
    setPuntuacionSeleccionada(0);
    setPuntuacionActual(null);
    setHoverEstrella(0);
    setMensajeExito("");
    setErrorValoracion("");
    setErrorImagenUrl(null);
    setResenasProducto([]);
    setCargandoResenas(Boolean(idProducto));
    setErrorCargaResenas("");
    setNuevaResenaTexto("");
    setErrorResena("");
    setExitoResena("");
    setValoracionStats(null);
    setPestanaSeleccionada(null);
  }

  // Cargar valoración de estrellas previa del usuario
  useEffect(() => {
    let montado = true;
    if (usuarioSesion && idProducto) {
      obtenerMiValoracion(idProducto)
        .then((val) => {
          if (montado && val) {
            setPuntuacionActual(val.puntuacion);
            setPuntuacionSeleccionada(val.puntuacion);
          }
        })
        .catch(() => {});
    }
    return () => {
      montado = false;
    };
  }, [usuarioSesion, idProducto]);

  // Cargar estadísticas públicas de valoración comunitaria
  useEffect(() => {
    let montado = true;
    if (idProducto) {
      obtenerValoracionStats(idProducto)
        .then((stats) => {
          if (montado) setValoracionStats(stats);
        })
        .catch(() => {
          // Si falla, simplemente no se muestran estadísticas
        });
    }
    return () => {
      montado = false;
    };
  }, [idProducto]);

  // Cargar reseñas comunitarias escritas del producto
  useEffect(() => {
    let montado = true;
    if (idProducto) {
      obtenerResenas(idProducto)
        .then((datos) => {
          if (montado) {
            setResenasProducto(datos);
          }
        })
        .catch((err) => {
          if (montado) {
            setErrorCargaResenas(
              err instanceof Error ? err.message : "Error al cargar las opiniones."
            );
          }
        })
        .finally(() => {
          if (montado) {
            setCargandoResenas(false);
          }
        });
    }
    return () => {
      montado = false;
    };
  }, [idProducto]);

  const manejarGuardarValoracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSesion) {
      setErrorValoracion("Debes iniciar sesión para valorar este dispositivo.");
      return;
    }
    if (!idProducto) {
      setErrorValoracion("No se pudo identificar el código del dispositivo a valorar.");
      return;
    }
    if (puntuacionSeleccionada < 1 || puntuacionSeleccionada > 5) {
      setErrorValoracion("Por favor selecciona una puntuación entre 1 y 5 estrellas.");
      return;
    }

    setEnviandoValoracion(true);
    setErrorValoracion("");
    setMensajeExito("");

    try {
      const res = await crearValoracion({
        idProducto,
        puntuacion: puntuacionSeleccionada,
      });
      setPuntuacionActual(res.puntuacion);
      setMensajeExito(
        `¡Tu valoración de ${res.puntuacion} ${res.puntuacion === 1 ? "estrella" : "estrellas"} ha sido guardada!`
      );
      onValoracionGuardada?.();
    } catch (err) {
      setErrorValoracion(
        err instanceof Error
          ? err.message
          : "No fue posible registrar tu valoración. Inténtalo más tarde."
      );
    } finally {
      setEnviandoValoracion(false);
    }
  };

  const manejarGuardarResena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSesion) {
      setErrorResena("Debes iniciar sesión para publicar una opinión.");
      return;
    }
    if (!idProducto) {
      setErrorResena("No se pudo identificar el código del dispositivo a reseñar.");
      return;
    }
    if (!nuevaResenaTexto.trim()) {
      setErrorResena("Por favor escribe tu opinión antes de publicar.");
      return;
    }

    const esMalicioso = PALABRAS_MALICIOSAS.some((palabra) =>
      nuevaResenaTexto.toLowerCase().includes(palabra)
    );
    if (esMalicioso) {
      setErrorResena(
        "El comentario contiene palabras no permitidas. Por favor mantén un lenguaje respetuoso."
      );
      setNuevaResenaTexto("");
      return;
    }

    setEnviandoResena(true);
    setErrorResena("");
    setExitoResena("");

    try {
      const res = await crearResena({
        idProducto,
        comentario: nuevaResenaTexto.trim(),
      });
      setNuevaResenaTexto("");
      setExitoResena("¡Tu opinión ha sido publicada con éxito!");
      setResenasProducto((prev) => [res, ...prev.filter((r) => r.idResena !== res.idResena)]);
      onResenaGuardada?.(res);
    } catch (err) {
      setErrorResena(
        err instanceof Error
          ? err.message
          : "No fue posible publicar tu opinión. Inténtalo más tarde."
      );
    } finally {
      setEnviandoResena(false);
    }
  };

  const ficha = useMemo(() => {
    if (!producto) return null;
    return normalizarFichaProducto(producto);
  }, [producto]);

  const pestanasSpecs = useMemo(() => {
    if (!ficha || !ficha.secciones || ficha.secciones.length === 0) return [];
    return ficha.secciones.map((sec, idx) => ({
      id: `sec-${idx}`,
      etiqueta: sec.titulo,
      icono: sec.icono,
      seccion: sec,
      esOpiniones: false,
    }));
  }, [ficha]);

  const pestanas = useMemo(() => {
    const lista: Array<{
      id: string;
      etiqueta: string;
      icono: string;
      seccion?: NonNullable<ReturnType<typeof normalizarFichaProducto>>["secciones"][number];
      esOpiniones?: boolean;
    }> = [...pestanasSpecs];

    lista.push({
      id: "tab-opiniones-comunidad",
      etiqueta: `Opiniones (${resenasProducto.length})`,
      icono: "💬",
      esOpiniones: true,
    });

    return lista;
  }, [pestanasSpecs, resenasProducto.length]);

  const pestanaActiva = useMemo(() => {
    if (pestanaSeleccionada && pestanas.some((p) => p.id === pestanaSeleccionada)) {
      return pestanaSeleccionada;
    }
    if (pestanasSpecs.length > 0) {
      return pestanasSpecs[0].id;
    }
    return pestanaSeleccionada === "tab-opiniones-comunidad"
      ? "tab-opiniones-comunidad"
      : "";
  }, [pestanaSeleccionada, pestanas, pestanasSpecs]);

  if (!producto || !ficha) return null;

  const esKimovil = "ranking" in producto;
  const ranking = esKimovil ? (producto as DispositivoKimovil).ranking : null;
  const precioFormateado = formatearCOP(ficha.precio);

  const seccionActiva =
    pestanaActiva !== "tab-opiniones-comunidad"
      ? pestanasSpecs.find((p) => p.id === pestanaActiva)?.seccion || ficha.secciones[0]
      : undefined;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo-dispositivo"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-card border border-line bg-surface-1 text-slate-100 shadow-soft lg:max-w-5xl">
        
        {/* Cabecera accesible superior */}
        <div className="flex shrink-0 items-center justify-between border-b border-line/70 bg-surface-0/60 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-300">
              FICHA TÉCNICA
            </span>

            <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <span aria-hidden="true">{ficha.categoriaIcono}</span>
              <span>{ficha.categoriaEtiqueta}</span>
            </span>

            {ranking !== null && (
              <span className="hidden rounded-full border border-line bg-surface-2/60 px-2.5 py-1 text-[11px] font-medium text-slate-400 sm:inline-block">
                RANKING #{ranking}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer whitespace-nowrap rounded-control border border-line bg-surface-2/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            aria-label="Cerrar ventana de especificaciones técnicas (Escape)"
          >
            ✕ CERRAR
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Columna Izquierda: Imagen y Resumen de Puntuación */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-card border border-line bg-surface-0 p-6">
                {ficha.imagen && ficha.imagen.trim().length > 0 && errorImagenUrl !== ficha.imagen ? (
                  <img
                    src={ficha.imagen}
                    alt={`Vista frontal de ${ficha.nombre}`}
                    onError={() => setErrorImagenUrl(ficha.imagen)}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <ProductImagePlaceholder
                    categoria={ficha.categoriaEtiqueta || ficha.categoriaTipo}
                    marca={ficha.marca}
                    nombre={ficha.nombre}
                    tamano="lg"
                  />
                )}

                <span className="absolute left-3 top-3 rounded-full border border-line bg-surface-1/90 px-2.5 py-1 text-[11px] font-medium text-slate-200 backdrop-blur">
                  {ficha.marca}
                </span>

                <span className="absolute bottom-3 right-3 rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold tracking-tight text-white shadow-soft">
                  {precioFormateado}
                </span>
              </div>

              {/* Evaluación Global y Técnica */}
              <div className="rounded-card border border-line bg-surface-0/50 p-5">
                <div className="mb-3 flex items-center justify-between border-b border-line/70 pb-3">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Puntuación TecReview
                  </span>
                  {ficha.puntuacionGlobal !== null ? (
                    <span className="text-xl font-semibold tracking-tight text-blue-300">
                      {ficha.puntuacionGlobal.toFixed(1)} / 10
                    </span>
                  ) : (
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Pendiente de valoraciones
                    </span>
                  )}
                </div>

                {/* Benchmark real (solo si está disponible) */}
                {ficha.benchmark && (
                  <div className="mb-4 flex items-center justify-between rounded-control border border-line bg-surface-2/40 p-3 text-xs">
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {ficha.benchmark.etiqueta}:
                    </span>
                    <span className="font-semibold tracking-tight text-white">
                      {ficha.benchmark.valor}
                    </span>
                  </div>
                )}

                {/* Métricas por categoría (solo si existen) */}
                {ficha.metricas && ficha.metricas.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {ficha.metricas.map((metrica, idx) => (
                      <div key={idx}>
                        <div className="mb-1 flex justify-between font-medium text-slate-400">
                          <span>{metrica.nombre}</span>
                          <span className="font-semibold text-white">
                            {metrica.puntos.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-0">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${Math.min(metrica.puntos * 10, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !ficha.benchmark &&
                  ficha.puntuacionGlobal === null && (
                    <div className="py-2 text-center">
                      <p className="text-xs text-slate-500">
                        Sin evaluación técnica de laboratorio registrada aún.
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        (Pruebas de hardware y benchmarks no cargados)
                      </p>
                    </div>
                  )
                )}

                {/* Estadísticas de valoración comunitaria (promedio estrellas) */}
                {valoracionStats && valoracionStats.cantidadValoraciones > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-control border border-amber-500/25 bg-amber-500/10 p-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                      <span aria-hidden="true">⭐</span> Valoración de la comunidad:
                    </span>
                    <span className="text-xs font-semibold">
                      <span className="text-amber-300">
                        {valoracionStats.promedioPuntuacion?.toFixed(1)} / 5
                      </span>
                      <span className="ml-1 text-slate-500">
                        ({valoracionStats.cantidadValoraciones} {valoracionStats.cantidadValoraciones === 1 ? "voto" : "votos"})
                      </span>
                    </span>
                  </div>
                )}

                {/* Acceso directo a las opiniones comunitarias del producto */}
                <button
                  type="button"
                  onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                  className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-control border border-blue-500/25 bg-surface-2/40 p-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-blue-500/10"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-300">
                    <span aria-hidden="true">💬</span> Opiniones de la comunidad:
                  </span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-300">
                    {cargandoResenas ? "..." : `${resenasProducto.length} ${resenasProducto.length === 1 ? "reseña" : "reseñas"}`}
                  </span>
                </button>
              </div>

              {/* SECCIÓN DE VALORACIÓN POR ESTRELLAS (1 a 5) */}
              <div className="mt-4 rounded-card border border-line bg-surface-0/50 p-5">
                <div className="mb-3 flex items-center justify-between border-b border-line/70 pb-3">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    TU CALIFICACIÓN (1 A 5 ESTRELLAS)
                  </span>
                  {puntuacionActual !== null && (
                    <span className="text-xs font-semibold text-amber-400">
                      ★ {puntuacionActual} / 5
                    </span>
                  )}
                </div>

                {!usuarioSesion ? (
                  <div className="text-center py-2">
                    <p className="mb-3 text-xs text-slate-400">
                      Inicia sesión para calificar este dispositivo con estrellas.
                    </p>
                    {onPedirLogin && (
                      <button
                        type="button"
                        onClick={onPedirLogin}
                        className="cursor-pointer rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                      >
                        Identificarse para valorar
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={manejarGuardarValoracion} className="flex flex-col gap-3">
                    <div
                      className="flex items-center justify-center gap-1.5"
                      role="group"
                      aria-label="Calificación de 1 a 5 estrellas"
                    >
                      {[1, 2, 3, 4, 5].map((estrella) => {
                        const activa = (hoverEstrella || puntuacionSeleccionada) >= estrella;
                        return (
                          <button
                            key={estrella}
                            type="button"
                            disabled={enviandoValoracion}
                            onClick={() => {
                              setPuntuacionSeleccionada(estrella);
                              setErrorValoracion("");
                              setMensajeExito("");
                            }}
                            onMouseEnter={() => setHoverEstrella(estrella)}
                            onMouseLeave={() => setHoverEstrella(0)}
                            aria-label={`Calificar con ${estrella} ${estrella === 1 ? "estrella" : "estrellas"}`}
                            className={`p-1 text-2xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded cursor-pointer disabled:opacity-50 ${
                              activa ? "text-amber-400" : "text-slate-700"
                            }`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-center">
                      <span className="text-xs font-medium text-slate-400">
                        {puntuacionSeleccionada > 0
                          ? `Puntuación seleccionada: ${puntuacionSeleccionada} de 5 estrellas`
                          : "Selecciona de 1 a 5 estrellas"}
                      </span>
                    </div>

                    {errorValoracion && (
                      <p className="text-center text-xs font-medium text-red-300" role="alert">
                        ⚠️ {errorValoracion}
                      </p>
                    )}

                    {mensajeExito && (
                      <p className="text-center text-xs font-medium text-emerald-300" role="status">
                        {mensajeExito}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={enviandoValoracion || puntuacionSeleccionada === 0}
                      className="w-full cursor-pointer rounded-control bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {enviandoValoracion
                        ? "Guardando..."
                        : puntuacionActual !== null
                          ? "Actualizar valoración"
                          : "Guardar valoración"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Columna Derecha: Selector de Pestañas y Contenido Dinámico */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                  {ficha.marca} / Especificaciones técnicas
                </span>
                <h2
                  id="modal-titulo-dispositivo"
                  className="mt-1 font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl"
                >
                  {ficha.nombre}
                </h2>
                <p className="mt-2 border-l-2 border-blue-500/60 pl-3 text-sm leading-relaxed text-slate-400">
                  {ficha.resumen}
                </p>
              </div>

              {/* Barra de pestañas que incluye especificaciones de hardware y opiniones de la comunidad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" aria-hidden="true" />
                    <span>Especificaciones & Comunidad ({ficha.categoriaEtiqueta}):</span>
                  </span>
                  <span className="text-[10px] font-medium lowercase tracking-normal text-blue-300">
                    (selecciona para ver)
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Categorías de especificaciones del dispositivo"
                  className="flex flex-wrap gap-2 rounded-control border border-line bg-surface-0/60 p-1.5"
                >
                  {pestanas.map((p) => {
                    const activa = pestanaActiva === p.id;
                    return (
                      <button
                        key={p.id}
                        role="tab"
                        aria-selected={activa}
                        aria-controls={`panel-${p.id}`}
                        id={`tab-${p.id}`}
                        onClick={() => setPestanaSeleccionada(p.id)}
                        className={`group relative flex cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                          activa
                            ? "border-blue-500/50 bg-surface-2 text-blue-300"
                            : "border-line bg-surface-1/60 text-slate-400 hover:border-blue-500/40 hover:bg-surface-2/60 hover:text-white"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                            activa
                              ? "bg-blue-500 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                              : "bg-slate-600 group-hover:bg-blue-400 group-hover:scale-110"
                          }`}
                          aria-hidden="true"
                        />
                        <span aria-hidden="true">{p.icono}</span>
                        <span>{p.etiqueta}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panel de contenido dinámico según la pestaña activa */}
              {pestanaActiva === "tab-opiniones-comunidad" ? (
                /* PANEL DE OPINIONES DE LA COMUNIDAD PARA ESTE PRODUCTO */
                <div
                  id="panel-tab-opiniones-comunidad"
                  role="tabpanel"
                  aria-labelledby="tab-tab-opiniones-comunidad"
                  className="space-y-4 mt-1"
                >
                  <div className="rounded-control border border-line bg-surface-2/40 p-4">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="flex items-center gap-2 text-xs font-semibold text-white">
                        <span aria-hidden="true">💬</span>
                        <span>Opiniones de la comunidad ({resenasProducto.length})</span>
                      </h4>
                      {idProducto && (
                        <span className="text-[10px] text-slate-500">
                          Ref #{idProducto}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">
                      Reseñas y comentarios compartidos por los usuarios para{" "}
                      <span className="font-medium text-slate-200">
                        {ficha.nombre}
                      </span>.
                    </p>
                  </div>

                  {/* Listado de reseñas */}
                  {cargandoResenas && resenasProducto.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Cargando opiniones de la comunidad...
                    </div>
                  ) : errorCargaResenas ? (
                    <div className="rounded-control border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      {errorCargaResenas}
                    </div>
                  ) : resenasProducto.length > 0 ? (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {resenasProducto.map((r) => (
                        <div
                          key={r.idResena}
                          className="rounded-control border border-line/80 bg-surface-2/30 p-3.5 text-xs transition-colors"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-300">
                                @{r.nombreUsuario || "Usuario de TecReview"}
                              </span>
                              <span
                                className="rounded-full border border-line bg-surface-1 px-1.5 py-0.5 text-[10px] text-slate-500"
                                title={`Reseña del producto #${r.idProducto}`}
                              >
                                #{r.idProducto}
                              </span>
                            </div>
                            <span className="text-[10px]">
                              {r.fechaCreacion
                                ? new Date(r.fechaCreacion).toLocaleDateString("es-CO")
                                : ""}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200 sm:text-sm">
                            {r.comentario}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-control border border-dashed border-line bg-surface-2/30 p-6 text-center text-xs text-slate-500">
                      Aún no hay opiniones de la comunidad para este dispositivo. ¡Sé el primero en compartir tu experiencia!
                    </div>
                  )}

                  {/* Formulario para publicar una opinión para este producto */}
                  <div className="rounded-control border border-line bg-surface-2/30 p-4">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      Publicar una opinión sobre este dispositivo
                    </span>
                    {!usuarioSesion ? (
                      <div className="flex flex-col items-center justify-between gap-3 text-xs sm:flex-row">
                        <p className="text-slate-400">
                          Debes iniciar sesión para publicar una opinión en la comunidad.
                        </p>
                        {onPedirLogin && (
                          <button
                            type="button"
                            onClick={onPedirLogin}
                            className="shrink-0 cursor-pointer rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                          >
                            Identificarse
                          </button>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={manejarGuardarResena} className="flex flex-col gap-2.5">
                        <textarea
                          rows={2}
                          value={nuevaResenaTexto}
                          onChange={(e) => setNuevaResenaTexto(e.target.value)}
                          placeholder={`Comparte tu experiencia con ${ficha.nombre}...`}
                          className="w-full resize-none rounded-control border border-line bg-surface-0/80 px-3 py-2 text-xs text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 sm:text-sm"
                        />
                        {errorResena && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                            ⚠️ {errorResena}
                          </p>
                        )}
                        {exitoResena && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium" role="status">
                            ✓ {exitoResena}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            onClick={manejarGuardarResena}
                            disabled={enviandoResena}
                            className="rounded-control bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                          >
                            {enviandoResena ? "Publicando..." : "Publicar opinión"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : pestanasSpecs.length > 0 && seccionActiva ? (
                /* PANELES DE ESPECIFICACIONES TÉCNICAS */
                <div
                  id={`panel-${pestanaActiva}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${pestanaActiva}`}
                  className="space-y-3.5 mt-1"
                >
                  <div className="rounded-control border border-line bg-surface-2/40 p-4">
                    <h4 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-white">
                      <span aria-hidden="true">{seccionActiva.icono}</span>
                      <span>{seccionActiva.titulo}</span>
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {seccionActiva.descripcion}
                    </p>
                  </div>

                  {/* Desglose en tarjetas si la especificación incluye múltiples puntos delimitados por · */}
                  {seccionActiva.descripcion.includes(" · ") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {seccionActiva.descripcion
                        .split(" · ")
                        .map((parte) => parte.trim())
                        .filter(Boolean)
                        .map((parte, pIdx) => (
                          <div
                            key={pIdx}
                            className="flex items-start gap-2.5 rounded-control border border-line bg-surface-2/30 p-3.5"
                          >
                            <span className="mt-0.5 text-sm font-semibold text-blue-400">•</span>
                            <span className="text-xs font-medium leading-relaxed text-slate-300">
                              {parte}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {seccionActiva.detalleExtra && (
                    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 text-xs text-blue-900 dark:text-blue-300">
                      <span className="font-bold">Detalle adicional: </span>
                      <span>{seccionActiva.detalleExtra}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Estado vacío cuando el producto no tiene especificaciones registradas */
                <div className="my-auto rounded-card border border-dashed border-line bg-surface-1/50 p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-slate-400">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-slate-200">
                    Sin especificaciones técnicas registradas
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                    Este producto no dispone de características técnicas detalladas registradas en el catálogo. Podrán ser asignadas a través del módulo de administración en una próxima actualización.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                    className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-control bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                  >
                    <span aria-hidden="true">💬</span>
                    <span>Ver opiniones de la comunidad ({resenasProducto.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="flex shrink-0 justify-end border-t border-line/70 bg-surface-0/60 px-5 py-3.5 sm:px-7">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-control border border-line bg-surface-2/60 px-5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white"
          >
            Cerrar ficha técnica
          </button>
        </div>
      </div>
    </div>
  );
}
