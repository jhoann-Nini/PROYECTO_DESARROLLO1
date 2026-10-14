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
          Claro: Pizarra/perla ultra suave (#f4f6fa)
          Oscuro: Carbón obsidiana profundo (#030712)
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          esOscuro ? "bg-[#030712]" : "bg-[#f4f7fb]"
        }`}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. SVG CON CORTE DIAGONAL BICOLOR (Inspirado en la foto de referencia)
          Divide la pantalla de forma angular entre el plano base y el plano secundario
      ───────────────────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1000 1000"
      >
        <defs>
          {/* Gradiente diagonal para Modo Claro: Azul cielo/hielo suave */}
          <linearGradient id="tecGradienteClaro" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#dbeafe" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.30" />
          </linearGradient>

          {/* Gradiente diagonal para Modo Oscuro: Azul marino medianoche / zafiro */}
          <linearGradient id="tecGradienteOscuro" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#172554" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.25" />
          </linearGradient>

          {/* Patrón de puntos tecnológicos (Tech Dot Matrix) para dar textura y evitar vacío */}
          <pattern
            id="tecDotGrid"
            x="0"
            y="0"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              className={esOscuro ? "fill-blue-400/20" : "fill-blue-600/15"}
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
              className={esOscuro ? "stroke-blue-400/5" : "stroke-blue-500/8"}
            />
          </pattern>
        </defs>

        {/* Polígono secundario: Plano diagonal (lado superior-derecho al inferior) */}
        <polygon
          points="520,0 1000,0 1000,1000 180,1000"
          fill={esOscuro ? "url(#tecGradienteOscuro)" : "url(#tecGradienteClaro)"}
          className="transition-all duration-700"
        />

        {/* Segundo polígono geométrico angular más sutil en la esquina superior derecha */}
        <polygon
          points="780,0 1000,0 1000,450"
          fill={esOscuro ? "#1e40af" : "#93c5fd"}
          fillOpacity={esOscuro ? 0.2 : 0.25}
          className="transition-all duration-700"
        />

        {/* Línea divisoria diagonal de alta definición con bisel sutil */}
        <line
          x1="520"
          y1="0"
          x2="180"
          y2="1000"
          stroke={esOscuro ? "#60a5fa" : "#3b82f6"}
          strokeWidth="1.5"
          strokeOpacity={esOscuro ? 0.35 : 0.4}
        />

        {/* Línea secundaria de acento tecnológico paralela */}
        <line
          x1="535"
          y1="0"
          x2="195"
          y2="1000"
          stroke={esOscuro ? "#3b82f6" : "#60a5fa"}
          strokeWidth="1"
          strokeDasharray="8 6"
          strokeOpacity={esOscuro ? 0.2 : 0.25}
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
          3. RESPLANDORES RADIALES SUAVES (Profundidad ambiental)
      ───────────────────────────────────────────────────────────── */}
      {/* Resplandor superior derecho (resalta la zona azul) */}
      <div
        className={`absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full blur-3xl transition-opacity duration-700 ${
          esOscuro
            ? "bg-blue-600/20"
            : "bg-sky-300/35"
        }`}
      />

      {/* Resplandor inferior izquierdo (equilibrio sutil) */}
      <div
        className={`absolute -bottom-32 -left-32 h-[450px] w-[450px] rounded-full blur-3xl transition-opacity duration-700 ${
          esOscuro
            ? "bg-indigo-950/40"
            : "bg-blue-100/60"
        }`}
      />

      {/* Acentos geométricos flotantes sutiles estilo "Tech / Hardware" */}
      <div className="absolute top-36 right-16 hidden lg:flex flex-col gap-2 opacity-30 dark:opacity-20">
        <div className="h-1.5 w-16 bg-blue-600 dark:bg-blue-400 rounded-full" />
        <div className="h-1.5 w-8 bg-blue-500 dark:bg-blue-400 rounded-full ml-auto" />
      </div>

      <div className="absolute bottom-24 left-12 hidden lg:flex flex-col gap-2 opacity-25 dark:opacity-20">
        <div className="h-1.5 w-8 bg-blue-600 dark:bg-blue-400 rounded-full" />
        <div className="h-1.5 w-16 bg-blue-500 dark:bg-blue-400 rounded-full" />
      </div>
    </div>
  );
}
