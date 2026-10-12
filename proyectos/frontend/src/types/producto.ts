export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  precioReferencia: number | null;
  estado: boolean;
  nombreCategoria?: string;
  nombreMarca?: string;
}

export type CategoriaDispositivo = "moviles" | "tablets" | "laptops" | "auriculares";

export interface SeccionHardware {
  icono: string;
  titulo: string;
  descripcion: string;
  detalleExtra?: string;
}

export interface MetricaPuntuacion {
  nombre: string;
  puntos: number;
}

export interface TiendaPrecio {
  nombre: string;
  precio: number;
  envioGratis: boolean;
  url?: string;
}

export interface EspecificacionesDetalladas {
  categoriaTipo?: CategoriaDispositivo;
  secciones?: SeccionHardware[];
  metricas?: MetricaPuntuacion[];
  benchmarkEtiqueta?: string;
  benchmarkValor?: string;
  tiendas?: TiendaPrecio[];

  // Campos heredados / retrocompatibles
  pantalla?: string;
  procesador?: string;
  ramAlmacenamiento?: string;
  camaras?: string;
  bateriaCarga?: string;
  sistemaOperativo?: string;
  conectividad?: string;
  antutuScore?: string;
  puntuaciones?: {
    rendimiento: number;
    camara: number;
    bateria: number;
    pantalla: number;
    calidadPrecio: number;
  };
}

export interface DispositivoKimovil {
  id: number;
  ranking: number;
  nombre: string;
  marca: string;
  especificaciones: string;
  puntuacion: number;
  precio: number;
  precioOriginal?: number;
  descuento?: string;
  tendencia: "sube" | "baja" | "igual";
  cambioRanking: number;
  imagen: string;
  tipo: "vendido" | "deseado" | "oferta";
  categoria?: string;
  detalleSpecs?: EspecificacionesDetalladas;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  usuario: string;
  email: string;
  avatar?: string;
}