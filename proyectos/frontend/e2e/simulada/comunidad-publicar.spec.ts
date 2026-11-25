import { expect, test } from "@playwright/test";
import type { PublicacionDetalle } from "../../src/types/comunidad";
import { firmarToken, generarClave, inyectarSesion, type UsuarioE2E } from "../soporte/sesion";
import { json, simularApi } from "../soporte/api-simulada";

const API = "http://127.0.0.1:3999";
const SUPABASE = "http://127.0.0.1:54399";
const ana: UsuarioE2E = { sub: "0b6c6c1e-1f0a-4f55-9f43-2b8c3c9d1a10", email: "ana@e2e.test", nombre: "Ana" };
const vacia = { items: [], nextCursor: null, total: 0 };

function detalle(extra: Partial<PublicacionDetalle> = {}): PublicacionDetalle {
  return {
    idPublicacion: 101, tipo: "GENERAL", idProducto: null, nombreProducto: null,
    titulo: "¿Qué portátil compro?", contenido: "Busco 16 GB de RAM.", autor: "Ana",
    fechaCreacion: "2026-11-25T10:00:00", fechaEdicion: null, fechaUltimaActividad: "2026-11-25T10:00:00",
    respuestas: 0, meGusta: 0, meGustaPropio: false, esAutor: true, estadoModeracion: "PUBLICADA", cerrada: false,
    ...extra,
  };
}

test.describe("Comunidad: crear una publicación", () => {
  test("con sesión, crea una publicación y llega a su detalle", async ({ page }) => {
    const token = firmarToken(generarClave(), ana, `${SUPABASE}/auth/v1`);
    await inyectarSesion(page, SUPABASE, token, ana);
    const creadas: unknown[] = [];
    const autorizaciones: (string | undefined)[] = [];
    const { noPrevistas } = await simularApi(page, API, {
      "GET /api/comunidad/publicaciones": (r) => json(r, 200, vacia),
      "POST /api/comunidad/publicaciones": (r, cuerpo) => {
        creadas.push(cuerpo);
        autorizaciones.push(r.request().headers().authorization);
        return json(r, 201, detalle());
      },
      "GET /api/comunidad/publicaciones/101": (r) => json(r, 200, detalle()),
      "GET /api/comunidad/publicaciones/101/respuestas": (r) => json(r, 200, { items: [], nextCursor: null }),
    }, { idUsuario: 7, nombre: ana.nombre, correo: ana.email });

    await page.goto("/comunidad");
    await expect(page.getByText(/todavía no hay publicaciones/i)).toBeVisible();
    await page.getByRole("button", { name: "Nueva publicación" }).click();
    await page.getByLabel("Título").fill("¿Qué portátil compro?");
    await page.getByLabel("Contenido").fill("Busco 16 GB de RAM.");
    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page).toHaveURL(/\/comunidad\/publicacion\/101$/);
    await expect(page.getByRole("heading", { name: "¿Qué portátil compro?" })).toBeVisible();
    expect(creadas).toEqual([{ tipo: "GENERAL", idProducto: null, titulo: "¿Qué portátil compro?", contenido: "Busco 16 GB de RAM." }]);
    expect(autorizaciones).toEqual([`Bearer ${token}`]);
    expect(noPrevistas).toEqual([]);
  });

  test("sin sesión, «Nueva publicación» abre el inicio de sesión y no envía nada", async ({ page }) => {
    const { noPrevistas } = await simularApi(page, API, {
      "GET /api/comunidad/publicaciones": (r) => json(r, 200, vacia),
    });

    await page.goto("/comunidad");
    await expect(page.getByText(/todavía no hay publicaciones/i)).toBeVisible();
    await page.getByRole("button", { name: "Nueva publicación" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Título")).toHaveCount(0);
    expect(noPrevistas).toEqual([]);
  });

  test("al superar la cuota muestra el mensaje del servidor (429)", async ({ page }) => {
    const token = firmarToken(generarClave(), ana, `${SUPABASE}/auth/v1`);
    await inyectarSesion(page, SUPABASE, token, ana);
    const { noPrevistas } = await simularApi(page, API, {
      "GET /api/comunidad/publicaciones": (r) => json(r, 200, vacia),
      "POST /api/comunidad/publicaciones": (r) =>
        json(r, 429, { message: "Alcanzaste el límite de 5 publicaciones por hora. Intenta más tarde." }),
    }, { idUsuario: 7, nombre: ana.nombre, correo: ana.email });

    await page.goto("/comunidad");
    await page.getByRole("button", { name: "Nueva publicación" }).click();
    await page.getByLabel("Título").fill("Sexta publicación");
    await page.getByLabel("Contenido").fill("Contenido");
    await page.getByRole("button", { name: "Publicar" }).click();

    // Next.js añade su propio role="alert" (el anunciador de rutas): se filtra por texto.
    await expect(page.getByRole("alert").filter({ hasText: "5 publicaciones por hora" })).toBeVisible();
    await expect(page).toHaveURL(/\/comunidad$/);
    expect(noPrevistas).toEqual([]);
  });
});
