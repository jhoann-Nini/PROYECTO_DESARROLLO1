import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { inyectarSesion, type UsuarioE2E } from "../soporte/sesion";
import { sql } from "./preparar";

/**
 * Pila completa (CA-12 de punta a punta, con los triggers reales de la 030):
 * lo pendiente no se ve, la moderadora lo aprueba, tres reportes lo ocultan
 * y rechazar uno lo vuelve a mostrar.
 */
const API = "http://127.0.0.1:8081";
const SUPABASE = "http://127.0.0.1:54399";
type Tokens = Record<string, { token: string; usuario: UsuarioE2E }>;
const tokens = (): Tokens => JSON.parse(readFileSync(path.join(__dirname, "..", ".auth", "tokens.json"), "utf8"));

async function como(browser: Browser, nombre: string): Promise<Page> {
  const { token, usuario } = tokens()[nombre];
  const page = await (await browser.newContext()).newPage();
  await inyectarSesion(page, SUPABASE, token, usuario);
  return page;
}

async function api(nombre: string, ruta: string, init: RequestInit = {}) {
  return fetch(`${API}${ruta}`, {
    ...init,
    headers: { authorization: `Bearer ${tokens()[nombre].token}`, "content-type": "application/json" },
  });
}

/** La lista ya cargó (el encabezado muestra el total) y el título está o no está. */
async function verEnComunidad(page: Page, titulo: string, visible: boolean) {
  await page.goto("/comunidad");
  await expect(page.getByRole("heading", { name: /^Publicaciones \(\d+\)$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: titulo })).toHaveCount(visible ? 1 : 0);
}

test.beforeAll(async () => {
  // Cada usuario se aprovisiona con su primera petición; la moderadora recibe su rol.
  for (const nombre of Object.keys(tokens())) {
    const respuesta = await api(nombre, "/api/usuarios/me");
    expect(respuesta.status, `aprovisionar ${nombre}`).toBe(200);
  }
  const correo = tokens().mod.usuario.email;
  sql(`INSERT INTO public.usuario_rol (id_usuario, id_rol, estado, fecha_asignacion)
       SELECT u.id_usuario, r.id_rol, TRUE, now() FROM public.usuario u, public.rol r
        WHERE u.correo = '${correo}' AND r.nombre = 'Moderador'
          AND NOT EXISTS (SELECT 1 FROM public.usuario_rol x WHERE x.id_usuario = u.id_usuario AND x.id_rol = r.id_rol)`);
});

test("lo pendiente no se ve, se aprueba, tres reportes lo ocultan y rechazar uno lo restaura", async ({ browser }) => {
  test.setTimeout(120_000);
  const titulo = `Atención E2E ${Date.now()}`;
  const ana = await como(browser, "ana");
  const bea = await como(browser, "bea");
  const mod = await como(browser, "mod");
  let idPublicacion = 0;

  await test.step("Ana publica un texto que el filtro retiene", async () => {
    await ana.goto("/comunidad");
    await ana.getByRole("button", { name: "Nueva publicación" }).click();
    await ana.getByLabel("Título").fill(titulo);
    await ana.getByLabel("Contenido").fill("El vendedor es un idiota");
    await expect(ana.getByRole("status").filter({ hasText: "quedará en revisión" })).toBeVisible();
    await ana.getByRole("button", { name: "Publicar" }).click();
    await expect(ana).toHaveURL(/\/comunidad\/publicacion\/\d+$/);
    idPublicacion = Number(ana.url().split("/").pop());
    await expect(ana.getByText(/En revisión: solo tú y los moderadores/)).toBeVisible();
  });

  await test.step("Bea no la ve, ni en la lista ni en el detalle", async () => {
    await verEnComunidad(bea, titulo, false);
    await bea.goto(`/comunidad/publicacion/${idPublicacion}`);
    await expect(bea.getByText("Esta publicación no existe o ya no está disponible")).toBeVisible();
  });

  await test.step("La moderadora la aprueba desde el panel", async () => {
    await mod.goto("/perfil");
    await mod.getByRole("button", { name: /Panel de moderación/ }).click();
    await mod.getByRole("tab", { name: /Comunidad/ }).click();
    const tarjeta = mod.getByRole("article").filter({ hasText: titulo });
    await tarjeta.getByLabel("Motivo de la decisión").fill("Es una queja sobre el servicio");
    await tarjeta.getByRole("button", { name: "Aprobar" }).click();
    await expect(tarjeta).toHaveCount(0);
    await verEnComunidad(bea, titulo, true);
  });

  await test.step("Tres reportes la ocultan (trigger de la 030)", async () => {
    for (const nombre of ["bea", "carlos", "dora"]) {
      const respuesta = await api(nombre, `/api/comunidad/publicaciones/${idPublicacion}/reportes`,
        { method: "POST", body: JSON.stringify({ motivo: "lenguaje-ofensivo" }) });
      expect(respuesta.status, `reporte de ${nombre}`).toBe(201);
    }
    await verEnComunidad(bea, titulo, false);
  });

  await test.step("La moderadora rechaza un reporte y vuelve a verse", async () => {
    await mod.goto("/perfil");
    await mod.getByRole("button", { name: /Panel de moderación/ }).click();
    await mod.getByRole("tab", { name: /Comunidad/ }).click();
    await mod.getByRole("button", { name: "Reportes", exact: true }).click();
    const tarjeta = mod.getByRole("article").filter({ hasText: titulo }).first();
    await expect(tarjeta).toContainText("3 reportes activos");
    await tarjeta.getByLabel("Justificación").fill("Ya fue aprobada por moderación");
    await tarjeta.getByRole("button", { name: "Rechazar reporte" }).click();
    await expect(mod.getByRole("article").filter({ hasText: titulo })).toHaveCount(2);
    await verEnComunidad(bea, titulo, true);
  });
});
