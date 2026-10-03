package com.example.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.dto.ProductoResponse;
import com.example.backend.service.ProductoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ProductoControllerTest {

    private MockMvc mockMvc;
    private ProductoService productoService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        productoService = mock(ProductoService.class);
        ProductoController controller = new ProductoController(productoService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
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
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idProducto").value(1))
                .andExpect(jsonPath("$.nombre").value("Laptop"));
    }
}
