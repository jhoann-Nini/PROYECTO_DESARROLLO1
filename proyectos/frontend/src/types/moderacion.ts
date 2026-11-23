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
  /** Caso 6: nivel de riesgo del filtro. ALTO (posible amenaza o acoso) va primero. */
  riesgo?: "NINGUNO" | "BAJO" | "MEDIO" | "ALTO";
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

/** Evento del historial de un reporte de oferta (Fase 2, migración 021). */
export interface ReporteOfertaHistorialResponse {
  idHistorial: number;
  estadoAnterior: EstadoReporte;
  estadoNuevo: EstadoReporte;
  idModerador: number;
  nombreModerador: string | null;
  justificacion: string | null;
  fechaEvento: string;
}

/** Reporte de precio o enlace tal como lo ve un moderador. */
export interface ReporteOfertaModeracionResponse {
  idReporte: number;
  idProducto: number;
  nombreProducto: string | null;
  idEstablecimiento: number;
  nombreEstablecimiento: string | null;
  precioActual: number | null;
  disponibilidadActual: boolean | null;
  idUsuario: number;
  nombreUsuario: string | null;
  motivo: "precio_incorrecto" | "enlace_incorrecto";
  descripcion: string | null;
  estado: EstadoReporte;
  fechaCreacion: string;
  fechaActualizacion: string;
  historial: ReporteOfertaHistorialResponse[];
}

export type AccionReporteOferta = "en-revision" | "aceptar" | "rechazar";

/** Contador de pendientes del panel (`GET /api/moderacion/pendientes/resumen`, Caso 6). */
export interface ResumenPendientesModeracion {
  /** Reseñas retenidas por el filtro automático. */
  revisionAutomatica: number;
  /** Reportes de reseñas pendientes o en revisión. */
  reportesResenas: number;
  /** Reportes de ofertas pendientes o en revisión. */
  reportesOfertas: number;
  total: number;
}
