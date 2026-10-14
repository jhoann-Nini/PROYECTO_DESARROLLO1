package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * CP-S1-06: Referencias inexistentes de categoría o marca.
 * Verifica que POST /api/productos responda HTTP 404 cuando se intenta crear un producto
 * con una categoría inexistente o una marca inexistente, conservando el formato ErrorResponse
 * y asegurando que no se persista ningún producto.
 */
@SpringBootTest
@Transactional
class ProductoControllerReferenciaInexistenteTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    private static final ObjectMapper mapper = new ObjectMapper();

    private Long validCategoriaId;
    private Long validMarcaId;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();

        Categoria categoria = new Categoria();
        categoria.setNombre("Categoria Test Valida");
        categoria.setDescripcion("Descripcion de prueba");
        categoria.setEstado(true);
        validCategoriaId = categoriaRepository.save(categoria).getIdCategoria();

        Marca marca = new Marca();
        marca.setNombre("Marca Test Valida");
        marca.setDescripcion("Descripcion de prueba");
        marca.setEstado(true);
        validMarcaId = marcaRepository.save(marca).getIdMarca();
    }

    @Test
    @DisplayName("Prueba A: Crear producto con idCategoria inexistente responde 404 y no crea el producto")
    void crearProductoConCategoriaInexistenteResponde404() throws Exception {
        long idCategoriaInexistente = 999999L;
        long conteoInicial = productoRepository.count();

        ProductoRequest request = new ProductoRequest(
                "Laptop Sin Categoria",
                "Laptop para prueba de categoria inexistente",
                idCategoriaInexistente,
                validMarcaId,
                null,
                new BigDecimal("2500000")
        );

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Categoría no encontrada con id " + idCategoriaInexistente)))
                .andExpect(jsonPath("$.path", is("/api/productos")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));

        assertEquals(conteoInicial, productoRepository.count());
        assertFalse(productoRepository.findAll().stream()
                .anyMatch(p -> "Laptop Sin Categoria".equals(p.getNombre())));
    }

    @Test
    @DisplayName("Prueba B: Crear producto con idMarca inexistente responde 404 y no crea el producto")
    void crearProductoConMarcaInexistenteResponde404() throws Exception {
        long idMarcaInexistente = 888888L;
        long conteoInicial = productoRepository.count();

        ProductoRequest request = new ProductoRequest(
                "Laptop Sin Marca",
                "Laptop para prueba de marca inexistente",
                validCategoriaId,
                idMarcaInexistente,
                null,
                new BigDecimal("2500000")
        );

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Marca no encontrada con id " + idMarcaInexistente)))
                .andExpect(jsonPath("$.path", is("/api/productos")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));

        assertEquals(conteoInicial, productoRepository.count());
        assertFalse(productoRepository.findAll().stream()
                .anyMatch(p -> "Laptop Sin Marca".equals(p.getNombre())));
    }
}
