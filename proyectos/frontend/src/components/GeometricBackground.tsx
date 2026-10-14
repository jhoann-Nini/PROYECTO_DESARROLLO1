"use client";

import React from "react";

interface GeometricBackgroundProps {
  tema?: "claro" | "oscuro";
}

/**
 * GeometricBackground
 * Fondo topográfico y de curvas de nivel orgánicas (Topographic Waves / Contour Lines)
 * inspirado fielmente en la imagen de referencia del usuario, adaptado a la cromática
 * de morado y azul (púrpura eléctrico y azul zafiro).
 * 
 * En modo oscuro presenta un cielo nocturno profundo (#090714) con resplandor morado en la
 * esquina superior derecha y azul en la inferior izquierda, atravesado por sutiles líneas
 * de contorno topográfico con opacidad calibrada para no comprometer la legibilidad (WCAG AA).
 */
export default function GeometricBackground({ tema = "claro" }: GeometricBackgroundProps) {
  const esOscuro = tema === "oscuro";

  // Colección de curvas de nivel topográficas onduladas que recorren la pantalla
  // de forma orgánica emulando mapas topográficos de relieve y ondas de elevación
  const lineasTopograficas = [
    // Bloque Superior (Ondas que bordean el resplandor morado)
    "M -80 30 C 260 -40, 560 90, 880 20 C 1200 -50, 1420 80, 1680 30",
    "M -80 65 C 250 -10, 570 125, 890 55 C 1210 -15, 1410 115, 1680 65",
    "M -80 105 C 240 25, 580 165, 900 95 C 1220 25, 1400 155, 1680 105",
    "M -80 150 C 230 65, 590 210, 910 140 C 1230 70, 1390 200, 1680 150",
    "M -80 200 C 220 110, 600 260, 920 190 C 1240 120, 1380 250, 1680 200",
    "M -80 255 C 210 160, 610 315, 930 245 C 1250 175, 1370 305, 1680 255",
    
    // Bloque Medio-Superior (Transición hacia la cresta central)
    "M -80 315 C 200 215, 620 375, 940 305 C 1260 235, 1360 365, 1680 315",
    "M -80 380 C 190 275, 630 440, 950 370 C 1270 300, 1350 430, 1680 380",
    "M -80 450 C 180 340, 640 510, 960 440 C 1280 370, 1340 500, 1680 450",
    "M -80 525 C 170 410, 650 585, 970 515 C 1290 445, 1330 575, 1680 525",

    // Bloque Medio-Inferior (Valle central suave con curva envolvente)
    "M -80 605 C 160 485, 660 665, 980 595 C 1300 525, 1320 655, 1680 605",
    "M -80 690 C 150 565, 670 750, 990 680 C 1310 610, 1310 740, 1680 690",
    "M -80 780 C 140 650, 680 840, 1000 770 C 1320 700, 1300 830, 1680 780",
    "M -80 875 C 130 740, 690 935, 1010 865 C 1330 795, 1290 925, 1680 875",
    "M -80 975 C 120 835, 700 1035, 1020 965 C 1340 895, 1280 1025, 1680 975",

    // Curvas concéntricas de elevación topográfica en esquina superior derecha
    "M 1100 -50 C 1250 80, 1400 120, 1650 40",
    "M 1150 -50 C 1280 60, 1420 100, 1650 10",
    "M 1200 -50 C 1310 40, 1440 80, 1650 -20",

    // Curvas concéntricas de elevación topográfica en esquina inferior izquierda
    "M -50 720 C 150 780, 240 920, 180 1050",
    "M -50 780 C 120 830, 200 950, 140 1050",
    "M -50 840 C 90 880, 160 980, 100 1050",
  ];

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. CAPA BASE DE COLOR
          Claro: Lavanda/perla suave (#fcfaff)
          Oscuro: Noche violeta-índigo profunda (#080711)
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          esOscuro ? "bg-[#080711]" : "bg-[#fcfaff]"
        }`}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. RESPLANDORES RADIALES SUAVES (Como la imagen de referencia)
          Esquina superior derecha: Morado / Púrpura cálido
          Esquina inferior izquierda: Azul eléctrico zafiro
          Centro / Fondo: Nebulosa difuminada
      ───────────────────────────────────────────────────────────── */}
      {/* Resplandor superior derecho (Morado / Violeta vibrante) */}
      <div
        className={`absolute -top-40 -right-40 h-[650px] w-[650px] rounded-full blur-[110px] transition-opacity duration-700 ${
          esOscuro ? "bg-purple-600/30" : "bg-purple-300/40"
        }`}
      />

      {/* Resplandor inferior izquierdo (Azul zafiro profundo) */}
      <div
        className={`absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full blur-[110px] transition-opacity duration-700 ${
          esOscuro ? "bg-blue-600/30" : "bg-blue-300/40"
        }`}
      />

      {/* Resplandor superior izquierdo sutil (Aura azul/morada secundaria) */}
      <div
        className={`absolute -top-32 -left-20 h-[450px] w-[450px] rounded-full blur-[120px] transition-opacity duration-700 ${
          esOscuro ? "bg-indigo-700/20" : "bg-indigo-200/35"
        }`}
      />

      {/* Resplandor inferior derecho cálido / morado suave */}
      <div
        className={`absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full blur-[120px] transition-opacity duration-700 ${
          esOscuro ? "bg-purple-800/20" : "bg-purple-200/30"
        }`}
      />

      {/* ─────────────────────────────────────────────────────────────
          3. SVG TOPOGRÁFICO CON CURVAS DE NIVEL (Topographic Contour Lines)
          Líneas finas, continuas y elegantes idénticas a la imagen
      ───────────────────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1600 1000"
      >
        <defs>
          {/* Gradiente lineal horizontal de trazo para Modo Oscuro (Morado a Azul) */}
          <linearGradient id="topoStrokeOscuro" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#a855f7" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.50" />
          </linearGradient>

          {/* Gradiente lineal horizontal de trazo para Modo Claro */}
          <linearGradient id="topoStrokeClaro" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#7c3aed" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0.35" />
          </linearGradient>

          {/* Gradiente secundario invertido para dar profundidad tridimensional */}
          <linearGradient id="topoStrokeInvertido" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.40" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Trazado de las curvas topográficas */}
        <g
          fill="none"
          stroke={esOscuro ? "url(#topoStrokeOscuro)" : "url(#topoStrokeClaro)"}
          strokeWidth="0.85"
          className="transition-all duration-700"
        >
          {lineasTopograficas.map((pathD, idx) => (
            <path
              key={idx}
              d={pathD}
              stroke={
                idx % 3 === 0
                  ? "url(#topoStrokeInvertido)"
                  : esOscuro
                  ? "url(#topoStrokeOscuro)"
                  : "url(#topoStrokeClaro)"
              }
              strokeWidth={idx % 4 === 0 ? "1.1" : "0.85"}
              strokeOpacity={
                esOscuro
                  ? 0.16 + ((idx * 7) % 15) * 0.012
                  : 0.20 + ((idx * 5) % 15) * 0.015
              }
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
