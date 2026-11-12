package com.example.backend.controller;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
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

@SpringBootTest
@Transactional
class ReporteResenaIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private ResenaRepository resenaRepository;

    @Autowired
    private ReporteResenaRepository reporteResenaRepository;

    private MockMvc mockMvc;

    private Producto producto;
    private Usuario autorResena;
    private Usuario usuarioReportante1;
    private Usuario usuarioReportante2;
    private Resena resenaActiva;
    private Resena resenaEliminada;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        Categoria categoria = new Categoria();
        categoria.setNombre("Hardware " + UUID.randomUUID());
        categoria.setDescripcion("Cat prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);

        Marca marca = new Marca();
        marca.setNombre("TechCorp " + UUID.randomUUID());
        marca.setDescripcion("Marca prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        Rol rol = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol normal");
                    return rolRepository.save(r);
                });

        autorResena = new Usuario();
        autorResena.setNombre("Autor Resena");
        autorResena.setCorreo("autor_" + UUID.randomUUID() + "@test.com");
        autorResena.setSupabaseUid(UUID.randomUUID().toString());
        autorResena.setRol(rol);
        autorResena.setEstado(true);
        autorResena.setFechaRegistro(LocalDateTime.now());
        autorResena = usuarioRepository.save(autorResena);

        usuarioReportante1 = new Usuario();
        usuarioReportante1.setNombre("Reportante Uno");
        usuarioReportante1.setCorreo("rep1_" + UUID.randomUUID() + "@test.com");
        usuarioReportante1.setSupabaseUid(UUID.randomUUID().toString());
        usuarioReportante1.setRol(rol);
        usuarioReportante1.setEstado(true);
        usuarioReportante1.setFechaRegistro(LocalDateTime.now());
        usuarioReportante1 = usuarioRepository.save(usuarioReportante1);

        usuarioReportante2 = new Usuario();
        usuarioReportante2.setNombre("Reportante Dos");
        usuarioReportante2.setCorreo("rep2_" + UUID.randomUUID() + "@test.com");
        usuarioReportante2.setSupabaseUid(UUID.randomUUID().toString());
        usuarioReportante2.setRol(rol);
        usuarioReportante2.setEstado(true);
        usuarioReportante2.setFechaRegistro(LocalDateTime.now());
        usuarioReportante2 = usuarioRepository.save(usuarioReportante2);

        producto = new Producto();
        producto.setNombre("Laptop Pro " + UUID.randomUUID());
        producto.setDescripcion("Laptop prueba");
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setPrecioReferencia(new BigDecimal("1200.00"));
        producto.setEstado(true);
        producto = productoRepository.save(producto);

        resenaActiva = new Resena();
        resenaActiva.setProducto(producto);
        resenaActiva.setUsuario(autorResena);
        resenaActiva.setComentario("Excelente portátil para trabajo pesado");
        resenaActiva.setPuntuacion(5);
        resenaActiva.setEstado(true);
        resenaActiva.setOcultaPorReportes(false);
        resenaActiva.setFechaCreacion(LocalDateTime.now());
        resenaActiva = resenaRepository.save(resenaActiva);

        resenaEliminada = new Resena();
        resenaEliminada.setProducto(producto);
        resenaEliminada.setUsuario(autorResena);
        resenaEliminada.setComentario("Reseña borrada por el autor");
        resenaEliminada.setPuntuacion(3);
        resenaEliminada.setEstado(false);
        resenaEliminada.setOcultaPorReportes(false);
        resenaEliminada.setFechaCreacion(LocalDateTime.now().minusDays(1));
        resenaEliminada = resenaRepository.save(resenaEliminada);
    }

    @Test
    @DisplayName("1. Usuario autenticado crea un reporte correctamente con estado PENDIENTE")
    void usuarioAutenticadoCreaReporteExitosamente() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam",
                                    "descripcion": "Publicidad encubierta de otra tienda"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idReporte").isNumber())
                .andExpect(jsonPath("$.idResena").value(resenaActiva.getIdResena()))
                .andExpect(jsonPath("$.motivo").value("spam"))
                .andExpect(jsonPath("$.descripcion").value("Publicidad encubierta de otra tienda"))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty());

        List<ReporteResena> reportes = reporteResenaRepository.findAll();
        assertEquals(1, reportes.size());
        ReporteResena r = reportes.get(0);
        assertEquals(resenaActiva.getIdResena(), r.getResena().getIdResena());
        assertEquals(usuarioReportante1.getIdUsuario(), r.getUsuario().getIdUsuario());
        assertEquals("spam", r.getMotivo());
        assertEquals(EstadoReporte.PENDIENTE, r.getEstado());
    }

    @Test
    @DisplayName("2. Usuario anónimo no puede reportar (401 Unauthorized)")
    void usuarioAnonimoNoPuedeReportar() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam"
                                }
                                """))
                .andExpect(status().isUnauthorized());

        assertTrue(reporteResenaRepository.findAll().isEmpty());
    }

    @Test
    @DisplayName("3. Usuario no puede reportar su propia reseña (403 Forbidden)")
    void usuarioNoPuedeReportarSuPropiaResena() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(autorResena.getSupabaseUid())
                                .claim("email", autorResena.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "falso"
                                }
                                """))
                .andExpect(status().isForbidden());

        assertTrue(reporteResenaRepository.findAll().isEmpty());
    }

    @Test
    @DisplayName("4. Usuario no puede reportar una reseña inexistente (404 Not Found)")
    void usuarioNoPuedeReportarResenaInexistente() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", 999999L)
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam"
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("5. Usuario no puede reportar una reseña eliminada lógicamente (404 Not Found)")
    void usuarioNoPuedeReportarResenaEliminada() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaEliminada.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam"
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("6. Motivo 'otro' sin descripción o con espacios en blanco es rechazado (400 Bad Request)")
    void motivoOtroSinDescripcionEsRechazado() throws Exception {
        // Sin descripción
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "otro"
                                }
                                """))
                .andExpect(status().isBadRequest());

        // Descripción vacía o solo espacios
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "otro",
                                    "descripcion": "   "
                                }
                                """))
                .andExpect(status().isBadRequest());

        // Motivo 'otro' con descripción válida sí es aceptado
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "otro",
                                    "descripcion": "Contenido no relacionado con el producto"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.motivo").value("otro"))
                .andExpect(jsonPath("$.descripcion").value("Contenido no relacionado con el producto"));
    }

    @Test
    @DisplayName("7. Motivos no permitidos son rechazados (400 Bad Request)")
    void motivosNoPermitidosSonRechazados() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "motivo-invalido",
                                    "descripcion": "Test"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("8. Un usuario no puede reportar dos veces la misma reseña (409 Conflict)")
    void usuarioNoPuedeReportarDosVecesMismaResena() throws Exception {
        // Primer reporte
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam"
                                }
                                """))
                .andExpect(status().isCreated());

        // Segundo reporte por el mismo usuario
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "falso"
                                }
                                """))
                .andExpect(status().isConflict());

        assertEquals(1, reporteResenaRepository.count());
    }

    @Test
    @DisplayName("9. Dos usuarios diferentes pueden reportar la misma reseña")
    void dosUsuariosDiferentesPuedenReportarMismaResena() throws Exception {
        // Reporte 1
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam"
                                }
                                """))
                .andExpect(status().isCreated());

        // Reporte 2 por usuarioReportante2
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante2.getSupabaseUid())
                                .claim("email", usuarioReportante2.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "lenguaje-ofensivo"
                                }
                                """))
                .andExpect(status().isCreated());

        assertEquals(2, reporteResenaRepository.count());
    }

    @Test
    @DisplayName("10. El usuario solo puede consultar sus propios reportes")
    void usuarioSoloConsultaSusPropiosReportes() throws Exception {
        // Usuario 1 reporta resenaActiva
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam"
                                }
                                """))
                .andExpect(status().isCreated());

        // Usuario 2 reporta resenaActiva
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante2.getSupabaseUid())
                                .claim("email", usuarioReportante2.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "falso"
                                }
                                """))
                .andExpect(status().isCreated());

        // Usuario 1 consulta /api/reportes/mis-reportes -> Solo ve 1 reporte (el suyo)
        mockMvc.perform(get("/api/reportes/mis-reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].motivo").value("spam"))
                .andExpect(jsonPath("$[0].idResena").value(resenaActiva.getIdResena()));

        // Usuario 2 consulta /api/reportes/mis-reportes -> Solo ve su reporte
        mockMvc.perform(get("/api/reportes/mis-reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante2.getSupabaseUid())
                                .claim("email", usuarioReportante2.getCorreo()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].motivo").value("falso"))
                .andExpect(jsonPath("$[0].idResena").value(resenaActiva.getIdResena()));

        // Usuario anónimo consulta /api/reportes/mis-reportes -> 401 Unauthorized
        mockMvc.perform(get("/api/reportes/mis-reportes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("11. El estado inicial del reporte siempre es PENDIENTE")
    void estadoInicialEsPendiente() throws Exception {
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "lenguaje-ofensivo",
                                    "descripcion": "Insultos en el texto"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    @Test
    @DisplayName("12. El backend no permite establecer id_usuario ni estado desde el payload del cliente")
    void backendIgnoraCamposNoPermitidosDesdeCliente() throws Exception {
        // Cliente malicioso intenta enviar id_usuario = 9999 y estado = 'ACEPTADO'
        mockMvc.perform(post("/api/resenas/{idResena}/reportes", resenaActiva.getIdResena())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "idUsuario": 9999,
                                    "estado": "ACEPTADO",
                                    "motivo": "spam",
                                    "descripcion": "Test de inyección de campos"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));

        ReporteResena guardado = reporteResenaRepository.findAll().get(0);
        assertEquals(usuarioReportante1.getIdUsuario(), guardado.getUsuario().getIdUsuario());
        assertEquals(EstadoReporte.PENDIENTE, guardado.getEstado());
    }

    @Test
    @DisplayName("13. [S2-39] Usuario puede reportar mediante POST /api/reportes con idResena en el cuerpo (201 Created)")
    void usuarioPuedeReportarMedianteEndpointPlano() throws Exception {
        mockMvc.perform(post("/api/reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                    "idResena": %d,
                                    "motivo": "spam",
                                    "descripcion": "Reporte enviado a endpoint plano"
                                }
                                """, resenaActiva.getIdResena())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idReporte").isNumber())
                .andExpect(jsonPath("$.idResena").value(resenaActiva.getIdResena()))
                .andExpect(jsonPath("$.motivo").value("spam"))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));

        assertEquals(1, reporteResenaRepository.count());
    }

    @Test
    @DisplayName("14. [S2-39] POST /api/reportes sin idResena devuelve 400 Bad Request")
    void reporteSinIdResenaDevuelve400BadRequest() throws Exception {
        mockMvc.perform(post("/api/reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioReportante1.getSupabaseUid())
                                .claim("email", usuarioReportante1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "motivo": "spam",
                                    "descripcion": "Sin id de reseña"
                                }
                                """))
                .andExpect(status().isBadRequest());

        assertEquals(0, reporteResenaRepository.count());
    }
}

