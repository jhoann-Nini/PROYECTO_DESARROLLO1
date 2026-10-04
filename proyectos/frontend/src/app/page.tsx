/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import { obtenerProductos } from "@/services/api";
import type { Producto } from "@/types/producto";
import {
  DISPOSITIVOS_VENDIDOS,
  DISPOSITIVOS_DESEADOS,
  ULTIMAS_OFERTAS,
  PRODUCTOS_MOCK,
} from "@/data/mockProductos";
import DeviceListItem from "@/components/DeviceListItem";
import ProductCard from "@/components/ProductCard";

type CategoriaDispositivo = "todos" | "moviles" | "tablets" | "tvs" | "wearables";

export default function Home() {
  // Estado de backend
  const [productosBackend, setProductosBackend] = useState<Producto[]>([]);
  const [cargandoApi, setCargandoApi] = useState(true);
  const [estadoBackend, setEstadoBackend] = useState<"online" | "offline">("offline");

  // Filtros interactivos del Header y Kimovil
  const [busqueda, setBusqueda] = useState("");
  const [tipoDispositivo, setTipoDispositivo] = useState<CategoriaDispositivo>("todos");
  const [presupuestoMax, setPresupuestoMax] = useState<number>(450);

  // Estados de vista
  const [mostrarTodosVendidos, setMostrarTodosVendidos] = useState(false);
  const [mostrarTodosDeseados, setMostrarTodosDeseados] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<"ranking" | "catalogo">("ranking");

  // Llamada al endpoint real del backend en Spring Boot
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

  // Filtrado de las listas según búsqueda y presupuesto del slider
  const vendidosFiltrados = useMemo(() => {
    return DISPOSITIVOS_VENDIDOS.filter((d) => {
      const matchBusqueda =
        d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.especificaciones.toLowerCase().includes(busqueda.toLowerCase());
      const matchPrecio = d.precio <= presupuestoMax;
      return matchBusqueda && matchPrecio;
    });
  }, [busqueda, presupuestoMax]);

  const deseadosFiltrados = useMemo(() => {
    return DISPOSITIVOS_DESEADOS.filter((d) => {
      const matchBusqueda =
        d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.especificaciones.toLowerCase().includes(busqueda.toLowerCase());
      const matchPrecio = d.precio <= presupuestoMax;
      return matchBusqueda && matchPrecio;
    });
  }, [busqueda, presupuestoMax]);

  const ofertasFiltradas = useMemo(() => {
    return ULTIMAS_OFERTAS.filter((d) => {
      const matchBusqueda =
        d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        d.especificaciones.toLowerCase().includes(busqueda.toLowerCase());
      return matchBusqueda && d.precio <= presupuestoMax;
    });
  }, [busqueda, presupuestoMax]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#f4f4f5] font-tech selection:bg-[#d71920] selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          TOPBAR TÉCNICA NOTIFICATION / SYSTEM STATUS
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 bg-black/90 px-4 py-2 text-xs font-mono text-zinc-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-[#d71920] animate-ping"></span>
              NOTHING (R) OS UI // CLONE KIMOVIL
            </span>
            <span className="hidden md:inline text-zinc-600">|</span>
            <span className="hidden md:inline text-zinc-500">
              SPEC INTELLIGENCE &amp; PRICE COMPARATOR
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador del Backend de Spring Boot */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 hidden sm:inline">SPRING BOOT API:</span>
              {estadoBackend === "online" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ONLINE (:8080)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                  STANDBY (MOCK DATA)
                </span>
              )}
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 font-mono text-[11px]">v2.4.0</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HEADER BANNER (SUPERIOR) - ESTILO NOTHING PHONE
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-glyph-circuit py-12 px-4 sm:px-6 lg:px-8">
        {/* Glow sutil rojo en la esquina superior */}
        <div className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-[#d71920]/10 blur-3xl"></div>

        <div className="mx-auto max-w-7xl">
          {/* Fila Superior del Banner: Logo & Navegación */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-10 border-b border-zinc-800/80">
            {/* Logo Nothing Movil */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-black shadow-inner">
                {/* Glyph dot matrix icon */}
                <div className="grid grid-cols-3 gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#d71920]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#d71920]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#d71920]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#d71920]"></div>
                </div>
              </div>

              <div>
                <h1 className="font-dot text-2xl sm:text-3xl font-bold tracking-wider text-white">
                  NOTHING <span className="text-[#d71920]">MOVIL</span>
                </h1>
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                  HARDWARE BENCHMARK &amp; PRICE ENGINE
                </p>
              </div>
            </div>

            {/* Categorías Técnicas con Iconos de Línea Roja */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "todos" as const, label: "TODOS", icon: "⌗" },
                { id: "moviles" as const, label: "MÓVILES", icon: "📱" },
                { id: "tablets" as const, label: "TABLETS", icon: "💻" },
                { id: "tvs" as const, label: "SMART TVS", icon: "📺" },
                { id: "wearables" as const, label: "WEARABLES", icon: "⌚" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTipoDispositivo(cat.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                    tipoDispositivo === cat.id
                      ? "border-[#d71920] bg-[#d71920]/10 text-white shadow-[0_0_15px_rgba(215,25,32,0.3)]"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  <span className="text-[#d71920]">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuerpo Central del Banner (Titular + Buscador + Slider + Ofertas) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-10">
            {/* Columna Izquierda / Central: Titular, Buscador y Slider de Precio (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div>
                {/* Titular Dot Matrix en Rojo */}
                <span className="inline-block rounded border border-[#d71920]/40 bg-[#d71920]/10 px-2.5 py-1 text-[11px] font-mono text-[#d71920] tracking-wider mb-3">
                  [ SYSTEM READY // DATABASE EXPLORER ]
                </span>

                <h2 className="font-dot text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#d71920] tracking-tight leading-tight">
                  EXPLORA TU PRÓXIMO DISPOSITIVO
                </h2>

                <p className="mt-3 font-tech text-base text-zinc-400 max-w-xl">
                  Compara fichas técnicas, evolución de precios y rankings de rendimiento con estética técnica de grado industrial.
                </p>
              </div>

              {/* Barra de Búsqueda Superior Industrial */}
              <div className="mt-8">
                <label className="block text-[11px] font-mono text-zinc-400 mb-2 uppercase tracking-wider">
                  {"// BÚSQUEDA RÁPIDA DE DISPOSITIVOS"}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 flex items-center pointer-events-none text-[#d71920]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="BUSCAR DISPOSITIVOS... (EJ. POCO, NOTHING, SAMSUNG)"
                    className="w-full rounded-xl border border-zinc-700 bg-black/90 py-3.5 pl-12 pr-4 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-[#d71920] focus:outline-none focus:ring-2 focus:ring-[#d71920]/30 shadow-2xl transition-all"
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda("")}
                      className="absolute right-4 text-xs font-mono text-zinc-500 hover:text-white cursor-pointer"
                    >
                      [CLEAR]
                    </button>
                  )}
                </div>
              </div>

              {/* Control Deslizante de Precio (Slider) + Panel Técnico Rojo */}
              <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#0e0e11]/90 p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#d71920]"></span>
                    <span className="font-mono text-xs text-zinc-300 font-bold uppercase tracking-wider">
                      FILTRAR POR PRESUPUESTO
                    </span>
                  </div>

                  {/* Panel Técnico Oscuro con Borde Rojo (Reemplazo de la burbuja púrpura) */}
                  <div className="inline-flex items-center gap-2 rounded-lg border border-[#d71920] bg-black px-4 py-1.5 shadow-[0_0_15px_rgba(215,25,32,0.25)]">
                    <span className="font-mono text-xs text-zinc-400">HASTA:</span>
                    <span className="font-dot text-base font-bold text-[#d71920]">
                      ${presupuestoMax} USD
                    </span>
                  </div>
                </div>

                {/* Slider Minimalista Nothing (Línea blanca/oscura con thumb rojo) */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="25"
                    value={presupuestoMax}
                    onChange={(e) => setPresupuestoMax(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d71920]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>MIN: $100</span>
                    <span className="text-[#d71920] font-bold">FILTRO ACTIVO: ≤ ${presupuestoMax}</span>
                    <span>MAX: $1,500+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Sección "ÚLTIMAS OFERTAS" (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="rounded-2xl border border-zinc-800 bg-[#0d0d10] p-5 shadow-2xl flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-[#d71920] rounded-sm"></span>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                      ÚLTIMAS OFERTAS
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-[#d71920] bg-[#d71920]/10 px-2 py-0.5 rounded border border-[#d71920]/30 font-bold">
                    LIVE DEALS
                  </span>
                </div>

                {/* Lista de Ofertas en Paneles Segmentados */}
                <div className="space-y-3 flex-1">
                  {ofertasFiltradas.length > 0 ? (
                    ofertasFiltradas.map((oferta) => (
                      <div
                        key={oferta.id}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-800/90 bg-[#121216] p-3 transition-all hover:border-[#d71920]/70 hover:bg-[#16161b]"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-black/50 p-1 flex items-center justify-center">
                          <img
                            src={oferta.imagen}
                            alt={oferta.nombre}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-tech text-xs font-bold text-white truncate group-hover:text-[#ff2a35] transition-colors">
                            {oferta.nombre}
                          </p>
                          <p className="font-mono-tech text-[10px] text-zinc-400 truncate">
                            {oferta.especificaciones}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {oferta.descuento && (
                            <span className="inline-block font-mono text-[9px] font-bold text-[#d71920] bg-[#d71920]/10 px-1 rounded">
                              {oferta.descuento}
                            </span>
                          )}
                          <div className="font-mono-tech text-sm font-extrabold text-[#d71920]">
                            ${oferta.precio}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs font-mono text-zinc-500">
                      No hay ofertas dentro de este rango (${presupuestoMax}).
                    </div>
                  )}
                </div>

                {/* Enlace ver más ofertas */}
                <div className="mt-4 pt-3 border-t border-zinc-800/70 text-center">
                  <button className="font-dot text-[11px] text-zinc-400 hover:text-[#d71920] transition-colors tracking-wider cursor-pointer">
                    {"// EXPLORAR TODAS LAS OFERTAS >"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SELECTOR DE VISTAS (RANKINGS TOP KIMOVIL vs CATÁLOGO API)
      ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 bg-[#0b0b0e]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSeccionActiva("ranking")}
              className={`rounded-lg px-4 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                seccionActiva === "ranking"
                  ? "bg-[#d71920] text-white shadow-[0_0_15px_rgba(215,25,32,0.4)]"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              [ 1. LO MÁS TOP - RANKINGS KIMOVIL ]
            </button>
            <button
              onClick={() => setSeccionActiva("catalogo")}
              className={`rounded-lg px-4 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                seccionActiva === "catalogo"
                  ? "bg-[#d71920] text-white shadow-[0_0_15px_rgba(215,25,32,0.4)]"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              [ 2. CATÁLOGO COMPLETO - API BACKEND ({productosBackend.length}) ]
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-zinc-500">
            <span>PRESUPUESTO ACTIVO: ≤ ${presupuestoMax}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN PRINCIPAL: "LO MÁS TOP" (LAS DOS COLUMNAS DE KIMOVIL)
      ───────────────────────────────────────────────────────────── */}
      {seccionActiva === "ranking" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ── COLUMNA 1: LOS MÁS VENDIDOS ── */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#0c0c0f] p-6 shadow-2xl">
              {/* Título de Columna con Línea de Subrayado Roja Técnica */}
              <div className="pb-4 border-b border-zinc-800 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-tech text-xl font-bold uppercase tracking-wider text-white">
                    LOS MÁS VENDIDOS
                  </h3>
                  <span className="font-mono text-xs text-zinc-500">
                    TOP {vendidosFiltrados.length}
                  </span>
                </div>
                {/* Línea técnica de acento rojo */}
                <div className="mt-2.5 h-0.5 w-16 bg-[#d71920]"></div>
              </div>

              {/* Lista de Dispositivos */}
              <div className="space-y-3">
                {vendidosFiltrados.length > 0 ? (
                  (mostrarTodosVendidos ? vendidosFiltrados : vendidosFiltrados.slice(0, 4)).map((item) => (
                    <DeviceListItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm font-mono text-zinc-500">
                    No hay dispositivos que coincidan con el presupuesto de ${presupuestoMax}.
                  </div>
                )}
              </div>

              {/* Botón "VER LISTA COMPLETA": Fondo negro y borde fino Crimson Red */}
              {vendidosFiltrados.length > 4 && (
                <div className="mt-6 pt-4 border-t border-zinc-800/70 text-center">
                  <button
                    onClick={() => setMostrarTodosVendidos(!mostrarTodosVendidos)}
                    className="w-full rounded-xl border border-[#d71920] bg-black py-3 font-dot text-xs text-white transition-all hover:bg-[#d71920] hover:shadow-[0_0_20px_rgba(215,25,32,0.4)] cursor-pointer"
                  >
                    {mostrarTodosVendidos ? "[ OCULTAR LISTA ]" : "VER LISTA COMPLETA"}
                  </button>
                </div>
              )}
            </div>

            {/* ── COLUMNA 2: LOS MÁS DESEADOS ── */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#0c0c0f] p-6 shadow-2xl">
              {/* Título de Columna con Línea de Subrayado Roja Técnica */}
              <div className="pb-4 border-b border-zinc-800 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-tech text-xl font-bold uppercase tracking-wider text-white">
                    LOS MÁS DESEADOS
                  </h3>
                  <span className="font-mono text-xs text-zinc-500">
                    TOP {deseadosFiltrados.length}
                  </span>
                </div>
                {/* Línea técnica de acento rojo */}
                <div className="mt-2.5 h-0.5 w-16 bg-[#d71920]"></div>
              </div>

              {/* Lista de Dispositivos */}
              <div className="space-y-3">
                {deseadosFiltrados.length > 0 ? (
                  (mostrarTodosDeseados ? deseadosFiltrados : deseadosFiltrados.slice(0, 4)).map((item) => (
                    <DeviceListItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm font-mono text-zinc-500">
                    No hay dispositivos que coincidan con el presupuesto de ${presupuestoMax}.
                  </div>
                )}
              </div>

              {/* Botón "VER LISTA COMPLETA": Fondo negro y borde fino Crimson Red */}
              {deseadosFiltrados.length > 4 && (
                <div className="mt-6 pt-4 border-t border-zinc-800/70 text-center">
                  <button
                    onClick={() => setMostrarTodosDeseados(!mostrarTodosDeseados)}
                    className="w-full rounded-xl border border-[#d71920] bg-black py-3 font-dot text-xs text-white transition-all hover:bg-[#d71920] hover:shadow-[0_0_20px_rgba(215,25,32,0.4)] cursor-pointer"
                  >
                    {mostrarTodosDeseados ? "[ OCULTAR LISTA ]" : "VER LISTA COMPLETA"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN CATÁLOGO API COMPLETO (INTEGRACIÓN SPRING BOOT)
      ───────────────────────────────────────────────────────────── */}
      {seccionActiva === "catalogo" && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0f] p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800 mb-8">
              <div>
                <span className="font-mono text-xs text-[#d71920] font-bold">
                  {"// SPRING BOOT REST SERVICE [/api/productos]"}
                </span>
                <h3 className="font-tech text-2xl font-bold text-white mt-1">
                  Catálogo General del Sistema
                </h3>
              </div>

              {/* Estado de conexión */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-zinc-400">ESTADO API:</span>
                {estadoBackend === "online" ? (
                  <span className="rounded-md border border-emerald-500/50 bg-emerald-950 px-2.5 py-1 font-mono text-xs text-emerald-400 font-bold">
                    CONECTADO A SPRING BOOT (:8080)
                  </span>
                ) : (
                  <span className="rounded-md border border-amber-500/50 bg-amber-950 px-2.5 py-1 font-mono text-xs text-amber-400 font-bold">
                    DATOS DE PRUEBA LOCALES
                  </span>
                )}
              </div>
            </div>

            {cargandoApi ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-80 animate-pulse rounded-2xl bg-zinc-900 border border-zinc-800"></div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {productosBackend.map((producto) => (
                  <ProductCard key={producto.idProducto} producto={producto} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FOOTER INDUSTRIAL NOTHING
      ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 bg-black py-10 px-4 sm:px-6 lg:px-8 mt-16 font-mono text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-dot text-sm font-bold text-white">
              NOTHING <span className="text-[#d71920]">MOVIL</span>
            </span>
            <span>{"//"}</span>
            <span>PROYECTO DESARROLLO 1 - TECNOREVIEW</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-zinc-600">CLIENT: NEXT.JS 16</span>
            <span className="text-zinc-600">SERVER: SPRING BOOT 4</span>
            <span className="text-zinc-600">DB: SUPABASE POSTGRESQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}