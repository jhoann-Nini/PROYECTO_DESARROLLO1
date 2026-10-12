/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import { obtenerProductos } from "@/services/api";
import type { Producto, DispositivoKimovil, UsuarioSesion } from "@/types/producto";
import {
  DISPOSITIVOS_VENDIDOS,
  DISPOSITIVOS_DESEADOS,
  ULTIMAS_OFERTAS,
  PRODUCTOS_MOCK,
} from "@/data/mockProductos";
import DeviceListItem from "@/components/DeviceListItem";
import ProductCard from "@/components/ProductCard";
import AuthModal from "@/components/AuthModal";
import FichaTecnicaModal from "@/components/FichaTecnicaModal";
import GeometricBackground from "@/components/GeometricBackground";
import { formatearCOP } from "@/data/specsHelper";

type CategoriaDispositivo = "todos" | "moviles" | "tablets" | "laptops" | "auriculares";

export default function Home() {
  // Estado de tema claro / oscuro (por defecto claro)
  const [tema, setTema] = useState<"claro" | "oscuro">("claro");

  // Estado de backend
  const [productosBackend, setProductosBackend] = useState<Producto[]>([]);
  const [cargandoApi, setCargandoApi] = useState(true);
  const [estadoBackend, setEstadoBackend] = useState<"online" | "offline">("offline");

  // Estado de Autenticación
  const [usuarioSesion, setUsuarioSesion] = useState<UsuarioSesion | null>(null);
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);

  // Estado de Ficha Técnica Modal
  const [productoSeleccionado, setProductoSeleccionado] = useState<DispositivoKimovil | Producto | null>(null);

  // Filtros interactivos
  const [busqueda, setBusqueda] = useState("");
  const [tipoDispositivo, setTipoDispositivo] = useState<CategoriaDispositivo>("todos");
  const [presupuestoMax, setPresupuestoMax] = useState<number>(1000);

  // Estados de vista
  const [mostrarTodosVendidos, setMostrarTodosVendidos] = useState(false);
  const [mostrarTodosDeseados, setMostrarTodosDeseados] = useState(false);
  const [mostrarTodasOfertas, setMostrarTodasOfertas] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<"ranking" | "catalogo">("ranking");

  // Opiniones de la comunidad
  const [comentario, setComentario] = useState("");
  const [mensajes, setMensajes] = useState<{ id: number; texto: string; fecha: string; usuario?: string }[]>([
    {
      id: 1,
      texto: "La ficha técnica del Nothing Phone (2a) es muy clara y completa. Excelente comparador.",
      fecha: "05/10/2026",
      usuario: "TechFan",
    },
    {
      id: 2,
      texto: "Los precios en pesos colombianos ayudan mucho a tomar la decisión de compra.",
      fecha: "12/10/2026",
      usuario: "CamiloR",
    },
  ]);
  const [errorComentario, setErrorComentario] = useState("");

  // Cargar preferencia de tema y sesión al montar
  useEffect(() => {
    try {
      const temaGuardado = localStorage.getItem("tecreview_tema") as "claro" | "oscuro" | null;
      if (temaGuardado === "oscuro") {
        queueMicrotask(() => {
          setTema("oscuro");
        });
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      document.documentElement.classList.remove("dark");
    }

    try {
      const sesionGuardada = localStorage.getItem("usuario_sesion");
      if (sesionGuardada) {
        const usuarioGuardado = JSON.parse(sesionGuardada) as UsuarioSesion;
        queueMicrotask(() => {
          setUsuarioSesion(usuarioGuardado);
        });
      }
    } catch {}
  }, []);

  const cambiarTema = (nuevoTema: "claro" | "oscuro") => {
    setTema(nuevoTema);
    try {
      localStorage.setItem("tecreview_tema", nuevoTema);
    } catch {}
    if (nuevoTema === "oscuro") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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

  // Filtrado de listas
  const vendidosFiltrados = useMemo(() => {
    return DISPOSITIVOS_VENDIDOS.filter((d) => {
      const matchBusqueda =
        d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.especificaciones.toLowerCase().includes(busqueda.toLowerCase());
      const matchPrecio = d.precio <= presupuestoMax;
      const matchCat = tipoDispositivo === "todos" || d.categoria === tipoDispositivo;
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [busqueda, presupuestoMax, tipoDispositivo]);

  const deseadosFiltrados = useMemo(() => {
    return DISPOSITIVOS_DESEADOS.filter((d) => {
      const matchBusqueda =
        d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.especificaciones.toLowerCase().includes(busqueda.toLowerCase());
      const matchPrecio = d.precio <= presupuestoMax;
      const matchCat = tipoDispositivo === "todos" || d.categoria === tipoDispositivo;
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [busqueda, presupuestoMax, tipoDispositivo]);

  const ofertasFiltradas = useMemo(() => {
    return ULTIMAS_OFERTAS.filter((d) => {
      const matchBusqueda =
        d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.especificaciones.toLowerCase().includes(busqueda.toLowerCase());
      const matchPrecio = d.precio <= presupuestoMax;
      const matchCat = tipoDispositivo === "todos" || d.categoria === tipoDispositivo;
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [busqueda, presupuestoMax, tipoDispositivo]);

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
        }
      }
      return matchBusqueda && matchPrecio && matchCat;
    });
  }, [productosBackend, busqueda, presupuestoMax, tipoDispositivo]);

  // Manejo de opiniones
  const palabrasMaliciosas = ["spam", "insulto", "estafa", "odio", "tonto", "idiota", "fraude", "mierda", "puta"];
  const manejarEnvioComentario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) return;

    const esMalicioso = palabrasMaliciosas.some((palabra) =>
      comentario.toLowerCase().includes(palabra)
    );

    if (esMalicioso) {
      setErrorComentario("El comentario contiene palabras no permitidas. Por favor mantén un lenguaje respetuoso.");
      setComentario("");
      return;
    }

    setMensajes([
      {
        id: Date.now(),
        texto: comentario,
        fecha: new Date().toLocaleDateString("es-CO"),
        usuario: usuarioSesion ? usuarioSesion.nombre : "Usuario anónimo",
      },
      ...mensajes,
    ]);
    setComentario("");
    setErrorComentario("");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("usuario_sesion");
    setUsuarioSesion(null);
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-300 ${tema === "oscuro" ? "dark text-slate-100" : "text-slate-900"}`}>
      
      {/* FONDO GEOMÉTRICO BICOLOR (MODO CLARO Y MODO OSCURO) */}
      <GeometricBackground tema={tema} />

      {/* ─────────────────────────────────────────────────────────────
          BARRA SUPERIOR CON SELECTOR CLARO/OSCURO Y SESIÓN
      ───────────────────────────────────────────────────────────── */}
      <nav aria-label="Navegación superior" className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 text-xs shadow-2xs sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm tracking-tight">
              <span className="h-2 w-2 rounded-full bg-blue-700 dark:bg-blue-500"></span>
              Tec<span className="text-blue-700 dark:text-blue-400">Review</span>
            </span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden md:inline text-slate-600 dark:text-slate-400 font-medium">
              Plataforma de Reseñas y Especificaciones Técnicas
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle segmentado Modo Claro / Modo Oscuro funcional */}
            <div
              role="radiogroup"
              aria-label="Seleccionar tema visual"
              className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold"
            >
              <button
                type="button"
                role="radio"
                aria-checked={tema === "claro"}
                onClick={() => cambiarTema("claro")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                  tema === "claro"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span aria-hidden="true">☀️</span>
                <span>Claro</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={tema === "oscuro"}
                onClick={() => cambiarTema("oscuro")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all cursor-pointer ${
                  tema === "oscuro"
                    ? "bg-slate-900 text-blue-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span aria-hidden="true">🌙</span>
                <span>Oscuro</span>
              </button>
            </div>

            {/* Control de sesión */}
            {usuarioSesion ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  {usuarioSesion.nombre}
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
                onClick={() => setModalAuthAbierto(true)}
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
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white" aria-label="TecReview">
                  Tec<span className="text-blue-700 dark:text-blue-500">Review</span>
                </h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Guía de compra y especificaciones técnicas
                </p>
              </div>
            </div>

            {/* Selector de Categorías Accesible */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
              {[
                { id: "todos" as const, label: "Todos", icon: "📱" },
                { id: "moviles" as const, label: "Celulares", icon: "📱" },
                { id: "tablets" as const, label: "Tablets", icon: "📱" },
                { id: "laptops" as const, label: "Portátiles / PC", icon: "💻" },
                { id: "auriculares" as const, label: "Auriculares", icon: "🎧" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTipoDispositivo(cat.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
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
                <span className="inline-block rounded-md bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-semibold text-blue-800 dark:text-blue-300 mb-3 shadow-2xs">
                  Catálogo y comparador de tecnología
                </span>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                  Encuentra y compara tu próximo dispositivo
                </h2>

                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                  Consulta fichas técnicas completas, análisis imparciales y precios de referencia en pesos colombianos (COP).
                </p>
              </div>

              {/* Buscador Rápido Accesible */}
              <div>
                <label htmlFor="buscador-principal" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                      className="absolute right-4 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Filtrando por categoría ({tipoDispositivo}) y presupuesto hasta {formatearCOP(presupuestoMax)}.
                </p>
              </div>

              {/* Slider de Presupuesto en COP */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-700"></span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Presupuesto máximo
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3.5 py-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Hasta:</span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
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
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Mínimo: $ 200.000 COP</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      Límite activo: {formatearCOP(presupuestoMax)}
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
                    <span className="h-2 w-2 bg-blue-700 rounded-full"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Ofertas destacadas
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    En promoción ({ofertasFiltradas.length})
                  </span>
                </div>

                {/* Lista de ofertas */}
                <div className="space-y-3 flex-1">
                  {ofertasFiltradas.length > 0 ? (
                    (mostrarTodasOfertas ? ofertasFiltradas : ofertasFiltradas.slice(0, 3)).map((oferta) => (
                      <div
                        key={oferta.id}
                        onClick={() => setProductoSeleccionado(oferta)}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-2xs cursor-pointer"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 flex items-center justify-center">
                          <img
                            src={oferta.imagen}
                            alt={`Imagen de ${oferta.nombre}`}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {oferta.nombre}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {oferta.especificaciones}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {oferta.descuento && (
                            <span className="inline-block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                              {oferta.descuento}
                            </span>
                          )}
                          <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                            {formatearCOP(oferta.precio)}
                          </div>
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
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                    <button
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
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                seccionActiva === "ranking"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              ⭐ Dispositivos destacados
            </button>
            <button
              onClick={() => setSeccionActiva("catalogo")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                seccionActiva === "catalogo"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              📦 Catálogo general ({productosBackendFiltrados.length})
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Filtro activo: {tipoDispositivo} | Hasta {formatearCOP(presupuestoMax)}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 1: DISPOSITIVOS DESTACADOS (MÁS VENDIDOS Y DESEADOS)
      ───────────────────────────────────────────────────────────── */}
      {seccionActiva === "ranking" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMNA 1: LOS MÁS VENDIDOS */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Los más vendidos
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    {vendidosFiltrados.length} dispositivos
                  </span>
                </div>
                <div className="mt-2 h-0.5 w-16 bg-blue-700"></div>
              </div>

              <div className="space-y-3">
                {vendidosFiltrados.length > 0 ? (
                  (mostrarTodosVendidos ? vendidosFiltrados : vendidosFiltrados.slice(0, 4)).map((item) => (
                    <DeviceListItem
                      key={item.id}
                      item={item}
                      onVerDetalle={(item) => setProductoSeleccionado(item)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                    No se encontraron dispositivos en la categoría &ldquo;{tipoDispositivo}&rdquo; dentro de este presupuesto.
                  </div>
                )}
              </div>

              {vendidosFiltrados.length > 4 && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    onClick={() => setMostrarTodosVendidos(!mostrarTodosVendidos)}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {mostrarTodosVendidos ? "Ocultar listado" : `Ver lista completa (${vendidosFiltrados.length})`}
                  </button>
                </div>
              )}
            </div>

            {/* COLUMNA 2: LOS MÁS DESEADOS */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Los más deseados
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    {deseadosFiltrados.length} dispositivos
                  </span>
                </div>
                <div className="mt-2 h-0.5 w-16 bg-blue-700"></div>
              </div>

              <div className="space-y-3">
                {deseadosFiltrados.length > 0 ? (
                  (mostrarTodosDeseados ? deseadosFiltrados : deseadosFiltrados.slice(0, 4)).map((item) => (
                    <DeviceListItem
                      key={item.id}
                      item={item}
                      onVerDetalle={(item) => setProductoSeleccionado(item)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                    No se encontraron dispositivos en la categoría &ldquo;{tipoDispositivo}&rdquo; dentro de este presupuesto.
                  </div>
                )}
              </div>

              {deseadosFiltrados.length > 4 && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    onClick={() => setMostrarTodosDeseados(!mostrarTodosDeseados)}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {mostrarTodosDeseados ? "Ocultar listado" : `Ver lista completa (${deseadosFiltrados.length})`}
                  </button>
                </div>
              )}
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Catálogo general de dispositivos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Productos verificados en la plataforma ({productosBackendFiltrados.length} disponibles)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {estadoBackend === "online" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Servidor conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 text-xs text-amber-800 dark:text-amber-300 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Modo local
                  </span>
                )}
              </div>
            </div>

            {cargandoApi ? (
              <div className="flex flex-col items-center justify-center py-20" aria-live="polite" aria-busy="true">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" aria-hidden="true"></div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Cargando catálogo de dispositivos...</p>
              </div>
            ) : productosBackendFiltrados.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {productosBackendFiltrados.map((producto) => (
                  <ProductCard
                    key={producto.idProducto}
                    producto={producto}
                    onVerDetalle={(prod) => setProductoSeleccionado(prod)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-sm text-slate-500">
                No hay productos que coincidan con la búsqueda &ldquo;{busqueda}&rdquo; y presupuesto de {formatearCOP(presupuestoMax)}.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN 3: OPINIONES DE LA COMUNIDAD
      ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="seccion-opiniones">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-6">
            <h3 id="seccion-opiniones" className="text-xl font-bold text-slate-900 dark:text-white">
              Opiniones de la comunidad
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Comparte tu experiencia, dudas o recomendaciones sobre dispositivos con otros usuarios.
            </p>
          </div>

          <form onSubmit={manejarEnvioComentario} className="mb-8">
            <label htmlFor="input-comentario" className="sr-only">Escribe tu opinión</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="input-comentario"
                type="text"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={usuarioSesion ? `Comentar como ${usuarioSesion.nombre}...` : "Escribe tu opinión aquí..."}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors shadow-2xs cursor-pointer"
              >
                Publicar opinión
              </button>
            </div>
            {errorComentario && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                {errorComentario}
              </p>
            )}
          </form>

          {/* Listado de opiniones */}
          <div className="space-y-3">
            {mensajes.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">@{msg.usuario || "Usuario anónimo"}</span>
                  <span className="text-[11px]">{msg.fecha}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{msg.texto}</p>
              </div>
            ))}
          </div>
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
      />

      {/* PIE DE PÁGINA */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md py-8 px-4 text-xs text-slate-500 dark:text-slate-400 text-center transition-colors">
        <p>© 2026 TecReview - Plataforma de Reseñas y Especificaciones Técnicas</p>
      </footer>
    </div>
  );
}