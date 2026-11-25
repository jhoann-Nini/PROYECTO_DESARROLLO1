/**
 * Capa simulada: intercepta en el navegador todas las llamadas a
 * NEXT_PUBLIC_API_URL. Copiar a proyectos/frontend/e2e/soporte/.
 * Supabase no se simula: con la sesión inyectada, supabase-js no hace
 * peticiones, y NEXT_PUBLIC_SUPABASE_URL apunta a un host donde no escucha nada.
 *
 * - Una ruta no prevista responde 501 y se registra en `noPrevistas`: la
 *   prueba debe comprobar que queda vacía, para que un endpoint nuevo no pase
 *   inadvertido con un 404 que la interfaz trate como «vacío».
 * - GET /api/usuarios/me responde por defecto: useSesionTecReview lo llama al
 *   cargar la sesión; sin él, la interfaz se comporta como sin sesión.
 * - Responde los OPTIONS de CORS: las peticiones con Authorization los envían.
 *
 * Límite: page.route solo ve lo que pide el navegador. Lo que piden los
 * Server Components (page.tsx con await a la API) no se intercepta.
 */
import type { Page, Route } from "@playwright/test";

export type Manejador = (route: Route, cuerpo: unknown) => Promise<void> | void;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

export function json(route: Route, estado: number, datos: unknown) {
  return route.fulfill({ status: estado, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(datos) });
}

export async function simularApi(
  page: Page,
  urlApi: string,
  manejadores: Record<string, Manejador>,
  perfil: { idUsuario: number; nombre: string; correo: string; roles?: string[] } | null = null,
) {
  const noPrevistas: string[] = [];
  const base = urlApi.replace(/\/$/, "");
  await page.route(`${base}/**`, async (route) => {
    const peticion = route.request();
    if (peticion.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS });
    }
    const url = new URL(peticion.url());
    const clave = `${peticion.method()} ${url.pathname}`;
    const manejador = manejadores[clave];
    if (manejador) {
      const cuerpo = peticion.postData() ? JSON.parse(peticion.postData() as string) : undefined;
      return manejador(route, cuerpo);
    }
    if (clave === "GET /api/usuarios/me" && perfil) {
      return json(route, 200, {
        ...perfil, rol: perfil.roles?.[0] ?? "Usuario registrado", activo: true,
        fechaRegistro: "2026-11-01T10:00:00", roles: perfil.roles ?? ["Usuario registrado"],
      });
    }
    noPrevistas.push(`${clave}${url.search}`);
    return json(route, 501, { message: `Ruta no simulada en la prueba: ${clave}` });
  });
  return { noPrevistas };
}
