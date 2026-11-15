/**
 * Tipos para la moderación de reseñas y cola de reportes de TecReview.
 * Correspondiente a las tareas S2-42, S2-43 y S2-72 (TEC-149).
 */

export type EstadoReporte =
  | "PENDIENTE"
  | "EN_REVISION"
  | "ACEPTADO"
  | "RECHAZADO";

export interface ReporteResenaItem {
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
  reportes: ReporteResenaItem[];
}

export interface FiltrosResenasReportadas {
  estado?: EstadoReporte;
  oculta?: boolean;
  idProducto?: number;
}

export interface AccionModeracionRequest {
  motivo?: string;
}

