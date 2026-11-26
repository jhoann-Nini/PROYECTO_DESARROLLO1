import { expect, test } from "@playwright/test";
import { firmarToken, generarClave, inyectarSesion } from "../soporte/sesion";
import { json, simularApi } from "../soporte/api-simulada";
import { API, SUPABASE, mod } from "../soporte/datos";

const resumen = { revisionAutomatica: 0, reportesResenas: 0, reportesOfertas: 0, apelaciones: 0,
  comunidadRevision: 1, comunidadReportes: 1, total: 2 };
const pendiente = {
  tipo: "PUBLICACION", id: 4, idPublicacion: 4, titulo: "Mala atención", contenido: "el vendedor es un idiota",
  autor: "Ana", fechaCreacion: "2026-11-25T10:00:00", riesgo: "MEDIO", motivos: ["Contiene lenguaje no permitido"],
};
const reporte = {
  idReporte: 9, tipo: "RESPUESTA", idContenido: 12, idPublicacion: 4, titulo: "Mala atención",
  contenido: "compra en www.spam.example", autorContenido: "Luis", reportante: "Bea", motivo: "spam", descripcion: null,
  estado: "PENDIENTE", fechaCreacion: "2026-11-25T11:00:00", reportesActivos: 1,
  ocultaPorReportes: false, ocultaPorModeracion: false, eliminada: false,
};

test("una moderadora rechaza lo retenido y acepta un reporte ocultando el contenido", async ({ page }) => {
  await inyectarSesion(page, SUPABASE, firmarToken(generarClave(), mod, `${SUPABASE}/auth/v1`), mod);
  const decisiones: { ruta: string; cuerpo: unknown }[] = [];
  const { noPrevistas } = await simularApi(page, API, {
    // Lo que /perfil y el panel cargan al abrirse, vacío: esta prueba no trata de reseñas.
    "GET /api/resenas": (r) => json(r, 200, []),
    "GET /api/usuarios/me/reincidencia": (r) => json(r, 200, { faltas: 0, nivel: "NINGUNO", ultimaFalta: null,
      revisionPreviaHasta: null, bloqueoHasta: null, proximaCaducidad: null }),
    "GET /api/apelaciones/mias": (r) => json(r, 200, []),
    "GET /api/moderacion/resenas/reportadas": (r) => json(r, 200, []),
    "GET /api/moderacion/pendientes/resumen": (r) => json(r, 200, resumen),
    "GET /api/moderacion/comunidad/en-revision": (r) => json(r, 200, decisiones.length ? [] : [pendiente]),
    "PUT /api/moderacion/comunidad/publicaciones/4/rechazar": (r, cuerpo) => {
      decisiones.push({ ruta: "rechazar", cuerpo });
      return json(r, 200, { tipo: "PUBLICACION", id: 4, estadoModeracion: "RECHAZADA",
        ocultaPorModeracion: false, ocultaPorReportes: false, eliminada: false });
    },
    "GET /api/moderacion/comunidad/reportes": (r) => json(r, 200, [reporte]),
    "PUT /api/moderacion/comunidad/reportes/9/aceptar": (r, cuerpo) => {
      decisiones.push({ ruta: "aceptar", cuerpo });
      return json(r, 200, { idReporte: 9, estado: "ACEPTADO" });
    },
  }, { idUsuario: 3, nombre: mod.nombre, correo: mod.email, roles: ["Moderador"] });

  await page.goto("/perfil");
  await page.getByRole("button", { name: /Panel de moderación/ }).click();
  await page.getByRole("tab", { name: /Comunidad/ }).click();

  await expect(page.getByText("el vendedor es un idiota")).toBeVisible();
  await expect(page.getByText("Riesgo medio")).toBeVisible();
  await page.getByLabel("Motivo de la decisión").fill("Insulto a una persona");
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await expect(page.getByText("el vendedor es un idiota")).toBeHidden();

  await page.getByRole("button", { name: "Reportes", exact: true }).click();
  await expect(page.getByText("compra en www.spam.example")).toBeVisible();
  await page.getByLabel("Justificación").fill("Es publicidad");
  await page.getByLabel("Al aceptar").selectOption("OCULTAR");
  await page.getByRole("button", { name: "Aceptar reporte" }).click();
  await expect(page.getByText("compra en www.spam.example")).toBeHidden();

  expect(decisiones).toEqual([
    { ruta: "rechazar", cuerpo: { motivo: "Insulto a una persona" } },
    { ruta: "aceptar", cuerpo: { justificacion: "Es publicidad", accion: "OCULTAR" } },
  ]);
  expect(noPrevistas).toEqual([]);
});
