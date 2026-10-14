package com.example.backend.config;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * CP-S1-09: Prueba de integración para la configuración CORS del backend.
 * Verifica la compatibilidad de orígenes entre el frontend (http://localhost:3000)
 * y los endpoints del backend (/api/**) configurados en {@link WebConfig}.
 */
@SpringBootTest
class CorsIntegrationTest {

    private static final String ALLOWED_ORIGIN = "http://localhost:3000";
    private static final String DISALLOWED_ORIGIN = "http://sitio-no-autorizado.com";

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();
    }

    @Test
    @DisplayName("1. Solicitud Preflight OPTIONS con origen permitido incluye cabeceras y métodos configurados")
    void preflightConOrigenPermitidoDevuelveCabecerasCors() throws Exception {
        mockMvc.perform(options("/api/productos")
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("GET")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("POST")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("PUT")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("DELETE")))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("OPTIONS")));
    }

    @Test
    @DisplayName("2. Petición GET real a /api/productos con origen permitido incluye Access-Control-Allow-Origin")
    void getConOrigenPermitidoIncluyeCabeceraCors() throws Exception {
        mockMvc.perform(get("/api/productos")
                .header("Origin", ALLOWED_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN));
    }

    @Test
    @DisplayName("3. Petición GET real a /api/health con origen permitido incluye Access-Control-Allow-Origin")
    void getHealthConOrigenPermitidoIncluyeCabeceraCors() throws Exception {
        mockMvc.perform(get("/api/health")
                .header("Origin", ALLOWED_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN));
    }

    @Test
    @DisplayName("4. Solicitud Preflight OPTIONS con origen no autorizado es rechazada (403 Forbidden)")
    void preflightConOrigenNoAutorizadoEsRechazada() throws Exception {
        mockMvc.perform(options("/api/productos")
                .header("Origin", DISALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("5. Petición GET con origen no autorizado no recibe la cabecera Access-Control-Allow-Origin")
    void getConOrigenNoAutorizadoNoRecibeCabeceraCors() throws Exception {
        mockMvc.perform(get("/api/productos")
                .header("Origin", DISALLOWED_ORIGIN))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
