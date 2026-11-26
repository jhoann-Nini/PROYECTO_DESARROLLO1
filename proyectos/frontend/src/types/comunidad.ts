/** Comunidad (fase 1): contratos de /api/comunidad. Ver proyectos/docs/api.md. */

export type TipoPublicacion = "GENERAL" | "PRODUCTO";
export type OrdenComunidad = "actividad" | "recientes";
export type EstadoModeracionComunidad = "PUBLICADA" | "PENDIENTE" | "RECHAZADA";
export type EstadoVisibleRespuesta = "VISIBLE" | "ELIMINADA" | "OCULTA" | "EN_REVISION";

export interface PublicacionResumen {
  idPublicacion: number;
  tipo: TipoPublicacion;
  idProducto: number | null;
  nombreProducto: string | null;
  titulo: string;
  extracto: string;
  autor: string;
  fechaCreacion: string;
  fechaUltimaActividad: string;
  respuestas: number;
  meGusta: number;
  /** Solo para el autor y los moderadores. */
  estadoModeracion: EstadoModeracionComunidad | null;
  cerrada: boolean;
}

export interface PublicacionDetalle {
  idPublicacion: number;
  tipo: TipoPublicacion;
  idProducto: number | null;
  nombreProducto: string | null;
  titulo: string;
  contenido: string;
  autor: string;
  fechaCreacion: string;
  fechaEdicion: string | null;
  fechaUltimaActividad: string;
  respuestas: number;
  meGusta: number;
  meGustaPropio: boolean;
  esAutor: boolean;
  estadoModeracion: EstadoModeracionComunidad | null;
  cerrada: boolean;
  /** Solo en las de producto: false si el producto se desactivó y no admite respuestas nuevas. */
  productoActivo: boolean | null;
}

export interface RespuestaComunidad {
  idRespuesta: number;
  idRespuestaPadre: number | null;
  profundidad: number;
  /** Nulo cuando quien mira no puede leerla (ver estadoVisible). */
  contenido: string | null;
  autor: string | null;
  enRespuestaA: string | null;
  estadoVisible: EstadoVisibleRespuesta;
  estadoModeracion: EstadoModeracionComunidad | null;
  respuestasHijas: number;
  meGusta: number;
  meGustaPropio: boolean;
  esAutor: boolean;
  fechaCreacion: string;
  fechaEdicion: string | null;
}

export interface Pagina<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PaginaPublicaciones extends Pagina<PublicacionResumen> {
  total: number;
}

export interface MeGusta {
  meGusta: number;
  meGustaPropio: boolean;
}

/** Límites del backend (RN-03): deben coincidir con ModeracionComunidad. */
export const LIMITES_COMUNIDAD = {
  tituloMin: 5,
  tituloMax: 150,
  publicacionMax: 5000,
  respuestaMax: 3000,
} as const;
