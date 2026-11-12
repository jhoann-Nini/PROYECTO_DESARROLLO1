/**
 * Tipos de la propuesta de contrato de moderación de reseñas y reportes.
 * El backend actual solo implementa el registro y la consulta de reportes
 * propios (`proyectos/docs/api.md` §26); las rutas administrativas todavía no
 * existen. Estos tipos deben alinearse cuando se acuerde el contrato final.
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
