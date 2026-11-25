/**
 * Sesión de pruebas E2E para TecReview, sin pasar por el formulario ni el
 * CAPTCHA de Supabase. Copiar a proyectos/frontend/e2e/soporte/sesion.ts.
 *
 * - firmarToken: JWT ES256 (el algoritmo que exige SecurityConfig), firmado
 *   con una clave P-256 generada para las pruebas. En la capa simulada el
 *   backend no lo valida; en la pila completa lo valida contra el JWKS local.
 * - inyectarSesion: escribe la sesión donde supabase-js la busca
 *   (localStorage["sb-<primer segmento del host>-auth-token"]) antes de que
 *   cargue la página, así getSession() la devuelve sin red.
 *
 * Solo usa node:crypto: no añade dependencias.
 */
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import type { Page } from "@playwright/test";

export interface ClaveE2E {
  privada: KeyObject;
  /** JWK público con kid, para servir en /auth/v1/.well-known/jwks.json. */
  jwk: Record<string, unknown>;
}

export function generarClave(kid = "e2e"): ClaveE2E {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  return { privada: privateKey, jwk: { ...publicKey.export({ format: "jwk" }), kid, alg: "ES256", use: "sig" } };
}

export interface UsuarioE2E {
  /** UUID: el backend lo guarda como supabase_uid y aprovisiona el usuario la primera vez. */
  sub: string;
  email: string;
  nombre: string;
}

const b64url = (valor: string | Buffer) => Buffer.from(valor).toString("base64url");

/**
 * Claims que el backend comprueba: iss (supabase.jwt.issuer-uri), aud
 * "authenticated", exp, sub UUID y user_metadata.email_verified = true
 * (UsuarioService rechaza correos sin verificar).
 */
export function firmarToken(clave: ClaveE2E, usuario: UsuarioE2E, emisor: string, segundos = 3600): string {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: clave.jwk.kid }));
  const cuerpo = b64url(JSON.stringify({
    iss: emisor,
    aud: "authenticated",
    sub: usuario.sub,
    email: usuario.email,
    role: "authenticated",
    iat: ahora,
    exp: ahora + segundos,
    user_metadata: { email_verified: true, nombre: usuario.nombre },
  }));
  // ieee-p1363: firma r||s de 64 bytes, el formato de JWS (no DER).
  const firma = sign("sha256", Buffer.from(`${cabecera}.${cuerpo}`), { key: clave.privada, dsaEncoding: "ieee-p1363" });
  return `${cabecera}.${cuerpo}.${b64url(firma)}`;
}

/** Igual que supabase-js: sb-<primer segmento del hostname>-auth-token. */
export function claveAlmacenamiento(urlSupabase: string): string {
  return `sb-${new URL(urlSupabase).hostname.split(".")[0]}-auth-token`;
}

export async function inyectarSesion(page: Page, urlSupabase: string, token: string, usuario: UsuarioE2E): Promise<void> {
  const expira = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp as number;
  const sesion = {
    access_token: token,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: expira - Math.floor(Date.now() / 1000),
    expires_at: expira,
    user: {
      id: usuario.sub,
      aud: "authenticated",
      role: "authenticated",
      email: usuario.email,
      user_metadata: { email_verified: true, nombre: usuario.nombre },
      app_metadata: { provider: "email" },
    },
  };
  await page.addInitScript(([clave, valor]) => {
    window.localStorage.setItem(clave, valor);
  }, [claveAlmacenamiento(urlSupabase), JSON.stringify(sesion)] as const);
}
