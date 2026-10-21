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
  esAdministrador,
  esRepresentante,
} from "@/types/producto";
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
import RankingItem from "@/components/RankingItem";
import ProductCard from "@/components/ProductCard";
import AuthModal from "@/components/AuthModal";
import FichaTecnicaModal from "@/components/FichaTecnicaModal";
import AdminPanelModal from "@/components/AdminPanelModal";
import GeometricBackground from "@/components/GeometricBackground";
import { formatearCOP } from "@/data/specsHelper";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type CategoriaDispositivo = "todos" | "moviles" | "tablets" | "laptops" | "auriculares" | "monitores";

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


  // Cargar preferencia de tema y sincronizar sesión real de Supabase al montar
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
    if (tipo === "monitores") return idCategoria === 5;
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
      const matchPrecio = presupuestoMax >= 1500 || precioItemCOP <= limiteCOP;
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

  // Filtrado de catálogo
  const productosBackendFiltrados = useMemo(() => {
    return productosBackend.filter((p) => {
      const matchBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase())) ||
        (p.nombreMarca && p.nombreMarca.toLowerCase().includes(busqueda.toLowerCase()));
      const matchPrecio = p.precioReferencia === null || p.precioReferencia <= presupuestoMax;

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
        } else if (tipoDispositivo === "monitores") {
          matchCat =
            p.idCategoria === 5 ||
            nomCat.includes("monitor") ||
            nomCat.includes("pantalla");
        }
      }
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [productosBackend, busqueda, presupuestoMax, tipoDispositivo]);

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

  const idProductoEfectivo = idProductoComentario !== ""
    ? idProductoComentario
    : (productosBackend.length > 0 ? productosBackend[0].idProducto : "");

  // Manejo de opiniones persistidas
  const palabrasMaliciosas = ["spam", "insulto", "estafa", "odio", "tonto", "idiota", "fraude", "mierda", "puta"];
  const manejarEnvioComentario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioSesion) {
      setModalAuthAbierto(true);
      setErrorComentario("Debes iniciar sesión para publicar una opinión.");
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

    const idProductoFinal = typeof idProductoEfectivo === "number"
      ? idProductoEfectivo
      : 1;

    setEnviandoComentario(true);
    setErrorComentario("");

    try {
      await crearResena({
        idProducto: Number(idProductoFinal),
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
      <nav aria-label="Navegación superior" className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 text-xs shadow-2xs sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-doto font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-base tracking-widest uppercase">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
              Tec<span className="text-blue-700 dark:text-blue-400">Review</span>
              <span className="text-red-500">.</span>
            </span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden md:inline text-slate-600 dark:text-slate-400 font-medium">
              Plataforma de Reseñas y Especificaciones Técnicas
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Enlace Explorador API disponible para navegación rápida */}
            <Link
              href="/productos"
              className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-950/40 text-red-400 hover:bg-red-900/50 hover:text-red-300 px-2.5 py-1 text-xs font-semibold font-mono tracking-wider transition-colors cursor-pointer shadow-2xs"
                aria-label="Panel de administración"
                title="Panel de administración (Rol verificado en servidor)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true"></span>
                Administración
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
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 border ${
                    esAdmin
                      ? "text-red-200 bg-red-950/40 border-red-800/60"
                      : esRepre
                      ? "text-amber-200 bg-amber-950/40 border-amber-800/60"
                      : "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
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
                          ? "text-red-400 font-mono"
                          : esRepre
                          ? "text-amber-400 font-mono"
                          : "text-blue-700 dark:text-blue-400"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-3 py-1 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
              >
                <span>🔑</span> Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          CABECERA PRINCIPAL (BANNER HERO CON FONDO TRASLÚCIDO)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/70 dark:border-slate-800/70 bg-white/20 dark:bg-slate-950/20 backdrop-blur-[1px] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          
          {/* Fila de Marca (sin la caja TR) y Categorías */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
            {/* Título de Marca Limpio */}
            <div className="flex items-center">
              <div>
                <h1 className="font-doto text-3xl sm:text-4xl lg:text-5xl font-black tracking-wider text-slate-900 dark:text-white uppercase" aria-label="TecReview">
                  Tec<span className="text-blue-700 dark:text-blue-500">Review</span><span className="text-red-500">.</span>
                </h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 font-mono">
                  {"//"} Guía de compra y especificaciones técnicas
                </p>
              </div>
            </div>

            {/* Selector de Categorías Accesible con estilo de Matriz Nothing Tech */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
              {[
                { id: "todos" as const, label: "Todos", icon: "📱" },
                { id: "moviles" as const, label: "Teléfonos", icon: "📱" },
                { id: "tablets" as const, label: "Tablets", icon: "📱" },
                { id: "laptops" as const, label: "Portátiles / PC", icon: "💻" },
                { id: "auriculares" as const, label: "Auriculares", icon: "🎧" },
                { id: "monitores" as const, label: "Monitores", icon: "🖥️" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTipoDispositivo(cat.id)}
                  className={`font-doto uppercase tracking-wider flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    tipoDispositivo === cat.id
                      ? "border-blue-700 bg-blue-700 text-white shadow-xs"
                      : "border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400 shadow-2xs"
                  }`}
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuerpo Central del Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
            
            {/* Columna Izquierda: Buscador y Slider de Presupuesto (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-2 rounded-md bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 px-3 py-1 text-xs font-bold font-doto uppercase tracking-widest text-blue-800 dark:text-blue-300 mb-3 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  CATÁLOGO Y COMPARADOR DE TECNOLOGÍA
                </span>

                <h2 className="font-doto text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-wide uppercase leading-tight">
                  Encuentra y compara tu próximo dispositivo.
                </h2>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  Consulta fichas técnicas completas, análisis imparciales y precios de referencia en pesos colombianos (COP).
                </p>
              </div>

              {/* Buscador Rápido Accesible */}
              <div>
                <label htmlFor="buscador-principal" className="block text-xs font-bold font-doto uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
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
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-12 pr-20 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs focus:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda("")}
                      aria-label="Borrar texto de búsqueda"
                      className="absolute right-4 text-xs font-bold font-doto uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {"//"} Filtrando por categoría ({tipoDispositivo}) y presupuesto hasta {formatearCOP(presupuestoMax)}.
                </p>
              </div>

              {/* Slider de Presupuesto en COP */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-600"></span>
                    <span className="text-xs font-bold font-doto text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Presupuesto máximo
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3.5 py-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 font-mono">Hasta:</span>
                    <span className="text-sm font-extrabold font-sans tracking-tight text-blue-700 dark:text-blue-300">
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
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-700"
                  />
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>Mínimo: $ 200.000 COP</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 font-sans">
                      Límite: {formatearCOP(presupuestoMax)}
                    </span>
                    <span>Máximo: $ 6.000.000+ COP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Ofertas Destacadas (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
                    <h3 className="text-xs font-bold font-doto uppercase tracking-wider text-slate-900 dark:text-white">
                      Ofertas destacadas.
                    </h3>
                  </div>
                  <span className="text-xs font-bold font-doto uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    En promoción ({ofertasFiltradas.length})
                  </span>
                </div>

                {/* Lista de ofertas */}
                <div className="space-y-3 flex-1">
                  {cargandoOfertas ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"></div>
                      <p className="mt-3 text-xs text-slate-500 font-mono">Cargando ofertas reales...</p>
                    </div>
                  ) : errorOfertas ? (
                    <div className="py-6 px-4 text-center rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 text-xs">
                      <p className="text-red-600 dark:text-red-400 font-medium">⚠️ {errorOfertas}</p>
                      <button
                        type="button"
                        onClick={cargarOfertas}
                        aria-label="Reintentar ofertas"
                        className="mt-2 text-xs font-bold text-blue-700 dark:text-blue-400 underline hover:no-underline cursor-pointer"
                      >
                        Reintentar ofertas
                      </button>
                    </div>
                  ) : ofertasFiltradas.length > 0 ? (
                    (mostrarTodasOfertas ? ofertasFiltradas : ofertasFiltradas.slice(0, 3)).map((oferta) => (
                      <div
                        key={`oferta-${oferta.idProducto}-${oferta.idEstablecimiento}`}
                        onClick={() => verFichaRanking(oferta)}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-2xs cursor-pointer"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 flex items-center justify-center">
                          <img
                            src={
                              oferta.imagen ||
                              "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80"
                            }
                            alt={`Imagen de ${oferta.nombre}`}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {oferta.nombre}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {oferta.nombreEstablecimiento}
                            {oferta.descripcion ? ` · ${oferta.descripcion}` : ""}
                          </p>
                          {oferta.ahorroMonetario > 0 && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              Ahorras: {formatearCOP(oferta.ahorroMonetario)}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {oferta.porcentajeDescuento > 0 && (
                            <span className="inline-block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                              -{Math.round(oferta.porcentajeDescuento)}%
                            </span>
                          )}
                          <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                            {formatearCOP(oferta.precioActual)}
                          </div>
                          {oferta.precioReferencia && (
                            <div className="text-[10px] text-slate-400 line-through">
                              {formatearCOP(oferta.precioReferencia)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 font-mono">
                      No hay ofertas coincidentes con este filtro.
                    </div>
                  )}
                </div>

                {ofertasFiltradas.length > 3 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                    <button
                      type="button"
                      onClick={() => setMostrarTodasOfertas(!mostrarTodasOfertas)}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
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
      <div className="border-b border-slate-200/70 dark:border-slate-800/70 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSeccionActiva("ranking")}
              className={`font-doto uppercase tracking-wider rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                seccionActiva === "ranking"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              ⭐ Dispositivos destacados
            </button>
            <button
              onClick={() => setSeccionActiva("catalogo")}
              className={`font-doto uppercase tracking-wider rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                seccionActiva === "catalogo"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              📦 Catálogo general ({productosBackendFiltrados.length})
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <span>{"//"} Filtro activo: {tipoDispositivo} | Hasta {formatearCOP(presupuestoMax)}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 1: DISPOSITIVOS DESTACADOS (RANKINGS REALES DEL BACKEND)
      ───────────────────────────────────────────────────────────── */}
      {seccionActiva === "ranking" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* COLUMNA 1: MEJOR VALORADOS */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-black font-doto uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-red-500">/</span> Mejor valorados.
                    </h3>
                    <span className="text-xs font-bold font-doto uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      ({mejorValoradosFiltrados.length} dispositivos)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {"//"} Puntuación real de usuarios registrados
                  </p>
                  <div className="mt-2 h-0.5 w-16 bg-blue-700"></div>
                </div>

                <div className="space-y-3">
                  {cargandoMejorValorados ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"></div>
                      <p className="mt-3 text-xs text-slate-500 font-mono">Cargando valoraciones reales...</p>
                    </div>
                  ) : errorMejorValorados ? (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-6 text-center text-xs">
                      <p className="text-red-600 dark:text-red-400 font-medium">⚠️ {errorMejorValorados}</p>
                      <button
                        type="button"
                        onClick={cargarMejorValorados}
                        aria-label="Reintentar valoraciones"
                        className="mt-3 font-doto uppercase tracking-wider rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
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
                        precio={item.precioReferencia}
                        metricaTipo="valoracion"
                        puntuacion={item.promedioPuntuacion}
                        cantidadValoraciones={item.cantidadValoraciones}
                        onVerDetalle={() => verFichaRanking(item)}
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                      {mejorValorados.length === 0
                        ? "Aún no hay productos con valoraciones registradas en el catálogo."
                        : `No se encontraron dispositivos en la categoría "${tipoDispositivo}" dentro de este presupuesto.`}
                    </div>
                  )}
                </div>
              </div>

              {mejorValoradosFiltrados.length > 4 && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => setMostrarTodosMejorValorados(!mostrarTodosMejorValorados)}
                    className="font-doto uppercase tracking-wider w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {mostrarTodosMejorValorados
                      ? "Ocultar listado"
                      : `Ver lista completa (${mejorValoradosFiltrados.length})`}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMNA 2: MÁS COMENTADOS */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-black font-doto uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-red-500">/</span> Más comentados.
                    </h3>
                    <span className="text-xs font-bold font-doto uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      ({masComentadosFiltrados.length} dispositivos)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {"//"} Interacción real de reseñas comunitarias
                  </p>
                  <div className="mt-2 h-0.5 w-16 bg-blue-700"></div>
                </div>

                <div className="space-y-3">
                  {cargandoMasComentados ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"></div>
                      <p className="mt-3 text-xs text-slate-500 font-mono">Cargando reseñas de la comunidad...</p>
                    </div>
                  ) : errorMasComentados ? (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-6 text-center text-xs">
                      <p className="text-red-600 dark:text-red-400 font-medium">⚠️ {errorMasComentados}</p>
                      <button
                        type="button"
                        onClick={cargarMasComentados}
                        aria-label="Reintentar comentarios"
                        className="mt-3 font-doto uppercase tracking-wider rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
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
                        precio={item.precioReferencia}
                        metricaTipo="comentario"
                        cantidadResenas={item.cantidadResenas}
                        onVerDetalle={() => verFichaRanking(item)}
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                      {masComentados.length === 0
                        ? "Aún no hay reseñas registradas para los productos en la plataforma."
                        : `No se encontraron dispositivos en la categoría "${tipoDispositivo}" dentro de este presupuesto.`}
                    </div>
                  )}
                </div>
              </div>

              {masComentadosFiltrados.length > 4 && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => setMostrarTodosComentados(!mostrarTodosComentados)}
                    className="font-doto uppercase tracking-wider w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {mostrarTodosComentados
                      ? "Ocultar listado"
                      : `Ver lista completa (${masComentadosFiltrados.length})`}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMNA 3: LOS MÁS DESEADOS */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-black font-doto uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-red-500">/</span> Los más deseados.
                    </h3>
                    <span className="text-xs font-bold font-doto uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      ({masDeseadosFiltrados.length} dispositivos)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {"//"} Listas de deseos y favoritos de usuarios
                  </p>
                  <div className="mt-2 h-0.5 w-16 bg-blue-700"></div>
                </div>

                <div className="space-y-3">
                  {cargandoMasDeseados ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"></div>
                      <p className="mt-3 text-xs text-slate-500 font-mono">Consultando listas de deseos...</p>
                    </div>
                  ) : errorMasDeseados ? (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-6 text-center text-xs">
                      <p className="text-red-600 dark:text-red-400 font-medium">⚠️ {errorMasDeseados}</p>
                      <button
                        type="button"
                        onClick={cargarMasDeseados}
                        aria-label="Reintentar deseos"
                        className="mt-3 font-doto uppercase tracking-wider rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
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
                        precio={item.precioReferencia}
                        metricaTipo="comentario"
                        cantidadResenas={item.cantidadDeseados}
                        onVerDetalle={() => verFichaRanking(item)}
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg mb-3">
                        ❤️
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs font-doto uppercase tracking-wider mb-1">
                        Sin listas de deseos registradas
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
              <div>
                <h3 className="text-lg sm:text-xl font-black font-doto uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-red-500">/</span> Catálogo general de dispositivos.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {"//"} Productos verificados en la plataforma ({productosBackendFiltrados.length} disponibles)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {estadoBackend === "online" ? (
                  <span className="font-doto uppercase tracking-wider inline-flex items-center gap-1.5 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Servidor conectado
                  </span>
                ) : (
                  <span className="font-doto uppercase tracking-wider inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 text-xs text-amber-800 dark:text-amber-300 font-bold">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Modo local
                  </span>
                )}
              </div>
            </div>

            {cargandoApi ? (
              <div className="flex flex-col items-center justify-center py-20" aria-live="polite" aria-busy="true">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" aria-hidden="true"></div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 font-doto uppercase tracking-wider">Cargando catálogo de dispositivos...</p>
              </div>
            ) : productosBackendFiltrados.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {productosBackendFiltrados.map((producto) => (
                  <ProductCard
                    key={`prod-${producto.idProducto}`}
                    producto={producto}
                    onVerDetalle={(prod) => setProductoSeleccionado(prod)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-sm text-slate-500 font-mono">
                No hay productos que coincidan con la búsqueda &ldquo;{busqueda}&rdquo; y presupuesto de {formatearCOP(presupuestoMax)}.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 3: OPINIONES DE LA COMUNIDAD (PERSISTIDAS)
      ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="seccion-opiniones">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 id="seccion-opiniones" className="text-lg sm:text-xl font-black font-doto uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-red-500">/</span> Opiniones de la comunidad ({resenas.length}).
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Comparte tu experiencia, dudas o recomendaciones sobre dispositivos con otros usuarios.
              </p>
            </div>
            <button
              type="button"
              onClick={cargarResenas}
              disabled={cargandoResenas}
              className="self-start sm:self-auto font-doto uppercase tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Actualizar listado de opiniones desde el servidor"
            >
              {cargandoResenas ? "Actualizando..." : "🔄 Actualizar"}
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
              className="w-full sm:max-w-md rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
            />
          </div>

          {/* Mensaje de invitación para usuarios anónimos */}
          {!usuarioSesion && (
            <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p className="text-blue-900 dark:text-blue-200">
                <span className="font-bold">¿Tienes experiencia con algún dispositivo?</span> Inicia sesión con tu cuenta para publicar una opinión verificada.
              </p>
              <button
                type="button"
                onClick={() => setModalAuthAbierto(true)}
                className="font-doto uppercase tracking-wider rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <label htmlFor="select-producto-comentario" className="font-semibold">
                    Dispositivo a reseñar:
                  </label>
                  <select
                    id="select-producto-comentario"
                    value={idProductoEfectivo}
                    onChange={(e) => setIdProductoComentario(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-700 focus:outline-none"
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
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                />
                <button
                  type="submit"
                  disabled={enviandoComentario}
                  className="font-doto uppercase tracking-wider rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-6 py-3 text-xs font-bold text-white transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
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
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              Cargando opiniones de la comunidad...
            </div>
          ) : resenasFiltradas.length > 0 ? (
            <div className="space-y-3">
              {resenasFiltradas.map((r) => (
                <div key={r.idResena} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-xs transition-colors">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-700 dark:text-blue-400">@{r.nombreUsuario || "Usuario"}</span>
                      {r.nombreProducto && (
                        <span className="text-[10px] font-doto uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {r.nombreProducto}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono">
                      {new Date(r.fechaCreacion).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{r.comentario}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500 font-mono">
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
      <footer className="border-t border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md py-8 px-4 text-xs text-slate-500 dark:text-slate-400 text-center transition-colors">
        <p>© 2026 TecReview - Plataforma de Reseñas y Especificaciones Técnicas</p>
      </footer>
    </div>
  );
}