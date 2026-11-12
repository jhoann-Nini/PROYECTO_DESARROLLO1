export interface OpcionesSeguridad {
  /** En producción se omite unsafe-eval y se anuncia HSTS. */
  produccion: boolean;
  /** Origen de la API del backend, por ejemplo https://api.tecreview.com */
  apiUrl?: string | null;
  /** Origen del proyecto de Supabase. */
  supabaseUrl?: string | null;
}

export interface HeaderSeguridad {
  key: string;
  value: string;
}

function normalizarOrigen(valor?: string | null): string | null {
  if (!valor) return null;

  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function origenWebSocket(origen: string): string {
  return origen.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

/**
 * La CSP se aplica desde next.config.ts, sin nonces, para conservar el
 * renderizado estático. Por eso script-src y style-src permiten inline.
 * Ver node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 */
export function construirCsp({
  produccion,
  apiUrl,
  supabaseUrl,
}: OpcionesSeguridad): string {
  const api = normalizarOrigen(apiUrl);
  const supabase = normalizarOrigen(supabaseUrl);
  const origenes = [...new Set([api, supabase].filter(Boolean))] as string[];

  const connectSrc = ["'self'"];
  if (origenes.length > 0) {
    for (const origen of origenes) {
      connectSrc.push(origen, origenWebSocket(origen));
    }
  } else if (!produccion) {
    // En desarrollo se permite un fallback amplio para no bloquear pruebas
    // contra servicios externos. En producción no se amplía a todo https:
    // porque, sin las variables públicas, la app tampoco puede autenticarse
    // ni consultar la API; es preferible fallar cerrado.
    connectSrc.push("https:", "wss:");
  }
  if (!produccion) {
    // Turbopack/Next usan WebSocket para el HMR en desarrollo.
    connectSrc.push("ws:");
  }

  const origenesHttp = origenes.filter((origen) => origen.startsWith("http:"));
  const imgSrc = ["'self'", "blob:", "data:", "https:", ...origenesHttp];

  const directivas = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${produccion ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (produccion) {
    directivas.push("upgrade-insecure-requests");
  }

  return directivas.join("; ");
}

export function construirHeadersSeguridad(
  opciones: OpcionesSeguridad
): HeaderSeguridad[] {
  const headers: HeaderSeguridad[] = [
    { key: "Content-Security-Policy", value: construirCsp(opciones) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
  ];

  if (opciones.produccion) {
    // includeSubDomains y preload son compromisos difíciles de revertir y
    // dependen del dominio real y de si comparte subdominios con otros
    // servicios. Se mantienen fuera hasta que el equipo confirme el dominio
    // de despliegue.
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000",
    });
  }

  return headers;
}
