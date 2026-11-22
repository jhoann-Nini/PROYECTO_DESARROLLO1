"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  crearResena,
  obtenerCategorias,
  obtenerMarcas,
  obtenerMasComentados,
  obtenerMasDeseados,
  obtenerMejorValorados,
  obtenerOfertas,
  obtenerProductos,
  obtenerResenas,
  type ResenaResponse,
} from "@/services/api";
import {
  esAdministrador,
  esRepresentante,
  type CategoriaResponse,
  type MarcaResponse,
  type Producto,
  type ProductoDeseado,
  type ProductoMasComentado,
  type ProductoMejorValorado,
  type ProductoOferta,
} from "@/types/producto";
import { construirCatalogo } from "@/data/catalogoApi";
import { useResumenOfertas } from "@/hooks/useResumenOfertas";
import { buscarAlternativas, coincideConBusqueda, filtrarProductos, type FiltrosCatalogo } from "@/data/catalogo";
import { rutaCatalogoPresupuesto } from "@/data/presupuesto";
import { seleccionarDestacados } from "@/data/destacados";
import {
  aplicarResenaEditada,
  contieneLenguajeNoPermitido,
  MENSAJE_LENGUAJE_NO_PERMITIDO,
  esResenaPublica,
  MENSAJE_RESENA_EDITADA_EN_REVISION,
  MENSAJE_RESENA_EN_REVISION,
} from "@/data/resenas";
import {
  normalizarTexto,
  type ProductoViewModel,
} from "@/data/productoViewModel";
import { formatearCOP } from "@/data/specsHelper";
import { useSesionTecReview } from "@/hooks/useSesionTecReview";
import SiteHeader from "@/components/shell/SiteHeader";
import SiteFooter from "@/components/shell/SiteFooter";
import BottomNav from "@/components/shell/BottomNav";
import SearchBar from "@/components/SearchBar";
import SugerenciasBusqueda from "@/components/home/SugerenciasBusqueda";
import AuthModal from "@/components/AuthModal";
import ReportarOfertaModal, { type OfertaReportable } from "@/components/ReportarOfertaModal";
import AdminPanelModal from "@/components/AdminPanelModal";
import ResumenSesion from "@/components/home/ResumenSesion";
import CategoriasHome from "@/components/home/CategoriasHome";
import PresupuestoHome from "@/components/home/PresupuestoHome";
import OfertasHome from "@/components/home/OfertasHome";
import DestacadosHome from "@/components/home/DestacadosHome";
import EstadoBusquedaHome from "@/components/home/EstadoBusquedaHome";
import RankingsHome from "@/components/home/RankingsHome";
import OpinionesHome from "@/components/home/OpinionesHome";
import CtaComparador from "@/components/home/CtaComparador";

interface ItemRankingFiltrable {
  nombre: string;
  descripcion: string | null;
  precioReferencia: number | null;
}

/**
 * Busca por el nombre del dispositivo, como el catálogo: la descripción
 * menciona otros productos y accesorios y daba falsos positivos.
 */
function coincideBusqueda(nombre: string, termino: string): boolean {
  if (!termino) return true;
  return coincideConBusqueda(nombre, termino);
}

function filtrarRanking<T extends ItemRankingFiltrable>(
  items: T[],
  busqueda: string,
): T[] {
  const termino = normalizarTexto(busqueda);

  return items.filter((item) => coincideBusqueda(item.nombre, termino));
}

function filtrarOfertas(
  ofertas: ProductoOferta[],
  busqueda: string,
): ProductoOferta[] {
  const termino = normalizarTexto(busqueda);

  return ofertas.filter((oferta) => {
    if (termino) {
      return (
        coincideBusqueda(oferta.nombre, termino) ||
        normalizarTexto(oferta.nombreEstablecimiento).includes(termino)
      );
    }

    return true;
  });
}

export default function Home() {
  const router = useRouter();

  // Catálogo y enriquecimiento desde la API
  const [productosBackend, setProductosBackend] = useState<Producto[]>([]);
  const [categoriasApi, setCategoriasApi] = useState<CategoriaResponse[]>([]);
  const [marcasApi, setMarcasApi] = useState<MarcaResponse[]>([]);
  const [cargandoApi, setCargandoApi] = useState(true);
  const [estadoBackend, setEstadoBackend] = useState<"online" | "offline">(
    "offline",
  );
  const [errorProductos, setErrorProductos] = useState<string | null>(null);

  // Sesión y roles confirmados por el backend
  const {
    usuario: usuarioSesion,
    cargando: cargandoAuth,
    error: errorSesion,
    establecerUsuario,
    limpiarError,
    cerrarSesion,
    reintentar: reintentarSincronizacion,
  } = useSesionTecReview();
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [ofertaReportando, setOfertaReportando] = useState<OfertaReportable | null>(null);
  const [reporteConfirmado, setReporteConfirmado] = useState("");
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);

  const esAdmin = useMemo(() => esAdministrador(usuarioSesion), [usuarioSesion]);
  const esRepre = useMemo(
    () => esRepresentante(usuarioSesion),
    [usuarioSesion],
  );

  // Búsqueda y presupuesto
  const [busqueda, setBusqueda] = useState("");
  const contenedorBusquedaRef = useRef<HTMLDivElement>(null);
  const [buscadorEnfocado, setBuscadorEnfocado] = useState(false);
  // El presupuesto se expresa en COP y se confirma en el catálogo general.
  const [presupuestoMax, setPresupuestoMax] = useState<number>(4_000_000);
  const confirmarPresupuesto = useCallback((valorCOP: number) => {
    router.push(rutaCatalogoPresupuesto(valorCOP));
  }, [router]);

  // Estados de los rankings y las ofertas
  const [mostrarTodosMejorValorados, setMostrarTodosMejorValorados] =
    useState(false);
  const [mostrarTodosComentados, setMostrarTodosComentados] = useState(false);
  const [mostrarTodasOfertas, setMostrarTodasOfertas] = useState(false);

  const [mejorValorados, setMejorValorados] = useState<ProductoMejorValorado[]>(
    [],
  );
  const [cargandoMejorValorados, setCargandoMejorValorados] = useState(true);
  const [errorMejorValorados, setErrorMejorValorados] = useState<string | null>(
    null,
  );

  const [masDeseados, setMasDeseados] = useState<ProductoDeseado[]>([]);
  const [cargandoMasDeseados, setCargandoMasDeseados] = useState(true);
  const [errorMasDeseados, setErrorMasDeseados] = useState<string | null>(null);

  const [masComentados, setMasComentados] = useState<ProductoMasComentado[]>([]);
  const [cargandoMasComentados, setCargandoMasComentados] = useState(true);
  const [errorMasComentados, setErrorMasComentados] = useState<string | null>(
    null,
  );

  const [ofertas, setOfertas] = useState<ProductoOferta[]>([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [errorOfertas, setErrorOfertas] = useState<string | null>(null);

  // Opiniones de la comunidad
  const [comentario, setComentario] = useState("");
  const [idProductoComentario, setIdProductoComentario] = useState<number | "">(
    "",
  );
  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(true);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [errorComentario, setErrorComentario] = useState("");
  const [avisoComentario, setAvisoComentario] = useState("");
  const [filtroComentarios, setFiltroComentarios] = useState("");

  const recargarProductosCatalogo = useCallback(async () => {
    setCargandoApi(true);
    setErrorProductos(null);
    try {
      const datos = await obtenerProductos<Producto>();
      if (datos && datos.length > 0) {
        setProductosBackend(datos);
        setEstadoBackend("online");
        setErrorProductos(null);
      } else {
        setProductosBackend([]);
        setEstadoBackend("online");
        setErrorProductos(null);
      }
    } catch (err) {
      setProductosBackend([]);
      setEstadoBackend("offline");
      setErrorProductos(
        err instanceof Error
          ? err.message
          : "No fue posible conectarse con el servidor.",
      );
    } finally {
      setCargandoApi(false);
    }
  }, []);

  // Cargar productos sin esperar los metadatos del catálogo.
  // Categorías y marcas se consultan en paralelo y enriquecen las tarjetas al llegar.
  useEffect(() => {
    let activo = true;

    obtenerProductos<Producto>()
      .then((datos) => {
        if (!activo) return;

        if (datos.length > 0) {
          setProductosBackend(datos);
          setEstadoBackend("online");
          setErrorProductos(null);
        } else {
          setProductosBackend([]);
          setEstadoBackend("online");
          setErrorProductos(null);
        }
      })
      .catch((err) => {
        if (!activo) return;
        setProductosBackend([]);
        setEstadoBackend("offline");
        setErrorProductos(
          err instanceof Error
            ? err.message
            : "No fue posible conectarse con el servidor.",
        );
      })
      .finally(() => {
        if (activo) setCargandoApi(false);
      });

    obtenerCategorias()
      .then((datos) => {
        if (activo) setCategoriasApi(datos);
      })
      .catch(() => {
        // Los productos pueden mostrarse aunque falle la carga de categorías.
      });

    obtenerMarcas()
      .then((datos) => {
        if (activo) setMarcasApi(datos);
      })
      .catch(() => {
        // Los productos pueden mostrarse aunque falle la carga de marcas.
      });

    return () => {
      activo = false;
    };
  }, []);

  const cargarMejorValorados = useCallback(async () => {
    setCargandoMejorValorados(true);
    setErrorMejorValorados(null);
    try {
      const datos = await obtenerMejorValorados(10);
      setMejorValorados(datos);
    } catch (err) {
      setMejorValorados([]);
      setErrorMejorValorados(
        err instanceof Error
          ? err.message
          : "Error al cargar los productos mejor valorados.",
      );
    } finally {
      setCargandoMejorValorados(false);
    }
  }, []);

  const cargarMasDeseados = useCallback(async () => {
    setCargandoMasDeseados(true);
    setErrorMasDeseados(null);
    try {
      const datos = await obtenerMasDeseados(10);
      setMasDeseados(datos);
    } catch (err) {
      setMasDeseados([]);
      setErrorMasDeseados(
        err instanceof Error
          ? err.message
          : "Error al cargar los productos más deseados.",
      );
    } finally {
      setCargandoMasDeseados(false);
    }
  }, []);

  const cargarMasComentados = useCallback(async () => {
    setCargandoMasComentados(true);
    setErrorMasComentados(null);
    try {
      const datos = await obtenerMasComentados(10);
      setMasComentados(datos);
    } catch (err) {
      setMasComentados([]);
      setErrorMasComentados(
        err instanceof Error
          ? err.message
          : "Error al cargar los productos más comentados.",
      );
    } finally {
      setCargandoMasComentados(false);
    }
  }, []);

  const cargarOfertas = useCallback(async () => {
    setCargandoOfertas(true);
    setErrorOfertas(null);
    try {
      const datos = await obtenerOfertas(10);
      const validas = datos.filter(
        (oferta) =>
          typeof oferta.precioActual === "number" &&
          typeof oferta.precioReferencia === "number" &&
          oferta.precioActual > 0 &&
          oferta.precioReferencia > oferta.precioActual,
      );
      setOfertas(validas);
    } catch (err) {
      setOfertas([]);
      setErrorOfertas(
        err instanceof Error
          ? err.message
          : "Error al cargar las ofertas destacadas.",
      );
    } finally {
      setCargandoOfertas(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;

    obtenerMejorValorados(10)
      .then((datos) => {
        if (montado) setMejorValorados(datos);
      })
      .catch((err) => {
        if (montado) {
          setMejorValorados([]);
          setErrorMejorValorados(
            err instanceof Error
              ? err.message
              : "Error al cargar los productos mejor valorados.",
          );
        }
      })
      .finally(() => {
        if (montado) setCargandoMejorValorados(false);
      });

    obtenerMasDeseados(10)
      .then((datos) => {
        if (montado) setMasDeseados(datos);
      })
      .catch((err) => {
        if (montado) {
          setMasDeseados([]);
          setErrorMasDeseados(
            err instanceof Error
              ? err.message
              : "Error al cargar los productos más deseados.",
          );
        }
      })
      .finally(() => {
        if (montado) setCargandoMasDeseados(false);
      });

    obtenerMasComentados(10)
      .then((datos) => {
        if (montado) setMasComentados(datos);
      })
      .catch((err) => {
        if (montado) {
          setMasComentados([]);
          setErrorMasComentados(
            err instanceof Error
              ? err.message
              : "Error al cargar los productos más comentados.",
          );
        }
      })
      .finally(() => {
        if (montado) setCargandoMasComentados(false);
      });

    obtenerOfertas(10)
      .then((datos) => {
        if (montado) {
          const validas = datos.filter(
            (oferta) =>
              typeof oferta.precioActual === "number" &&
              typeof oferta.precioReferencia === "number" &&
              oferta.precioActual > 0 &&
              oferta.precioReferencia > oferta.precioActual,
          );
          setOfertas(validas);
        }
      })
      .catch((err) => {
        if (montado) {
          setOfertas([]);
          setErrorOfertas(
            err instanceof Error
              ? err.message
              : "Error al cargar las ofertas destacadas.",
          );
        }
      })
      .finally(() => {
        if (montado) setCargandoOfertas(false);
      });

    return () => {
      montado = false;
    };
  }, []);

  const cargarResenas = useCallback(async () => {
    setCargandoResenas(true);
    try {
      const datos = await obtenerResenas();
      setResenas(datos);
    } catch {
      // Si falla temporalmente la carga de reseñas, preservar la lista actual.
    } finally {
      setCargandoResenas(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarInicial() {
      try {
        const datos = await obtenerResenas();
        if (activo) {
          setResenas(datos);
        }
      } catch {
        // Si falla temporalmente la carga de reseñas, preservar lista vacía.
      } finally {
        if (activo) {
          setCargandoResenas(false);
        }
      }
    }

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  // El slider ya entrega el límite en COP: no hay nada que convertir.
  const limitePresupuestoCOP = presupuestoMax;

  const resumenOfertas = useResumenOfertas();
  const vistas = useMemo(
    () =>
      construirCatalogo({
        productos: productosBackend,
        categorias: categoriasApi,
        marcas: marcasApi,
        resumenOfertas,
      }),
    [productosBackend, categoriasApi, marcasApi, resumenOfertas],
  );

  const productosSugeridos = useMemo(
    () =>
      vistas
        .filter((producto) => producto.disponible)
        .slice(0, 5),
    [vistas],
  );

  // Productos activos del catálogo. TecReview no tiene un proceso de verificación de productos.
  const totalProductosRegistrados = useMemo(
    () => productosBackend.filter((producto) => producto.estado !== false).length,
    [productosBackend],
  );

  const totalEnPresupuesto = useMemo(
    () =>
      vistas.filter(
        (producto) =>
          producto.precioCOP > 0 &&
          producto.precioCOP <= limitePresupuestoCOP,
      ).length,
    [vistas, limitePresupuestoCOP],
  );

  const filtros = useMemo<FiltrosCatalogo>(
    () => ({
      busqueda,
      categorias: [],
      marcas: [],
      precioMin: 0,
      precioMax: Number.MAX_SAFE_INTEGER,
      caracteristicas: [],
    }),
    [busqueda],
  );

  const productosFiltrados = useMemo(
    () => filtrarProductos(vistas, filtros),
    [vistas, filtros],
  );

  // La búsqueda conserva sus resultados; el presupuesto no altera destacados.
  const hayFiltrosHome = busqueda.trim().length > 0;

  const productosDestacados = useMemo(
    () =>
      hayFiltrosHome
        ? productosFiltrados
        : seleccionarDestacados(productosFiltrados, mejorValorados),
    [hayFiltrosHome, productosFiltrados, mejorValorados],
  );
  // Fase 4 (H-12): alternativas reales solo cuando la búsqueda no encuentra nada.
  const alternativasBusqueda = useMemo(
    () =>
      busqueda.trim() && productosDestacados.length === 0
        ? buscarAlternativas(vistas, busqueda)
        : [],
    [busqueda, productosDestacados, vistas],
  );


  const mejorValoradosFiltrados = useMemo(
    () =>
      filtrarRanking(
        mejorValorados,
        busqueda,
      ),
    [mejorValorados, busqueda],
  );

  const masComentadosFiltrados = useMemo(
    () =>
      filtrarRanking(
        masComentados,
        busqueda,
      ),
    [masComentados, busqueda],
  );

  const masDeseadosFiltrados = useMemo(
    () =>
      filtrarRanking(
        masDeseados,
        busqueda,
      ),
    [masDeseados, busqueda],
  );

  const ofertasFiltradas = useMemo(
    () =>
      filtrarOfertas(
        ofertas,
        busqueda,
      ),
    [ofertas, busqueda],
  );

  const irAlDetalle = useCallback(
    (idProducto: number) => {
      if (typeof idProducto === "number" && Number.isSafeInteger(idProducto) && idProducto > 0) {
        router.push(`/productos/${idProducto}`);
      }
    },
    [router],
  );

  const verFichaRanking = useCallback(
    (
      item:
        | ProductoMejorValorado
        | ProductoMasComentado
        | ProductoOferta
        | ProductoDeseado,
    ) => {
      irAlDetalle(item.idProducto);
    },
    [irAlDetalle],
  );

  const abrirDetalle = useCallback(
    (vista: ProductoViewModel) => {
      irAlDetalle(vista.idProducto);
    },
    [irAlDetalle],
  );

  const idProductoEfectivo =
    idProductoComentario !== ""
      ? idProductoComentario
      : productosBackend.length > 0
        ? productosBackend[0].idProducto
        : "";

  const manejarEnvioComentario = async (
    evento: React.FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (!usuarioSesion) {
      setModalAuthAbierto(true);
      setErrorComentario("Debes iniciar sesión para publicar una opinión.");
      return;
    }

    if (!idProductoEfectivo) {
      setErrorComentario(
        "Por favor selecciona el dispositivo sobre el que deseas opinar.",
      );
      return;
    }

    if (!comentario.trim()) {
      setErrorComentario("Por favor escribe tu opinión antes de publicar.");
      return;
    }

    if (contieneLenguajeNoPermitido(comentario)) {
      setErrorComentario(
        MENSAJE_LENGUAJE_NO_PERMITIDO,
      );
      return;
    }

    setEnviandoComentario(true);
    setErrorComentario("");
    setAvisoComentario("");

    try {
      const nueva = await crearResena({
        idProducto: Number(idProductoEfectivo),
        comentario: comentario.trim(),
      });
      setComentario("");
      setAvisoComentario(
        esResenaPublica(nueva)
          ? "Tu opinión fue publicada."
          : MENSAJE_RESENA_EN_REVISION,
      );
      await cargarResenas();
    } catch (err) {
      setErrorComentario(
        err instanceof Error
          ? err.message
          : "No fue posible guardar tu opinión. Inténtalo de nuevo más tarde.",
      );
    } finally {
      setEnviandoComentario(false);
    }
  };

  const resenasFiltradas = useMemo(() => {
    if (!filtroComentarios.trim()) return resenas;
    const termino = normalizarTexto(filtroComentarios);
    return resenas.filter(
      (resena) =>
        normalizarTexto(resena.comentario).includes(termino) ||
        (resena.nombreUsuario
          ? normalizarTexto(resena.nombreUsuario).includes(termino)
          : false) ||
        (resena.nombreProducto
          ? normalizarTexto(resena.nombreProducto).includes(termino)
          : false),
    );
  }, [resenas, filtroComentarios]);

  const seleccionarTodos = useCallback(() => {
    setBusqueda("");
  }, []);

  return (
    <div className="theme-tecreview flex min-h-screen flex-col">
      <SiteHeader>
        <ResumenSesion
          cargando={cargandoAuth}
          usuario={usuarioSesion}
          error={errorSesion}
          esAdmin={esAdmin}
          esRepresentante={esRepre}
          onAbrirAuth={() => {
            limpiarError();
            setModalAuthAbierto(true);
          }}
          onCerrarSesion={cerrarSesion}
          onReintentar={reintentarSincronizacion}
          onAbrirAdmin={() => setModalAdminAbierto(true)}
        />
      </SiteHeader>

      <main className="flex-1 pb-20 md:pb-0">
        <section className="border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]">
          <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pt-14">
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
              <div className="flex flex-col gap-6 lg:col-span-7">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-blue)]/20 bg-[var(--color-brand-blue)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-blue)]">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-solid)]"
                      aria-hidden="true"
                    />
                    Catálogo y comparador de tecnología
                  </span>

                  <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
                    Encuentra y compara tu próximo dispositivo.
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-subtle)] sm:text-base">
                    Consulta fichas técnicas completas, análisis imparciales y
                    precios de referencia en pesos colombianos (COP).
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
                    Buscar dispositivos tecnológicos
                  </p>
                  <div ref={contenedorBusquedaRef}>
                    <SearchBar
                      value={busqueda}
                      onChange={setBusqueda}
                      placeholder="Busca por marca o modelo. Ej.: Galaxy S24, iPhone 16"
                      ariaLabel="Buscar dispositivos por marca o modelo"
                      onFocus={() => setBuscadorEnfocado(true)}
                      onBlur={(event) => {
                        const siguiente = event.relatedTarget as Node | null;
                        if (
                          !siguiente ||
                          !contenedorBusquedaRef.current?.contains(siguiente)
                        ) {
                          setBuscadorEnfocado(false);
                        }
                      }}
                    />
                    {buscadorEnfocado && !busqueda.trim() && (
                      <SugerenciasBusqueda
                        productos={productosSugeridos}
                        onSeleccionar={setBusqueda}
                      />
                    )}
                  </div>
                  {!cargandoApi && (
                    <EstadoBusquedaHome
                      busqueda={busqueda}
                      totalResultados={productosDestacados.length}
                      hayAlternativas={alternativasBusqueda.length > 0}
                    />
                  )}
                  <p className="mt-2 text-xs text-[var(--color-subtle)]">
                    Presupuesto de referencia: hasta{" "}
                    {formatearCOP(presupuestoMax)}. Confirma para ver productos
                    de todas las categorías en el catálogo general.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-subtle)]">
                    Explorar por categoría
                  </p>
                  <CategoriasHome onSeleccionarTodos={seleccionarTodos} />
                </div>

                <PresupuestoHome
                  presupuestoMax={presupuestoMax}
                  onCambiarPresupuesto={setPresupuestoMax}
                  onConfirmarPresupuesto={confirmarPresupuesto}
                  totalEnPresupuesto={totalEnPresupuesto}
                  totalProductos={vistas.length}
                />
              </div>

              <div className="lg:col-span-5">
                <OfertasHome
                  ofertas={ofertasFiltradas}
                  cargando={cargandoOfertas}
                  error={errorOfertas}
                  onReintentar={cargarOfertas}
                  mostrarTodas={mostrarTodasOfertas}
                  onAlternar={() => setMostrarTodasOfertas((previo) => !previo)}
                  onVerDetalle={verFichaRanking}
                  onReportar={(oferta) => {
                    setReporteConfirmado("");
                    setOfertaReportando({
                      idProducto: oferta.idProducto,
                      idEstablecimiento: oferta.idEstablecimiento,
                      nombreProducto: oferta.nombre,
                      nombreEstablecimiento: oferta.nombreEstablecimiento,
                    });
                  }}
                />
                {reporteConfirmado && (
                  <p role="status" className="mt-2 text-sm text-[var(--color-positive)]">
                    {reporteConfirmado}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <DestacadosHome
          productos={productosDestacados}
          totalRegistrados={totalProductosRegistrados}
          totalMostrados={productosDestacados.length}
          cargando={cargandoApi}
          estadoBackend={estadoBackend}
          error={errorProductos}
          onReintentar={recargarProductosCatalogo}
          busqueda={busqueda}
          onVerDetalle={abrirDetalle}
          onLimpiarBusqueda={() => setBusqueda("")}
          alternativas={alternativasBusqueda}
        />

        <RankingsHome
          mejorValorados={mejorValoradosFiltrados}
          cargandoMejorValorados={cargandoMejorValorados}
          errorMejorValorados={errorMejorValorados}
          onReintentarMejorValorados={cargarMejorValorados}
          mostrarTodosMejorValorados={mostrarTodosMejorValorados}
          onAlternarMejorValorados={() =>
            setMostrarTodosMejorValorados((previo) => !previo)
          }
          masComentados={masComentadosFiltrados}
          cargandoMasComentados={cargandoMasComentados}
          errorMasComentados={errorMasComentados}
          onReintentarMasComentados={cargarMasComentados}
          mostrarTodosComentados={mostrarTodosComentados}
          onAlternarComentados={() =>
            setMostrarTodosComentados((previo) => !previo)
          }
          masDeseados={masDeseadosFiltrados}
          cargandoMasDeseados={cargandoMasDeseados}
          errorMasDeseados={errorMasDeseados}
          onReintentarMasDeseados={cargarMasDeseados}
          onVerDetalle={verFichaRanking}
          sinValoraciones={mejorValorados.length === 0}
          sinComentarios={masComentados.length === 0}
          sinDeseos={masDeseados.length === 0}
        />

        <OpinionesHome
          usuario={usuarioSesion}
          resenas={resenas}
          resenasFiltradas={resenasFiltradas}
          cargando={cargandoResenas}
          filtro={filtroComentarios}
          onCambiarFiltro={setFiltroComentarios}
          onActualizar={cargarResenas}
          comentario={comentario}
          onCambiarComentario={setComentario}
          idProducto={idProductoEfectivo}
          onCambiarProducto={setIdProductoComentario}
          productos={productosBackend}
          enviando={enviandoComentario}
          error={errorComentario || null}
          aviso={avisoComentario || null}
          onPublicar={manejarEnvioComentario}
          onPedirLogin={() => setModalAuthAbierto(true)}
          onResenaEditada={(actualizada) => {
            setResenas((previas) => aplicarResenaEditada(previas, actualizada));
            if (!esResenaPublica(actualizada)) {
              setAvisoComentario(MENSAJE_RESENA_EDITADA_EN_REVISION);
            }
          }}
          onResenaEliminada={(idResena) =>
            setResenas((previas) =>
              previas.filter((previa) => previa.idResena !== idResena),
            )
          }
        />

        <CtaComparador />
      </main>

      <SiteFooter />
      <BottomNav />

      <AuthModal
        isOpen={modalAuthAbierto}
        onClose={() => setModalAuthAbierto(false)}
        onLoginSuccess={establecerUsuario}
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
            setModalAuthAbierto(true);
          }}
        />
      )}

      <AdminPanelModal
        isOpen={modalAdminAbierto}
        onClose={() => setModalAdminAbierto(false)}
        usuarioSesion={usuarioSesion}
        onProductoCambiado={recargarProductosCatalogo}
      />
    </div>
  );
}
