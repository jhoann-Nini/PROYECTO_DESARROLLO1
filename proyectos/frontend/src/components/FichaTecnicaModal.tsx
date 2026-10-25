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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo-dispositivo"
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl shadow-slate-950/25 text-slate-900">
        
        {/* Cabecera accesible superior */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold font-doto uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md">
              FICHA TÉCNICA
            </span>

            <span className="text-xs font-doto uppercase tracking-wider text-slate-700 text-slate-600 bg-white bg-white border border-slate-200 border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold shadow-2xs">
              <span aria-hidden="true">{ficha.categoriaIcono}</span>
              <span>{ficha.categoriaEtiqueta}</span>
            </span>

            {ranking !== null && (
              <span className="font-doto hidden sm:inline-block text-xs uppercase tracking-wider text-slate-600 text-slate-500 bg-slate-100 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 border-slate-200 font-bold">
                RANKING #{ranking}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
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
              <div className="relative aspect-[4/3] w-full rounded-2xl border border-slate-200 border-slate-200 bg-slate-50 bg-slate-50 p-6 flex items-center justify-center overflow-hidden">
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

                <span className="font-doto uppercase tracking-wider absolute top-3 left-3 rounded-md bg-white/95 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 text-slate-700 border border-slate-200 border-slate-200 shadow-2xs">
                  {ficha.marca}
                </span>

                <span className="font-sans font-extrabold tracking-tight absolute bottom-3 right-3 rounded-md bg-blue-700 dark:bg-blue-600 px-3 py-1 text-sm text-white shadow-xs">
                  {precioFormateado}
                </span>
              </div>

              {/* Evaluación Global y Técnica */}
              <div className="rounded-2xl border border-slate-200 border-slate-200 bg-slate-50/70 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 border-slate-200 mb-3">
                  <span className="text-xs font-bold font-doto text-slate-600 text-slate-500 uppercase tracking-wider">
                    PUNTUACIÓN TECREVIEW
                  </span>
                  {ficha.puntuacionGlobal !== null ? (
                    <span className="text-xl font-extrabold font-sans text-blue-700 dark:text-blue-400 tracking-tight">
                      {ficha.puntuacionGlobal.toFixed(1)} / 10
                    </span>
                  ) : (
                    <span className="text-xs font-bold font-doto text-slate-500 uppercase tracking-wider">
                      Pendiente de valoraciones
                    </span>
                  )}
                </div>

                {/* Benchmark real (solo si está disponible) */}
                {ficha.benchmark && (
                  <div className="mb-4 rounded-xl border border-slate-200 border-slate-200 bg-white bg-white p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-600 text-slate-500 font-semibold uppercase tracking-wider font-doto text-[11px]">
                      {ficha.benchmark.etiqueta}:
                    </span>
                    <span className="text-slate-900 text-slate-900 font-bold font-sans tracking-tight">
                      {ficha.benchmark.valor}
                    </span>
                  </div>
                )}

                {/* Métricas por categoría (solo si existen) */}
                {ficha.metricas && ficha.metricas.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {ficha.metricas.map((metrica, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-slate-700 text-slate-600 mb-1 font-medium">
                          <span>{metrica.nombre}</span>
                          <span className="font-bold text-slate-900 text-slate-900 font-sans">
                            {metrica.puntos.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-700 bg-blue-600 rounded-full transition-all duration-300"
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
                      <p className="text-xs text-slate-500 font-mono">
                        Sin evaluación técnica de laboratorio registrada aún.
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        (Pruebas de hardware y benchmarks no cargados)
                      </p>
                    </div>
                  )
                )}

                {/* Estadísticas de valoración comunitaria (promedio estrellas) */}
                {valoracionStats && valoracionStats.cantidadValoraciones > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 border-amber-200 bg-amber-50/60 bg-amber-50 p-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold font-doto uppercase tracking-wider text-[11px] text-amber-700 text-amber-700">
                      <span aria-hidden="true">⭐</span> Valoración de la comunidad:
                    </span>
                    <span className="font-bold font-sans text-xs">
                      <span className="text-amber-600 text-amber-600">
                        {valoracionStats.promedioPuntuacion?.toFixed(1)} / 5
                      </span>
                      <span className="text-slate-400 text-slate-500 ml-1">
                        ({valoracionStats.cantidadValoraciones} {valoracionStats.cantidadValoraciones === 1 ? "voto" : "votos"})
                      </span>
                    </span>
                  </div>
                )}

                {/* Acceso directo a las opiniones comunitarias del producto */}
                <button
                  type="button"
                  onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                  className="mt-2 w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-200 border-blue-200 bg-white/80 bg-white hover:bg-blue-50 hover:bg-blue-50 transition-colors text-xs text-slate-700 text-slate-600 font-medium cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-bold font-doto uppercase tracking-wider text-[11px] text-blue-700 dark:text-blue-400">
                    <span aria-hidden="true">💬</span> Opiniones de la comunidad:
                  </span>
                  <span className="font-bold font-sans text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md">
                    {cargandoResenas ? "..." : `${resenasProducto.length} ${resenasProducto.length === 1 ? "reseña" : "reseñas"}`}
                  </span>
                </button>
              </div>

              {/* SECCIÓN DE VALORACIÓN POR ESTRELLAS (1 a 5) */}
              <div className="rounded-2xl border border-slate-200 border-slate-200 bg-slate-50/70 bg-slate-50/70 p-5 mt-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 border-slate-200 mb-3">
                  <span className="text-xs font-bold font-doto text-slate-700 text-slate-600 uppercase tracking-wider">
                    TU CALIFICACIÓN (1 A 5 ESTRELLAS)
                  </span>
                  {puntuacionActual !== null && (
                    <span className="text-xs font-bold font-sans text-amber-500">
                      ★ {puntuacionActual} / 5
                    </span>
                  )}
                </div>

                {!usuarioSesion ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-600 text-slate-500 mb-3">
                      Inicia sesión para calificar este dispositivo con estrellas.
                    </p>
                    {onPedirLogin && (
                      <button
                        type="button"
                        onClick={onPedirLogin}
                        className="font-doto uppercase tracking-wider rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
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
                              activa ? "text-amber-400" : "text-slate-300 dark:text-slate-700"
                            }`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-center">
                      <span className="text-xs text-slate-600 text-slate-500 font-medium">
                        {puntuacionSeleccionada > 0
                          ? `Puntuación seleccionada: ${puntuacionSeleccionada} de 5 estrellas`
                          : "Selecciona de 1 a 5 estrellas"}
                      </span>
                    </div>

                    {errorValoracion && (
                      <p className="text-xs text-red-600 dark:text-red-400 text-center font-medium" role="alert">
                        ⚠️ {errorValoracion}
                      </p>
                    )}

                    {mensajeExito && (
                      <p className="text-xs text-green-600 dark:text-green-400 text-center font-medium" role="status">
                        {mensajeExito}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={enviandoValoracion || puntuacionSeleccionada === 0}
                      className="w-full font-doto uppercase tracking-wider rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
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
                <span className="text-xs text-blue-700 dark:text-blue-400 font-bold font-doto uppercase tracking-wider">
                  {ficha.marca} {"//"} ESPECIFICACIONES TÉCNICAS
                </span>
                <h2
                  id="modal-titulo-dispositivo"
                  className="text-2xl sm:text-3xl font-black font-doto text-slate-900 text-slate-900 mt-1 leading-tight uppercase tracking-wide"
                >
                  {ficha.nombre}
                </h2>
                <p className="mt-2 text-sm text-slate-600 text-slate-500 leading-relaxed border-l-3 border-blue-700 dark:border-blue-500 pl-3">
                  {ficha.resumen}
                </p>
              </div>

              {/* Barra de pestañas que incluye especificaciones de hardware y opiniones de la comunidad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-doto font-bold uppercase tracking-wider text-slate-500 text-slate-500 px-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" aria-hidden="true" />
                    <span>Especificaciones & Comunidad ({ficha.categoriaEtiqueta}):</span>
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-normal lowercase">
                    (selecciona para ver)
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Categorías de especificaciones del dispositivo"
                  className="flex flex-wrap gap-2 p-1.5 bg-slate-100/90 bg-slate-50/70 rounded-xl border border-slate-200 border-slate-200"
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
                        className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold font-doto uppercase tracking-wider transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                          activa
                            ? "bg-white bg-white text-blue-700 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500 shadow-sm"
                            : "bg-white/60 bg-white/50 border border-slate-300/80 border-slate-200/80 text-slate-600 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-white dark:hover:bg-slate-800/80 shadow-2xs"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                            activa
                              ? "bg-blue-600 dark:bg-blue-400 scale-125 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                              : "bg-slate-400 dark:bg-slate-600 group-hover:bg-blue-500 group-hover:scale-110"
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
                  <div className="rounded-xl border border-slate-200 border-slate-200 bg-white bg-white p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-900 text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span aria-hidden="true">💬</span>
                        <span>Opiniones de la comunidad ({resenasProducto.length})</span>
                      </h4>
                      {idProducto && (
                        <span className="text-[10px] font-mono text-slate-500">
                          Ref #{idProducto}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 text-slate-500 leading-relaxed">
                      Reseñas y comentarios compartidos por los usuarios para{" "}
                      <span className="font-semibold text-slate-800 text-slate-700">
                        {ficha.nombre}
                      </span>.
                    </p>
                  </div>

                  {/* Listado de reseñas */}
                  {cargandoResenas && resenasProducto.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 font-mono">
                      Cargando opiniones de la comunidad...
                    </div>
                  ) : errorCargaResenas ? (
                    <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900">
                      {errorCargaResenas}
                    </div>
                  ) : resenasProducto.length > 0 ? (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {resenasProducto.map((r) => (
                        <div
                          key={r.idResena}
                          className="rounded-xl border border-slate-200 border-slate-200 bg-slate-50 bg-slate-50/60 p-3.5 text-xs transition-colors"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-slate-500 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700 dark:text-blue-400">
                                @{r.nombreUsuario || "Usuario de TecReview"}
                              </span>
                              <span
                                className="text-[10px] font-mono bg-slate-100 bg-slate-100 text-slate-500 text-slate-500 px-1.5 py-0.5 rounded"
                                title={`Reseña del producto #${r.idProducto}`}
                              >
                                #{r.idProducto}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono">
                              {r.fechaCreacion
                                ? new Date(r.fechaCreacion).toLocaleDateString("es-CO")
                                : ""}
                            </span>
                          </div>
                          <p className="text-slate-800 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {r.comentario}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 border-slate-200 p-6 text-center text-xs text-slate-500 font-mono">
                      Aún no hay opiniones de la comunidad para este dispositivo. ¡Sé el primero en compartir tu experiencia!
                    </div>
                  )}

                  {/* Formulario para publicar una opinión para este producto */}
                  <div className="rounded-xl border border-slate-200 border-slate-200 bg-slate-50/80 bg-slate-50/80 p-4">
                    <span className="text-xs font-bold font-doto uppercase tracking-wider text-slate-700 text-slate-600 block mb-2">
                      Publicar una opinión sobre este dispositivo
                    </span>
                    {!usuarioSesion ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <p className="text-slate-600 text-slate-500">
                          Debes iniciar sesión para publicar una opinión en la comunidad.
                        </p>
                        {onPedirLogin && (
                          <button
                            type="button"
                            onClick={onPedirLogin}
                            className="font-doto uppercase tracking-wider rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
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
                          className="w-full rounded-xl border border-slate-300 border-slate-200 bg-white bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors resize-none"
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
                            className="font-doto uppercase tracking-wider rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
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
                  <div className="rounded-xl border border-slate-200 border-slate-200 bg-white bg-white p-4">
                    <h4 className="text-xs font-bold text-slate-900 text-slate-900 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                      <span aria-hidden="true">{seccionActiva.icono}</span>
                      <span>{seccionActiva.titulo}</span>
                    </h4>
                    <p className="text-sm text-slate-600 text-slate-500 leading-relaxed">
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
                            className="rounded-xl border border-slate-200 border-slate-200 bg-slate-50 bg-slate-50 p-3.5 flex items-start gap-2.5"
                          >
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-0.5">•</span>
                            <span className="text-xs text-slate-700 text-slate-600 font-medium leading-relaxed">
                              {parte}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {seccionActiva.detalleExtra && (
                    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 bg-blue-50 p-3.5 text-xs text-blue-900 dark:text-blue-300">
                      <span className="font-bold">Detalle adicional: </span>
                      <span>{seccionActiva.detalleExtra}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Estado vacío cuando el producto no tiene especificaciones registradas */
                <div className="rounded-2xl border border-dashed border-slate-300 border-slate-200 p-8 text-center bg-slate-50/50 bg-slate-50/40 my-auto">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 bg-slate-100 flex items-center justify-center text-2xl mb-3">
                    📋
                  </div>
                  <h3 className="text-sm font-bold font-doto uppercase tracking-wider text-slate-800 text-slate-700">
                    Sin especificaciones técnicas registradas
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 text-slate-500 max-w-md mx-auto leading-relaxed">
                    Este producto no dispone de características técnicas detalladas registradas en el catálogo. Podrán ser asignadas a través del módulo de administración en una próxima actualización.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                    className="mt-4 inline-flex items-center gap-2 font-doto uppercase tracking-wider rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    <span>💬</span>
                    <span>Ver opiniones de la comunidad ({resenasProducto.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="flex justify-end px-5 sm:px-7 py-3.5 border-t border-slate-200 border-slate-200 bg-slate-50 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 border-slate-200 bg-white bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-700 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cerrar ficha técnica
          </button>
        </div>
      </div>
    </div>
  );
}
