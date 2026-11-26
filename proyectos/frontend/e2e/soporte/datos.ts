import type { PublicacionDetalle, RespuestaComunidad } from "../../src/types/comunidad";
import type { UsuarioE2E } from "./sesion";

/** Datos de prueba compartidos por las pruebas E2E de la comunidad. */
export const API = "http://127.0.0.1:3999";
export const SUPABASE = "http://127.0.0.1:54399";

export const ana: UsuarioE2E = { sub: "0b6c6c1e-1f0a-4f55-9f43-2b8c3c9d1a10", email: "ana@e2e.test", nombre: "Ana" };
export const mod: UsuarioE2E = { sub: "5d1b2c3a-7e8f-4a1b-9c2d-3e4f5a6b7c8d", email: "mod@e2e.test", nombre: "Moderadora" };

export function detalle(extra: Partial<PublicacionDetalle> = {}): PublicacionDetalle {
  return {
    idPublicacion: 101, tipo: "GENERAL", idProducto: null, nombreProducto: null,
    titulo: "¿Qué portátil compro?", contenido: "Busco 16 GB de RAM.", autor: "Ana",
    fechaCreacion: "2026-11-25T10:00:00", fechaEdicion: null, fechaUltimaActividad: "2026-11-25T10:00:00",
    respuestas: 0, meGusta: 0, meGustaPropio: false, esAutor: true, estadoModeracion: "PUBLICADA", cerrada: false,
    productoActivo: null, ...extra,
  };
}

export function respuesta(id: number, extra: Partial<RespuestaComunidad> = {}): RespuestaComunidad {
  return {
    idRespuesta: id, idRespuestaPadre: null, profundidad: 0, contenido: `Respuesta ${id}`, autor: "Luis",
    enRespuestaA: null, estadoVisible: "VISIBLE", estadoModeracion: null, respuestasHijas: 0, meGusta: 0,
    meGustaPropio: false, esAutor: false, fechaCreacion: "2026-11-25T11:00:00", fechaEdicion: null, ...extra,
  };
}
