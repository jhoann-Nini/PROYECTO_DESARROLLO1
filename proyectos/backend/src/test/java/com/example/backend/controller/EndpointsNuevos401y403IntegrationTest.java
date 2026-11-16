package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioEstablecimiento;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioEstablecimientoRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.math.BigDecimal;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Suite de pruebas de seguridad para la tarea TEC-139 / HU-S2-13:
 * "HU-S2-13: pruebas 401 y 403 de todos los endpoints nuevos" (Bajo historia épica TEC-129 HU-S2-17 — Pruebas).
 *
 * Cobertura exhaustiva:
 * - 401 Unauthorized: cada endpoint nuevo evaluado sin cabecera de autenticación es rechazado.
 * - 403 Forbidden: cada endpoint nuevo evaluado con un rol o actor no autorizado es rechazado.
 * - Flujos cubiertos:
 *   1. Reportes y moderación (HU-S2-13 / S2-39 / S2-42 / S2-43 / S2-72): reportes, colas y acciones operativas.
 *   2. Administración de usuarios y roles (/api/admin/**): consultas, asignaciones y revocaciones.
 *   3. Gestión de establecimientos y representantes (/api/establecimientos, /api/representante/**).
 *   4. Contraste positivo: acceso autorizado para los roles legítimos.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EndpointsNuevos401y403IntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";

    private static ECPublicKey testPublicKey;
    private static ECPrivateKey testPrivateKey;
    private static ECKey testJwk;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ResenaRepository resenaRepository;

    @Autowired
    private ReporteResenaRepository reporteResenaRepository;

    @Autowired
    private EstablecimientoRepository establecimientoRepository;

    @Autowired
    private UsuarioEstablecimientoRepository usuarioEstablecimientoRepository;

    @Autowired
    private UsuarioRolRepository usuarioRolRepository;

    private MockMvc mockMvc;

    private Rol rolAdmin;
    private Rol rolModerador;
    private Rol rolRepresentante;
    private Rol rolUsuario;

    private Usuario usuarioAutor;
    private Usuario usuarioReportante;
    private Usuario usuarioModerador;
    private Usuario usuarioRepresentante;
    private Usuario usuarioAdmin;

    private Producto producto;
    private Resena resenaActiva;
    private ReporteResena reporteExistente;
    private Establecimiento tienda;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) pair.getPublic();
        testPrivateKey = (ECPrivateKey) pair.getPrivate();
        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-endpoints-nuevos-401-403-key")
                .algorithm(JWSAlgorithm.ES256)
                .keyUse(KeyUse.SIGNATURE)
                .build();
    }

    @TestConfiguration
    static class TestJwtConfiguration {
        @Bean
        @Primary
        public JwtDecoder testJwtDecoder() {
            JWKSource<SecurityContext> source = new ImmutableJWKSet<>(new JWKSet(testJwk));
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSource(source)
                    .jwsAlgorithm(SignatureAlgorithm.ES256)
                    .build();
            decoder.setJwtValidator(SecurityConfig.createJwtValidator(TEST_ISSUER, TEST_AUDIENCE));
            return decoder;
        }
    }

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();

        rolAdmin = obtenerOCrearRol("Administrador");
        rolModerador = obtenerOCrearRol("Moderador");
        rolRepresentante = obtenerOCrearRol("Representante de establecimiento");
        rolUsuario = obtenerOCrearRol("Usuario registrado");

        usuarioAutor = crearUsuario("autor_resena_test@test.com", rolUsuario, true);
        usuarioReportante = crearUsuario("reportante_test@test.com", rolUsuario, true);
        usuarioModerador = crearUsuario("moderador_test@test.com", rolModerador, true);
        usuarioRepresentante = crearUsuario("representante_test@test.com", rolRepresentante, true);
        usuarioAdmin = crearUsuario("admin_test@test.com", rolAdmin, true);

        Categoria categoria = new Categoria();
        categoria.setNombre("Dispositivos Test");
        categoria = categoriaRepository.saveAndFlush(categoria);

        Marca marca = new Marca();
        marca.setNombre("Marca Test");
        marca = marcaRepository.saveAndFlush(marca);

        producto = new Producto();
        producto.setNombre("Smartphone Test X");
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setEstado(true);
        producto = productoRepository.saveAndFlush(producto);

        resenaActiva = new Resena();
        resenaActiva.setProducto(producto);
        resenaActiva.setUsuario(usuarioAutor);
        resenaActiva.setPuntuacion(5);
        resenaActiva.setComentario("Muy buen rendimiento general.");
        resenaActiva.setEstado(true);
        resenaActiva.setOcultaPorModeracion(false);
        resenaActiva.setOcultaPorReportes(false);
        resenaActiva = resenaRepository.saveAndFlush(resenaActiva);

        reporteExistente = new ReporteResena();
        reporteExistente.setResena(resenaActiva);
        reporteExistente.setUsuario(usuarioReportante);
        reporteExistente.setMotivo("spam");
        reporteExistente.setDescripcion("Spam detectado en la reseña");
        reporteExistente.setEstado(EstadoReporte.PENDIENTE);
        reporteExistente.setFechaCreacion(LocalDateTime.now());
        reporteExistente = reporteResenaRepository.saveAndFlush(reporteExistente);

        tienda = new Establecimiento();
        tienda.setNombre("Tienda Certificada HU-S2-13");
        tienda.setDireccion("Calle 50 # 10-20");
        tienda.setEstado(true);
        tienda = establecimientoRepository.saveAndFlush(tienda);

        UsuarioEstablecimiento ue = new UsuarioEstablecimiento();
        ue.setUsuario(usuarioRepresentante);
        ue.setEstablecimiento(tienda);
        ue.setEstado(true);
        ue.setFechaAsignacion(LocalDateTime.now());
        usuarioEstablecimientoRepository.saveAndFlush(ue);
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre(nombre);
            r.setDescripcion("Rol " + nombre);
            return rolRepository.save(r);
        });
    }

    private Usuario crearUsuario(String correo, Rol rol, boolean activo) {
        Usuario usuario = new Usuario();
        usuario.setNombre("User " + rol.getNombre());
        usuario.setCorreo(correo);
        usuario.setSupabaseUid(UUID.randomUUID().toString());
        usuario.setRol(rol);
        usuario.setEstado(activo);
        usuario.setFechaRegistro(LocalDateTime.now());

        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setRol(rol);
        asignacion.setEstado(true);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(asignacion);

        return usuarioRepository.saveAndFlush(usuario);
    }

    private String generarToken(Usuario usuario) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .subject(usuario.getSupabaseUid())
                .audience(TEST_AUDIENCE)
                .claim("email", usuario.getCorreo())
                .claim("email_verified", true)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600000))
                .build();

        SignedJWT jwt = new SignedJWT(header, claims);
        jwt.sign(new ECDSASigner(testPrivateKey));
        return jwt.serialize();
    }

    // =========================================================================
    // SECCIÓN 1: Reportes y Moderación (HU-S2-13 / S2-39 / S2-42 / S2-43 / S2-72)
    // =========================================================================

    @Test
    @DisplayName("S2-13-01: POST /api/resenas/{id}/reportes anónimo responde 401 Unauthorized")
    void crearReporteAnonimoResponde401() throws Exception {
        mockMvc.perform(post("/api/resenas/" + resenaActiva.getIdResena() + "/reportes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "motivo": "spam",
                                  "descripcion": "Publicidad externa"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-02: POST /api/resenas/{id}/reportes por autor de la reseña responde 403 Forbidden (autorreporte)")
    void autorreporteResponde403() throws Exception {
        mockMvc.perform(post("/api/resenas/" + resenaActiva.getIdResena() + "/reportes")
                        .header("Authorization", "Bearer " + generarToken(usuarioAutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "motivo": "spam",
                                  "descripcion": "Intento de reportar mi propia reseña"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-03: POST /api/reportes/resenas/{id} anónimo responde 401 Unauthorized")
    void crearReporteRutaAlternaAnonimoResponde401() throws Exception {
        mockMvc.perform(post("/api/reportes/resenas/" + resenaActiva.getIdResena())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "motivo": "lenguaje-ofensivo",
                                  "descripcion": "Comentario agresivo"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-04: POST /api/reportes (con id en body) anónimo responde 401 Unauthorized")
    void crearReporteBodyAnonimoResponde401() throws Exception {
        String payload = String.format("{\"idResena\": %d, \"motivo\": \"spam\", \"descripcion\": \"Publicidad\"}", resenaActiva.getIdResena());
        mockMvc.perform(post("/api/reportes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-05: GET /api/reportes/mis-reportes anónimo responde 401 Unauthorized")
    void misReportesAnonimoResponde401() throws Exception {
        mockMvc.perform(get("/api/reportes/mis-reportes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-06: GET /api/moderacion/reportes anónimo responde 401 Unauthorized")
    void colaModeracionReportesAnonimoResponde401() throws Exception {
        mockMvc.perform(get("/api/moderacion/reportes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-07: GET /api/moderacion/reportes por usuario estándar responde 403 Forbidden")
    void colaModeracionReportesUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(get("/api/moderacion/reportes")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-08: GET /api/moderacion/reportes por representante responde 403 Forbidden")
    void colaModeracionReportesRepresentanteResponde403() throws Exception {
        mockMvc.perform(get("/api/moderacion/reportes")
                        .header("Authorization", "Bearer " + generarToken(usuarioRepresentante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-09: GET /api/moderacion/resenas/reportadas anónimo responde 401 Unauthorized")
    void resenasReportadasAnonimoResponde401() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-10: GET /api/moderacion/resenas/reportadas por usuario estándar responde 403 Forbidden")
    void resenasReportadasUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-11: GET /api/moderacion/resenas/pendientes por usuario estándar responde 403 Forbidden")
    void resenasPendientesUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/pendientes")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-12: PATCH /api/moderacion/reportes/{id}/estado anónimo responde 401 Unauthorized")
    void actualizarEstadoReporteAnonimoResponde401() throws Exception {
        mockMvc.perform(patch("/api/moderacion/reportes/" + reporteExistente.getIdReporte() + "/estado")
                        .param("estado", "DESCARTADO"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-13: PATCH /api/moderacion/reportes/{id}/estado por usuario estándar responde 403 Forbidden")
    void actualizarEstadoReporteUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(patch("/api/moderacion/reportes/" + reporteExistente.getIdReporte() + "/estado")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante))
                        .param("estado", "DESCARTADO"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-14: GET /api/moderacion/reportes/{id}/historial por usuario estándar responde 403 Forbidden")
    void historialModeracionUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(get("/api/moderacion/reportes/" + reporteExistente.getIdReporte() + "/historial")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-15: POST /api/moderacion/resenas/{id}/ocultar anónimo responde 401 Unauthorized")
    void ocultarResenaAnonimoResponde401() throws Exception {
        mockMvc.perform(post("/api/moderacion/resenas/" + resenaActiva.getIdResena() + "/ocultar"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-16: POST /api/moderacion/resenas/{id}/ocultar por usuario estándar responde 403 Forbidden")
    void ocultarResenaUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(post("/api/moderacion/resenas/" + resenaActiva.getIdResena() + "/ocultar")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-17: POST /api/moderacion/resenas/{id}/publicar por usuario estándar responde 403 Forbidden")
    void publicarResenaUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(post("/api/moderacion/resenas/" + resenaActiva.getIdResena() + "/publicar")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-18: POST /api/moderacion/resenas/{id}/rechazar-reportes por usuario estándar responde 403 Forbidden")
    void rechazarReportesUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(post("/api/moderacion/resenas/" + resenaActiva.getIdResena() + "/rechazar-reportes")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // SECCIÓN 2: Endpoints Administrativos (/api/admin/**)
    // =========================================================================

    @Test
    @DisplayName("S2-13-19: GET /api/admin/usuarios anónimo responde 401 Unauthorized")
    void adminUsuariosAnonimoResponde401() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-20: GET /api/admin/usuarios por moderador responde 403 Forbidden")
    void adminUsuariosModeradorResponde403() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios")
                        .header("Authorization", "Bearer " + generarToken(usuarioModerador)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-21: GET /api/admin/roles anónimo responde 401 Unauthorized")
    void adminRolesAnonimoResponde401() throws Exception {
        mockMvc.perform(get("/api/admin/roles"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-22: GET /api/admin/roles por usuario estándar responde 403 Forbidden")
    void adminRolesUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(get("/api/admin/roles")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-23: POST /api/admin/roles anónimo responde 401 Unauthorized")
    void adminAsignarRolAnonimoResponde401() throws Exception {
        mockMvc.perform(post("/api/admin/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idRol": 1
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-24: POST /api/admin/roles por moderador responde 403 Forbidden")
    void adminAsignarRolModeradorResponde403() throws Exception {
        mockMvc.perform(post("/api/admin/roles")
                        .header("Authorization", "Bearer " + generarToken(usuarioModerador))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idRol": 1
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-25: DELETE /api/admin/roles anónimo responde 401 Unauthorized")
    void adminRevocarRolAnonimoResponde401() throws Exception {
        mockMvc.perform(delete("/api/admin/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idRol": 1
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-26: DELETE /api/admin/roles por representante responde 403 Forbidden")
    void adminRevocarRolRepresentanteResponde403() throws Exception {
        mockMvc.perform(delete("/api/admin/roles")
                        .header("Authorization", "Bearer " + generarToken(usuarioRepresentante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idRol": 1
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-27: POST /api/admin/representantes anónimo responde 401 Unauthorized")
    void adminAsignarRepresentanteAnonimoResponde401() throws Exception {
        mockMvc.perform(post("/api/admin/representantes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idEstablecimiento": 1
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-28: POST /api/admin/representantes por usuario registrado responde 403 Forbidden")
    void adminAsignarRepresentanteUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(post("/api/admin/representantes")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idEstablecimiento": 1
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-29: DELETE /api/admin/representantes por moderador responde 403 Forbidden")
    void adminRevocarRepresentanteModeradorResponde403() throws Exception {
        mockMvc.perform(delete("/api/admin/representantes")
                        .header("Authorization", "Bearer " + generarToken(usuarioModerador))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": 1,
                                  "idEstablecimiento": 1
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // SECCIÓN 3: Tiendas y Representantes (/api/establecimientos, /api/representante/**)
    // =========================================================================

    @Test
    @DisplayName("S2-13-30: POST /api/establecimientos anónimo responde 401 Unauthorized")
    void crearTiendaAnonimoResponde401() throws Exception {
        mockMvc.perform(post("/api/establecimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda Anonima"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-31: POST /api/establecimientos por moderador responde 403 Forbidden")
    void crearTiendaModeradorResponde403() throws Exception {
        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(usuarioModerador))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda Moderador"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-32: PUT /api/establecimientos/{id} por usuario registrado responde 403 Forbidden")
    void actualizarTiendaUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(put("/api/establecimientos/" + tienda.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda Modificada"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-33: DELETE /api/establecimientos/{id} por representante responde 403 Forbidden")
    void eliminarTiendaRepresentanteResponde403() throws Exception {
        mockMvc.perform(delete("/api/establecimientos/" + tienda.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(usuarioRepresentante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-34: GET /api/representante/establecimientos anónimo responde 401 Unauthorized")
    void listarTiendasRepresentanteAnonimoResponde401() throws Exception {
        mockMvc.perform(get("/api/representante/establecimientos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S2-13-35: GET /api/representante/establecimientos por usuario estándar responde 403 Forbidden")
    void listarTiendasRepresentanteUsuarioOrdinarioResponde403() throws Exception {
        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(usuarioReportante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-13-36: PUT /api/representante/establecimientos/{id} por moderador responde 403 Forbidden")
    void actualizarTiendaRepresentanteModeradorResponde403() throws Exception {
        mockMvc.perform(put("/api/representante/establecimientos/" + tienda.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(usuarioModerador))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Nombre Actualizado"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // SECCIÓN 4: Contraste Positivo de Autorización
    // =========================================================================

    @Test
    @DisplayName("S2-13-37: Usuario estándar reporta reseña ajena legítimamente con 201 Created")
    void usuarioReportaResenaAjenaExitosamente() throws Exception {
        Usuario otroUsuario = crearUsuario("otro_reportante_ok@test.com", rolUsuario, true);

        mockMvc.perform(post("/api/resenas/" + resenaActiva.getIdResena() + "/reportes")
                        .header("Authorization", "Bearer " + generarToken(otroUsuario))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "motivo": "spam",
                                  "descripcion": "Reporte válido y legítimo"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(resenaActiva.getIdResena()))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    @Test
    @DisplayName("S2-13-38: Moderador activo consulta cola de reportes con 200 OK")
    void moderadorConsultaColaExitosamente() throws Exception {
        mockMvc.perform(get("/api/moderacion/reportes")
                        .header("Authorization", "Bearer " + generarToken(usuarioModerador)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("S2-13-39: Administrador activo consulta usuarios registrados con 200 OK")
    void administradorConsultaUsuariosExitosamente() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios")
                        .header("Authorization", "Bearer " + generarToken(usuarioAdmin)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("S2-13-40: Representante activo consulta sus tiendas asignadas con 200 OK")
    void representanteConsultaSusTiendasExitosamente() throws Exception {
        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(usuarioRepresentante)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nombre").value("Tienda Certificada HU-S2-13"));
    }
}
