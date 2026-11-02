package com.example.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.dto.ResenaUpdateRequest;
import com.example.backend.exception.GlobalExceptionHandler;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.service.ResenaService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.core.MethodParameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

class ResenaControllerTest {

    private MockMvc mockMvc;
    private ResenaService resenaService;

    @BeforeEach
    void setUp() {
        resenaService = mock(ResenaService.class);
        ResenaController controller = new ResenaController(resenaService);

        HandlerMethodArgumentResolver jwtResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        || Jwt.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return Jwt.withTokenValue("mock-jwt")
                        .header("alg", "none")
                        .claim("sub", "mock-sub")
                        .build();
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(jwtResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/resenas devuelve lista de reseñas con 200 OK")
    void listarResenasReturnsOk() throws Exception {
        ResenaResponse response = new ResenaResponse(
                1L,
                10L,
                "Nothing Phone (2a)",
                5L,
                "Usuario Tester",
                "Excelente dispositivo calidad-precio.",
                LocalDateTime.now(),
                true
        );

        when(resenaService.listar(null)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idResena").value(1))
                .andExpect(jsonPath("$[0].idProducto").value(10))
                .andExpect(jsonPath("$[0].nombreProducto").value("Nothing Phone (2a)"))
                .andExpect(jsonPath("$[0].nombreUsuario").value("Usuario Tester"))
                .andExpect(jsonPath("$[0].comentario").value("Excelente dispositivo calidad-precio."));
    }

    @Test
    @DisplayName("GET /api/productos/{id}/resenas devuelve lista filtrada con 200 OK")
    void listarPorProductoReturnsOk() throws Exception {
        ResenaResponse response = new ResenaResponse(
                2L,
                15L,
                "Galaxy S25",
                8L,
                "TechFan",
                "Muy buena pantalla.",
                LocalDateTime.now(),
                true
        );

        when(resenaService.listar(15L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/productos/15/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idResena").value(2))
                .andExpect(jsonPath("$[0].idProducto").value(15));
    }

    @Test
    @DisplayName("POST /api/resenas con cuerpo válido llama al servicio y devuelve 201 Created")
    void crearResenaReturnsCreated() throws Exception {
        ResenaResponse response = new ResenaResponse(
                1L,
                10L,
                "Nothing Phone (2a)",
                5L,
                "Usuario Tester",
                "Comentario de prueba.",
                LocalDateTime.now(),
                true
        );

        when(resenaService.crearOActualizar(any(ResenaRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":10,\"comentario\":\"Comentario de prueba.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(1))
                .andExpect(jsonPath("$.comentario").value("Comentario de prueba."));
    }

    @Test
    @DisplayName("POST /api/resenas con título, ventajas y desventajas (S2-12) devuelve 201 Created")
    void crearResenaConTituloVentajasDesventajasReturnsCreated() throws Exception {
        ResenaResponse response = new ResenaResponse(
                3L,
                10L,
                "Nothing Phone (2a)",
                5L,
                "Usuario Tester",
                "Gran relación calidad-precio.",
                "Excelente opción gama media",
                "Diseño único y buena batería",
                "Carga algo lenta",
                LocalDateTime.now(),
                true
        );

        when(resenaService.crearOActualizar(any(ResenaRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":10,\"comentario\":\"Gran relación calidad-precio.\",\"titulo\":\"Excelente opción gama media\",\"ventajas\":\"Diseño único y buena batería\",\"desventajas\":\"Carga algo lenta\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(3))
                .andExpect(jsonPath("$.titulo").value("Excelente opción gama media"))
                .andExpect(jsonPath("$.ventajas").value("Diseño único y buena batería"))
                .andExpect(jsonPath("$.desventajas").value("Carga algo lenta"));
    }

    @Test
    @DisplayName("POST /api/productos/{id}/resenas con título, ventajas y desventajas (S2-12) devuelve 201 Created")
    void crearParaProductoConTituloVentajasDesventajasReturnsCreated() throws Exception {
        ResenaResponse response = new ResenaResponse(
                4L,
                20L,
                "Pixel 9 Pro",
                5L,
                "Usuario Tester",
                "La mejor cámara del mercado.",
                "Fotografía excepcional",
                "Cámaras y software limpio",
                "Precio elevado",
                LocalDateTime.now(),
                true
        );

        when(resenaService.crearOActualizar(any(ResenaRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/productos/20/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":20,\"comentario\":\"La mejor cámara del mercado.\",\"titulo\":\"Fotografía excepcional\",\"ventajas\":\"Cámaras y software limpio\",\"desventajas\":\"Precio elevado\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(4))
                .andExpect(jsonPath("$.idProducto").value(20))
                .andExpect(jsonPath("$.titulo").value("Fotografía excepcional"))
                .andExpect(jsonPath("$.ventajas").value("Cámaras y software limpio"))
                .andExpect(jsonPath("$.desventajas").value("Precio elevado"));
    }

    @Test
    @DisplayName("POST /api/resenas con comentario vacío devuelve 400 Bad Request")
    void crearResenaComentarioVacioReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":10,\"comentario\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/resenas sin idProducto devuelve 400 Bad Request")
    void crearResenaSinProductoReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario sin producto.\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/resenas con título superior a 150 caracteres devuelve 400 Bad Request")
    void crearResenaTituloExcesivoReturnsBadRequest() throws Exception {
        String tituloLargo = "A".repeat(151);
        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":10,\"comentario\":\"Comentario válido.\",\"titulo\":\"" + tituloLargo + "\"}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // Pruebas S2-17: Endpoint PUT para actualizar reseñas
    // =========================================================================

    @Test
    @DisplayName("PUT /api/resenas/{id} con datos válidos llama al servicio y devuelve 200 OK (S2-17)")
    void actualizarResenaReturnsOk() throws Exception {
        ResenaResponse response = new ResenaResponse(
                5L,
                10L,
                "Nothing Phone (2a)",
                5L,
                "Usuario Tester",
                "Comentario editado y mejorado.",
                "Nuevo título",
                "Nuevas ventajas",
                "Nuevas desventajas",
                LocalDateTime.now(),
                true
        );

        when(resenaService.actualizar(eq(5L), any(ResenaUpdateRequest.class), any())).thenReturn(response);

        mockMvc.perform(put("/api/resenas/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario editado y mejorado.\",\"titulo\":\"Nuevo título\",\"ventajas\":\"Nuevas ventajas\",\"desventajas\":\"Nuevas desventajas\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(5))
                .andExpect(jsonPath("$.comentario").value("Comentario editado y mejorado."))
                .andExpect(jsonPath("$.titulo").value("Nuevo título"))
                .andExpect(jsonPath("$.ventajas").value("Nuevas ventajas"))
                .andExpect(jsonPath("$.desventajas").value("Nuevas desventajas"));
    }

    @Test
    @DisplayName("PUT /api/productos/{idProducto}/resenas/{idResena} con datos válidos devuelve 200 OK (S2-17)")
    void actualizarParaProductoReturnsOk() throws Exception {
        ResenaResponse response = new ResenaResponse(
                6L,
                15L,
                "Galaxy S25",
                5L,
                "Usuario Tester",
                "Excelente tras actualizar.",
                "Actualización tras 3 meses de uso",
                "Muy fluido",
                "Batería normal",
                LocalDateTime.now(),
                true
        );

        when(resenaService.actualizar(eq(6L), any(ResenaUpdateRequest.class), any())).thenReturn(response);

        mockMvc.perform(put("/api/productos/15/resenas/6")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Excelente tras actualizar.\",\"titulo\":\"Actualización tras 3 meses de uso\",\"ventajas\":\"Muy fluido\",\"desventajas\":\"Batería normal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(6))
                .andExpect(jsonPath("$.idProducto").value(15))
                .andExpect(jsonPath("$.titulo").value("Actualización tras 3 meses de uso"));
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} con comentario vacío devuelve 400 Bad Request (S2-17)")
    void actualizarResenaComentarioVacioReturnsBadRequest() throws Exception {
        mockMvc.perform(put("/api/resenas/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} con título mayor a 150 caracteres devuelve 400 Bad Request (S2-17)")
    void actualizarResenaTituloExcesivoReturnsBadRequest() throws Exception {
        String tituloLargo = "B".repeat(151);
        mockMvc.perform(put("/api/resenas/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario válido.\",\"titulo\":\"" + tituloLargo + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} devuelve 204 No Content cuando la eliminación es exitosa (S2-18)")
    void eliminarResenaReturnsNoContent() throws Exception {
        doNothing().when(resenaService).eliminar(eq(5L), any());

        mockMvc.perform(delete("/api/resenas/5"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /api/productos/{idProducto}/resenas/{idResena} devuelve 204 No Content (S2-18)")
    void eliminarParaProductoReturnsNoContent() throws Exception {
        doNothing().when(resenaService).eliminar(eq(8L), any());

        mockMvc.perform(delete("/api/productos/20/resenas/8"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} para reseña inexistente devuelve 404 Not Found (S2-18)")
    void eliminarResenaInexistenteReturnsNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Reseña no encontrada con id 99"))
                .when(resenaService).eliminar(eq(99L), any());

        mockMvc.perform(delete("/api/resenas/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} sin permiso devuelve 403 Forbidden (S2-18)")
    void eliminarResenaSinPermisoReturnsForbidden() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para eliminar esta reseña."))
                .when(resenaService).eliminar(eq(5L), any());

        mockMvc.perform(delete("/api/resenas/5"))
                .andExpect(status().isForbidden());
    }
}
