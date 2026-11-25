import { ApiError } from "@/services/api";

/** 401: no hay sesión o expiró; la interfaz abre el inicio de sesión. */
export function esSinSesion(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Mensaje para el usuario: el del servidor (403, 404, 409, 429) o uno genérico. */
export function mensajeError(error: unknown, generico: string): string {
  return error instanceof ApiError && error.message ? error.message : generico;
}

const FORMATO = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function formatearFecha(valor: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : FORMATO.format(fecha);
}
