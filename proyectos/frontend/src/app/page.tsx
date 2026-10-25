/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  obtenerProductos,
  obtenerMiPerfil,
  mapearPerfilABusinessSession,
  obtenerResenas,
  crearResena,
  type ResenaResponse,
  ApiError,
  obtenerMejorValorados,
  obtenerMasDeseados,
  obtenerOfertas,
  obtenerMasComentados,
} from "@/services/api";
import {
  type Producto,
  type DispositivoKimovil,
  type UsuarioSesion,
  type ProductoMejorValorado,
  type ProductoDeseado,
  type ProductoMasComentado,
  type ProductoOferta,
  esAdministrador,
  esRepresentante,
} from "@/types/producto";
import {
  PRODUCTOS_MOCK,
} from "@/data/mockProductos";
import {
  CATEGORIAS_NAVEGABLES,
  obtenerRutaCategoria,
} from "@/lib/categorias";
import RankingItem from "@/components/RankingItem";
import ProductCard from "@/components/ProductCard";
import AuthModal from "@/components/AuthModal";
import FichaTecnicaModal from "@/components/FichaTecnicaModal";
import AdminPanelModal from "@/components/AdminPanelModal";
import ProductImagePlaceholder from "@/components/ProductImagePlaceholder";
import GeometricBackground from "@/components/GeometricBackground";
import { formatearCOP } from "@/data/specsHelper";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type CategoriaDispositivo = "todos" | "moviles" | "tablets" | "laptops" | "auriculares";

export default function Home() {
  // Estado de backend
  const [productosBackend, setProductosBackend] = useState<Producto[]>([]);
  const [cargandoApi, setCargandoApi] = useState(true);
  const [estadoBackend, setEstadoBackend] = useState<"online" | "offline">("offline");

  // Estado de Autenticación y Roles
  const [usuarioSesion, setUsuarioSesion] = useState<UsuarioSesion | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);

  // Verificación estricta de roles desde los datos confirmados por el backend
  const esAdmin = useMemo(() => esAdministrador(usuarioSesion), [usuarioSesion]);
  const esRepre = useMemo(() => esRepresentante(usuarioSesion), [usuarioSesion]);

  // Estado de Ficha Técnica Modal
  const [productoSeleccionado, setProductoSeleccionado] = useState<DispositivoKimovil | Producto | null>(null);

  // Filtros interactivos
  const [busqueda, setBusqueda] = useState("");
  const [tipoDispositivo, setTipoDispositivo] = useState<CategoriaDispositivo>("todos");
  const [presupuestoMax, setPresupuestoMax] = useState<number>(1000);
  const [filtrarSoloEnPresupuesto, setFiltrarSoloEnPresupuesto] = useState(false);

  // Estados de vista
  const [mostrarTodosMejorValorados, setMostrarTodosMejorValorados] = useState(false);
  const [mostrarTodosComentados, setMostrarTodosComentados] = useState(false);
  const [mostrarTodasOfertas, setMostrarTodasOfertas] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<"ranking" | "catalogo">("ranking");

  // Estados de Rankings Reales del Backend (Fase 4.5)
  const [mejorValorados, setMejorValorados] = useState<ProductoMejorValorado[]>([]);
  const [cargandoMejorValorados, setCargandoMejorValorados] = useState(true);
  const [errorMejorValorados, setErrorMejorValorados] = useState<string | null>(null);

  const [masDeseados, setMasDeseados] = useState<ProductoDeseado[]>([]);
  const [cargandoMasDeseados, setCargandoMasDeseados] = useState(true);
  const [errorMasDeseados, setErrorMasDeseados] = useState<string | null>(null);

  const [masComentados, setMasComentados] = useState<ProductoMasComentado[]>([]);
  const [cargandoMasComentados, setCargandoMasComentados] = useState(true);
  const [errorMasComentados, setErrorMasComentados] = useState<string | null>(null);

  const [ofertas, setOfertas] = useState<ProductoOferta[]>([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [errorOfertas, setErrorOfertas] = useState<string | null>(null);

  // Opiniones de la comunidad persistidas
  const [comentario, setComentario] = useState("");
  const [idProductoComentario, setIdProductoComentario] = useState<number | "">("");
  const [resenas, setResenas] = useState<ResenaResponse[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(true);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [errorComentario, setErrorComentario] = useState("");
  const [filtroComentarios, setFiltroComentarios] = useState("");


  // Asegurar modo oscuro permanente y sincronizar sesión real de Supabase al montar
  useEffect(() => {
    try {
      document.documentElement.classList.add("dark");
    } catch {}

    // Sincronización con Supabase Auth y aprovisionamiento de perfil en Spring Boot
    let montado = true;
    let ultimoTokenProcesado: string | null = null;
    let peticionEnVuelo: Promise<void> | null = null;
    let suscripcion: { unsubscribe: () => void } | null = null;

    async function sincronizarPerfil(session: Session | null) {
      if (!session?.access_token || !session.user) {
        ultimoTokenProcesado = null;
        if (montado) {
          setUsuarioSesion(null);
          setCargandoAuth(false);
        }
        return;
      }

      // Evitar peticiones duplicadas cuando onAuthStateChange y getSession coincidan
      if (session.access_token === ultimoTokenProcesado) {
        if (peticionEnVuelo) {
          await peticionEnVuelo;
        }
        return;
      }

      ultimoTokenProcesado = session.access_token;
      if (montado) {
        setCargandoAuth(true);
        setErrorSesion(null);
      }

      const tarea = (async () => {
        try {
          const perfil = await obtenerMiPerfil(session.access_token);
          if (montado) {
            setUsuarioSesion(mapearPerfilABusinessSession(perfil, session.user));
            setErrorSesion(null);
          }
        } catch (err) {
          const esErrorDefinitivo =
            err instanceof ApiError &&
            (err.status === 401 || err.status === 403 || err.status === 409);

          const mensaje =
            err instanceof Error
              ? err.message
              : "No fue posible verificar tu perfil en el servidor.";

          if (esErrorDefinitivo) {
            // Rechazo definitivo de identidad o autorización (H-02):
            ultimoTokenProcesado = null;
            if (montado) {
              setUsuarioSesion(null);
              setErrorSesion(mensaje);
            }
            // Revocar sesión local en Supabase para evitar bucles o sesiones huérfanas
            try {
              const supabase = createClient();
              await supabase.auth.signOut({ scope: "local" });
            } catch {}
          } else {
            // Error transitorio (ej. microcorte de red o indisponibilidad del backend) (H-04):
            // Preservar el perfil previamente validado si ya existía para no expulsar al usuario
            if (montado) {
              setErrorSesion(mensaje);
              setUsuarioSesion((prev) => (prev ? prev : null));
            }
          }
        } finally {
          if (montado) {
            setCargandoAuth(false);
          }
        }
      })();

      peticionEnVuelo = tarea;
      await tarea;
      if (peticionEnVuelo === tarea) {
        peticionEnVuelo = null;
      }
    }

    try {
      const supabase = createClient();

      // 1. Suscribirse prioritariamente a los eventos de autenticación
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!montado) return;
        sincronizarPerfil(session);
      });
      suscripcion = authListener.subscription;

      // 2. getSession() de respaldo si onAuthStateChange aún no sincronizó
      supabase.auth
        .getSession()
        .then(({ data: { session }, error }) => {
          if (!montado || error) return;
          sincronizarPerfil(session);
        })
        .catch(() => {
          if (montado) {
            setCargandoAuth(false);
          }
        });
    } catch {
      // Si las variables de Supabase no están configuradas en el entorno
      queueMicrotask(() => {
        if (montado) {
          setCargandoAuth(false);
        }
      });
    }

    return () => {
      montado = false;
      suscripcion?.unsubscribe();
    };
  }, []);

  // Consulta y actualización del catálogo de productos del backend
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

  // Consulta al backend en Spring Boot
  useEffect(() => {
    let activo = true;

    async function consultarApi() {
      try {
        const datos = await obtenerProductos<Producto>();
        if (activo) {
          if (datos && datos.length > 0) {
            setProductosBackend(datos);
            setEstadoBackend("online");
          } else {
            setProductosBackend(PRODUCTOS_MOCK);
            setEstadoBackend("offline");
          }
        }
      } catch {
        if (!activo) return;
        setProductosBackend(PRODUCTOS_MOCK);
        setEstadoBackend("offline");
      } finally {
        if (activo) setCargandoApi(false);
      }
    }

    consultarApi();

    return () => {
      activo = false;
    };
  }, []);

  // Consulta de Rankings Reales del Backend (Fase 4.5)
  const cargarMejorValorados = useCallback(async () => {
    setCargandoMejorValorados(true);
    setErrorMejorValorados(null);
    try {
      const datos = await obtenerMejorValorados(10);
      setMejorValorados(datos);
    } catch (err) {
      setMejorValorados([]);
      setErrorMejorValorados(
        err instanceof Error ? err.message : "Error al cargar los productos mejor valorados."
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
        err instanceof Error ? err.message : "Error al cargar los productos más deseados."
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
        err instanceof Error ? err.message : "Error al cargar los productos más comentados."
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
        (o) =>
          typeof o.precioActual === "number" &&
          typeof o.precioReferencia === "number" &&
          o.precioActual > 0 &&
          o.precioReferencia > o.precioActual
      );
      setOfertas(validas);
    } catch (err) {
      setOfertas([]);
      setErrorOfertas(
        err instanceof Error ? err.message : "Error al cargar las ofertas destacadas."
      );
    } finally {
      setCargandoOfertas(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;

    // Consultar rankings en paralelo para optimizar la carga inicial
    obtenerMejorValorados(10)
      .then((datos) => {
        if (montado) setMejorValorados(datos);
      })
      .catch((err) => {
        if (montado) {
          setMejorValorados([]);
          setErrorMejorValorados(
            err instanceof Error ? err.message : "Error al cargar los productos mejor valorados."
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
            err instanceof Error ? err.message : "Error al cargar los productos más deseados."
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
            err instanceof Error ? err.message : "Error al cargar los productos más comentados."
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
            (o) =>
              typeof o.precioActual === "number" &&
              typeof o.precioReferencia === "number" &&
              o.precioActual > 0 &&
              o.precioReferencia > o.precioActual
          );
          setOfertas(validas);
        }
      })
      .catch((err) => {
        if (montado) {
          setOfertas([]);
          setErrorOfertas(
            err instanceof Error ? err.message : "Error al cargar las ofertas destacadas."
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

  // Función auxiliar para filtrar por categoría
  const matchCatRanking = useCallback((idCategoria: number, tipo: CategoriaDispositivo) => {
    if (tipo === "todos") return true;
    if (tipo === "moviles") return idCategoria === 1;
    if (tipo === "tablets") return idCategoria === 2;
    if (tipo === "laptops") return idCategoria === 3;
    if (tipo === "auriculares") return idCategoria === 4;
    return true;
  }, []);

  // Filtrado de rankings
  const mejorValoradosFiltrados = useMemo(() => {
    const limiteCOP = presupuestoMax < 10000 ? presupuestoMax * 4000 : presupuestoMax;
    return mejorValorados.filter((item) => {
      const matchBusqueda =
        !busqueda.trim() ||
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
      const precioItemCOP =
        item.precioReferencia !== null && item.precioReferencia !== undefined
          ? (item.precioReferencia < 10000 ? item.precioReferencia * 4000 : item.precioReferencia)
          : null;
      const matchPrecio =
        busqueda.trim().length > 0 ||
        precioItemCOP === null ||
        presupuestoMax >= 1500 ||
        precioItemCOP <= limiteCOP;
      const matchCat = matchCatRanking(item.idCategoria, tipoDispositivo);
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [mejorValorados, busqueda, presupuestoMax, tipoDispositivo, matchCatRanking]);

  const masComentadosFiltrados = useMemo(() => {
    const limiteCOP = presupuestoMax < 10000 ? presupuestoMax * 4000 : presupuestoMax;
    return masComentados.filter((item) => {
      const matchBusqueda =
        !busqueda.trim() ||
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
      const precioItemCOP =
        item.precioReferencia !== null && item.precioReferencia !== undefined
          ? (item.precioReferencia < 10000 ? item.precioReferencia * 4000 : item.precioReferencia)
          : null;
      const matchPrecio =
        busqueda.trim().length > 0 ||
        precioItemCOP === null ||
        presupuestoMax >= 1500 ||
        precioItemCOP <= limiteCOP;
      const matchCat = matchCatRanking(item.idCategoria, tipoDispositivo);
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [masComentados, busqueda, presupuestoMax, tipoDispositivo, matchCatRanking]);

  const masDeseadosFiltrados = useMemo(() => {
    const limiteCOP = presupuestoMax < 10000 ? presupuestoMax * 4000 : presupuestoMax;
    return masDeseados.filter((item) => {
      const matchBusqueda =
        !busqueda.trim() ||
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
      const precioItemCOP =
        item.precioReferencia !== null && item.precioReferencia !== undefined
          ? (item.precioReferencia < 10000 ? item.precioReferencia * 4000 : item.precioReferencia)
          : null;
      const matchPrecio =
        busqueda.trim().length > 0 ||
        precioItemCOP === null ||
        presupuestoMax >= 1500 ||
        precioItemCOP <= limiteCOP;
      const matchCat = matchCatRanking(item.idCategoria, tipoDispositivo);
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [masDeseados, busqueda, presupuestoMax, tipoDispositivo, matchCatRanking]);

  const ofertasFiltradas = useMemo(() => {
    const limiteCOP = presupuestoMax < 10000 ? presupuestoMax * 4000 : presupuestoMax;
    return ofertas.filter((item) => {
      const matchBusqueda =
        !busqueda.trim() ||
        item.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(busqueda.toLowerCase())) ||
        (item.nombreEstablecimiento && item.nombreEstablecimiento.toLowerCase().includes(busqueda.toLowerCase()));
      const precioItemCOP =
        item.precioActual < 10000 ? item.precioActual * 4000 : item.precioActual;
      const matchPrecio =
        busqueda.trim().length > 0 ||
        presupuestoMax >= 1500 ||
        precioItemCOP <= limiteCOP;
      const matchCat = matchCatRanking(item.idCategoria, tipoDispositivo);
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [ofertas, busqueda, presupuestoMax, tipoDispositivo, matchCatRanking]);

  // Conversión de elemento de ranking hacia Producto para ver su Ficha Técnica
  const verFichaRanking = useCallback(
    (item: ProductoMejorValorado | ProductoMasComentado | ProductoOferta | ProductoDeseado) => {
      setProductoSeleccionado({
        idProducto: item.idProducto,
        nombre: item.nombre,
        descripcion: item.descripcion,
        idCategoria: item.idCategoria,
        idMarca: item.idMarca,
        imagen: item.imagen,
        precioReferencia:
          "precioActual" in item && typeof item.precioActual === "number"
            ? item.precioActual
            : item.precioReferencia,
        estado: true,
        caracteristicas: item.caracteristicas,
      });
    },
    []
  );

  // Límite de presupuesto en COP para comparaciones numéricas precisas
  const limitePresupuestoCOP = useMemo(() => {
    return presupuestoMax < 10000 ? presupuestoMax * 4000 : presupuestoMax;
  }, [presupuestoMax]);

  // Contadores del catálogo y verificación de plataforma
  const totalProductosVerificados = useMemo(() => {
    return productosBackend.filter((p) => p.estado !== false).length;
  }, [productosBackend]);

  const totalEnPresupuesto = useMemo(() => {
    return productosBackend.filter((p) => {
      if (p.estado === false) return false;
      if (p.precioReferencia === null || p.precioReferencia === undefined) return true;
      const precioCOP =
        p.precioReferencia < 10000 ? p.precioReferencia * 4000 : p.precioReferencia;
      return precioCOP <= limitePresupuestoCOP;
    }).length;
  }, [productosBackend, limitePresupuestoCOP]);

  // Filtrado de catálogo
  const productosBackendFiltrados = useMemo(() => {
    return productosBackend.filter((p) => {
      const matchBusqueda =
        !busqueda.trim() ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase())) ||
        (p.nombreMarca && p.nombreMarca.toLowerCase().includes(busqueda.toLowerCase()));

      let matchCat = true;
      if (tipoDispositivo !== "todos") {
        const nomCat = (p.nombreCategoria || "").toLowerCase();
        if (tipoDispositivo === "moviles") {
          matchCat =
            p.idCategoria === 1 ||
            nomCat.includes("móvil") ||
            nomCat.includes("movil") ||
            nomCat.includes("celular");
        } else if (tipoDispositivo === "tablets") {
          matchCat = p.idCategoria === 2 || nomCat.includes("tablet");
        } else if (tipoDispositivo === "laptops") {
          matchCat =
            p.idCategoria === 3 ||
            nomCat.includes("laptop") ||
            nomCat.includes("computador") ||
            nomCat.includes("pc") ||
            nomCat.includes("portatil") ||
            nomCat.includes("portátil");
        } else if (tipoDispositivo === "auriculares") {
          matchCat =
            p.idCategoria === 4 ||
            nomCat.includes("auricular") ||
            nomCat.includes("audífono") ||
            nomCat.includes("audifono") ||
            nomCat.includes("headphone") ||
            nomCat.includes("ear");
        }
      }

      // El presupuesto funciona como un filtro explícito:
      // 1. En la vista general, no excluye productos a menos que el usuario lo active
      //    explícitamente con "filtrarSoloEnPresupuesto".
      // 2. Si el usuario busca un modelo concreto (busqueda.trim()), la búsqueda prevalece
      //    para localizar el producto independientemente del presupuesto.
      let matchPrecio = true;
      if (filtrarSoloEnPresupuesto && !busqueda.trim()) {
        if (p.precioReferencia !== null && p.precioReferencia !== undefined) {
          const precioCOP =
            p.precioReferencia < 10000 ? p.precioReferencia * 4000 : p.precioReferencia;
          matchPrecio = precioCOP <= limitePresupuestoCOP;
        }
      }

      return matchBusqueda && matchCat && matchPrecio;
    });
  }, [
    productosBackend,
    busqueda,
    tipoDispositivo,
    filtrarSoloEnPresupuesto,
    limitePresupuestoCOP,
  ]);

  // Carga y consulta de opiniones persistidas
  const cargarResenas = useCallback(async () => {
    setCargandoResenas(true);
    try {
      const datos = await obtenerResenas();
      setResenas(datos);
    } catch {
      // Si falla temporalmente la carga de reseñas, preservar lista vacía
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
        // Si falla temporalmente la carga de reseñas, preservar lista vacía
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

  // ID del producto seleccionado para comentar en la sección comunitaria
  const idProductoEfectivo =
    idProductoComentario !== ""
      ? idProductoComentario
      : productosBackend.length > 0
        ? productosBackend[0].idProducto
        : "";

  // Manejo de opiniones persistidas
  const palabrasMaliciosas = ["spam", "insulto", "estafa", "odio", "tonto", "idiota", "fraude", "mierda", "puta"];
  const manejarEnvioComentario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioSesion) {
      setModalAuthAbierto(true);
      setErrorComentario("Debes iniciar sesión para publicar una opinión.");
      return;
    }

    if (!idProductoEfectivo) {
      setErrorComentario("Por favor selecciona el dispositivo sobre el que deseas opinar.");
      return;
    }

    if (!comentario.trim()) {
      setErrorComentario("Por favor escribe tu opinión antes de publicar.");
      return;
    }

    const esMalicioso = palabrasMaliciosas.some((palabra) =>
      comentario.toLowerCase().includes(palabra)
    );

    if (esMalicioso) {
      setErrorComentario("El comentario contiene palabras no permitidas. Por favor mantén un lenguaje respetuoso.");
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
          : "No fue posible guardar tu opinión. Inténtalo de nuevo más tarde."
      );
    } finally {
      setEnviandoComentario(false);
    }
  };

  const resenasFiltradas = useMemo(() => {
    if (!filtroComentarios.trim()) return resenas;
    const term = filtroComentarios.toLowerCase();
    return resenas.filter(
      (r) =>
        r.comentario.toLowerCase().includes(term) ||
        (r.nombreUsuario && r.nombreUsuario.toLowerCase().includes(term)) ||
        (r.nombreProducto && r.nombreProducto.toLowerCase().includes(term))
    );
  }, [resenas, filtroComentarios]);


  const cerrarSesion = async () => {
    setErrorSesion(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error al revocar sesión en Supabase:", error.message);
        // Respaldo: intentar revocación local para que los tokens del navegador no queden huérfanos
        try {
          const { error: errorLocal } = await supabase.auth.signOut({ scope: "local" });
          if (errorLocal) {
            setErrorSesion("No fue posible cerrar la sesión. Inténtalo de nuevo.");
            return;
          }
          // El cierre local de respaldo tuvo éxito
          setUsuarioSesion(null);
        } catch {
          setErrorSesion("Error de conexión al cerrar la sesión.");
          return;
        }
      } else {
        // Cierre exitoso tanto en servidor como localmente
        setUsuarioSesion(null);
      }
    } catch (err) {
      console.error("Error al conectar con Supabase:", err);
      setErrorSesion("Error al conectar con el servicio de autenticación.");
    }
  };

  const reintentarSincronizacion = async () => {
    setErrorSesion(null);
    setCargandoAuth(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const perfil = await obtenerMiPerfil(session.access_token);
        setUsuarioSesion(mapearPerfilABusinessSession(perfil, session.user));
        setErrorSesion(null);
      } else {
        setUsuarioSesion(null);
      }
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al reintentar la conexión.";
      setErrorSesion(mensaje);
    } finally {
      setCargandoAuth(false);
    }
  };

  return (
    <div className="relative min-h-screen dark text-slate-100 transition-colors duration-300">
      
      {/* FONDO GEOMÉTRICO BICOLOR (MODO OSCURO) */}
      <GeometricBackground tema="oscuro" />

      {/* ─────────────────────────────────────────────────────────────
          BARRA SUPERIOR Y SESIÓN
      ───────────────────────────────────────────────────────────── */}
      <nav aria-label="Navegación superior" className="sticky top-0 z-30 border-b border-line/80 bg-[#090714]/80 px-4 py-3 text-xs backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-brand flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-widest text-white sm:text-base">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
              Tec<span className="text-blue-400">Review</span>
              <span className="text-red-500">.</span>
            </span>
            <span className="hidden md:inline text-line">|</span>
            <span className="hidden md:inline text-slate-500 font-medium">
              Plataforma de Reseñas y Especificaciones Técnicas
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Enlace Explorador API disponible para navegación rápida */}
            <Link
              href="/productos"
              className="hidden items-center gap-1 rounded-full border border-line/80 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-blue-500/50 hover:text-blue-300 sm:inline-flex"
              title="Explorar catálogo directo del backend"
            >
              Catálogo API
            </Link>

            {/* Enlace de Administración: visible ÚNICAMENTE para Administradores confirmados por el backend */}
            {esAdmin && (
              <a
                href="#administracion"
                onClick={(e) => {
                  e.preventDefault();
                  setModalAdminAbierto(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:border-red-400/60 hover:bg-red-500/15 hover:text-red-200 cursor-pointer"
                aria-label="Panel de administración"
                title="Panel de administración (Rol verificado en servidor)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true"></span>
                <span className="hidden sm:inline">Administración</span>
                <span className="sm:hidden">Admin</span>
              </a>
            )}

            {/* Control de sesión */}
            {errorSesion && (
              <span className="text-[11px] text-red-600 dark:text-red-400 font-medium mr-1 inline-flex items-center gap-1.5" role="alert">
                <span>⚠️ {errorSesion}</span>
                <button
                  type="button"
                  onClick={reintentarSincronizacion}
                  className="underline hover:no-underline font-bold text-blue-700 dark:text-blue-400 cursor-pointer"
                  title="Reintentar verificación con el servidor"
                >
                  Reintentar
                </button>
              </span>
            )}
            {cargandoAuth ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 animate-pulse px-2 py-1">
                Verificando...
              </span>
            ) : usuarioSesion ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                    esAdmin
                      ? "text-red-200 bg-red-950/40 border-red-800/60"
                      : esRepre
                      ? "text-amber-200 bg-amber-950/40 border-amber-800/60"
                      : "border-line bg-surface-2/60 text-slate-200"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      esAdmin
                        ? "bg-red-500"
                        : esRepre
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  ></span>
                  {usuarioSesion.nombre}
                  {usuarioSesion.rol && (
                    <span
                      className={`text-[10px] font-normal ${
                        esAdmin
                          ? "text-red-400"
                          : esRepre
                          ? "text-amber-400"
                          : "text-blue-300"
                      }`}
                    >
                      • {usuarioSesion.rol}
                    </span>
                  )}
                </span>
                <button
                  onClick={cerrarSesion}
                  className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Cerrar sesión"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setErrorSesion(null);
                  setModalAuthAbierto(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-control bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-brand-hover active:scale-[0.98] cursor-pointer"
              >
                <span aria-hidden="true">🔑</span> Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          CABECERA PRINCIPAL (BANNER HERO CON FONDO TRASLÚCIDO)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line/70 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          
          {/* Fila de Marca (sin la caja TR) y Categorías */}
          <div className="flex flex-col gap-6 border-b border-line/70 pb-8 md:flex-row md:items-center md:justify-between">
            {/* Título de Marca Limpio */}
            <div className="flex items-center">
              <div>
                <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-black tracking-wider text-white uppercase" aria-label="TecReview">
                  Tec<span className="text-blue-400">Review</span><span className="text-red-500">.</span>
                </h1>
                <p className="mt-1 text-[13px] font-medium text-slate-500">
                  Guía de compra y especificaciones técnicas
                </p>
              </div>
            </div>

            {/* Selector de Categorías Accesible con navegación a páginas propias */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Explorar por categoría">
              <button
                type="button"
                onClick={() => setTipoDispositivo("todos")}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                  tipoDispositivo === "todos"
                    ? "border-blue-500/60 bg-blue-600 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
                    : "border-line bg-surface-1/80 text-slate-300 hover:border-blue-500/40 hover:bg-surface-2 hover:text-white"
                }`}
              >
                <span aria-hidden="true">📱</span>
                Todos
              </button>

              {CATEGORIAS_NAVEGABLES.map((categoria) => (
                <Link
                  key={categoria.slug}
                  href={obtenerRutaCategoria(categoria.slug)}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface-1/80 px-4 py-2 text-[13px] font-medium text-slate-300 transition-all duration-200 hover:border-blue-500/40 hover:bg-surface-2 hover:text-white"
                  title={`Ver todos los productos de ${categoria.etiqueta}`}
                >
                  <span aria-hidden="true">{categoria.icono}</span>
                  {categoria.etiqueta}
                </Link>
              ))}
            </div>
          </div>

          {/* Cuerpo Central del Banner */}
          <div className="grid grid-cols-1 gap-6 pt-8 lg:grid-cols-12 lg:gap-10">
            
            {/* Columna Izquierda: Buscador y Slider de Presupuesto (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between gap-6">
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  Catálogo y comparador de tecnología
                </span>

                <h2 className="max-w-2xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-4xl md:text-5xl">
                  Encuentra y compara tu próximo dispositivo.
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                  Consulta fichas técnicas completas, análisis imparciales y precios de referencia en pesos colombianos (COP).
                </p>
              </div>

              {/* Buscador Rápido Accesible */}
              <div>
                <label htmlFor="buscador-principal" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Buscar dispositivos tecnológicos
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 flex items-center pointer-events-none text-slate-400" aria-hidden="true">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="buscador-principal"
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por marca, modelo o categoría (ej. Xiaomi, Samsung, Lenovo)..."
                    aria-label="Buscar dispositivos por marca, modelo o características"
                    className="w-full rounded-control border border-line bg-surface-1/90 py-3.5 pl-12 pr-24 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda("")}
                      aria-label="Borrar texto de búsqueda"
                      className="absolute right-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-white cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Filtrando por categoría ({tipoDispositivo}) y presupuesto hasta {formatearCOP(presupuestoMax)}.
                </p>
              </div>

              {/* Slider de Presupuesto en COP */}
              <div className="rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span className="text-sm font-semibold text-slate-200">
                      Presupuesto máximo
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5">
                    <span className="text-[11px] font-medium text-slate-400">Hasta:</span>
                    <span className="text-sm font-semibold tracking-tight text-blue-300">
                      {formatearCOP(presupuestoMax)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="50"
                    max="1500"
                    step="25"
                    value={presupuestoMax}
                    onChange={(e) => setPresupuestoMax(Number(e.target.value))}
                    aria-label="Ajustar presupuesto máximo en pesos colombianos"
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-blue-500"
                  />
                  <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>Mínimo: $ 200.000 COP</span>
                    <span className="font-semibold text-blue-300">
                      Límite: {formatearCOP(presupuestoMax)}
                    </span>
                    <span>Máximo: $ 6.000.000+ COP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Ofertas Destacadas (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="flex h-full flex-col rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-line/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                    <h3 className="text-sm font-semibold text-white">
                      Ofertas destacadas
                    </h3>
                  </div>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-300">
                    En promoción ({ofertasFiltradas.length})
                  </span>
                </div>

                {/* Lista de ofertas */}
                <div className="space-y-3 flex-1">
                  {cargandoOfertas ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-blue-500"></div>
                      <p className="mt-3 text-xs text-slate-500">Cargando ofertas reales...</p>
                    </div>
                  ) : errorOfertas ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center">
                      <div className="w-full rounded-control border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-xs">
                        <p className="font-medium text-red-300">⚠️ {errorOfertas}</p>
                        <button
                          type="button"
                          onClick={cargarOfertas}
                          aria-label="Reintentar ofertas"
                          className="mt-2 text-xs font-semibold text-blue-300 underline decoration-blue-500/40 underline-offset-4 transition-colors hover:text-blue-200 hover:no-underline cursor-pointer"
                        >
                          Reintentar ofertas
                        </button>
                      </div>
                    </div>
                  ) : ofertasFiltradas.length > 0 ? (
                    (mostrarTodasOfertas ? ofertasFiltradas : ofertasFiltradas.slice(0, 3)).map((oferta) => (
                      <div
                        key={`oferta-${oferta.idProducto}-${oferta.idEstablecimiento}`}
                        onClick={() => verFichaRanking(oferta)}
                        className="group flex items-center justify-between gap-3 rounded-control border border-line/80 bg-surface-2/40 p-3 transition-all duration-200 hover:border-blue-500/40 hover:bg-surface-2 cursor-pointer"
                      >
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface-0 p-1">
                          {oferta.imagen && oferta.imagen.trim().length > 0 ? (
                            <img
                              src={oferta.imagen}
                              alt={`Imagen de ${oferta.nombre}`}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ProductImagePlaceholder
                              categoria={oferta.idCategoria}
                              nombre={oferta.nombre}
                              tamano="sm"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-100 transition-colors group-hover:text-blue-300">
                            {oferta.nombre}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {oferta.nombreEstablecimiento}
                            {oferta.descripcion ? ` · ${oferta.descripcion}` : ""}
                          </p>
                          {oferta.ahorroMonetario > 0 && (
                            <p className="text-[10px] font-medium text-emerald-400">
                              Ahorras: {formatearCOP(oferta.ahorroMonetario)}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          {oferta.porcentajeDescuento > 0 && (
                            <span className="inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                              -{Math.round(oferta.porcentajeDescuento)}%
                            </span>
                          )}
                          <div className="text-xs font-semibold text-blue-300">
                            {formatearCOP(oferta.precioActual)}
                          </div>
                          {oferta.precioReferencia && (
                            <div className="text-[10px] text-slate-500 line-through">
                              {formatearCOP(oferta.precioReferencia)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No hay ofertas coincidentes con este filtro.
                    </div>
                  )}
                </div>

                {ofertasFiltradas.length > 3 && (
                  <div className="mt-4 border-t border-line/70 pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setMostrarTodasOfertas(!mostrarTodasOfertas)}
                      className="text-xs font-semibold text-blue-300 transition-colors hover:text-blue-200 hover:underline cursor-pointer"
                    >
                      {mostrarTodasOfertas ? "Ocultar ofertas adicionales" : "Ver todas las ofertas disponibles"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SELECTOR DE VISTAS (DESTACADOS vs CATÁLOGO)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-line/70 bg-[#090714]/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSeccionActiva("ranking")}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                seccionActiva === "ranking"
                  ? "bg-blue-600 text-white"
                  : "border border-line bg-surface-1 text-slate-300 hover:bg-surface-2 hover:text-white"
              }`}
            >
              ⭐ Dispositivos destacados
            </button>
            <button
              onClick={() => setSeccionActiva("catalogo")}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                seccionActiva === "catalogo"
                  ? "bg-blue-600 text-white"
                  : "border border-line bg-surface-1 text-slate-300 hover:bg-surface-2 hover:text-white"
              }`}
            >
              📦 Catálogo general ({productosBackendFiltrados.length})
            </button>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
            <span>Filtro activo: {tipoDispositivo} · Hasta {formatearCOP(presupuestoMax)}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 1: DISPOSITIVOS DESTACADOS (RANKINGS REALES DEL BACKEND)
      ───────────────────────────────────────────────────────────── */}
      {seccionActiva === "ranking" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            
            {/* COLUMNA 1: MEJOR VALORADOS */}
            <div className="flex flex-col justify-between rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
              <div>
                <div className="mb-6 border-b border-line/70 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                      <span className="text-red-500">/</span> Mejor valorados.
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      ({mejorValoradosFiltrados.length} dispositivos)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {"//"} Puntuación real de usuarios registrados
                  </p>
                  <div className="mt-3 h-0.5 w-12 rounded-full bg-blue-500/70"></div>
                </div>

                <div className="space-y-3">
                  {cargandoMejorValorados ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-blue-500"></div>
                      <p className="mt-3 text-xs text-slate-500">Cargando valoraciones reales...</p>
                    </div>
                  ) : errorMejorValorados ? (
                    <div className="rounded-control border border-red-500/30 bg-red-500/10 p-6 text-center text-xs">
                      <p className="font-medium text-red-300">⚠️ {errorMejorValorados}</p>
                      <button
                        type="button"
                        onClick={cargarMejorValorados}
                        aria-label="Reintentar valoraciones"
                        className="mt-3 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                      >
                        Reintentar valoraciones
                      </button>
                    </div>
                  ) : mejorValoradosFiltrados.length > 0 ? (
                    (mostrarTodosMejorValorados
                      ? mejorValoradosFiltrados
                      : mejorValoradosFiltrados.slice(0, 4)
                    ).map((item) => (
                      <RankingItem
                        key={`mejor-${item.idProducto}`}
                        ranking={item.posicionRanking}
                        nombre={item.nombre}
                        descripcion={item.descripcion}
                        imagen={item.imagen}
                        categoria={item.idCategoria}
                        precio={item.precioReferencia}
                        metricaTipo="valoracion"
                        puntuacion={item.promedioPuntuacion}
                        cantidadValoraciones={item.cantidadValoraciones}
                        onVerDetalle={() => verFichaRanking(item)}
                      />
                    ))
                  ) : (
                    <div className="rounded-control border border-dashed border-line bg-surface-2/30 p-8 text-center text-sm text-slate-500">
                      {mejorValorados.length === 0
                        ? "Aún no hay productos con valoraciones registradas en el catálogo."
                        : `No se encontraron dispositivos en la categoría "${tipoDispositivo}" dentro de este presupuesto.`}
                    </div>
                  )}
                </div>
              </div>

              {mejorValoradosFiltrados.length > 4 && (
                <div className="mt-6 border-t border-line/70 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setMostrarTodosMejorValorados(!mostrarTodosMejorValorados)}
                    className="w-full rounded-control border border-line bg-surface-2/60 py-3 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-surface-2 hover:text-white cursor-pointer"
                  >
                    {mostrarTodosMejorValorados
                      ? "Ocultar listado"
                      : `Ver lista completa (${mejorValoradosFiltrados.length})`}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMNA 2: MÁS COMENTADOS */}
            <div className="flex flex-col justify-between rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
              <div>
                <div className="mb-6 border-b border-line/70 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                      <span className="text-red-500">/</span> Más comentados.
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      ({masComentadosFiltrados.length} dispositivos)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {"//"} Interacción real de reseñas comunitarias
                  </p>
                  <div className="mt-3 h-0.5 w-12 rounded-full bg-blue-500/70"></div>
                </div>

                <div className="space-y-3">
                  {cargandoMasComentados ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-blue-500"></div>
                      <p className="mt-3 text-xs text-slate-500">Cargando reseñas de la comunidad...</p>
                    </div>
                  ) : errorMasComentados ? (
                    <div className="rounded-control border border-red-500/30 bg-red-500/10 p-6 text-center text-xs">
                      <p className="font-medium text-red-300">⚠️ {errorMasComentados}</p>
                      <button
                        type="button"
                        onClick={cargarMasComentados}
                        aria-label="Reintentar comentarios"
                        className="mt-3 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                      >
                        Reintentar comentarios
                      </button>
                    </div>
                  ) : masComentadosFiltrados.length > 0 ? (
                    (mostrarTodosComentados
                      ? masComentadosFiltrados
                      : masComentadosFiltrados.slice(0, 4)
                    ).map((item) => (
                      <RankingItem
                        key={`comentado-${item.idProducto}`}
                        ranking={item.posicionRanking}
                        nombre={item.nombre}
                        descripcion={item.descripcion}
                        imagen={item.imagen}
                        categoria={item.idCategoria}
                        precio={item.precioReferencia}
                        metricaTipo="comentario"
                        cantidadResenas={item.cantidadResenas}
                        onVerDetalle={() => verFichaRanking(item)}
                      />
                    ))
                  ) : (
                    <div className="rounded-control border border-dashed border-line bg-surface-2/30 p-8 text-center text-sm text-slate-500">
                      {masComentados.length === 0
                        ? "Aún no hay reseñas registradas para los productos en la plataforma."
                        : `No se encontraron dispositivos en la categoría "${tipoDispositivo}" dentro de este presupuesto.`}
                    </div>
                  )}
                </div>
              </div>

              {masComentadosFiltrados.length > 4 && (
                <div className="mt-6 border-t border-line/70 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setMostrarTodosComentados(!mostrarTodosComentados)}
                    className="w-full rounded-control border border-line bg-surface-2/60 py-3 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-surface-2 hover:text-white cursor-pointer"
                  >
                    {mostrarTodosComentados
                      ? "Ocultar listado"
                      : `Ver lista completa (${masComentadosFiltrados.length})`}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMNA 3: LOS MÁS DESEADOS */}
            <div className="flex flex-col justify-between rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
              <div>
                <div className="mb-6 border-b border-line/70 pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                      <span className="text-red-500">/</span> Los más deseados.
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      ({masDeseadosFiltrados.length} dispositivos)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {"//"} Listas de deseos y favoritos de usuarios
                  </p>
                  <div className="mt-3 h-0.5 w-12 rounded-full bg-blue-500/70"></div>
                </div>

                <div className="space-y-3">
                  {cargandoMasDeseados ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-blue-500"></div>
                      <p className="mt-3 text-xs text-slate-500">Consultando listas de deseos...</p>
                    </div>
                  ) : errorMasDeseados ? (
                    <div className="rounded-control border border-red-500/30 bg-red-500/10 p-6 text-center text-xs">
                      <p className="font-medium text-red-300">⚠️ {errorMasDeseados}</p>
                      <button
                        type="button"
                        onClick={cargarMasDeseados}
                        aria-label="Reintentar deseos"
                        className="mt-3 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                      >
                        Reintentar deseos
                      </button>
                    </div>
                  ) : masDeseadosFiltrados.length > 0 ? (
                    masDeseadosFiltrados.map((item) => (
                      <RankingItem
                        key={`deseado-${item.idProducto}`}
                        ranking={item.posicionRanking}
                        nombre={item.nombre}
                        descripcion={item.descripcion}
                        imagen={item.imagen}
                        categoria={item.idCategoria}
                        precio={item.precioReferencia}
                        metricaTipo="comentario"
                        cantidadResenas={item.cantidadDeseados}
                        onVerDetalle={() => verFichaRanking(item)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-surface-2/30 p-8 text-center text-sm text-slate-500">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-2 text-slate-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                        </svg>
                      </div>
                      <p className="mb-1 text-xs font-semibold text-slate-200">
                        Sin listas de deseos registradas
                      </p>
                      <p className="max-w-xs text-xs leading-relaxed text-slate-500">
                        La funcionalidad de listas de deseos y favoritos estará disponible en una fase posterior. Actualmente la plataforma no muestra datos ficticios.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 2: CATÁLOGO GENERAL DE PRODUCTOS
      ───────────────────────────────────────────────────────────── */}
      {seccionActiva === "catalogo" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 border-b border-line/70 pb-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                  <span className="text-red-500">/</span> Catálogo general de dispositivos.
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {totalProductosVerificados} productos verificados en la plataforma • {productosBackendFiltrados.length} mostrado{productosBackendFiltrados.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {estadoBackend === "online" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Servidor conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Modo local
                  </span>
                )}
              </div>
            </div>

            {/* Barra informativa de presupuesto y selector explícito */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500">Presupuesto activo:</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 font-semibold text-blue-300">
                  Hasta {formatearCOP(presupuestoMax)}
                </span>
                <span className="text-slate-500">
                  ({totalEnPresupuesto} de {totalProductosVerificados} dentro del presupuesto)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltrarSoloEnPresupuesto((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    filtrarSoloEnPresupuesto
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-line bg-surface-2/60 text-slate-300 hover:border-blue-500/40 hover:text-white"
                  }`}
                  aria-pressed={filtrarSoloEnPresupuesto}
                  title="Alternar entre mostrar todo el catálogo o filtrar exclusivamente por presupuesto"
                >
                  <span aria-hidden="true">{filtrarSoloEnPresupuesto ? "✓" : "○"}</span>
                  {filtrarSoloEnPresupuesto ? "Solo en presupuesto" : "Filtrar por presupuesto"}
                </button>
              </div>
            </div>

            {cargandoApi ? (
              <div className="flex flex-col items-center justify-center py-20" aria-live="polite" aria-busy="true">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-blue-500" aria-hidden="true"></div>
                <p className="mt-4 text-sm text-slate-400">Cargando catálogo de dispositivos...</p>
              </div>
            ) : productosBackendFiltrados.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {productosBackendFiltrados.map((producto) => (
                  <ProductCard
                    key={`prod-${producto.idProducto}`}
                    producto={producto}
                    onVerDetalle={(prod) => setProductoSeleccionado(prod)}
                    limitePresupuestoCOP={limitePresupuestoCOP}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-control border border-dashed border-line bg-surface-2/30 p-8 text-center text-sm sm:p-12">
                {busqueda.trim() ? (
                  <div className="space-y-3">
                    <p className="text-base font-semibold text-slate-200">
                      No se encontraron productos para &ldquo;{busqueda}&rdquo;.
                    </p>
                    <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-500">
                      No hay coincidencias con ese nombre o modelo en el catálogo. Intenta con otros términos como marca (Samsung, Asus, Sony...) o tipo de dispositivo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBusqueda("")}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : tipoDispositivo !== "todos" ? (
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-200">
                      No hay dispositivos disponibles en la categoría &ldquo;{tipoDispositivo}&rdquo;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTipoDispositivo("todos")}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-control border border-line bg-surface-2/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white cursor-pointer"
                    >
                      Ver todas las categorías
                    </button>
                  </div>
                ) : filtrarSoloEnPresupuesto ? (
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-200">
                      No hay productos registrados dentro del presupuesto de {formatearCOP(presupuestoMax)}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFiltrarSoloEnPresupuesto(false)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-control bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                    >
                      Mostrar todos los productos
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-500">
                    No hay productos registrados en el catálogo en este momento.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 3: OPINIONES DE LA COMUNIDAD (PERSISTIDAS)
      ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="seccion-opiniones">
        <div className="rounded-card border border-line bg-surface-1/80 p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 id="seccion-opiniones" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                <span className="text-red-500">/</span> Opiniones de la comunidad ({resenas.length}).
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Comparte tu experiencia, dudas o recomendaciones sobre dispositivos con otros usuarios.
              </p>
            </div>
            <button
              type="button"
              onClick={cargarResenas}
              disabled={cargandoResenas}
              className="self-start rounded-control border border-line bg-surface-2/60 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white disabled:opacity-50 sm:self-auto cursor-pointer"
              title="Actualizar listado de opiniones desde el servidor"
            >
              {cargandoResenas ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {/* Barra de Filtro de Opiniones */}
          <div className="mb-6">
            <label htmlFor="input-filtro-opiniones" className="sr-only">Filtrar opiniones de la comunidad</label>
            <input
              id="input-filtro-opiniones"
              type="search"
              value={filtroComentarios}
              onChange={(e) => setFiltroComentarios(e.target.value)}
              placeholder="Buscar por comentario, autor o producto..."
              className="w-full rounded-control border border-line bg-surface-0/80 px-4 py-2.5 text-xs text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 sm:max-w-md"
            />
          </div>

          {/* Mensaje de invitación para usuarios anónimos */}
          {!usuarioSesion && (
            <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-control border border-blue-500/25 bg-blue-500/10 p-4 text-xs sm:flex-row">
              <p className="text-slate-300">
                <span className="font-semibold text-white">¿Tienes experiencia con algún dispositivo?</span> Inicia sesión con tu cuenta para publicar una opinión verificada.
              </p>
              <button
                type="button"
                onClick={() => setModalAuthAbierto(true)}
                className="shrink-0 rounded-control bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 cursor-pointer"
              >
                Identificarse para opinar
              </button>
            </div>
          )}

          {/* Formulario de publicación */}
          <form onSubmit={manejarEnvioComentario} className="mb-8">
            <label htmlFor="input-comentario" className="sr-only">Escribe tu opinión</label>
            <div className="flex flex-col gap-3">
              {productosBackend.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <label htmlFor="select-producto-comentario" className="font-medium">
                    Dispositivo a reseñar:
                  </label>
                  <select
                    id="select-producto-comentario"
                    value={idProductoEfectivo}
                    onChange={(e) => setIdProductoComentario(Number(e.target.value))}
                    className="rounded-control border border-line bg-surface-0/80 px-3 py-1.5 text-xs text-white transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  >
                    {productosBackend.map((p) => (
                      <option key={p.idProducto} value={p.idProducto}>
                        Dispositivo: {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="input-comentario"
                  type="text"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder={
                    usuarioSesion
                      ? `Comentar como ${usuarioSesion.nombre}...`
                      : "Inicia sesión para publicar tu opinión aquí..."
                  }
                  className="flex-1 rounded-control border border-line bg-surface-0/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                />
                <button
                  type="submit"
                  disabled={enviandoComentario}
                  className="rounded-control bg-blue-600 px-6 py-3 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {enviandoComentario ? "Publicando..." : "Publicar opinión"}
                </button>
              </div>
            </div>
            {errorComentario && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                {errorComentario}
              </p>
            )}
          </form>

          {/* Listado de opiniones persistidas */}
          {cargandoResenas && resenas.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Cargando opiniones de la comunidad...
            </div>
          ) : resenasFiltradas.length > 0 ? (
            <div className="space-y-3">
              {resenasFiltradas.map((r) => (
                <div key={r.idResena} className="rounded-control border border-line/80 bg-surface-2/30 p-4 text-xs transition-colors hover:border-line">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-blue-300">@{r.nombreUsuario || "Usuario"}</span>
                      {r.nombreProducto && (
                        <span className="rounded-full border border-line bg-surface-1 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          {r.nombreProducto}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px]">
                      {new Date(r.fechaCreacion).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">{r.comentario}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-control border border-dashed border-line bg-surface-2/30 p-8 text-center text-xs text-slate-500">
              {filtroComentarios.trim()
                ? `No se encontraron opiniones que coincidan con "${filtroComentarios}".`
                : "Aún no hay opiniones registradas. ¡Sé el primero en compartir tu experiencia!"}
            </div>
          )}
        </div>
      </section>

      {/* MODAL DE AUTENTICACIÓN */}
      <AuthModal
        isOpen={modalAuthAbierto}
        onClose={() => setModalAuthAbierto(false)}
        onLoginSuccess={(usr) => setUsuarioSesion(usr)}
      />

      {/* MODAL DE FICHA TÉCNICA */}
      <FichaTecnicaModal
        key={
          productoSeleccionado
            ? "ranking" in productoSeleccionado
              ? `kim_${productoSeleccionado.id}`
              : `prod_${productoSeleccionado.idProducto}`
            : "modal_cerrado"
        }
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        usuarioSesion={usuarioSesion}
        onPedirLogin={() => setModalAuthAbierto(true)}
        onValoracionGuardada={cargarMejorValorados}
        onResenaGuardada={(nueva) => {
          setResenas((prev) => [
            nueva,
            ...prev.filter((r) => r.idResena !== nueva.idResena),
          ]);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          MODAL MODULAR DEL PANEL DE ADMINISTRACIÓN (FASE 3.1)
      ───────────────────────────────────────────────────────────── */}
      <AdminPanelModal
        isOpen={modalAdminAbierto}
        onClose={() => setModalAdminAbierto(false)}
        usuarioSesion={usuarioSesion}
        onProductoCambiado={recargarProductosCatalogo}
      />

      {/* PIE DE PÁGINA */}
      <footer className="border-t border-line/70 bg-[#090714]/70 px-4 py-8 text-center text-xs text-slate-500 backdrop-blur-md">
        <p>© 2026 TecReview - Plataforma de Reseñas y Especificaciones Técnicas</p>
      </footer>
    </div>
  );
}