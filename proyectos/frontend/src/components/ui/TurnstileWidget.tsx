"use client";

import { useEffect, useRef } from "react";

/**
 * CAPTCHA de Cloudflare Turnstile para los formularios de autenticación.
 *
 * Supabase Auth valida el token con la clave secreta, que nunca llega al
 * navegador. Aquí solo se usa la clave pública (site key).
 *
 * Cada token sirve para un solo intento: para pedir uno nuevo, el componente
 * que lo usa cambia la prop `key` y el widget se vuelve a montar.
 */

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface OpcionesTurnstile {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  language?: string;
  theme?: "auto" | "light" | "dark";
}

interface TurnstileApi {
  render: (contenedor: HTMLElement, opciones: OpcionesTurnstile) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let cargaScript: Promise<TurnstileApi> | null = null;

function cargarTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (cargaScript) return cargaScript;

  cargaScript = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile no se inicializó."));
    };
    script.onerror = () => {
      cargaScript = null;
      script.remove();
      reject(new Error("No se pudo cargar Turnstile."));
    };
    document.head.appendChild(script);
  });
  return cargaScript;
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** Recibe el token, o null cuando expira o falla la verificación. */
  onToken: (token: string | null) => void;
  /** Se llama si el script de Cloudflare no se puede cargar. */
  onErrorCarga?: () => void;
}

export default function TurnstileWidget({
  siteKey,
  onToken,
  onErrorCarga,
}: TurnstileWidgetProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  // Refs para no volver a renderizar el widget cuando cambian los callbacks.
  const onTokenRef = useRef(onToken);
  const onErrorCargaRef = useRef(onErrorCarga);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorCargaRef.current = onErrorCarga;
  });

  useEffect(() => {
    let cancelado = false;
    let widgetId: string | null = null;

    cargarTurnstile()
      .then((turnstile) => {
        if (cancelado || !contenedorRef.current) return;
        widgetId = turnstile.render(contenedorRef.current, {
          sitekey: siteKey,
          language: "es",
          theme: "auto",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelado) onErrorCargaRef.current?.();
      });

    return () => {
      cancelado = true;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {}
      }
    };
  }, [siteKey]);

  return (
    <div
      ref={contenedorRef}
      className="flex min-h-[65px] justify-center"
      data-testid="turnstile-widget"
    />
  );
}
