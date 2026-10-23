package com.example.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.service.ResenaService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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
}
