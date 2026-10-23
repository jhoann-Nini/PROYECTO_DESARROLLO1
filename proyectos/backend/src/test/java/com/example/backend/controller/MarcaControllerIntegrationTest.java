package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Marca;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * CP-S1-08: Pruebas de integración HTTP para el módulo de Marcas.
 * Verifica listar activas, exclusión de inactivas, consulta por ID, creación,
 * actualización y eliminación lógica contra la base de datos H2 en memoria.
 */
@SpringBootTest
class MarcaControllerIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @BeforeEach
    void setUp() {
        productoRepository.deleteAll();
        marcaRepository.deleteAll();
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();
    }

    @AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        marcaRepository.deleteAll();
    }

    private Marca crearMarca(String nombre, String descripcion, boolean activa) {
        Marca marca = new Marca();
        marca.setNombre(nombre);
        marca.setDescripcion(descripcion);
        marca.setEstado(activa);
        return marcaRepository.save(marca);
    }

    @Test
    @DisplayName("1. GET /api/marcas: responde 200 y excluye marcas inactivas")
    void listarMarcasActivasExcluyeInactivasResponde200() throws Exception {
        Marca activa = crearMarca("Marca Activa Test", "Descripcion activa", true);
        Marca inactiva = crearMarca("Marca Inactiva Test", "Descripcion inactiva", false);

        mockMvc.perform(get("/api/marcas"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[?(@.idMarca == " + activa.getIdMarca() + ")]").exists())
                .andExpect(jsonPath("$[?(@.idMarca == " + inactiva.getIdMarca() + ")]").doesNotExist());
    }

    @Test
    @DisplayName("2a. GET /api/marcas/{id}: marca existente responde 200 con sus datos")
    void obtenerMarcaExistenteResponde200() throws Exception {
        Marca marca = crearMarca("Sony Test", "Marca japonesa", true);

        mockMvc.perform(get("/api/marcas/{id}", marca.getIdMarca()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.idMarca", is(marca.getIdMarca().intValue())))
                .andExpect(jsonPath("$.nombre", is("Sony Test")))
                .andExpect(jsonPath("$.descripcion", is("Marca japonesa")))
                .andExpect(jsonPath("$.estado", is(true)));
    }

    @Test
    @DisplayName("2b. GET /api/marcas/{id}: ID inexistente responde 404")
    void obtenerMarcaInexistenteResponde404() throws Exception {
        long idInexistente = 999999L;

        mockMvc.perform(get("/api/marcas/{id}", idInexistente))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Marca no encontrada con id " + idInexistente)))
                .andExpect(jsonPath("$.path", is("/api/marcas/" + idInexistente)))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    @DisplayName("3a. POST /api/marcas: creación válida responde 201 y persiste en base de datos")
    void crearMarcaValidaResponde201YPersiste() throws Exception {
        String json = "{\"nombre\": \"Lenovo Test\", \"descripcion\": \"Tecnologia\"}";

        mockMvc.perform(post("/api/marcas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idMarca", notNullValue()))
                .andExpect(jsonPath("$.nombre", is("Lenovo Test")))
                .andExpect(jsonPath("$.descripcion", is("Tecnologia")))
                .andExpect(jsonPath("$.estado", is(true)));

        Optional<Marca> persistida = marcaRepository.findAll().stream()
                .filter(m -> "Lenovo Test".equals(m.getNombre()))
                .findFirst();
        assertTrue(persistida.isPresent(), "La marca debe estar persistida en la base de datos");
        assertTrue(persistida.get().getEstado(), "La marca creada debe tener estado true");
    }

    @Test
    @DisplayName("3b. POST /api/marcas: nombre en blanco responde 400 y no persiste")
    void crearMarcaNombreEnBlancoResponde400YSinPersistir() throws Exception {
        long conteoInicial = marcaRepository.count();
        String jsonInvalido = "{\"nombre\": \"   \", \"descripcion\": \"Sin nombre\"}";

        mockMvc.perform(post("/api/marcas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonInvalido))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("nombre: El nombre es obligatorio")));

        assertEquals(conteoInicial, marcaRepository.count(), "No se debe persistir ninguna marca con payload inválido");
    }

    @Test
    @DisplayName("4a. PUT /api/marcas/{id}: actualización válida responde 200 y persiste")
    void actualizarMarcaValidaResponde200YPersiste() throws Exception {
        Marca marca = crearMarca("Marca Original", "Desc Original", true);
        String jsonActualizado = "{\"nombre\": \"Marca Renombrada\", \"descripcion\": \"Desc Nueva\"}";

        mockMvc.perform(put("/api/marcas/{id}", marca.getIdMarca())
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonActualizado))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idMarca", is(marca.getIdMarca().intValue())))
                .andExpect(jsonPath("$.nombre", is("Marca Renombrada")))
                .andExpect(jsonPath("$.descripcion", is("Desc Nueva")))
                .andExpect(jsonPath("$.estado", is(true)));

        Marca persistida = marcaRepository.findById(marca.getIdMarca()).orElseThrow();
        assertEquals("Marca Renombrada", persistida.getNombre());
        assertEquals("Desc Nueva", persistida.getDescripcion());
    }

    @Test
    @DisplayName("4b. PUT /api/marcas/{id}: ID inexistente responde 404")
    void actualizarMarcaInexistenteResponde404() throws Exception {
        long idInexistente = 999999L;
        String json = "{\"nombre\": \"Marca Fantasma\", \"descripcion\": \"Desc\"}";

        mockMvc.perform(put("/api/marcas/{id}", idInexistente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Marca no encontrada con id " + idInexistente)));
    }

    @Test
    @DisplayName("5a. DELETE /api/marcas/{id}: responde 204 y realiza borrado lógico (estado=false)")
    void eliminarMarcaResponde204YRealizaBorradoLogico() throws Exception {
        Marca marca = crearMarca("Marca Para Eliminar", "Desc", true);

        mockMvc.perform(delete("/api/marcas/{id}", marca.getIdMarca()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        Optional<Marca> persistida = marcaRepository.findById(marca.getIdMarca());
        assertTrue(persistida.isPresent(), "El registro debe conservarse en base de datos tras borrado lógico");
        assertFalse(persistida.get().getEstado(), "El estado de la marca debe ser false tras el borrado lógico");
    }

    @Test
    @DisplayName("5b. DELETE /api/marcas/{id}: ID inexistente responde 404")
    void eliminarMarcaInexistenteResponde404() throws Exception {
        long idInexistente = 999999L;

        mockMvc.perform(delete("/api/marcas/{id}", idInexistente))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Marca no encontrada con id " + idInexistente)));
    }
}
