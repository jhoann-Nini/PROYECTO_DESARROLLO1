"use client";

import React from "react";

interface GeometricBackgroundProps {
  tema?: "claro" | "oscuro";
}

/**
 * GeometricBackground
 * Fondo geométrico bicolor inspirado en la composición diagonal y moderna de TecReview.
 * Combina los dos colores clave en cada modo (claro y oscuro) con un corte diagonal nítido,
 * textura de micro-puntos de ingeniería (tech dot matrix) y sutiles acentos angulares
 * para enriquecer la experiencia visual sin comprometer la legibilidad ni el contraste (WCAG AA).
 */
export default function GeometricBackground({ tema = "claro" }: GeometricBackgroundProps) {
  const esOscuro = tema === "oscuro";

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. CAPA BASE DE COLOR PRINCIPAL
          Claro: Lavanda/perla tecnológico suave (#fbf9fe)
          Oscuro: Noche índigo-violeta profunda (#090714)
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          esOscuro ? "bg-[#090714]" : "bg-[#fbf9fe]"
        }`}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. SVG CON CORTE DIAGONAL MORADO Y AZUL (Cromática Morado / Azul)
      ───────────────────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1000 1000"
      >
        <defs>
          {/* Gradiente diagonal para Modo Claro: Morado lavanda a Azul cielo suave */}
          <linearGradient id="tecGradienteClaro" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.50" />
            <stop offset="100%" stopColor="#ede9fe" stopOpacity="0.25" />
          </linearGradient>

          {/* Gradiente diagonal para Modo Oscuro: Púrpura/Morado a Azul Eléctrico y Medianoche */}
          <linearGradient id="tecGradienteOscuro" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.38" />
            <stop offset="45%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#090714" stopOpacity="0.10" />
          </linearGradient>

          {/* Patrón de puntos tecnológicos (Tech Dot Matrix) con tono morado/azul */}
          <pattern
            id="tecDotGrid"
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              className={esOscuro ? "fill-purple-400/25" : "fill-indigo-600/18"}
            />
          </pattern>

          {/* Patrón de líneas sutiles a 45 grados */}
          <pattern
            id="tecStripes"
            x="0"
            y="0"
            width="40"
            height="40"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="40"
              strokeWidth="1"
              className={esOscuro ? "stroke-purple-400/10" : "stroke-blue-500/10"}
            />
          </pattern>
        </defs>

        {/* Polígono secundario: Plano diagonal (lado superior-derecho al inferior) */}
        <polygon
          points="520,0 1000,0 1000,1000 180,1000"
          fill={esOscuro ? "url(#tecGradienteOscuro)" : "url(#tecGradienteClaro)"}
          className="transition-all duration-700"
        />

        {/* Segundo polígono geométrico angular morado en la esquina superior derecha */}
        <polygon
          points="780,0 1000,0 1000,450"
          fill={esOscuro ? "#6b21a8" : "#c084fc"}
          fillOpacity={esOscuro ? 0.28 : 0.22}
          className="transition-all duration-700"
        />

        {/* Línea divisoria diagonal de alta definición con tono Morado eléctrico */}
        <line
          x1="520"
          y1="0"
          x2="180"
          y2="1000"
          stroke={esOscuro ? "#a855f7" : "#8b5cf6"}
          strokeWidth="1.5"
          strokeOpacity={esOscuro ? 0.45 : 0.4}
        />

        {/* Línea secundaria de acento tecnológico paralela con tono Azul */}
        <line
          x1="535"
          y1="0"
          x2="195"
          y2="1000"
          stroke={esOscuro ? "#3b82f6" : "#60a5fa"}
          strokeWidth="1"
          strokeDasharray="8 6"
          strokeOpacity={esOscuro ? 0.35 : 0.3}
        />

        {/* Capa de textura: Micro-puntos sobre el fondo para que no se vea vacío */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#tecDotGrid)"
        />

        {/* Capa de rayas sutiles en la zona diagonal */}
        <polygon
          points="520,0 1000,0 1000,1000 180,1000"
          fill="url(#tecStripes)"
        />
      </svg>

      {/* ─────────────────────────────────────────────────────────────
          3. RESPLANDORES RADIALES SUAVES (Morado Superior y Azul Inferior)
      ───────────────────────────────────────────────────────────── */}
      {/* Resplandor superior derecho: Morado / Púrpura vibrante */}
      <div
        className={`absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full blur-3xl transition-opacity duration-700 ${
          esOscuro
            ? "bg-purple-600/30"
            : "bg-purple-300/40"
        }`}
      />

      {/* Resplandor inferior izquierdo: Azul eléctrico */}
      <div
        className={`absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full blur-3xl transition-opacity duration-700 ${
          esOscuro
            ? "bg-blue-600/30"
            : "bg-blue-300/40"
        }`}
      />

      {/* Resplandor ambiental central de mezcla Morado y Azul */}
      <div
        className={`absolute top-1/3 left-1/4 h-[350px] w-[350px] rounded-full blur-3xl transition-opacity duration-700 ${
          esOscuro
            ? "bg-indigo-600/15"
            : "bg-indigo-200/30"
        }`}
      />

      {/* Acentos geométricos flotantes estilo "Tech / Hardware" bicolor (Morado y Azul) */}
      <div className="absolute top-36 right-16 hidden lg:flex flex-col gap-2 opacity-40 dark:opacity-30">
        <div className="h-1.5 w-16 bg-purple-600 dark:bg-purple-400 rounded-full" />
        <div className="h-1.5 w-8 bg-blue-600 dark:bg-blue-400 rounded-full ml-auto" />
      </div>

      <div className="absolute bottom-24 left-12 hidden lg:flex flex-col gap-2 opacity-35 dark:opacity-30">
        <div className="h-1.5 w-8 bg-purple-600 dark:bg-purple-400 rounded-full" />
        <div className="h-1.5 w-16 bg-blue-600 dark:bg-blue-400 rounded-full" />
      </div>
    </div>
  );
}
