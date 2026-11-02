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
                5,
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
                .andExpect(jsonPath("$[0].comentario").value("Excelente dispositivo calidad-precio."))
                .andExpect(jsonPath("$[0].puntuacion").value(5));
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
                4,
                LocalDateTime.now(),
                true
        );

        when(resenaService.listar(15L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/productos/15/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idResena").value(2))
                .andExpect(jsonPath("$[0].idProducto").value(15))
                .andExpect(jsonPath("$[0].puntuacion").value(4));
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
                5,
                LocalDateTime.now(),
                true
        );

        when(resenaService.crearOActualizar(any(ResenaRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":10,\"comentario\":\"Comentario de prueba.\",\"puntuacion\":5}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(1))
                .andExpect(jsonPath("$.comentario").value("Comentario de prueba."))
                .andExpect(jsonPath("$.puntuacion").value(5));
    }

    @Test
    @DisplayName("POST /api/productos/{id}/resenas con datos válidos devuelve 201 Created")
    void crearParaProductoReturnsCreated() throws Exception {
        ResenaResponse response = new ResenaResponse(
                4L,
                20L,
                "Pixel 9 Pro",
                5L,
                "Usuario Tester",
                "La mejor cámara del mercado.",
                5,
                LocalDateTime.now(),
                true
        );

        when(resenaService.crearOActualizar(any(ResenaRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/productos/20/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":20,\"comentario\":\"La mejor cámara del mercado.\",\"puntuacion\":5}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(4))
                .andExpect(jsonPath("$.idProducto").value(20))
                .andExpect(jsonPath("$.puntuacion").value(5))
                .andExpect(jsonPath("$.comentario").value("La mejor cámara del mercado."));
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
    @DisplayName("POST /api/resenas con comentario superior a 1000 caracteres devuelve 400 Bad Request")
    void crearResenaComentarioExcesivoReturnsBadRequest() throws Exception {
        String comentarioLargo = "A".repeat(1001);
        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":10,\"comentario\":\"" + comentarioLargo + "\",\"puntuacion\":5}"))
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
                4,
                LocalDateTime.now(),
                true
        );

        when(resenaService.actualizar(eq(5L), any(ResenaUpdateRequest.class), any())).thenReturn(response);

        mockMvc.perform(put("/api/resenas/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario editado y mejorado.\",\"puntuacion\":4}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(5))
                .andExpect(jsonPath("$.comentario").value("Comentario editado y mejorado."))
                .andExpect(jsonPath("$.puntuacion").value(4));
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
                5,
                LocalDateTime.now(),
                true
        );

        when(resenaService.actualizar(eq(15L), eq(6L), any(ResenaUpdateRequest.class), any())).thenReturn(response);

        mockMvc.perform(put("/api/productos/15/resenas/6")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Excelente tras actualizar.\",\"puntuacion\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(6))
                .andExpect(jsonPath("$.idProducto").value(15))
                .andExpect(jsonPath("$.comentario").value("Excelente tras actualizar."))
                .andExpect(jsonPath("$.puntuacion").value(5));
    }

    @Test
    @DisplayName("PUT /api/productos/{idProducto}/resenas/{idResena} cuando la reseña no pertenece al producto devuelve 404 Not Found")
    void actualizarParaProductoNoPerteneceReturnsNotFound() throws Exception {
        when(resenaService.actualizar(eq(99L), eq(6L), any(ResenaUpdateRequest.class), any()))
                .thenThrow(new ResourceNotFoundException("Reseña no encontrada con id 6 para el producto con id 99"));

        mockMvc.perform(put("/api/productos/99/resenas/6")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario válido.\",\"puntuacion\":4}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} para reseña inexistente devuelve 404 Not Found (S2-17)")
    void actualizarResenaInexistenteReturnsNotFound() throws Exception {
        when(resenaService.actualizar(eq(99L), any(ResenaUpdateRequest.class), any()))
                .thenThrow(new ResourceNotFoundException("Reseña no encontrada con id 99"));

        mockMvc.perform(put("/api/resenas/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Reseña inexistente.\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} sin permiso devuelve 403 Forbidden (S2-17)")
    void actualizarResenaSinPermisoReturnsForbidden() throws Exception {
        when(resenaService.actualizar(eq(5L), any(ResenaUpdateRequest.class), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para modificar esta reseña."));

        mockMvc.perform(put("/api/resenas/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Modificación no autorizada.\"}"))
                .andExpect(status().isForbidden());
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
    @DisplayName("PUT /api/resenas/{id} con comentario superior a 1000 caracteres devuelve 400 Bad Request (S2-17)")
    void actualizarResenaComentarioExcesivoReturnsBadRequest() throws Exception {
        String comentarioLargo = "B".repeat(1001);
        mockMvc.perform(put("/api/resenas/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"" + comentarioLargo + "\"}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // Pruebas S2-18: Endpoint DELETE para eliminar reseñas
    // =========================================================================

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
        doNothing().when(resenaService).eliminar(eq(20L), eq(8L), any());

        mockMvc.perform(delete("/api/productos/20/resenas/8"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /api/productos/{idProducto}/resenas/{idResena} cuando la reseña no pertenece al producto devuelve 404 Not Found")
    void eliminarParaProductoNoPerteneceReturnsNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Reseña no encontrada con id 8 para el producto con id 99"))
                .when(resenaService).eliminar(eq(99L), eq(8L), any());

        mockMvc.perform(delete("/api/productos/99/resenas/8"))
                .andExpect(status().isNotFound());
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
