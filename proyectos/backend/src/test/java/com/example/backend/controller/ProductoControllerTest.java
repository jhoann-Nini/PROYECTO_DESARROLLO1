package com.example.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.dto.ProductoResponse;
import com.example.backend.service.ProductoService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ProductoControllerTest {

    private MockMvc mockMvc;
    private ProductoService productoService;

    @BeforeEach
    void setUp() {
        productoService = mock(ProductoService.class);
        ProductoController controller = new ProductoController(productoService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void listarProductosReturnsOk() throws Exception {
        ProductoResponse producto = new ProductoResponse(
                1L,
                "Laptop",
                "Laptop de prueba",
                1L,
                1L,
                null,
                new BigDecimal("2500000"),
                true
        );

        when(productoService.listarActivos()).thenReturn(List.of(producto));

        mockMvc.perform(get("/api/productos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idProducto").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Laptop"));
    }

    @Test
    void crearProductoReturnsCreated() throws Exception {
        ProductoRequest request = new ProductoRequest(
                "Laptop",
                "Laptop de prueba",
                1L,
                1L,
                null,
                new BigDecimal("2500000")
        );

        ProductoResponse response = new ProductoResponse(
                1L,
                request.nombre(),
                request.descripcion(),
                request.idCategoria(),
                request.idMarca(),
                request.imagen(),
                request.precioReferencia(),
                true
        );

        when(productoService.crear(request)).thenReturn(response);

        mockMvc.perform(post("/api/productos")
                        .contentType("application/json")
                        .content("""
                                {
                                    "nombre": "Laptop",
                                    "descripcion": "Laptop de prueba",
                                    "idCategoria": 1,
                                    "idMarca": 1,
                                    "imagen": null,
                                    "precioReferencia": 2500000
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idProducto").value(1))
                .andExpect(jsonPath("$.nombre").value("Laptop"));
    }

    @Test
    void obtenerFichaTecnicaReturnsOk() throws Exception {
        Map<String, Object> ficha = Map.of("version_esquema", 3, "categoria", "portatiles");
        when(productoService.obtenerFichaTecnica(1L)).thenReturn(ficha);

        mockMvc.perform(get("/api/productos/1/ficha-tecnica"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version_esquema").value(3))
                .andExpect(jsonPath("$.categoria").value("portatiles"));
    }

    @Test
    void actualizarFichaTecnicaReturnsOk() throws Exception {
        Map<String, Object> ficha = Map.of("pantalla", "14 pulgadas");
        ProductoResponse response = new ProductoResponse(
                1L, "Laptop", "Laptop de prueba", 1L, 1L, null, new BigDecimal("2500000"), true, ficha
        );
        when(productoService.actualizarFichaTecnica(1L, ficha)).thenReturn(response);

        mockMvc.perform(put("/api/productos/1/ficha-tecnica")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pantalla\":\"14 pulgadas\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(1))
                .andExpect(jsonPath("$.caracteristicas.pantalla").value("14 pulgadas"));
    }

    @Test
    void actualizarFichaTecnicaParcialReturnsOk() throws Exception {
        Map<String, Object> ficha = Map.of("pantalla", "14 pulgadas OLED");
        ProductoResponse response = new ProductoResponse(
                1L, "Laptop", "Laptop de prueba", 1L, 1L, null, new BigDecimal("2500000"), true, ficha
        );
        when(productoService.actualizarFichaTecnica(1L, ficha)).thenReturn(response);

        mockMvc.perform(patch("/api/productos/1/ficha-tecnica")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pantalla\":\"14 pulgadas OLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(1))
                .andExpect(jsonPath("$.caracteristicas.pantalla").value("14 pulgadas OLED"));
    }
}
