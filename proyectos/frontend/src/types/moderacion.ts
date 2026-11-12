/**
 * Tipos del contrato de moderación de reseñas y reportes.
 * Documentados en la sección 28 del API del backend (S2-42/S2-43).
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
  totalReportes: number;
  reportesPendientes: number;
  reportes: ReporteResenaResponse[];
}

export interface FiltrosResenasReportadas {
  estado?: EstadoReporte;
  oculta?: boolean;
  idProducto?: number;
}
