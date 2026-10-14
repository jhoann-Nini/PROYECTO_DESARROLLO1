package com.example.backend.controller;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;


import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest

class CategoriaControllerIntegrationTest {

        private MockMvc mockMvc;
    @Autowired
    private WebApplicationContext wac;

    private Long existentId;

    @BeforeEach
    void setUp() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();
        // Create a category for successful retrieval
        String json = "{\"nombre\": \"TestCat\", \"descripcion\": \"Desc\"}";
        MvcResult result = mockMvc.perform(post("/api/categorias")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andReturn();
        // Extract the created id from response body
        String response = result.getResponse().getContentAsString();
        // Simple parsing assuming response contains "idCategoria" field
        existentId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                .readTree(response).get("idCategoria").asLong();
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
        // First delete (logical delete) – should succeed (204)
        mockMvc.perform(delete("/api/categorias/{id}", existentId))
                .andExpect(status().isNoContent());
        // Second delete – should return conflict because already inactive
        mockMvc.perform(delete("/api/categorias/{id}", existentId))
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void deleteActiveCategoriaReturnsNoContentAndThenNotFound() throws Exception {
        // First delete (logical delete) – should succeed (204 No Content)
        mockMvc.perform(delete("/api/categorias/{id}", existentId))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        // Subsequent GET should return 404 with proper error JSON structure
        mockMvc.perform(get("/api/categorias/{id}", existentId))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Categoría no encontrada con id " + existentId));
    }

}
