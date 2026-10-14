package com.example.backend.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.dto.ProductoResponse;
import com.example.backend.exception.GlobalExceptionHandler;
import com.example.backend.service.ProductoService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * CP-S1-03: Verifica que los parametros de filtrado idCategoria e idMarca
 * en GET /api/productos delegan al metodo de servicio correspondiente y
 * devuelven los resultados esperados.
 */
@WebMvcTest(controllers = ProductoController.class)
@Import(GlobalExceptionHandler.class)
class ProductoControllerFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductoService productoService;

    private ProductoResponse sample;

    @BeforeEach
    void setUp() {
        sample = new ProductoResponse(
                1L,
                "Laptop",
                "Desc",
                1L,
                1L,
                null,
                new BigDecimal("2500000"),
                true
        );
    }

    @Test
    void getByCategoriaFiltersResults() throws Exception {
        when(productoService.listarPorCategoria(1L)).thenReturn(List.of(sample));

        mockMvc.perform(get("/api/productos").param("idCategoria", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idProducto").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Laptop"));

        verify(productoService, times(1)).listarPorCategoria(1L);
        verify(productoService, never()).listarPorMarca(anyLong());
    }

    @Test
    void getByMarcaFiltersResults() throws Exception {
        when(productoService.listarPorMarca(2L)).thenReturn(List.of(sample));

        mockMvc.perform(get("/api/productos").param("idMarca", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idProducto").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Laptop"));

        verify(productoService, times(1)).listarPorMarca(2L);
        verify(productoService, never()).listarPorCategoria(anyLong());
    }

    @Test
    void getWithoutMatchesReturnsEmptyArray() throws Exception {
        when(productoService.listarPorCategoria(99L)).thenReturn(List.of());

        mockMvc.perform(get("/api/productos").param("idCategoria", "99"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(productoService, times(1)).listarPorCategoria(99L);
    }
}
