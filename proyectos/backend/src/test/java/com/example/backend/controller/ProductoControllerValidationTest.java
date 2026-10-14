package com.example.backend.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.exception.GlobalExceptionHandler;
import com.example.backend.service.ProductoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * CP-S1-05: Validacion de la carga de {@link ProductoRequest}.
 * Cada caso envia un JSON que viola una restriccion declarada en el record
 * y comprueba que el controlador responde con 400 Bad Request sin invocar el
 * servicio de negocio.
 */
@WebMvcTest(controllers = ProductoController.class)
@Import(GlobalExceptionHandler.class)
class ProductoControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductoService productoService;

    private static final ObjectMapper mapper = new ObjectMapper();

    /** Construye el JSON base valido como ObjectNode para facilitar modificaciones. */
    private static ObjectNode baseNode() {
        ObjectNode node = mapper.createObjectNode();
        node.put("nombre", "Laptop");
        node.put("descripcion", "Prueba");
        node.put("idCategoria", 1);
        node.put("idMarca", 1);
        node.putNull("imagen");
        node.put("precioReferencia", 2500000);
        return node;
    }

    @Test
    void nombreVacioDebeFallar() throws Exception {
        ObjectNode node = baseNode();
        node.put("nombre", "");
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest());
        verify(productoService, never()).crear(any(ProductoRequest.class));
    }

    @Test
    void nombreExcedeLongitudDebeFallar() throws Exception {
        ObjectNode node = baseNode();
        node.put("nombre", "a".repeat(151));
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest());
        verify(productoService, never()).crear(any(ProductoRequest.class));
    }

    @Test
    void categoriaNulaDebeFallar() throws Exception {
        ObjectNode node = baseNode();
        node.putNull("idCategoria");
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest());
        verify(productoService, never()).crear(any(ProductoRequest.class));
    }

    @Test
    void marcaNulaDebeFallar() throws Exception {
        ObjectNode node = baseNode();
        node.putNull("idMarca");
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest());
        verify(productoService, never()).crear(any(ProductoRequest.class));
    }

    @Test
    void precioNegativoDebeFallar() throws Exception {
        ObjectNode node = baseNode();
        node.put("precioReferencia", -10);
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest());
        verify(productoService, never()).crear(any(ProductoRequest.class));
    }

    @Test
    void imagenExcedeLongitudDebeFallar() throws Exception {
        ObjectNode node = baseNode();
        node.put("imagen", "b".repeat(1001));
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest());
        verify(productoService, never()).crear(any(ProductoRequest.class));
    }
}
