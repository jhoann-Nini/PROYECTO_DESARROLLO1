package com.example.backend.dto;

/**
 * Datos de la Api devuelve al consultar un Producto
**/

public record ProductoResponse(
  long idProducto,
  String nombre,
  String descripcion,
  long idCategoria,
  long idMarca,
  String imagen,
  java.math.BigDecimal precioReferencia,
  Boolean estado

) {
}
