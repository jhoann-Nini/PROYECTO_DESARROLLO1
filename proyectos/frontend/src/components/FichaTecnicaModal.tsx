/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil, Producto, UsuarioSesion } from "@/types/producto";
import type { ProductoViewModel } from "@/data/productoViewModel";
import { idApiDeViewModel } from "@/data/productoViewModel";
import { useState, useEffect, useMemo } from "react";
import { normalizarFichaProducto, formatearCOP, INFO_CATEGORIAS } from "@/data/specsHelper";
import type { FichaNormalizada } from "@/data/specsHelper";
import { normalizarFichaTecnicaV2 } from "@/data/normalizadorFicha";
import type { FichaTecnicaV2 } from "@/types/fichaTecnica";
import FichaTecnicaV2Panel from "@/components/FichaTecnicaV2Panel";
import {
  agregarResenaCreada,
  contieneLenguajeNoPermitido,
  MENSAJE_LENGUAJE_NO_PERMITIDO,
  esResenaPublica,
  MENSAJE_RESENA_EN_REVISION,
  analizarComentario,
} from "@/data/resenas";
import {
  obtenerMiValoracion,
  obtenerResenas,
  crearResena,
  obtenerValoracionStats,
  type ResenaResponse,
  type ValoracionPublicaStats,
} from "@/services/api";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import { obtenerAtribucionImagen } from "@/data/atribucionImagenes";
import AtribucionImagenProducto from "@/components/AtribucionImagenProducto";
import { CLASE_FOCO } from "@/components/ui/foco";
import { buttonClassName } from "@/components/ui/Button";
import AvisoTerminosResena from "@/components/ui/AvisoTerminosResena";
import FichaTecnicaV3Panel from "@/components/FichaTecnicaV3Panel";
import { clasificarFichaTecnicaProducto, type EstadoFichaTecnicaProducto } from "@/data/fichaTecnicaProducto";
import { obtenerFichaTecnicaV3Piloto } from "@/data/fichasTecnicasV3Piloto";

interface FichaTecnicaModalProps {
  producto: DispositivoKimovil | Producto | ProductoViewModel | null;
  onClose: () => void;
  usuarioSesion?: UsuarioSesion | null;
  onPedirLogin?: () => void;
  onValoracionGuardada?: () => void;
  onResenaGuardada?: (resena: ResenaResponse) => void;
}

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

  // Aviso preventivo (TEC-98): informa mientras se escribe, sin borrar texto.
  const riesgoComentario = useMemo(
    () => analizarComentario(nuevaResenaTexto).riesgo,
    [nuevaResenaTexto],
  );

  const idProductoApi = useMemo<number | null>(() => {
    if (!producto) return null;
    if ("origen" in producto) {
      if (producto.origen === "mock" || producto.origen === "ranking") return null;
      return idApiDeViewModel(producto as ProductoViewModel);
    }
    if ("idProducto" in producto && typeof producto.idProducto === "number") {
      if (Number.isSafeInteger(producto.idProducto) && producto.idProducto > 0) {
        return producto.idProducto;
      }
    }
    return null;
  }, [producto]);

  const claveProductoUnica = useMemo(() => {
    if (!producto) return null;
    if ("idGlobal" in producto && producto.idGlobal) return producto.idGlobal;
    if ("idProducto" in producto) return `prod:${producto.idProducto}`;
    if ("id" in producto) return `kimovil:${(producto as DispositivoKimovil).id}`;
    return null;
  }, [producto]);

  // Resetear estados locales durante el render cuando cambia el producto (patrón recomendado por React)
  const [prevClaveProducto, setPrevClaveProducto] = useState(claveProductoUnica);
  if (claveProductoUnica !== prevClaveProducto) {
    setPrevClaveProducto(claveProductoUnica);
    setPuntuacionSeleccionada(0);
    setPuntuacionActual(null);
    setHoverEstrella(0);
    setErrorImagenUrl(null);
    setResenasProducto([]);
    setCargandoResenas(Boolean(idProductoApi));
    setErrorCargaResenas("");
    setNuevaResenaTexto("");
    setErrorResena("");
    setExitoResena("");
    setValoracionStats(null);
    setPestanaSeleccionada(null);
  }

  // Cargar valoración de estrellas previa del usuario (únicamente para productos de API)
  useEffect(() => {
    let montado = true;
    if (usuarioSesion && idProductoApi) {
      obtenerMiValoracion(idProductoApi)
        .then((val) => {
          if (montado && val) {
            setPuntuacionActual(val.puntuacion);
          }
        })
        .catch(() => {});
    }
    return () => {
      montado = false;
    };
  }, [usuarioSesion, idProductoApi]);

  // Cargar estadísticas públicas de valoración comunitaria (únicamente para productos de API)
  useEffect(() => {
    let montado = true;
    if (idProductoApi) {
      obtenerValoracionStats(idProductoApi)
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
  }, [idProductoApi]);

  // Cargar reseñas comunitarias escritas del producto (únicamente para productos de API)
  useEffect(() => {
    let montado = true;
    if (idProductoApi) {
      obtenerResenas(idProductoApi)
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
  }, [idProductoApi]);

  const manejarGuardarResena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioSesion) {
      setErrorResena("Debes iniciar sesión para publicar una opinión.");
      return;
    }
    if (!idProductoApi) {
      setErrorResena(
        "Las opiniones y valoraciones solo están disponibles para productos registrados en el catálogo."
      );
      return;
    }
    if (puntuacionSeleccionada !== 0 && (puntuacionSeleccionada < 1 || puntuacionSeleccionada > 5)) {
      setErrorResena("Por favor selecciona una puntuación entre 1 y 5 estrellas.");
      return;
    }
    if (!nuevaResenaTexto.trim()) {
      setErrorResena("Por favor escribe tu opinión antes de publicar.");
      return;
    }

    if (contieneLenguajeNoPermitido(nuevaResenaTexto)) {
      setErrorResena(
        MENSAJE_LENGUAJE_NO_PERMITIDO
      );
      return;
    }

    setEnviandoResena(true);
    setErrorResena("");
    setExitoResena("");

    try {
      const res = await crearResena({
        idProducto: idProductoApi,
        comentario: nuevaResenaTexto.trim(),
        ...(puntuacionSeleccionada > 0 ? { puntuacion: puntuacionSeleccionada } : {}),
      });
      setNuevaResenaTexto("");
      if (puntuacionSeleccionada > 0) {
        setPuntuacionActual(puntuacionSeleccionada);
      }
      setPuntuacionSeleccionada(0);
      setExitoResena(
        esResenaPublica(res)
          ? "¡Tu opinión ha sido publicada con éxito!"
          : MENSAJE_RESENA_EN_REVISION
      );
      setResenasProducto((prev) => agregarResenaCreada(prev, res));
      if (idProductoApi) {
        obtenerValoracionStats(idProductoApi)
          .then((st) => setValoracionStats(st))
          .catch(() => {});
      }
      onResenaGuardada?.(res);
      onValoracionGuardada?.();
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

  const estadoFicha = useMemo<EstadoFichaTecnicaProducto | null>(() => {
    if (!producto) return null;
    if ("fichaTecnica" in producto && producto.fichaTecnica) return producto.fichaTecnica;
    if ("caracteristicas" in producto) return clasificarFichaTecnicaProducto(producto as Producto);
    const fichaV3Piloto = obtenerFichaTecnicaV3Piloto({
      id: "id" in producto ? (producto as DispositivoKimovil).id : null,
      nombre: producto.nombre,
    });
    if (fichaV3Piloto) {
      return {
        version: "v3",
        estado: "valida",
        original: fichaV3Piloto as unknown as Record<string, unknown>,
        ficha: fichaV3Piloto,
      };
    }
    return null;
  }, [producto]);

  const fichaTecnicaV2 = useMemo<FichaTecnicaV2 | null>(() => {
    if (!producto) return null;
    if (estadoFicha?.version === "v3" || estadoFicha?.version === "error") return null;
    if ("origen" in producto) {
      if (producto.fichaTecnicaV2) {
        return normalizarFichaTecnicaV2(producto.fichaTecnicaV2, { categoriaPorDefecto: producto.categoria });
      }
      const caracteristicas = Object.fromEntries(Object.entries(producto.especificaciones).filter(([, valor]) => typeof valor === "string" && valor.trim().length > 0));
      return normalizarFichaTecnicaV2(caracteristicas, { categoriaPorDefecto: producto.categoria });
    }
    return normalizarFichaTecnicaV2(producto);
  }, [producto, estadoFicha]);

  const usaFichaV2 = useMemo(() => {
    if (!producto) return false;
    if (estadoFicha?.version === "v3" || estadoFicha?.version === "error") return false;
    if ("origen" in producto) return true;
    if ("caracteristicas" in producto) {
      const raw = producto.caracteristicas;
      return Boolean(raw && typeof raw === "object" && !Array.isArray(raw) && raw.version_esquema === 2);
    }
    return false;
  }, [producto, estadoFicha]);

  const ficha = useMemo(() => {
    if (!producto) return null;
    if ("origen" in producto) {
      const secciones = (fichaTecnicaV2?.atributos ?? []).map((atributo) => ({
        icono: INFO_CATEGORIAS[producto.categoria].icono,
        titulo: atributo.nombre.toUpperCase(),
        descripcion: String(atributo.valor) + (atributo.unidad ? " " + atributo.unidad : ""),
      }));
      const fichaViewModel: FichaNormalizada = {
        categoriaTipo: producto.categoria,
        categoriaEtiqueta: producto.categoriaEtiqueta,
        categoriaIcono: INFO_CATEGORIAS[producto.categoria].icono,
        marca: producto.marca,
        nombre: producto.nombre,
        precio: producto.precioCOP,
        imagen: producto.imagen || "",
        puntuacionGlobal: null,
        resumen: "",
        secciones,
        metricas: [],
        benchmark: null,
        tiendas: [],
        tieneEspecificacionesReales: secciones.length > 0,
        datosTecnicos: producto.datosFichaTecnica,
      };
      return fichaViewModel;
    }
    if (usaFichaV2 && "caracteristicas" in producto) {
      const caracteristicas = Object.fromEntries((fichaTecnicaV2?.atributos ?? []).map((atributo) => [
        atributo.clave, String(atributo.valor) + (atributo.unidad ? " " + atributo.unidad : ""),
      ]));
      return normalizarFichaProducto({ ...(producto as Producto), caracteristicas });
    }
    return normalizarFichaProducto(producto as unknown as Producto | DispositivoKimovil);
  }, [producto, fichaTecnicaV2, usaFichaV2]);

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
  const imagenSinDerivados = obtenerAtribucionImagen(ficha.imagen)?.licencia === "CC BY-ND 2.0";
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
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-inverse/45 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo-dispositivo"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-card border border-line bg-paper text-ink  lg:max-w-5xl">
        
        {/* Cabecera accesible superior */}
        <div className="flex shrink-0 items-center justify-between border-b border-dotted border-line bg-canvas px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-brand-blue/25 bg-brand-blue/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-normal text-brand-blue">
              FICHA TÉCNICA
            </span>

            <span className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink">
              <span aria-hidden="true">{ficha.categoriaIcono}</span>
              <span>{ficha.categoriaEtiqueta}</span>
            </span>

            {ranking !== null && (
              <span className="hidden rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-subtle sm:inline-block">
                RANKING #{ranking}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className={buttonClassName("secondary", "shrink-0 whitespace-nowrap text-xs")}
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
                    className={`max-h-full max-w-full object-contain ${imagenSinDerivados ? "" : "transition-transform duration-300 hover:scale-105"}`}
                  />
                ) : (
                  <ProductImagePlaceholder
                    categoria={ficha.categoriaEtiqueta || ficha.categoriaTipo}
                    marca={ficha.marca}
                    nombre={ficha.nombre}
                    tamano="lg"
                  />
                )}
                <AtribucionImagenProducto src={ficha.imagen} className="absolute bottom-10 left-3 right-3 rounded-card bg-paper/90 px-2 py-1" />

                <span className="absolute left-3 top-3 rounded-full border border-line bg-paper/95 px-2.5 py-1 text-[11px] font-medium text-ink backdrop-blur">
                  {ficha.marca}
                </span>

                <span className="absolute bottom-3 right-3 rounded-pill bg-brand-solid px-3 py-1 text-sm font-medium uppercase tracking-normal text-on-solid">
                  {precioFormateado}
                </span>
              </div>

              {/* Evaluación Global y Técnica */}
              <div className="rounded-card border border-line bg-canvas p-5">
                <div className="mb-3 flex items-center justify-between border-b border-dotted border-line pb-3">
                  <span className="text-[11px] font-medium uppercase tracking-normal text-subtle">
                    Puntuación TecReview
                  </span>
                  {ficha.puntuacionGlobal !== null ? (
                    <span className="text-xl font-medium tracking-normal text-brand-blue">
                      {ficha.puntuacionGlobal.toFixed(1)} / 10
                    </span>
                  ) : (
                    <span className="text-xs font-medium uppercase tracking-normal text-subtle">
                      Pendiente de valoraciones
                    </span>
                  )}
                </div>

                {/* Benchmark real (solo si está disponible) */}
                {ficha.benchmark && (
                  <div className="mb-4 flex items-center justify-between rounded-card border border-line bg-canvas p-3 text-xs">
                    <span className="text-[11px] font-medium uppercase tracking-normal text-subtle">
                      {ficha.benchmark.etiqueta}:
                    </span>
                    <span className="font-medium tracking-normal text-ink">
                      {ficha.benchmark.valor}
                    </span>
                  </div>
                )}

                {/* Métricas por categoría (solo si existen) */}
                {ficha.metricas && ficha.metricas.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {ficha.metricas.map((metrica, idx) => (
                      <div key={idx}>
                        <div className="mb-1 flex justify-between font-medium text-subtle">
                          <span>{metrica.nombre}</span>
                          <span className="font-medium text-ink">
                            {metrica.puntos.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                          <div
                            className="h-full rounded-full bg-brand-solid transition-all duration-300"
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
                      <p className="text-xs text-subtle">
                        Sin evaluación técnica de laboratorio registrada aún.
                      </p>
                      <p className="mt-0.5 text-[10px] text-subtle">
                        (Pruebas de hardware y benchmarks no cargados)
                      </p>
                    </div>
                  )
                )}

                {/* Estadísticas de valoración comunitaria (promedio estrellas) */}
                {valoracionStats && valoracionStats.cantidadValoraciones > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-card border border-surface-border-strong bg-paper p-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
                      <span aria-hidden="true">⭐</span> Valoración de la comunidad:
                    </span>
                    <span className="text-xs font-medium">
                      <span className="text-text-secondary">
                        {valoracionStats.promedioPuntuacion?.toFixed(1)} / 5
                      </span>
                      <span className="ml-1 text-subtle">
                        ({valoracionStats.cantidadValoraciones} {valoracionStats.cantidadValoraciones === 1 ? "voto" : "votos"})
                      </span>
                    </span>
                  </div>
                )}

                {/* Acceso directo a las opiniones comunitarias del producto */}
                <button
                  type="button"
                  onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                  className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-card border border-brand-blue/25 bg-canvas p-2.5 text-xs font-medium text-ink transition-colors hover:bg-brand-blue/10"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-blue">
                    <span aria-hidden="true">💬</span> Opiniones de la comunidad:
                  </span>
                  <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                    {cargandoResenas ? "..." : `${resenasProducto.length} ${resenasProducto.length === 1 ? "reseña" : "reseñas"}`}
                  </span>
                </button>
              </div>

              {/* SECCIÓN INFORMATIVA DE VALORACIONES Y OPINIONES UNIFICADAS */}
              <div className="mt-4 rounded-card border border-line bg-canvas p-5">
                <div className="mb-3 flex items-center justify-between border-b border-dotted border-line pb-3">
                  <span className="text-[11px] font-medium uppercase tracking-normal text-subtle">
                    TU CALIFICACIÓN (1 A 5 ESTRELLAS)
                  </span>
                  {puntuacionActual !== null && (
                    <span className="text-xs font-medium text-star">
                      ★ {puntuacionActual} / 5
                    </span>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-subtle mb-3">
                  Las valoraciones se integran con las opiniones de la comunidad. Publica tu puntuación de 1 a 5 estrellas junto con tu comentario.
                </p>

                <button
                  type="button"
                  onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                  className={`w-full cursor-pointer rounded-card bg-brand-solid px-3.5 py-2 text-xs font-medium text-on-solid transition-colors hover:bg-brand-solid/90 ${CLASE_FOCO}`}
                >
                  {usuarioSesion ? "Calificar y escribir opinión" : "Ver opiniones de la comunidad"}
                </button>
              </div>
            </div>

            {/* Columna Derecha: Selector de Pestañas y Contenido Dinámico */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-normal text-brand-blue">
                  {ficha.marca} / Especificaciones técnicas
                </span>
                <h2
                  id="modal-titulo-dispositivo"
                  className="mt-1 text-2xl font-medium leading-tight tracking-normal text-ink sm:text-3xl"
                >
                  {ficha.nombre}
                </h2>
                <p className="mt-2 border-l-2 border-brand-blue/60 pl-3 text-sm leading-relaxed text-subtle">
                  {ficha.resumen}
                </p>
                {estadoFicha?.version === "v3" && <FichaTecnicaV3Panel key={claveProductoUnica ?? "v3"} estado={estadoFicha} />}
                {estadoFicha?.version === "error" && <div role="alert" className="rounded-card border border-status-error bg-paper p-4 text-sm text-status-error">No se pudo interpretar la ficha técnica. No se mostrará como ficha V1/V2.</div>}
                {estadoFicha?.version !== "v3" && estadoFicha?.version !== "error" && usaFichaV2 && fichaTecnicaV2 && <FichaTecnicaV2Panel ficha={fichaTecnicaV2} />}

                {estadoFicha?.version !== "v3" && estadoFicha?.version !== "error" && !usaFichaV2 && ficha.datosTecnicos && (
                  <section
                    aria-label="Datos técnicos verificados"
                    className="mt-4 space-y-4 rounded-card border border-line bg-canvas p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-line pb-3">
                      <div>
                        <h3 className="text-sm font-medium text-ink">Ficha técnica detallada</h3>
                        <p className="mt-0.5 text-[11px] text-subtle">Datos declarados para esta variante del producto</p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-normal ${
                          ficha.datosTecnicos.estado_verificacion === "verificado"
                            ? "border-transparent bg-surface-2 text-ink"
                            : ficha.datosTecnicos.estado_verificacion === "requiere_revision"
                              ? "border-surface-border-strong bg-paper text-text-secondary"
                              : "border-line bg-paper text-subtle"
                        }`}
                      >
                        {ficha.datosTecnicos.estado_verificacion === "requiere_revision"
                          ? "Requiere revisión"
                          : ficha.datosTecnicos.estado_verificacion === "verificado"
                            ? "Verificado"
                            : ficha.datosTecnicos.estado_verificacion === "parcial"
                              ? "Verificación parcial"
                              : "Pendiente de verificación"}
                      </span>
                    </div>

                    {ficha.datosTecnicos.variante && (
                      <div>
                        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-normal text-subtle">Variante / identificación</h4>
                        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {([
                            ["Modelo", ficha.datosTecnicos.variante.modelo],
                            ["SKU", ficha.datosTecnicos.variante.sku],
                            ["Mercado", ficha.datosTecnicos.variante.mercado],
                            ["RAM", ficha.datosTecnicos.variante.ram],
                            ["Almacenamiento", ficha.datosTecnicos.variante.almacenamiento],
                            ["Conectividad", ficha.datosTecnicos.variante.conectividad],
                            ["Identificador", ficha.datosTecnicos.variante.identificador],
                          ] as const).filter(([, value]) => Boolean(value)).map(([label, value]) => (
                            <div key={label} className="flex items-start justify-between gap-3 rounded-card border border-line bg-paper px-3 py-2 text-xs">
                              <dt className="text-subtle">{label}</dt>
                              <dd className="text-right font-medium text-ink">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {ficha.datosTecnicos.metricasComparables.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-normal text-subtle">Métricas técnicas comparables</h4>
                        <div className="overflow-hidden rounded-card border border-line">
                          {ficha.datosTecnicos.metricasComparables.map((metrica) => (
                            <div key={metrica.clave} className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-line bg-paper px-3 py-2.5 text-xs last:border-b-0">
                              <div>
                                <p className="font-medium text-ink">{metrica.nombre}</p>
                                <p className="text-[10px] text-subtle">{metrica.grupo}{metrica.comparable ? " · Comparable" : " · Solo informativa"}</p>
                              </div>
                              <span className="font-medium tabular-nums text-ink">
                                {typeof metrica.valor === "boolean" ? (metrica.valor ? "Sí" : "No") : String(metrica.valor)}{metrica.unidad ? ` ${metrica.unidad}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ficha.datosTecnicos.benchmarks.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-normal text-subtle">Resultados de benchmarks</h4>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {ficha.datosTecnicos.benchmarks.map((benchmark, index) => (
                            <article key={`${benchmark.nombre}-${benchmark.prueba ?? ""}-${index}`} className="rounded-card border border-line bg-paper p-3">
                              <p className="text-xs font-medium text-ink">{benchmark.nombre}</p>
                              <p className="mt-1 text-lg font-medium tabular-nums text-brand-blue">{benchmark.valor}{benchmark.unidad ? ` ${benchmark.unidad}` : ""}</p>
                              {(benchmark.prueba || benchmark.version || benchmark.fecha) && (
                                <p className="mt-1 text-[10px] leading-relaxed text-subtle">
                                  {[benchmark.prueba, benchmark.version ? `Versión ${benchmark.version}` : null, benchmark.fecha].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {ficha.datosTecnicos.fuentes.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-normal text-subtle">Fuentes y verificación</h4>
                        <ul className="space-y-2">
                          {ficha.datosTecnicos.fuentes.map((fuente, index) => (
                            <li key={fuente.id ?? `${fuente.nombre}-${index}`} className="rounded-card border border-line bg-paper px-3 py-2.5 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium text-ink">{fuente.nombre}</span>
                                <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] capitalize text-subtle">{fuente.tipo}</span>
                              </div>
                              {(fuente.vendedor || fuente.fecha_consulta) && (
                                <p className="mt-1 text-[10px] text-subtle">
                                  {[fuente.vendedor ? `Vendedor: ${fuente.vendedor}` : null, fuente.fecha_consulta ? `Consulta: ${fuente.fecha_consulta}` : null].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              {fuente.variante && <p className="mt-1 text-[10px] text-subtle">Variante: {fuente.variante}</p>}
                              {fuente.observaciones && <p className="mt-1 text-[11px] text-subtle">{fuente.observaciones}</p>}
                              {fuente.url && (
                                <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-medium text-brand-blue underline underline-offset-2">
                                  Consultar fuente
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!ficha.datosTecnicos.variante &&
                      ficha.datosTecnicos.metricasComparables.length === 0 &&
                      ficha.datosTecnicos.benchmarks.length === 0 &&
                      ficha.datosTecnicos.fuentes.length === 0 && (
                        <p className="text-xs text-subtle">Aún no se han registrado variante, métricas, benchmarks ni fuentes para este producto.</p>
                      )}
                  </section>
                )}
              </div>

              {/* Barra de pestañas que incluye especificaciones de hardware y opiniones de la comunidad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5 text-[11px] font-medium uppercase tracking-normal text-subtle">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-solid" aria-hidden="true" />
                    <span>Especificaciones & Comunidad ({ficha.categoriaEtiqueta}):</span>
                  </span>
                  <span className="text-[10px] font-medium lowercase tracking-normal text-brand-blue">
                    (selecciona para ver)
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="Categorías de especificaciones del dispositivo"
                  className="flex flex-wrap gap-2 rounded-card border border-line bg-canvas p-1.5"
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
                        className={`group relative flex cursor-pointer items-center gap-2 rounded-card border px-3 py-2 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 ${
                          activa
                            ? "border-brand-blue/50 bg-canvas text-brand-blue"
                            : "border-line bg-paper text-subtle hover:border-brand-blue hover:bg-canvas hover:text-brand-blue"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                            activa
                              ? "bg-brand-solid scale-125 "
                              : "bg-subtle/50 group-hover:bg-brand-blue/60 group-hover:scale-110"
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
                  <div className="rounded-card border border-line bg-canvas p-4">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="flex items-center gap-2 text-xs font-medium text-ink">
                        <span aria-hidden="true">💬</span>
                        <span>Opiniones de la comunidad ({resenasProducto.length})</span>
                      </h4>
                      {idProductoApi && (
                        <span className="text-[10px] text-subtle">
                          Ref #{idProductoApi}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-subtle">
                      Reseñas y comentarios compartidos por los usuarios para{" "}
                      <span className="font-medium text-ink">
                        {ficha.nombre}
                      </span>.
                    </p>
                  </div>

                  {/* Listado de reseñas */}
                  {cargandoResenas && resenasProducto.length === 0 ? (
                    <div className="py-6 text-center text-xs text-subtle">
                      Cargando opiniones de la comunidad...
                    </div>
                  ) : errorCargaResenas ? (
                    <div className="rounded-card border border-status-error bg-paper p-3 text-xs text-status-error">
                      {errorCargaResenas}
                    </div>
                  ) : resenasProducto.length > 0 ? (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {resenasProducto.map((r) => (
                        <div
                          key={r.idResena}
                          className="rounded-card border border-line bg-canvas p-3.5 text-xs transition-colors"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-subtle">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-brand-blue">
                                @{r.nombreUsuario || "Usuario de TecReview"}
                              </span>
                              {r.puntuacion && (
                                <span className="font-medium text-star">
                                  ★ {r.puntuacion}/5
                                </span>
                              )}
                              <span
                                className="rounded-full border border-line bg-paper px-1.5 py-0.5 text-[10px] text-subtle"
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
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink sm:text-sm">
                            {r.comentario}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-card border border-dashed border-line bg-canvas p-6 text-center text-xs text-subtle">
                      Aún no hay opiniones de la comunidad para este dispositivo. ¡Sé el primero en compartir tu experiencia!
                    </div>
                  )}

                  {/* Formulario unificado para publicar una opinión con calificación */}
                  <div className="rounded-card border border-line bg-canvas p-4">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-normal text-subtle">
                      Publicar una opinión sobre este dispositivo
                    </span>
                    {!idProductoApi ? (
                      <div className="rounded-card border border-dashed border-line bg-canvas p-4 text-center text-xs text-subtle">
                        Las opiniones y valoraciones comunitarias están disponibles para dispositivos registrados en el catálogo.
                      </div>
                    ) : !usuarioSesion ? (
                      <div className="flex flex-col items-center justify-between gap-3 text-xs sm:flex-row">
                        <p className="text-subtle">
                          Debes iniciar sesión para publicar una opinión en la comunidad.
                        </p>
                        {onPedirLogin && (
                          <button
                            type="button"
                            onClick={onPedirLogin}
                            className={`shrink-0 cursor-pointer rounded-card bg-brand-solid px-3.5 py-2 text-xs font-medium text-on-solid transition-colors hover:bg-brand-solid/90 ${CLASE_FOCO}`}
                          >
                            Identificarse para valorar
                          </button>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={manejarGuardarResena} className="flex flex-col gap-3">
                        {/* Selector de calificación de 1 a 5 estrellas */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-subtle">
                            Calificación:
                          </span>
                          <div
                            role="group"
                            aria-label="Calificación de 1 a 5 estrellas"
                            className="flex items-center gap-1"
                          >
                            {[1, 2, 3, 4, 5].map((estrella) => {
                              const activa = (hoverEstrella || puntuacionSeleccionada) >= estrella;
                              return (
                                <button
                                  key={estrella}
                                  type="button"
                                  disabled={enviandoResena}
                                  onClick={() => {
                                    setPuntuacionSeleccionada(estrella);
                                    setErrorResena("");
                                  }}
                                  onMouseEnter={() => setHoverEstrella(estrella)}
                                  onMouseLeave={() => setHoverEstrella(0)}
                                  aria-label={`Calificar con ${estrella} ${estrella === 1 ? "estrella" : "estrellas"}`}
                                  className={`cursor-pointer rounded-card p-1 text-xl leading-none transition-transform hover:scale-110 focus:outline-none disabled:opacity-50 ${CLASE_FOCO}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={
                                      activa
                                        ? "text-star"
                                        : "text-subtle dark:text-subtle"
                                    }
                                  >
                                    {activa ? "★" : "☆"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-xs font-medium text-subtle">
                            {puntuacionSeleccionada > 0
                              ? `Puntuación seleccionada: ${puntuacionSeleccionada} de 5 estrellas`
                              : "Selecciona de 1 a 5 estrellas"}
                          </span>
                        </div>

                        <textarea
                          rows={2}
                          value={nuevaResenaTexto}
                          onChange={(e) => setNuevaResenaTexto(e.target.value)}
                          placeholder={`Comparte tu experiencia con ${ficha.nombre}...`}
                          className="min-h-16 w-full resize-none rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-xs text-ink placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-brand-blue sm:text-sm"
                        />
                        <AvisoTerminosResena riesgo={riesgoComentario} />
                        {errorResena && (
                          <p className="text-xs text-status-error font-medium" role="alert">
                            ⚠️ {errorResena}
                          </p>
                        )}
                        {exitoResena && (
                          <p className="text-xs text-positive font-medium" role="status">
                            ✓ {exitoResena}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={enviandoResena || !nuevaResenaTexto.trim()}
                            className={`rounded-card bg-brand-solid px-4 py-2 text-xs font-medium text-on-solid transition-colors hover:bg-brand-solid/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${CLASE_FOCO}`}
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
                  <div className="rounded-card border border-line bg-canvas p-4">
                    <h4 className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink">
                      <span aria-hidden="true">{seccionActiva.icono}</span>
                      <span>{seccionActiva.titulo}</span>
                    </h4>
                    <p className="text-sm leading-relaxed text-subtle">
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
                            className="flex items-start gap-2.5 rounded-card border border-line bg-canvas p-3.5"
                          >
                            <span className="mt-0.5 text-sm font-medium text-brand-blue">•</span>
                            <span className="text-xs font-medium leading-relaxed text-ink">
                              {parte}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {seccionActiva.detalleExtra && (
                    <div className="rounded-card border border-brand-blue/25 bg-brand-blue/5 p-3.5 text-xs text-ink">
                      <span className="font-medium">Detalle adicional: </span>
                      <span>{seccionActiva.detalleExtra}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Estado vacío cuando el producto no tiene especificaciones registradas */
                <div className="my-auto rounded-card border border-dashed border-line bg-paper p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-canvas text-subtle">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-ink">
                    Sin especificaciones técnicas registradas
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-subtle">
                    Este producto no dispone de características técnicas detalladas registradas en el catálogo. Podrán ser asignadas a través del módulo de administración en una próxima actualización.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPestanaSeleccionada("tab-opiniones-comunidad")}
                    className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-card bg-brand-solid px-4 py-2 text-xs font-medium text-on-solid transition-colors hover:bg-brand-solid/90"
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
        <div className="flex shrink-0 justify-end border-t border-dotted border-line bg-canvas px-5 py-3.5 sm:px-7">
          <button
            onClick={onClose}
            className={buttonClassName("secondary", "text-xs")}
          >
            Cerrar ficha técnica
          </button>
        </div>
      </div>
    </div>
  );
}
