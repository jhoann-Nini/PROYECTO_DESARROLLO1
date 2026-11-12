import { describe, expect, it } from "vitest";
import {
  construirCsp,
  construirHeadersSeguridad,
  type OpcionesSeguridad,
} from "./securityHeaders";

const PRODUCCION: OpcionesSeguridad = {
  produccion: true,
  apiUrl: "https://api.tecreview.example",
  supabaseUrl: "https://proyecto.supabase.co",
};

function valorHeader(
  headers: { key: string; value: string }[],
  clave: string
): string | undefined {
  return headers.find((header) => header.key === clave)?.value;
}

function directiva(csp: string, nombre: string): string | undefined {
  return csp
    .split(";")
    .map((directivaCsp) => directivaCsp.trim())
    .find((directivaCsp) => directivaCsp.startsWith(`${nombre} `));
}

describe("construirHeadersSeguridad", () => {
  it("incluye las cabeceras de seguridad base en producción", () => {
    const headers = construirHeadersSeguridad(PRODUCCION);

    expect(valorHeader(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(valorHeader(headers, "X-Frame-Options")).toBe("DENY");
    expect(valorHeader(headers, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(valorHeader(headers, "Permissions-Policy")).toContain("camera=()");
    expect(valorHeader(headers, "Strict-Transport-Security")).toContain(
      "max-age="
    );
  });

  it("no anuncia HSTS fuera de producción", () => {
    const headers = construirHeadersSeguridad({
      ...PRODUCCION,
      produccion: false,
    });

    expect(valorHeader(headers, "Strict-Transport-Security")).toBeUndefined();
  });
});

describe("construirCsp", () => {
  it("genera una CSP estática compatible con Next.js sin nonces", () => {
    const csp = construirCsp(PRODUCCION);

    expect(directiva(csp, "default-src")).toBe("default-src 'self'");
    expect(directiva(csp, "script-src")).toBe(
      "script-src 'self' 'unsafe-inline'"
    );
    expect(directiva(csp, "style-src")).toBe(
      "style-src 'self' 'unsafe-inline'"
    );
    expect(directiva(csp, "font-src")).toBe("font-src 'self' data:");
    expect(directiva(csp, "img-src")).toBe(
      "img-src 'self' blob: data: https:"
    );
    expect(directiva(csp, "object-src")).toBe("object-src 'none'");
    expect(directiva(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'nonce-");
  });

  it("habilita unsafe-eval y WebSocket local solo en desarrollo", () => {
    const csp = construirCsp({ ...PRODUCCION, produccion: false });

    expect(directiva(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directiva(csp, "connect-src")).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("limita connect-src a los orígenes configurados de API y Supabase", () => {
    const csp = construirCsp(PRODUCCION);

    expect(directiva(csp, "connect-src")).toBe(
      "connect-src 'self' https://api.tecreview.example wss://api.tecreview.example https://proyecto.supabase.co wss://proyecto.supabase.co"
    );
  });

  it("aplica un fallback https/wss cuando faltan los orígenes configurables", () => {
    const csp = construirCsp({
      produccion: true,
      apiUrl: null,
      supabaseUrl: undefined,
    });

    expect(directiva(csp, "connect-src")).toBe(
      "connect-src 'self' https: wss:"
    );
  });

  it("permite orígenes http locales de Supabase en desarrollo", () => {
    const csp = construirCsp({
      produccion: false,
      supabaseUrl: "http://127.0.0.1:54321",
    });

    expect(directiva(csp, "connect-src")).toContain(
      "http://127.0.0.1:54321"
    );
    expect(directiva(csp, "connect-src")).toContain("ws://127.0.0.1:54321");
    expect(directiva(csp, "img-src")).toContain("http://127.0.0.1:54321");
  });

  it("ignora orígenes inválidos y usa el fallback seguro", () => {
    const csp = construirCsp({
      produccion: true,
      apiUrl: "no-es-una-url",
      supabaseUrl: "javascript:alert(1)",
    });

    expect(directiva(csp, "connect-src")).toBe(
      "connect-src 'self' https: wss:"
    );
  });
});
