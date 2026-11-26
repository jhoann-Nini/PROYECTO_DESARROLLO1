/**
 * Preparación de la capa B (pila completa). Corre una vez antes de las pruebas:
 *  1. Siembra los roles que el backend necesita (sin datos de usuarios).
 *  2. Levanta un JWKS local en 127.0.0.1:54399, con una clave P-256 nueva:
 *     el backend valida contra él los tokens (propiedades -D de la config).
 *  3. Firma un token por usuario de prueba y los guarda en e2e/.auth/tokens.json.
 * Nunca toca Supabase, Render ni Vercel.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { firmarToken, generarClave, type UsuarioE2E } from "../soporte/sesion";
import { USUARIOS_PILA } from "./usuarios";

const EMISOR = "http://127.0.0.1:54399/auth/v1";

export function sql(consulta: string): string {
  const contenedor = process.env.E2E_PG_CONTENEDOR ?? "tecreview-pg030-pruebas";
  return execFileSync("docker", ["exec", "-i", contenedor, "psql", "-U", "postgres", "-qtA", "-v", "ON_ERROR_STOP=1", "-c", consulta],
    { encoding: "utf8" }).trim();
}

export default async function preparar() {
  for (const rol of ["Usuario registrado", "Moderador"]) {
    sql(`INSERT INTO public.rol (nombre) SELECT '${rol}' WHERE NOT EXISTS (SELECT 1 FROM public.rol WHERE nombre = '${rol}')`);
  }

  const clave = generarClave();
  const jwks = JSON.stringify({ keys: [clave.jwk] });
  const servidor = createServer((peticion, respuesta) => {
    if (peticion.url === "/auth/v1/.well-known/jwks.json") {
      respuesta.writeHead(200, { "content-type": "application/json" }).end(jwks);
    } else {
      respuesta.writeHead(404).end();
    }
  });
  await new Promise<void>((listo) => servidor.listen(54399, "127.0.0.1", listo));

  const tokens: Record<string, { token: string; usuario: UsuarioE2E }> = {};
  for (const [nombre, usuario] of Object.entries(USUARIOS_PILA)) {
    tokens[nombre] = { token: firmarToken(clave, usuario, EMISOR, 3 * 3600), usuario };
  }
  const carpeta = path.join(__dirname, "..", ".auth");
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(path.join(carpeta, "tokens.json"), JSON.stringify(tokens));

  return async () => {
    await new Promise<void>((cerrado) => servidor.close(() => cerrado()));
  };
}
