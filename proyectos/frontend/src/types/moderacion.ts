/**
 * Tipos de moderación de reseñas y reportes, alineados con los DTO del backend:
 * `ModeracionResenasController` y `ResenaReportadaResponse`.
 */

/**
 * Estado de moderación del contenido de una reseña (`EstadoModeracion` en el backend).
 * PENDIENTE: retenida por el filtro automático hasta que un moderador la revise.
 * RECHAZADA: un moderador decidió no publicarla.
 */
export type EstadoModeracionResena = "PUBLICADA" | "PENDIENTE" | "RECHAZADA";

/** Reseña retenida por el filtro automático (`ResenaEnRevisionResponse`). */
export interface ResenaEnRevisionResponse {
  idResena: number;
  idProducto: number | null;
  nombreProducto: string | null;
  idUsuario: number | null;
  nombreUsuario: string | null;
  comentario: string;
  puntuacion?: number | null;
  fechaCreacion: string;
  estadoModeracion: EstadoModeracionResena;
  ocultaPorModeracion?: boolean;
  ocultaPorReportes?: boolean;
  /** Por qué el filtro la retuvo (enlace, lenguaje no permitido, texto repetido). */
  motivosDeteccion: string[];
}

export type EstadoReporte =
  | "PENDIENTE"
  | "EN_REVISION"
  | "ACEPTADO"
  | "RECHAZADO";

export interface ReporteResenaResponse {
  idReporte: number;
  idUsuarioReportante: number;
  nombreReportante: string;
  motivo: string;
  descripcion?: string | null;
  estado: EstadoReporte;
  fechaCreacion: string;
}

export interface ResenaReportadaResponse {
  idResena: number;
  idProducto: number;
  nombreProducto: string;
  idAutor: number;
  nombreAutor: string;
  comentario: string;
  puntuacion?: number | null;
  fechaCreacion: string;
  estado: boolean;
  ocultaPorReportes: boolean;
  ocultaPorModeracion?: boolean;
  totalReportes: number;
  reportesPendientes: number;
  reportes: ReporteResenaResponse[];
}

export type ReporteResenaItem = ReporteResenaResponse;

export interface AccionModeracionRequest {
  motivo?: string;
}

export interface FiltrosResenasReportadas {
  estado?: EstadoReporte;
  oculta?: boolean;
  idProducto?: number;
}
