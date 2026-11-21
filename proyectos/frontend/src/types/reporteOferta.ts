/** Oferta pública de TEC-134: el idProducto viene de la ruta consultada. */
export interface TiendaProductoResponse {
  idEstablecimiento: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  latitud: number | null;
  longitud: number | null;
  precio: number;
  disponibilidad: boolean;
}

export interface CrearReporteOfertaRequest {
  idProducto: number;
  idEstablecimiento: number;
  motivo: "precio_incorrecto" | "enlace_incorrecto";
  descripcion?: string;
}

export interface ReporteOfertaResponse extends Omit<CrearReporteOfertaRequest, "descripcion"> {
  idReporte: number;
  descripcion: string | null;
  estado: string;
  fechaCreacion: string;
}
