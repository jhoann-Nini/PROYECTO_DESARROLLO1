/* eslint-disable @next/next/no-img-element */
"use client";

import { DispositivoKimovil, Producto } from "@/types/producto";
import { useState, useEffect } from "react";
import { normalizarFichaProducto, formatearCOP } from "@/data/specsHelper";

interface FichaTecnicaModalProps {
  producto: DispositivoKimovil | Producto | null;
  onClose: () => void;
}

type TabFicha = "pantalla" | "rendimiento" | "bateria" | "pros_contras";

export default function FichaTecnicaModal({ producto, onClose }: FichaTecnicaModalProps) {
  const [pestanaActiva, setPestanaActiva] = useState<TabFicha>("pantalla");

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

  const ficha = normalizarFichaProducto(producto);
  const esKimovil = "ranking" in producto;
  const ranking = esKimovil ? (producto as DispositivoKimovil).ranking : null;

  const pestanas = [
    { id: "pantalla", etiqueta: "Pantalla y diseño", icono: "🖥️" },
    { id: "rendimiento", etiqueta: "Rendimiento y procesador", icono: "⚡" },
    { id: "bateria", etiqueta: "Autonomía y batería", icono: "🔋" },
    { id: "pros_contras", etiqueta: "Puntos a favor y en contra", icono: "⚖️" },
  ] as const;

  const precioFormateado = formatearCOP(ficha.precio);

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
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-slate-900 dark:text-slate-100">
        
        {/* Cabecera accesible superior */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold font-doto uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md">
              FICHA TÉCNICA
            </span>

            <span className="text-xs font-doto uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold shadow-2xs">
              <span aria-hidden="true">{ficha.categoriaIcono}</span>
              <span>{ficha.categoriaEtiqueta}</span>
            </span>

            {ranking !== null && (
              <span className="font-doto hidden sm:inline-block text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 font-bold">
                RANKING #{ranking}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="font-doto uppercase tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
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
              <div className="relative aspect-[4/3] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center overflow-hidden">
                <img
                  src={ficha.imagen}
                  alt={`Vista frontal de ${ficha.nombre}`}
                  className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105"
                />

                <span className="font-doto uppercase tracking-wider absolute top-3 left-3 rounded-md bg-white/95 dark:bg-slate-900/90 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {ficha.marca}
                </span>

                <span className="font-sans font-extrabold tracking-tight absolute bottom-3 right-3 rounded-md bg-blue-700 dark:bg-blue-600 px-3 py-1 text-sm text-white shadow-xs">
                  {precioFormateado}
                </span>
              </div>

              {/* Evaluación Global */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <span className="text-xs font-bold font-doto text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    PUNTUACIÓN TECREVIEW
                  </span>
                  <span className="text-xl font-extrabold font-sans text-blue-700 dark:text-blue-400 tracking-tight">
                    {ficha.puntuacionGlobal} / 10
                  </span>
                </div>

                <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider font-doto text-[11px]">{ficha.benchmark.etiqueta}:</span>
                  <span className="text-slate-900 dark:text-white font-bold font-sans tracking-tight">{ficha.benchmark.valor}</span>
                </div>

                <div className="space-y-3 text-xs">
                  {ficha.metricas.map((metrica, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1 font-medium">
                        <span>{metrica.nombre}</span>
                        <span className="font-bold text-slate-900 dark:text-white font-sans">{metrica.puntos.toFixed(1)}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-700 dark:bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(metrica.puntos * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Selector de Pestañas y Contenido */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div>
                <span className="text-xs text-blue-700 dark:text-blue-400 font-bold font-doto uppercase tracking-wider">
                  {ficha.marca} // ESPECIFICACIONES TÉCNICAS
                </span>
                <h2 id="modal-titulo-dispositivo" className="text-2xl sm:text-3xl font-black font-doto text-slate-900 dark:text-white mt-1 leading-tight uppercase tracking-wide">
                  {ficha.nombre}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-l-3 border-blue-700 dark:border-blue-500 pl-3">
                  {ficha.resumen}
                </p>
              </div>

              {/* Barra de pestañas accesible */}
              <div
                role="tablist"
                aria-label="Categorías de especificaciones del dispositivo"
                className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
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
                      onClick={() => setPestanaActiva(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold font-doto uppercase tracking-wider transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                        activa
                          ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-slate-700"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <span aria-hidden="true">{p.icono}</span>
                      <span>{p.etiqueta}</span>
                    </button>
                  );
                })}
              </div>

              {/* Panel de Contenido de Pestañas */}
              <div className="mt-1">
                {/* 1. PANTALLA Y DISEÑO */}
                {pestanaActiva === "pantalla" && (
                  <div
                    id="panel-pantalla"
                    role="tabpanel"
                    aria-labelledby="tab-pantalla"
                    className="space-y-3.5"
                  >
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1.5 flex items-center gap-2">
                        <span>📱</span> Experiencia visual y materiales
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Panel de alta definición con ángulos de visión optimizados para interiores y exteriores. Ofrece transiciones suaves y fidelidad de color precisa.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Claridad y resolución</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">Nitidez certificada FHD+ / 2K</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Ideal para leer texto sin fatiga ocular y reproducir video en alta calidad.</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Tasa de actualización</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">Fluidez adaptativa (hasta 120 Hz)</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Animaciones más naturales y respuesta táctil casi instantánea.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. RENDIMIENTO Y PROCESADOR */}
                {pestanaActiva === "rendimiento" && (
                  <div
                    id="panel-rendimiento"
                    role="tabpanel"
                    aria-labelledby="tab-rendimiento"
                    className="space-y-3.5"
                  >
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1.5 flex items-center gap-2">
                        <span>⚡</span> Potencia y fluidez del sistema
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Arquitectura moderna capaz de ejecutar múltiples tareas simultáneas, edición ligera y juegos demandantes sin ralentizaciones perceptibles.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Procesador principal</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">Chip multinúcleo optimizado</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Equilibrio entre bajo consumo de energía y alta velocidad.</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Memoria y multitarea</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">RAM de alta velocidad</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Permite mantener aplicaciones abiertas en segundo plano sin reiniciarlas.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. AUTONOMÍA Y BATERÍA */}
                {pestanaActiva === "bateria" && (
                  <div
                    id="panel-bateria"
                    role="tabpanel"
                    aria-labelledby="tab-bateria"
                    className="space-y-3.5"
                  >
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1.5 flex items-center gap-2">
                        <span>🔋</span> Duración de carga para tu día a día
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Batería calibrada para ofrecer una jornada entera de uso estándar (mensajería, navegación, llamadas y multimedia) sin depender del cargador.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Tiempo estimado de uso</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">1 a 1.5 días de uso regular</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Gestión inteligente de energía basada en tus hábitos.</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Tecnología de recarga</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">Carga rápida compatible</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Recupera hasta el 50% de batería en aproximadamente 30 minutos.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. PUNTOS A FAVOR Y EN CONTRA */}
                {pestanaActiva === "pros_contras" && (
                  <div
                    id="panel-pros_contras"
                    role="tabpanel"
                    aria-labelledby="tab-pros_contras"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span>✓</span> Puntos a favor
                      </h4>
                      <ul className="space-y-2 text-xs text-emerald-950 dark:text-emerald-200 font-medium">
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">•</span>
                          <span>Excelente balance entre precio de mercado y prestaciones.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">•</span>
                          <span>Pantalla brillante con excelente legibilidad bajo la luz solar.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">•</span>
                          <span>Software limpio con soporte extendido de actualizaciones.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span>⚠️</span> Puntos a tener en cuenta
                      </h4>
                      <ul className="space-y-2 text-xs text-amber-950 dark:text-amber-200 font-medium">
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-700 dark:text-amber-400 font-bold">•</span>
                          <span>Verifica si el adaptador de carga rápida viene incluido en la caja.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-amber-700 dark:text-amber-400 font-bold">•</span>
                          <span>Almacenamiento no ampliable mediante tarjeta microSD en ciertas versiones.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="flex justify-end px-5 sm:px-7 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cerrar ficha técnica
          </button>
        </div>
      </div>
    </div>
  );
}
