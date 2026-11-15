/**
 * Tipos de moderación de reseñas y reportes, alineados con los DTO del backend:
 * `ModeracionResenasController` y `ResenaReportadaResponse`.
 */

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
