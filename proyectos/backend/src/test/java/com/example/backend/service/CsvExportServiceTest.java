package com.example.backend.service;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.repository.ProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CsvExportServiceTest {

    @Mock
    private ProductoRepository productoRepository;

    private ObjectMapper objectMapper;
    private CsvExportService csvExportService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        csvExportService = new CsvExportService(productoRepository, objectMapper);
    }

    @Test
    @DisplayName("escaparCampo maneja valores nulos y cadenas normales")
    void testEscaparCampoNormal() {
        assertEquals("", CsvExportService.escaparCampo(null));
        assertEquals("", CsvExportService.escaparCampo(""));
        assertEquals("Samsung Galaxy S24", CsvExportService.escaparCampo("Samsung Galaxy S24"));
    }

    @Test
    @DisplayName("escaparCampo escapa comas, comillas y saltos de línea conforme a RFC 4180")
    void testEscaparCampoEspeciales() {
        // Con comas
        assertEquals("\"Laptop, Gaming\"", CsvExportService.escaparCampo("Laptop, Gaming"));
        // Con comillas dobles
        assertEquals("\"Pantalla 6.5\"\" AMOLED\"", CsvExportService.escaparCampo("Pantalla 6.5\" AMOLED"));
        // Con saltos de línea
        assertEquals("\"Línea 1\nLínea 2\"", CsvExportService.escaparCampo("Línea 1\nLínea 2"));
        // Con comillas, comas y saltos de línea combinados
        assertEquals("\"\"\"Pro\"\", 128GB\nEdición Especial\"", CsvExportService.escaparCampo("\"Pro\", 128GB\nEdición Especial"));
    }

    @Test
    @DisplayName("exportarCatalogoCsv genera CSV con UTF-8 BOM, encabezados exactos y datos formateados")
    void testExportarCatalogoCsvCompleto() {
        Categoria cat = new Categoria();
        cat.setIdCategoria(1L);
        cat.setNombre("Móviles y Teléfonos");

        Marca marca = new Marca();
        marca.setIdMarca(2L);
        marca.setNombre("Apple, Inc.");

        Producto p1 = new Producto();
        p1.setIdProducto(101L);
        p1.setNombre("iPhone 15 \"Pro\", 128GB");
        p1.setCategoria(cat);
        p1.setMarca(marca);
        p1.setImagen("https://img.ejemplo.com/iphone.png");
        p1.setPrecioReferencia(new BigDecimal("999.99"));

        Map<String, Object> specs = new LinkedHashMap<>();
        specs.put("ram", "8GB");
        specs.put("camara", "48 Mpx, OIS");
        p1.setCaracteristicas(specs);

        Producto p2 = new Producto();
        p2.setIdProducto(102L);
        p2.setNombre("Producto Básico Sin Detalles");
        p2.setCategoria(null);
        p2.setMarca(null);
        p2.setImagen(null);
        p2.setPrecioReferencia(null);
        p2.setCaracteristicas(null);

        when(productoRepository.findAllActivosParaExportar()).thenReturn(List.of(p1, p2));

        byte[] csvBytes = csvExportService.exportarCatalogoCsv();
        assertNotNull(csvBytes);
        assertTrue(csvBytes.length > 3);

        // Verificar UTF-8 BOM (0xEF, 0xBB, 0xBF)
        assertEquals((byte) 0xEF, csvBytes[0]);
        assertEquals((byte) 0xBB, csvBytes[1]);
        assertEquals((byte) 0xBF, csvBytes[2]);

        String contenido = new String(csvBytes, 3, csvBytes.length - 3, StandardCharsets.UTF_8);
        String[] lineas = contenido.split("\n");

        assertEquals("id_producto,nombre,categoria,marca,imagen_url,precio_referencia,caracteristicas_json", lineas[0].trim());

        // Verificar producto 1 con caracteres especiales y JSON
        assertTrue(lineas[1].contains("101"));
        assertTrue(lineas[1].contains("\"iPhone 15 \"\"Pro\"\", 128GB\""));
        assertTrue(lineas[1].contains("Móviles y Teléfonos"));
        assertTrue(lineas[1].contains("\"Apple, Inc.\""));
        assertTrue(lineas[1].contains("https://img.ejemplo.com/iphone.png"));
        assertTrue(lineas[1].contains("\"\"camara\"\":\"\"48 Mpx, OIS\"\""));

        // Verificar producto 2 con nulos
        assertEquals("102,Producto Básico Sin Detalles,,,,,", lineas[2].trim());
    }
}
