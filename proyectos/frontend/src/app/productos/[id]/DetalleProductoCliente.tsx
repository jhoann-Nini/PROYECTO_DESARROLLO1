/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  obtenerCategorias,
  obtenerMarcas,
  obtenerProductoPorId,
  obtenerPublicacionesProducto,
  obtenerTiendasProducto,
  obtenerResenas,
  obtenerValoracionStats,
  type ResenaResponse,
  type ValoracionPublicaStats,
} from "@/services/api";
import type { CategoriaResponse, MarcaResponse, Producto, TiendaPrecio } from "@/types/producto";
import type { TiendaProductoResponse } from "@/types/reporteOferta";
import { formatearCOP, normalizarFichaProducto } from "@/data/specsHelper";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import AuthModal from "@/components/AuthModal";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import AtribucionImagenProducto from "@/components/AtribucionImagenProducto";
import RatingStars from "@/components/catalogo/RatingStars";
import EspecificacionesProducto from "@/components/detalle/EspecificacionesProducto";
import ValoracionProducto from "@/components/detalle/ValoracionProducto";
import OpinionesProducto from "@/components/detalle/OpinionesProducto";
import BotonComparador from "@/components/detalle/BotonComparador";
import BotonCompartir from "@/components/detalle/BotonCompartir";
import BotonFavorito from "@/components/favoritos/BotonFavorito";
import ReportarOfertaModal, { type OfertaReportable } from "@/components/ReportarOfertaModal";
import { CLASE_FOCO } from "@/components/ui/foco";
import Button, { buttonClassName } from "@/components/ui/Button";

interface DetalleProductoClienteProps {
  idProducto: number;
}

type PestanaDetalle = "especificaciones" | "opiniones";

/** Fecha corta de la última actualización del precio; null si no hay o no es válida. */
function formatearFechaPrecio(valor: string | null): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(fecha);
}

function enriquecerProducto(
  producto: Producto,
  categorias: CategoriaResponse[],
  marcas: MarcaResponse[],
): Producto {
  return {
    ...producto,
    nombreCategoria:
      producto.nombreCategoria ||
      categorias.find(
        (categoria) => categoria.idCategoria === producto.idCategoria,
      )?.nombre,
    nombreMarca:
      producto.nombreMarca ||
      marcas.find((marca) => marca.idMarca === producto.idMarca)?.nombre,
  };
}

export default function DetalleProductoCliente({
  idProducto,
}: DetalleProductoClienteProps) {
  const {
    usuario,
    cargando: cargandoSesion,
    establecerUsuario,
  } = useSesionTecReview();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [intento, setIntento] = useState(0);

  const [stats, setStats] = useState<ValoracionPublicaStats | null>(null);
  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(true);
  const [errorResenas, setErrorResenas] = useState<string | null>(null);
  const [intentoResenas, setIntentoResenas] = useState(0);

  const [pestana, setPestana] = useState<PestanaDetalle>("especificaciones");
  const [totalComunidad, setTotalComunidad] = useState<number | null>(null);

  // Comunidad: el número de publicaciones es informativo; si falla, el enlace sigue.
  useEffect(() => {
    let activo = true;
    obtenerPublicacionesProducto(idProducto, { limite: 1 })
      .then((pagina) => {
        if (activo) setTotalComunidad(pagina.total);
      })
      .catch(() => {
        if (activo) setTotalComunidad(null);
      });
    return () => {
      activo = false;
    };
  }, [idProducto]);
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [errorImagen, setErrorImagen] = useState(false);
  const [tiendasReales, setTiendasReales] = useState<TiendaProductoResponse[] | null>(null);
  const [errorTiendas, setErrorTiendas] = useState<string | null>(null);
  const [intentoTiendas, setIntentoTiendas] = useState(0);
  const [ofertaReportando, setOfertaReportando] = useState<OfertaReportable | null>(null);
  const [reporteConfirmado, setReporteConfirmado] = useState("");

  useEffect(() => {
    let activo = true;

    Promise.allSettled([
      obtenerProductoPorId(idProducto),
      obtenerCategorias(),
      obtenerMarcas(),
    ])
      .then(([resultadoProducto, resultadoCategorias, resultadoMarcas]) => {
        if (!activo) return;

        if (resultadoProducto.status === "rejected") {
          const motivo = resultadoProducto.reason;
          if (motivo instanceof ApiError && motivo.status === 404) {
            setNoEncontrado(true);
          } else {
            setError(
              motivo instanceof Error
                ? motivo.message
                : "No fue posible cargar el detalle del producto.",
            );
          }
          return;
        }

        const categorias =
          resultadoCategorias.status === "fulfilled"
            ? resultadoCategorias.value
            : [];
        const marcas =
          resultadoMarcas.status === "fulfilled" ? resultadoMarcas.value : [];

        setProducto(
          enriquecerProducto(resultadoProducto.value, categorias, marcas),
        );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [idProducto, intento]);

  useEffect(() => {
    let activo = true;

    Promise.allSettled([
      obtenerValoracionStats(idProducto),
      obtenerResenas(idProducto),
    ])
      .then(([resultadoStats, resultadoResenas]) => {
        if (!activo) return;

        setStats(
          resultadoStats.status === "fulfilled" ? resultadoStats.value : null,
        );

        if (resultadoResenas.status === "fulfilled") {
          setResenas(resultadoResenas.value);
        } else {
          setResenas([]);
          setErrorResenas(
            resultadoResenas.reason instanceof Error
              ? resultadoResenas.reason.message
              : "No fue posible cargar las opiniones del producto.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargandoResenas(false);
      });

    return () => {
      activo = false;
    };
  }, [idProducto, intentoResenas]);

  useEffect(() => {
    let activo = true;
    obtenerTiendasProducto(idProducto)
      .then((tiendas) => {
        if (activo) {
          setTiendasReales(tiendas);
          setErrorTiendas(null);
        }
      })
      .catch((err) => {
        if (activo) {
          setTiendasReales([]);
          setErrorTiendas(err instanceof Error ? err.message : "No pudimos consultar las tiendas.");
        }
      });
    return () => { activo = false; };
  }, [idProducto, intentoTiendas]);

  const refrescarStats = useCallback(async () => {
    try {
      const actualizadas = await obtenerValoracionStats(idProducto);
      setStats(actualizadas);
    } catch {
      // Mantener las estadísticas previas si la consulta falla.
    }
  }, [idProducto]);

  const reintentarProducto = useCallback(() => {
    setCargando(true);
    setError(null);
    setNoEncontrado(false);
    setProducto(null);
    setErrorImagen(false);
    setIntento((valor) => valor + 1);
  }, []);

  const reintentarResenas = useCallback(() => {
    setCargandoResenas(true);
    setErrorResenas(null);
    setIntentoResenas((valor) => valor + 1);
  }, []);

  const ficha = useMemo(
    () => (producto ? normalizarFichaProducto(producto) : null),
    [producto],
  );

  // Fase 3 (H-06): las ofertas del backend son la única fuente de tiendas.
  // El JSON heredado de la ficha (`tiendas`) solo existe en los mocks y no se
  // mezcla con datos reales ni recibe identificadores inventados.
  const tiendas: (TiendaPrecio & { idEstablecimiento: number; fechaActualizacionPrecio: string | null })[] =
    errorTiendas || !tiendasReales
      ? []
      : tiendasReales.map((tienda) => ({
          idEstablecimiento: tienda.idEstablecimiento,
          nombre: tienda.nombre,
          precio: tienda.precio,
          envioGratis: false,
          url: tienda.urlOferta ?? undefined,
          verificada: tienda.verificado === true,
          fechaActualizacionPrecio: tienda.fechaActualizacionPrecio ?? null,
        }));

  // Fase 3 (H-04): la disponibilidad sale de las ofertas, no del estado del producto.
  const estadoDisponibilidad: { texto: string; positivo: boolean } = !producto?.estado
    ? { texto: "Retirado del catálogo", positivo: false }
    : errorTiendas
      ? { texto: "Disponibilidad sin confirmar", positivo: false }
      : tiendasReales === null
        ? { texto: "Consultando tiendas…", positivo: false }
        : tiendas.length > 0
          ? {
              texto: `Disponible en ${tiendas.length} ${tiendas.length === 1 ? "tienda" : "tiendas"}`,
              positivo: true,
            }
          : { texto: "Sin tiendas con disponibilidad registrada", positivo: false };

  const precio =
    producto?.precioReferencia && producto.precioReferencia > 0
      ? formatearCOP(producto.precioReferencia)
      : "Consultar disponibilidad";

  const abrirAuth = useCallback(() => setModalAuthAbierto(true), []);

  if (cargando) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-card border border-line bg-paper p-12 text-center"
        >
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand-blue" />
          <p className="mt-4 text-sm text-subtle">
            Cargando detalle del producto…
          </p>
        </div>
      </main>
    );
  }

  if (noEncontrado) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-card border border-dashed border-line bg-paper p-10 text-center">
          <p className="text-2xl font-medium tracking-normal text-ink">
            Producto no encontrado
          </p>
          <p className="mt-2 text-sm text-subtle">
            El producto solicitado no existe o ya no está disponible en el
            catálogo.
          </p>
          <Link
            href="/productos"
            className={buttonClassName("primary", "mt-5 text-sm")}
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  if (error || !producto || !ficha) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-card border border-status-error bg-paper p-8 text-center"
        >
          <p className="text-lg font-medium text-status-error">
            No pudimos cargar el producto
          </p>
          <p className="mt-2 text-sm text-status-error">
            {error ?? "El producto no tiene datos para mostrar."}
          </p>
          <Button
            type="button"
            onClick={reintentarProducto}
            className="mt-4 text-sm"
          >
            Reintentar
          </Button>
        </div>
      </main>
    );
  }

  const hayEnlacesTienda = tiendas.some(
    (tienda) => tienda.url && /^https?:\/\//i.test(tienda.url),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Migas de pan"
        className="mb-6 flex flex-wrap items-center gap-2 text-xs text-subtle"
      >
        <Link href="/" className="transition-colors hover:text-brand-blue">
          Inicio
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/productos"
          className="transition-colors hover:text-brand-blue"
        >
          Productos
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-ink">
          {producto.nombre}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="overflow-hidden rounded-card border border-line bg-paper p-5">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-card bg-surface-0 p-6">
            {producto.imagen && !errorImagen ? (
              <img
                src={producto.imagen}
                alt={`Fotografía de ${producto.nombre}`}
                onError={() => setErrorImagen(true)}
                className="h-full w-full object-contain"
              />
            ) : (
              <ProductImagePlaceholder
                categoria={producto.nombreCategoria ?? producto.idCategoria}
                marca={ficha.marca}
                nombre={producto.nombre}
                tamano="lg"
                tema="claro"
              />
            )}
          </div>
          <AtribucionImagenProducto src={producto.imagen} className="mt-2" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-card bg-brand-blue/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-normal text-brand-blue">
              {ficha.categoriaEtiqueta}
            </span>
            <span
              className={`rounded-card px-2.5 py-1 text-[11px] font-medium ${
                estadoDisponibilidad.positivo
                  ? "bg-positive/15 text-ink"
                  : "border border-line bg-paper text-subtle"
              }`}
            >
              {estadoDisponibilidad.texto}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-medium uppercase leading-none tracking-normal text-ink sm:text-4xl">
            {producto.nombre}
          </h1>

          <p className="mt-2 text-sm font-medium text-subtle">
            {ficha.marca}
            <span aria-hidden="true"> · </span>
            {ficha.categoriaEtiqueta}
          </p>

          <div className="mt-4">
            <RatingStars
              rating={stats?.promedioPuntuacion ?? null}
              cantidadResenas={stats?.cantidadValoraciones ?? null}
              etiquetaCantidad="opiniones"
              tamano="md"
            />
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-normal text-subtle">
            Precio de referencia
          </p>
          <p className="mt-1 text-3xl font-medium uppercase tracking-normal text-ink">
            {precio}
          </p>

          <section
            aria-labelledby="titulo-donde-comprar"
            className="mt-6 rounded-card border border-line bg-paper p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2
                  id="titulo-donde-comprar"
                  className="text-lg font-medium uppercase tracking-normal text-ink"
                >
                  Dónde comprar
                </h2>
                {hayEnlacesTienda && (
                  <p className="mt-1 text-xs text-subtle">
                    Los enlaces abren la tienda en una pestaña nueva.
                  </p>
                )}
              </div>
              {tiendas.length > 0 && (
                <p className="text-xs text-subtle">
                  {tiendas.length}{" "}
                  {tiendas.length === 1 ? "tienda" : "tiendas"} disponibles
                </p>
              )}
            </div>

            {reporteConfirmado && (
              <p role="status" className="mt-3 text-sm text-positive">
                {reporteConfirmado}
              </p>
            )}
            {errorTiendas && (
              <div role="alert" className="mt-3 text-sm text-status-error">
                {errorTiendas}{" "}
                <button type="button" onClick={() => {
                  setErrorTiendas(null);
                  setTiendasReales(null);
                  setIntentoTiendas((valor) => valor + 1);
                }} className={`cursor-pointer underline ${CLASE_FOCO}`}>Reintentar tiendas</button>
              </div>
            )}
            {tiendas.length > 0 ? (
              <ul className="mt-4 divide-y divide-dotted divide-line">
                {tiendas.map((tienda, indice) => {
                  const idEstablecimiento = tienda.idEstablecimiento;
                  const urlValida =
                    tienda.url && /^https?:\/\//i.test(tienda.url)
                      ? tienda.url
                      : null;

                  return (
                    <li
                      key={tienda.idEstablecimiento ?? `${tienda.nombre}-${indice}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-ink">
                          {tienda.nombre}{tienda.verificada === true && (
                            <span
                              aria-label={`${tienda.nombre} verificada por TecReview`}
                              className="ml-2 inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink"
                            >
                              <span aria-hidden="true">✓</span> Verificada
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-subtle">
                          Envío no especificado
                          {formatearFechaPrecio(tienda.fechaActualizacionPrecio) && (
                            <> · Precio actualizado el {formatearFechaPrecio(tienda.fechaActualizacionPrecio)}</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium text-ink">
                          <span className="sr-only">
                            Precio en {tienda.nombre}:{" "}
                          </span>
                          {formatearCOP(tienda.precio)}
                        </p>
                        {urlValida && (
                          <a
                            href={urlValida}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver tienda: ${tienda.nombre} (abre en una pestaña nueva)`}
                            className="rounded-card border border-line px-3 py-2 text-sm font-medium text-brand-blue transition-colors hover:border-brand-blue"
                          >
                            Ver tienda
                          </a>
                        )}
                          <button type="button"
                            onClick={() => {
                              setReporteConfirmado("");
                              setOfertaReportando({
                                idProducto: producto.idProducto,
                                idEstablecimiento,
                                nombreProducto: producto.nombre,
                                nombreEstablecimiento: tienda.nombre,
                              });
                            }}
                            aria-label={`Reportar precio o enlace de ${producto.nombre} en ${tienda.nombre}`}
                            className={`cursor-pointer rounded-card border border-line px-3 py-2 text-sm font-medium text-brand-blue hover:border-brand-blue ${CLASE_FOCO}`}
                          >Reportar precio o enlace</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-subtle">
                Aún no hay tiendas con precios publicados para este producto.
              </p>
            )}
          </section>

          {producto.descripcion && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-subtle">
              {producto.descripcion}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-start gap-3">
            <BotonComparador
              idProducto={producto.idProducto}
              nombreProducto={producto.nombre}
            />
            <BotonFavorito
              idProducto={producto.idProducto}
              nombreProducto={producto.nombre}
            />
            <BotonCompartir titulo={producto.nombre} />
          </div>

          <dl className="mt-6 grid gap-3 border-t border-dotted border-line pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-normal text-subtle">
                Categoría
              </dt>
              <dd className="mt-1 font-medium text-ink">
                {producto.nombreCategoria ?? ficha.categoriaEtiqueta}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-normal text-subtle">
                Marca
              </dt>
              <dd className="mt-1 font-medium text-ink">
                {ficha.marca}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-10">
        <div
          role="tablist"
          aria-label="Información del producto"
          className="flex flex-wrap gap-2 border-b border-dotted border-line"
        >
          <button
            type="button"
            role="tab"
            id="tab-especificaciones"
            aria-selected={pestana === "especificaciones"}
            aria-controls="panel-especificaciones"
            onClick={() => setPestana("especificaciones")}
            className={`min-h-11 cursor-pointer rounded-t-card px-4 py-2.5 text-sm font-medium uppercase transition-colors ${
              pestana === "especificaciones"
                ? "border-b-2 border-brand-blue text-brand-blue"
                : "text-subtle hover:text-ink"
            }`}
          >
            Especificaciones
          </button>
          <button
            type="button"
            role="tab"
            id="tab-opiniones"
            aria-selected={pestana === "opiniones"}
            aria-controls="panel-opiniones"
            onClick={() => setPestana("opiniones")}
            className={`min-h-11 cursor-pointer rounded-t-card px-4 py-2.5 text-sm font-medium uppercase transition-colors ${
              pestana === "opiniones"
                ? "border-b-2 border-brand-blue text-brand-blue"
                : "text-subtle hover:text-ink"
            }`}
          >
            Opiniones ({resenas.length})
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--color-subtle)]">
          ¿Tienes una pregunta sobre este producto?{" "}
          <Link
            href={`/productos/${idProducto}/comunidad`}
            className={`font-semibold text-[var(--color-brand-blue)] hover:underline ${CLASE_FOCO}`}
          >
            {totalComunidad === null ? "Comunidad" : `Comunidad (${totalComunidad})`}
          </Link>
        </p>

        <div
          role="tabpanel"
          id="panel-especificaciones"
          aria-labelledby="tab-especificaciones"
          hidden={pestana !== "especificaciones"}
          className="pt-6"
        >
          <EspecificacionesProducto producto={producto} />
        </div>

        <div
          role="tabpanel"
          id="panel-opiniones"
          aria-labelledby="tab-opiniones"
          hidden={pestana !== "opiniones"}
          className="space-y-5 pt-6"
        >
          <ValoracionProducto
            idProducto={producto.idProducto}
            usuario={usuario}
            cargandoSesion={cargandoSesion}
            stats={stats}
            onPedirLogin={abrirAuth}
            onActualizarStats={refrescarStats}
          />

          <OpinionesProducto
            idProducto={producto.idProducto}
            nombreProducto={producto.nombre}
            usuario={usuario}
            resenas={resenas}
            cargando={cargandoResenas}
            error={errorResenas}
            onReintentar={reintentarResenas}
            onResenaCreada={(nueva) =>
              setResenas((previas) => [
                nueva,
                ...previas.filter(
                  (resena) => resena.idResena !== nueva.idResena,
                ),
              ])
            }
            onResenaEditada={(editada) =>
              setResenas((previas) =>
                previas.map((r) =>
                  r.idResena === editada.idResena ? editada : r,
                ),
              )
            }
            onResenaEliminada={(idEliminada) =>
              setResenas((previas) =>
                previas.filter((r) => r.idResena !== idEliminada),
              )
            }
            onActualizarStats={refrescarStats}
            onPedirLogin={abrirAuth}
          />
        </div>
      </div>

      <AuthModal
        isOpen={modalAuthAbierto}
        onClose={() => setModalAuthAbierto(false)}
        onLoginSuccess={(nuevoUsuario) => {
          establecerUsuario(nuevoUsuario);
          setModalAuthAbierto(false);
        }}
      />
      {ofertaReportando && (
        <ReportarOfertaModal
          oferta={ofertaReportando}
          onCerrar={() => setOfertaReportando(null)}
          onReportado={() => {
            setReporteConfirmado("Gracias. Recibimos tu reporte y lo revisaremos.");
            setOfertaReportando(null);
          }}
          onPedirLogin={() => {
            setOfertaReportando(null);
            abrirAuth();
          }}
        />
      )}
    </main>
  );
}
