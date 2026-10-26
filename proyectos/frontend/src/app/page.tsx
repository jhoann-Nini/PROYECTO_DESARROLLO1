"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PRODUCTOS_MOCK } from "@/data/mockProductos";
import { construirCatalogo } from "@/data/catalogoApi";
import { filtrarProductos, type FiltrosCatalogo } from "@/data/catalogo";
import { normalizarPrecioCOP } from "@/data/precios";
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
import AuthModal from "@/components/AuthModal";
import AdminPanelModal from "@/components/AdminPanelModal";
import ResumenSesion from "@/components/home/ResumenSesion";
import CategoriasHome from "@/components/home/CategoriasHome";
import PresupuestoHome from "@/components/home/PresupuestoHome";
import OfertasHome from "@/components/home/OfertasHome";
import DestacadosHome from "@/components/home/DestacadosHome";
import RankingsHome from "@/components/home/RankingsHome";
import OpinionesHome from "@/components/home/OpinionesHome";
import CtaComparador from "@/components/home/CtaComparador";

interface ItemRankingFiltrable {
  nombre: string;
  descripcion: string | null;
  precioReferencia: number | null;
}

function coincideBusqueda(
  nombre: string,
  descripcion: string | null,
  termino: string,
): boolean {
  if (!termino) return true;
  return (
    normalizarTexto(nombre).includes(termino) ||
    (descripcion ? normalizarTexto(descripcion).includes(termino) : false)
  );
}

function filtrarRanking<T extends ItemRankingFiltrable>(
  items: T[],
  busqueda: string,
  filtrarPorPresupuesto: boolean,
  limitePresupuestoCOP: number,
): T[] {
  const termino = normalizarTexto(busqueda);

  return items.filter((item) => {
    if (termino) {
      // La búsqueda prevalece sobre el presupuesto.
      return coincideBusqueda(item.nombre, item.descripcion, termino);
    }

    if (!filtrarPorPresupuesto) return true;

    // Los rankings sin precio se conservan: no se inventa un valor.
    if (
      item.precioReferencia === null ||
      item.precioReferencia === undefined
    ) {
      return true;
    }

    return normalizarPrecioCOP(item.precioReferencia) <= limitePresupuestoCOP;
  });
}

function filtrarOfertas(
  ofertas: ProductoOferta[],
  busqueda: string,
  filtrarPorPresupuesto: boolean,
  limitePresupuestoCOP: number,
): ProductoOferta[] {
  const termino = normalizarTexto(busqueda);

  return ofertas.filter((oferta) => {
    if (termino) {
      return (
        coincideBusqueda(oferta.nombre, oferta.descripcion, termino) ||
        normalizarTexto(oferta.nombreEstablecimiento).includes(termino)
      );
    }

    if (!filtrarPorPresupuesto) return true;

    return normalizarPrecioCOP(oferta.precioActual) <= limitePresupuestoCOP;
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
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);

  const esAdmin = useMemo(() => esAdministrador(usuarioSesion), [usuarioSesion]);
  const esRepre = useMemo(
    () => esRepresentante(usuarioSesion),
    [usuarioSesion],
  );

  // Búsqueda y presupuesto
  const [busqueda, setBusqueda] = useState("");
  const [presupuestoMax, setPresupuestoMax] = useState<number>(1000);
  const [filtrarSoloEnPresupuesto, setFiltrarSoloEnPresupuesto] =
    useState(false);

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
  const [filtroComentarios, setFiltroComentarios] = useState("");

  const recargarProductosCatalogo = useCallback(async () => {
    try {
      const datos = await obtenerProductos<Producto>();
      if (datos && datos.length > 0) {
        setProductosBackend(datos);
        setEstadoBackend("online");
      } else {
        setProductosBackend(PRODUCTOS_MOCK);
        setEstadoBackend("offline");
      }
    } catch {
      setProductosBackend(PRODUCTOS_MOCK);
      setEstadoBackend("offline");
    }
  }, []);

  // Carga inicial: productos, categorías y marcas
  useEffect(() => {
    let activo = true;

    async function consultarApi() {
      const [resultadoProductos, resultadoCategorias, resultadoMarcas] =
        await Promise.allSettled([
          obtenerProductos<Producto>(),
          obtenerCategorias(),
          obtenerMarcas(),
        ]);

      if (!activo) return;

      if (resultadoCategorias.status === "fulfilled") {
        setCategoriasApi(resultadoCategorias.value);
      }
      if (resultadoMarcas.status === "fulfilled") {
        setMarcasApi(resultadoMarcas.value);
      }

      if (
        resultadoProductos.status === "fulfilled" &&
        resultadoProductos.value &&
        resultadoProductos.value.length > 0
      ) {
        setProductosBackend(resultadoProductos.value);
        setEstadoBackend("online");
      } else {
        setProductosBackend(PRODUCTOS_MOCK);
        setEstadoBackend("offline");
      }

      setCargandoApi(false);
    }

    consultarApi();

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

  const limitePresupuestoCOP = useMemo(
    () => normalizarPrecioCOP(presupuestoMax),
    [presupuestoMax],
  );

  const vistas = useMemo(
    () =>
      construirCatalogo({
        productos: productosBackend,
        categorias: categoriasApi,
        marcas: marcasApi,
      }),
    [productosBackend, categoriasApi, marcasApi],
  );

  const totalProductosVerificados = useMemo(
    () => productosBackend.filter((producto) => producto.estado !== false).length,
    [productosBackend],
  );

  const totalEnPresupuesto = useMemo(
    () =>
      vistas.filter(
        (producto) =>
          producto.disponible &&
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
      precioMax:
        filtrarSoloEnPresupuesto && !busqueda.trim()
          ? limitePresupuestoCOP
          : Number.MAX_SAFE_INTEGER,
      caracteristicas: [],
    }),
    [busqueda, filtrarSoloEnPresupuesto, limitePresupuestoCOP],
  );

  const productosFiltrados = useMemo(
    () => filtrarProductos(vistas, filtros),
    [vistas, filtros],
  );

  const mejorValoradosFiltrados = useMemo(
    () =>
      filtrarRanking(
        mejorValorados,
        busqueda,
        filtrarSoloEnPresupuesto,
        limitePresupuestoCOP,
      ),
    [mejorValorados, busqueda, filtrarSoloEnPresupuesto, limitePresupuestoCOP],
  );

  const masComentadosFiltrados = useMemo(
    () =>
      filtrarRanking(
        masComentados,
        busqueda,
        filtrarSoloEnPresupuesto,
        limitePresupuestoCOP,
      ),
    [masComentados, busqueda, filtrarSoloEnPresupuesto, limitePresupuestoCOP],
  );

  const masDeseadosFiltrados = useMemo(
    () =>
      filtrarRanking(
        masDeseados,
        busqueda,
        filtrarSoloEnPresupuesto,
        limitePresupuestoCOP,
      ),
    [masDeseados, busqueda, filtrarSoloEnPresupuesto, limitePresupuestoCOP],
  );

  const ofertasFiltradas = useMemo(
    () =>
      filtrarOfertas(
        ofertas,
        busqueda,
        filtrarSoloEnPresupuesto,
        limitePresupuestoCOP,
      ),
    [ofertas, busqueda, filtrarSoloEnPresupuesto, limitePresupuestoCOP],
  );

  const irAlDetalle = useCallback(
    (idProducto: number) => {
      router.push(`/productos/${idProducto}`);
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

  const palabrasMaliciosas = [
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

    const esMalicioso = palabrasMaliciosas.some((palabra) =>
      comentario.toLowerCase().includes(palabra),
    );

    if (esMalicioso) {
      setErrorComentario(
        "El comentario contiene palabras no permitidas. Por favor mantén un lenguaje respetuoso.",
      );
      setComentario("");
      return;
    }

    setEnviandoComentario(true);
    setErrorComentario("");

    try {
      await crearResena({
        idProducto: Number(idProductoEfectivo),
        comentario: comentario.trim(),
      });
      setComentario("");
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
    setFiltrarSoloEnPresupuesto(false);
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
                  <SearchBar
                    value={busqueda}
                    onChange={setBusqueda}
                    placeholder="Buscar por marca, modelo o categoría (ej. Xiaomi, Samsung, Lenovo)..."
                    ariaLabel="Buscar dispositivos por marca, modelo o características"
                  />
                  <p className="mt-2 text-xs text-[var(--color-subtle)]">
                    Presupuesto de referencia: hasta{" "}
                    {formatearCOP(presupuestoMax)}. Activa el filtro para
                    aplicarlo al catálogo.
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
                  totalEnPresupuesto={totalEnPresupuesto}
                  totalProductos={totalProductosVerificados}
                  filtrarSolo={filtrarSoloEnPresupuesto}
                  onAlternarFiltro={() =>
                    setFiltrarSoloEnPresupuesto((previo) => !previo)
                  }
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
                />
              </div>
            </div>
          </div>
        </section>

        <DestacadosHome
          productos={productosFiltrados}
          totalVerificados={totalProductosVerificados}
          totalMostrados={productosFiltrados.length}
          cargando={cargandoApi}
          estadoBackend={estadoBackend}
          busqueda={busqueda}
          filtroPresupuesto={filtrarSoloEnPresupuesto}
          presupuestoMax={presupuestoMax}
          limitePresupuestoCOP={limitePresupuestoCOP}
          onVerDetalle={abrirDetalle}
          onLimpiarBusqueda={() => setBusqueda("")}
          onMostrarTodos={() => setFiltrarSoloEnPresupuesto(false)}
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
          onPublicar={manejarEnvioComentario}
          onPedirLogin={() => setModalAuthAbierto(true)}
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

      <AdminPanelModal
        isOpen={modalAdminAbierto}
        onClose={() => setModalAdminAbierto(false)}
        usuarioSesion={usuarioSesion}
        onProductoCambiado={recargarProductosCatalogo}
      />
    </div>
  );
}
