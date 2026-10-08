/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil, Producto } from "@/types/producto";
import { useState, useEffect } from "react";
import { normalizarFichaProducto } from "@/data/specsHelper";

interface FichaTecnicaModalProps {
  producto: DispositivoKimovil | Producto | null;
  onClose: () => void;
}

export default function FichaTecnicaModal({ producto, onClose }: FichaTecnicaModalProps) {
  const [guardadoFavoritos, setGuardadoFavoritos] = useState(false);
  const [alertaAccion, setAlertaAccion] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (producto) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [producto, onClose]);



  if (!producto) return null;

  // Normalización técnica inteligente según la categoría (móviles, auriculares, laptops, tablets)
  const ficha = normalizarFichaProducto(producto);
  const esKimovil = "ranking" in producto;
  const ranking = esKimovil ? (producto as DispositivoKimovil).ranking : null;

  const manejarFavoritos = () => {
    const nuevoEstado = !guardadoFavoritos;
    setGuardadoFavoritos(nuevoEstado);
    setAlertaAccion(
      nuevoEstado ? "¡Dispositivo guardado en tu lista de favoritos!" : "Eliminado de favoritos."
    );
    setTimeout(() => setAlertaAccion(""), 2200);
  };

  const manejarComparador = () => {
    setAlertaAccion("Dispositivo añadido a la tabla de comparación técnica.");
    setTimeout(() => setAlertaAccion(""), 2200);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha técnica de ${ficha.nombre}`}
    >
      {/* Contenedor del Modal con Encuadre Ajustado a la Pantalla (max-h-[92vh]) */}
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d11] shadow-[0_0_50px_rgba(0,0,0,0.85)]">
        
        {/* ─────────────────────────────────────────────────────────────
            CABECERA FIJA SUPERIOR (Sticky Header - Siempre accesible)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b border-zinc-800 bg-[#101014] shrink-0 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#d71920] bg-[#d71920]/10 border border-[#d71920]/30 px-2.5 py-1 rounded">
              {"[ FICHA TÉCNICA // DATASHEET ]"}
            </span>

            {/* Categoría Dinámica Coherente */}
            <span className="font-mono text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded flex items-center gap-1.5">
              <span>{ficha.categoriaIcono}</span>
              <span className="uppercase font-bold tracking-wider">{ficha.categoriaEtiqueta}</span>
            </span>

            {ranking !== null && (
              <span className="hidden sm:inline-block font-mono text-xs text-zinc-400 bg-black/60 px-2 py-1 rounded border border-zinc-800/80">
                RANKING #{ranking}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-xs font-bold text-zinc-300 hover:border-[#d71920] hover:text-white transition-all cursor-pointer"
            aria-label="Cerrar modal de ficha técnica"
          >
            ✕ CERRAR (ESC)
          </button>
        </div>

        {/* Notificación de Acción Flotante */}
        {alertaAccion && (
          <div className="mx-5 sm:mx-7 mt-3 rounded-xl border border-emerald-500/50 bg-emerald-950/80 p-2.5 font-mono text-xs text-emerald-400 text-center animate-pulse">
            ✅ {alertaAccion}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CUERPO CENTRAL DESPLAZABLE (Scrollable Content Body)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* ── COLUMNA IZQUIERDA: Encuadre de Imagen y Puntuaciones (5 Cols) ── */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Vitrina Visual del Producto con Encuadre Perfecto */}
              <div className="relative aspect-[4/3] w-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 via-black to-black p-4 flex items-center justify-center overflow-hidden group">
                <img
                  src={ficha.imagen}
                  alt={ficha.nombre}
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-105"
                />

                {/* Badge de Marca */}
                <span className="absolute top-3 left-3 rounded-md bg-black/85 px-2.5 py-1 font-mono text-[11px] font-bold text-zinc-300 border border-zinc-700/80 backdrop-blur-md">
                  {ficha.marca}
                </span>

                {/* Badge de Categoría */}
                <span className="absolute top-3 right-3 rounded-md bg-black/85 px-2 py-1 font-mono text-[10px] text-zinc-400 border border-zinc-800 backdrop-blur-md">
                  {ficha.categoriaIcono} {ficha.categoriaTipo.toUpperCase()}
                </span>

                {/* Badge de Precio */}
                <span className="absolute bottom-3 right-3 rounded-md bg-[#d71920] px-3 py-1 font-dot text-sm font-extrabold text-white shadow-[0_0_15px_rgba(215,25,32,0.5)]">
                  ${ficha.precio} USD
                </span>
              </div>

              {/* Tarjeta de Puntuación Coherente con la Categoría */}
              <div className="rounded-2xl border border-zinc-800 bg-[#121217] p-4.5 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <span className="font-mono text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    PUNTUACIÓN KIMOVIL / NOTHING
                  </span>
                  <span className="font-dot text-lg font-bold text-emerald-400">
                    {ficha.puntuacionGlobal} / 10
                  </span>
                </div>

                {/* Medición Técnica / Benchmark Específico */}
                <div className="mb-4 rounded-xl border border-zinc-800/80 bg-black/60 p-2.5 flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-400 font-bold">{ficha.benchmark.etiqueta}:</span>
                  <span className="text-emerald-400 font-bold">{ficha.benchmark.valor}</span>
                </div>

                {/* Barras de Métricas Técnicas Coherentes */}
                <div className="space-y-2.5 font-mono text-[11px]">
                  {ficha.metricas.map((metrica, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-zinc-400 mb-1">
                        <span>{metrica.nombre}</span>
                        <span className="text-emerald-400 font-bold">{metrica.puntos.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${Math.min(metrica.puntos * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Especificaciones y Precios (7 Cols) ── */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Título y Resumen del Dispositivo */}
              <div>
                <span className="font-mono text-xs text-[#d71920] font-bold uppercase tracking-wider">
                  {ficha.marca} {"// ESPECIFICACIONES COMPLETAS"}
                </span>
                <h2 className="font-tech text-2xl sm:text-3xl font-extrabold text-white mt-1 leading-tight">
                  {ficha.nombre}
                </h2>
                <p className="mt-2 text-xs font-mono text-zinc-400 leading-relaxed border-l-2 border-[#d71920] pl-3">
                  {ficha.resumen}
                </p>
              </div>

              {/* Rejilla Modular de Especificaciones Técnicas (2 Columnas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ficha.secciones.map((sec, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-800/90 bg-[#121217] p-3 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-1.5 text-[#d71920] font-mono text-xs font-bold mb-1">
                      <span>{sec.icono}</span>
                      <span className="uppercase tracking-wider">{sec.titulo}</span>
                    </div>
                    <p className="text-zinc-200 font-mono text-[11px] leading-relaxed">
                      {sec.descripcion}
                    </p>
                    {sec.detalleExtra && (
                      <p className="mt-1 text-[10px] font-mono text-emerald-400 font-bold">
                        {sec.detalleExtra}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Comparador de Precios en Tiendas */}
              <div className="rounded-xl border border-zinc-800 bg-black/70 p-3.5">
                <span className="font-mono text-xs font-bold text-white block mb-2.5 uppercase tracking-wider">
                  🛒 COMPARADOR DE PRECIOS EN TIENDAS ONLINE
                </span>
                <div className="space-y-2 font-mono text-xs">
                  {ficha.tiendas.map((tienda, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-zinc-900 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300">{tienda.nombre}</span>
                        {tienda.envioGratis && (
                          <span className="text-[9px] bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-1.5 py-0.2 rounded">
                            Envío Gratis
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-emerald-400 font-bold">${tienda.precio} USD</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAlertaAccion(`Redirigiendo a tienda oficial: ${tienda.nombre}`);
                            setTimeout(() => setAlertaAccion(""), 2000);
                          }}
                          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-[#d71920] hover:text-white transition-all cursor-pointer"
                        >
                          IR A TIENDA ↗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BARRA INFERIOR DE ACCIONES FIJA (Sticky Footer Action Bar)
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 sm:px-7 py-3.5 border-t border-zinc-800 bg-[#101014] shrink-0 z-10">
          <button
            onClick={manejarFavoritos}
            className={`flex-1 rounded-xl border px-4 py-3 font-mono text-xs font-bold transition-all cursor-pointer ${
              guardadoFavoritos
                ? "border-emerald-500 bg-emerald-950/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "border-zinc-800 bg-black text-zinc-300 hover:border-[#d71920] hover:text-white"
            }`}
          >
            {guardadoFavoritos ? "★ EN FAVORITOS" : "☆ GUARDAR EN FAVORITOS"}
          </button>

          <button
            onClick={manejarComparador}
            className="flex-1 rounded-xl border border-[#d71920] bg-[#d71920] px-4 py-3 font-dot text-xs font-bold text-white transition-all hover:bg-[#ff2a35] hover:shadow-[0_0_20px_rgba(215,25,32,0.5)] cursor-pointer"
          >
            COMPRAR AL MEJOR PRECIO (${ficha.precio} USD)
          </button>
        </div>
      </div>
    </div>
  );
}
