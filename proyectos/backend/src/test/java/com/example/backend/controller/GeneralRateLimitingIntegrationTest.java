package com.example.backend.controller;

import com.example.backend.config.GeneralRateLimitingFilter;
import com.example.backend.service.GeneralRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("HU-S2-14 / TEC-121: Pruebas de integración del control general de tasa de peticiones")
class GeneralRateLimitingIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private GeneralRateLimiterService rateLimiterService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        rateLimiterService.reset();
    }

    @Test
    @DisplayName("Petición válida dentro del límite devuelve 200 OK con cabeceras estándar de rate limit")
    void peticionValidaRetornaCabecerasRateLimit() throws Exception {
        mockMvc.perform(get("/api/categorias")
                        .header("X-Forwarded-For", "203.0.113.195"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-RateLimit-Limit"))
                .andExpect(header().exists("X-RateLimit-Remaining"))
                .andExpect(header().exists("X-RateLimit-Reset"))
                .andExpect(header().string("X-RateLimit-Limit", String.valueOf(rateLimiterService.getDefaultLimit())));
    }

    @Test
    @DisplayName("Peticiones sucesivas decrementan X-RateLimit-Remaining")
    void peticionesSucesivasDecrementanRemaining() throws Exception {
        String testIp = "203.0.113.50";

        mockMvc.perform(get("/api/categorias")
                        .header("X-Forwarded-For", testIp))
                .andExpect(status().isOk())
                .andExpect(header().string("X-RateLimit-Remaining", String.valueOf(rateLimiterService.getDefaultLimit() - 1)));

        mockMvc.perform(get("/api/categorias")
                        .header("X-Forwarded-For", testIp))
                .andExpect(status().isOk())
                .andExpect(header().string("X-RateLimit-Remaining", String.valueOf(rateLimiterService.getDefaultLimit() - 2)));
    }

    @Test
    @DisplayName("Superar el límite general devuelve HTTP 429 Too Many Requests con Retry-After y cuerpo ErrorResponse")
    void superarLimiteDevuelve429ConRetryAfterYJson() throws Exception {
        String testIp = "198.51.100.99";
        int limit = rateLimiterService.getDefaultLimit();

        // Consumir hasta el límite exacto
        for (int i = 0; i < limit; i++) {
            mockMvc.perform(get("/api/categorias")
                            .header("X-Forwarded-For", testIp))
                    .andExpect(status().isOk());
        }

        // Petición (límite + 1): debe retornar 429 Too Many Requests
        mockMvc.perform(get("/api/categorias")
                        .header("X-Forwarded-For", testIp))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(header().string("X-RateLimit-Remaining", "0"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is(429)))
                .andExpect(jsonPath("$.error", is("Too Many Requests")))
                .andExpect(jsonPath("$.message", is(GeneralRateLimitingFilter.MENSAJE_LIMITE_GENERAL)))
                .andExpect(jsonPath("$.path", is("/api/categorias")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    @DisplayName("Endpoint /api/health está excluido de rate limit y no consume cuota")
    void healthEndpointExcluidoDeRateLimit() throws Exception {
        String testIp = "192.0.2.1";

        mockMvc.perform(get("/api/health")
                        .header("X-Forwarded-For", testIp))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-RateLimit-Limit"));

        // Verificar que no se creó bucket para esa IP
        assertEquals(0, rateLimiterService.getActiveClientCount());
    }

    @Test
    @DisplayName("Solicitudes preflight OPTIONS no consumen cuota de rate limit")
    void optionsPreflightNoConsumeCuota() throws Exception {
        mockMvc.perform(options("/api/productos")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header("X-Forwarded-For", "192.0.2.77"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("X-RateLimit-Limit"));

        assertEquals(0, rateLimiterService.getActiveClientCount());
    }

    @Test
    @DisplayName("Clientes con diferentes IPs tienen cuotas aisladas e independientes")
    void cuotasAisladasPorIp() throws Exception {
        String ip1 = "192.0.2.10";
        String ip2 = "192.0.2.20";
        int limit = rateLimiterService.getDefaultLimit();

        // Agotar cuota para ip1
        for (int i = 0; i < limit; i++) {
            mockMvc.perform(get("/api/categorias")
                            .header("X-Forwarded-For", ip1))
                    .andExpect(status().isOk());
        }

        // ip1 debe estar bloqueada
        mockMvc.perform(get("/api/categorias")
                        .header("X-Forwarded-For", ip1))
                .andExpect(status().isTooManyRequests());

        // ip2 debe poder realizar solicitudes con cuota completa
        mockMvc.perform(get("/api/categorias")
                        .header("X-Forwarded-For", ip2))
                .andExpect(status().isOk())
                .andExpect(header().string("X-RateLimit-Remaining", String.valueOf(limit - 1)));
    }

    private void assertEquals(int expected, int actual) {
        org.junit.jupiter.api.Assertions.assertEquals(expected, actual);
    }
}
