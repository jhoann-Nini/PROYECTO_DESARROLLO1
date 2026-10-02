export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  idCategoria: number;
  idMarca: number;
  imagen: string | null;
  precioReferencia: number | null;
  estado: boolean;
}
