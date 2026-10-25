package com.example.backend.service;

import com.example.backend.entity.Producto;
import com.example.backend.repository.ProductoRepository;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Servicio encargado de la generación y exportación del catálogo de productos en formato CSV
 * bajo el estándar RFC 4180 y codificación UTF-8 con BOM para máxima compatibilidad.
 */
@Service
public class CsvExportService {

    private final ProductoRepository productoRepository;
    private final ObjectMapper objectMapper;

    public CsvExportService(ProductoRepository productoRepository, ObjectMapper objectMapper) {
        this.productoRepository = productoRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Exporta todos los productos activos en la base de datos en formato CSV.
     * Incluye BOM UTF-8 (\uFEFF) para visualización correcta de caracteres especiales en Excel y hojas de cálculo.
     *
     * @return Arreglo de bytes del archivo CSV resultante.
     */
    @Transactional(readOnly = true)
    public byte[] exportarCatalogoCsv() {
        List<Producto> productos = productoRepository.findAllActivosParaExportar();

        StringBuilder sb = new StringBuilder();
        // Encabezados del CSV requeridos
        sb.append("id_producto,nombre,categoria,marca,imagen_url,precio_referencia,caracteristicas_json\n");

        for (Producto p : productos) {
            String id = p.getIdProducto() != null ? String.valueOf(p.getIdProducto()) : "";
            String nombre = escaparCampo(p.getNombre());
            String categoria = p.getCategoria() != null ? escaparCampo(p.getCategoria().getNombre()) : "";
            String marca = p.getMarca() != null ? escaparCampo(p.getMarca().getNombre()) : "";
            String imagenUrl = p.getImagen() != null ? escaparCampo(p.getImagen()) : "";
            String precio = p.getPrecioReferencia() != null ? p.getPrecioReferencia().toPlainString() : "";

            String caracteristicasJson = "";
            if (p.getCaracteristicas() != null && !p.getCaracteristicas().isEmpty()) {
                try {
                    caracteristicasJson = escaparCampo(objectMapper.writeValueAsString(p.getCaracteristicas()));
                } catch (Exception e) {
                    caracteristicasJson = "";
                }
            }

            sb.append(id).append(",")
              .append(nombre).append(",")
              .append(categoria).append(",")
              .append(marca).append(",")
              .append(imagenUrl).append(",")
              .append(precio).append(",")
              .append(caracteristicasJson)
              .append("\n");
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Byte Order Mark (BOM) UTF-8 (\uFEFF: EF BB BF)
            baos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
            baos.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar el stream de bytes del archivo CSV", e);
        }
    }

    /**
     * Aplica las reglas de escape RFC 4180 a un campo de texto:
     * - Si es nulo, retorna cadena vacía.
     * - Si contiene comillas dobles, comas o saltos de línea (CR o LF), se envuelve en comillas dobles
     *   y cada comilla interna se duplica ("").
     */
    public static String escaparCampo(String valor) {
        if (valor == null) {
            return "";
        }
        if (valor.contains("\"") || valor.contains(",") || valor.contains("\n") || valor.contains("\r")) {
            return "\"" + valor.replace("\"", "\"\"") + "\"";
        }
        return valor;
    }
}
