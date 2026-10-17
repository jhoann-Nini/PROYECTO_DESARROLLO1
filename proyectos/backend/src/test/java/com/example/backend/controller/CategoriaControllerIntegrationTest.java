package com.example.backend.controller;

import com.example.backend.entity.Categoria;
import com.example.backend.repository.CategoriaRepository;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class CategoriaControllerIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private CategoriaRepository categoriaRepository;

    private Long existentId;

    @BeforeEach
    void setUp() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();

        String json = "{\"nombre\": \"TestCat\", \"descripcion\": \"Desc\"}";

        MvcResult result = mockMvc.perform(post("/api/categorias")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        String response = result.getResponse().getContentAsString();

        existentId = JsonMapper.builder()
                .build()
                .readTree(response)
                .get("idCategoria")
                .asLong();
    }

    @Test
    void listarCategoriasActivasExcluyeInactivasResponde200() throws Exception {
        Categoria inactiva = new Categoria();
        inactiva.setNombre("Cat Inactiva Test");
        inactiva.setDescripcion("Desc");
        inactiva.setEstado(false);
        inactiva = categoriaRepository.save(inactiva);

        mockMvc.perform(get("/api/categorias"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[?(@.idCategoria == " + existentId + ")]").exists())
                .andExpect(jsonPath("$[?(@.idCategoria == "
                        + inactiva.getIdCategoria() + ")]").doesNotExist());
    }

    @Test
    void getExistingCategoriaReturns200() throws Exception {
        mockMvc.perform(get("/api/categorias/{id}", existentId))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.idCategoria").value(existentId))
                .andExpect(jsonPath("$.nombre").value("TestCat"))
                .andExpect(jsonPath("$.estado").value(true));
    }

    @Test
    void actualizarCategoriaExistenteResponde200YPersiste() throws Exception {
        String updateJson =
                "{\"nombre\": \"Cat Renombrada\", \"descripcion\": \"Desc Actualizada\"}";

        mockMvc.perform(put("/api/categorias/{id}", existentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCategoria").value(existentId))
                .andExpect(jsonPath("$.nombre").value("Cat Renombrada"))
                .andExpect(jsonPath("$.descripcion").value("Desc Actualizada"))
                .andExpect(jsonPath("$.estado").value(true));

        Categoria persistida = categoriaRepository.findById(existentId).orElseThrow();

        assertEquals("Cat Renombrada", persistida.getNombre());
        assertEquals("Desc Actualizada", persistida.getDescripcion());
    }

    @Test
    void actualizarCategoriaInexistenteResponde404() throws Exception {
        long idInexistente = 999999L;
        String updateJson =
                "{\"nombre\": \"Cat Fantasma\", \"descripcion\": \"Desc\"}";

        mockMvc.perform(put("/api/categorias/{id}", idInexistente)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString(
                                "Categoría no encontrada con id " + idInexistente)));
    }

    @Test
    void crearCategoriaPayloadInvalidoResponde400YSinPersistir() throws Exception {
        long conteoInicial = categoriaRepository.count();
        String jsonInvalido =
                "{\"nombre\": \"\", \"descripcion\": \"Sin nombre\"}";

        mockMvc.perform(post("/api/categorias")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonInvalido))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString(
                                "nombre: El nombre es obligatorio")));

        assertEquals(conteoInicial, categoriaRepository.count());
    }

    @Test
    void getNonExistingCategoriaReturns404() throws Exception {
        mockMvc.perform(get("/api/categorias/{id}", 999999L))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deleteAlreadyInactiveCategoriaReturns409() throws Exception {
        mockMvc.perform(delete("/api/categorias/{id}", existentId))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/categorias/{id}", existentId))
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void deleteActiveCategoriaReturnsNoContentAndThenNotFound() throws Exception {
        mockMvc.perform(delete("/api/categorias/{id}", existentId))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        mockMvc.perform(get("/api/categorias/{id}", existentId))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value(
                        "Categoría no encontrada con id " + existentId));
    }
}