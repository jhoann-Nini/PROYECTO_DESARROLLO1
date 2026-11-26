import { expect, test, type Page } from "@playwright/test";
import { firmarToken, generarClave, inyectarSesion } from "../soporte/sesion";
import { json, simularApi, type Manejador } from "../soporte/api-simulada";
import { API, SUPABASE, ana, detalle, respuesta } from "../soporte/datos";

async function abrirDetalle(page: Page, reportar: Manejador) {
  await inyectarSesion(page, SUPABASE, firmarToken(generarClave(), ana, `${SUPABASE}/auth/v1`), ana);
  return simularApi(page, API, {
    "GET /api/comunidad/publicaciones/101": (r) => json(r, 200, detalle({ esAutor: false, autor: "Luis", respuestas: 1 })),
    "GET /api/comunidad/publicaciones/101/respuestas": (r) => json(r, 200, { items: [respuesta(7)], nextCursor: null }),
    "POST /api/comunidad/respuestas/7/reportes": reportar,
  }, { idUsuario: 7, nombre: ana.nombre, correo: ana.email });
}

async function reportarRespuesta(page: Page, motivo: string) {
  await page.goto("/comunidad/publicacion/101");
  await page.getByRole("button", { name: "Reportar la respuesta de Luis" }).click();
  const dialogo = page.getByRole("dialog", { name: "Reportar respuesta" });
  await expect(dialogo).toBeVisible();
  await dialogo.getByLabel("Motivo").selectOption(motivo);
  await dialogo.getByRole("button", { name: "Enviar reporte" }).click();
  return dialogo;
}

test.describe("Comunidad: reportar una respuesta", () => {
  test("envía el reporte y agradece", async ({ page }) => {
    const enviados: unknown[] = [];
    const { noPrevistas } = await abrirDetalle(page, (r, cuerpo) => {
      enviados.push(cuerpo);
      return json(r, 201, { idReporte: 1, estado: "PENDIENTE", motivo: "spam", fechaCreacion: "2026-11-25T12:00:00" });
    });

    const dialogo = await reportarRespuesta(page, "spam");

    await expect(dialogo).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "un moderador lo revisará" })).toBeVisible();
    expect(enviados).toEqual([{ motivo: "spam", descripcion: null }]);
    expect(noPrevistas).toEqual([]);
  });

  test("un reporte duplicado muestra el aviso del servidor (409)", async ({ page }) => {
    const { noPrevistas } = await abrirDetalle(page, (r) =>
      json(r, 409, { message: "Ya reportaste este contenido y tu reporte sigue abierto." }));

    const dialogo = await reportarRespuesta(page, "acoso");

    await expect(dialogo.getByRole("alert")).toContainText("Ya reportaste este contenido");
    expect(noPrevistas).toEqual([]);
  });

  test("el límite de reportes muestra el mensaje del servidor (429)", async ({ page }) => {
    const { noPrevistas } = await abrirDetalle(page, (r) =>
      json(r, 429, { message: "Alcanzaste el límite de 10 reportes por hora. Intenta de nuevo más tarde." }));

    const dialogo = await reportarRespuesta(page, "spam");

    await expect(dialogo.getByRole("alert")).toContainText("10 reportes por hora");
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    expect(noPrevistas).toEqual([]);
  });
});
