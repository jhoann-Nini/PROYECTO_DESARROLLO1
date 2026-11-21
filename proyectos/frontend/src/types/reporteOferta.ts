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
  /** Fase 3: `establecimiento.verificado` (TEC-151). Opcional por compatibilidad. */
  verificado?: boolean;
  /** Fase 3 (migración 022): enlace de la oferta en la tienda. */
  urlOferta?: string | null;
  /** Fase 3 (migración 022): último cambio de precio, disponibilidad o enlace. */
  fechaActualizacionPrecio?: string | null;
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
