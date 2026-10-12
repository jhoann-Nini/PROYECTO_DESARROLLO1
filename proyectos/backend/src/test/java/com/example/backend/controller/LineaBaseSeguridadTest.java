package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.CategoriaResponse;
import com.example.backend.dto.MarcaResponse;
import com.example.backend.dto.ProductoResponse;
import com.example.backend.service.CategoriaService;
import com.example.backend.service.MarcaService;
import com.example.backend.service.ProductoService;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Línea base de seguridad: documenta el comportamiento ACTUAL.
 *
 * Hoy no existe autenticación ni autorización, así que las escrituras responden
 * con éxito sin credenciales. Cuando se añada Spring Security, las pruebas de
 * "sin credenciales" deben fallar: es la señal esperada. Entonces se sustituyen
 * por pruebas que esperen 401 (sin autenticar) y 403 (sin permisos).
 */
class LineaBaseSeguridadTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new ProductoController(mock(ProductoService.class)),
                new CategoriaController(mock(CategoriaService.class)),
                new MarcaController(mock(MarcaService.class))
        ).build();
    }

    private static final String PRODUCTO_JSON = """
            {"nombre":"Laptop","descripcion":"Prueba","idCategoria":1,"idMarca":1,
             "imagen":null,"precioReferencia":100}
            """;
    private static final String NOMBRE_JSON = """
            {"nombre":"Prueba","descripcion":"Prueba"}
            """;

    @Test
    void productosEscrituraSinCredencialesHoyFunciona() throws Exception {
        mockMvc.perform(post("/api/productos").contentType("application/json").content(PRODUCTO_JSON))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/productos/1").contentType("application/json").content(PRODUCTO_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/productos/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void categoriasEscrituraSinCredencialesHoyFunciona() throws Exception {
        mockMvc.perform(post("/api/categorias").contentType("application/json").content(NOMBRE_JSON))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/categorias/1").contentType("application/json").content(NOMBRE_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/categorias/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void marcasEscrituraSinCredencialesHoyFunciona() throws Exception {
        mockMvc.perform(post("/api/marcas").contentType("application/json").content(NOMBRE_JSON))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/marcas/1").contentType("application/json").content(NOMBRE_JSON))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/marcas/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void lecturasSinCredencialesResponden200() throws Exception {
        mockMvc.perform(get("/api/productos")).andExpect(status().isOk());
        mockMvc.perform(get("/api/categorias")).andExpect(status().isOk());
        mockMvc.perform(get("/api/marcas")).andExpect(status().isOk());
    }

    @Test
    void ningunDtoDeRespuestaExponePassword() {
        for (Class<?> dto : new Class<?>[] {
                ProductoResponse.class, CategoriaResponse.class, MarcaResponse.class }) {
            boolean expone = Arrays.stream(dto.getRecordComponents())
                    .map(RecordComponent::getName)
                    .anyMatch(n -> n.toLowerCase().contains("password"));
            assertTrue(!expone, dto.getSimpleName() + " no debe exponer un campo password");
        }
    }
}
