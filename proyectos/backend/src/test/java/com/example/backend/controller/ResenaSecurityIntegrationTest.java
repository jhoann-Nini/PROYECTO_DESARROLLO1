package com.example.backend.controller;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ReporteResenaDecisionAuditoriaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
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
import java.util.Map;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Transactional
class ResenaSecurityIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";
    private static final String TEST_SUB = "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e";

    private static ECPublicKey testPublicKey;
    private static ECPrivateKey testPrivateKey;
    private static ECKey testJwk;

    @Autowired
    private WebApplicationContext wac;

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

    @Autowired
    private ResenaModeracionAuditoriaRepository moderacionAuditoriaRepository;

    @Autowired
    private ReporteResenaDecisionAuditoriaRepository reporteDecisionAuditoriaRepository;

    private MockMvc mockMvc;
    private Long idProductoValido;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));

        KeyPair testKeyPair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) testKeyPair.getPublic();
        testPrivateKey = (ECPrivateKey) testKeyPair.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-supabase-es256-key")
                .algorithm(JWSAlgorithm.ES256)
                .keyUse(KeyUse.SIGNATURE)
                .build();
    }

    @TestConfiguration
    static class TestJwtConfiguration {
        @Bean
        @Primary
        public JwtDecoder testJwtDecoder() {
            JWKSource<SecurityContext> jwkSource = new ImmutableJWKSet<>(new JWKSet(testJwk));
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSource(jwkSource)
                    .jwsAlgorithm(SignatureAlgorithm.ES256)
                    .build();
            decoder.setJwtValidator(SecurityConfig.createJwtValidator(TEST_ISSUER, TEST_AUDIENCE));
            return decoder;
        }
    }

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac)
                .apply(springSecurity())
                .build();

        Categoria cat = new Categoria();
        cat.setNombre("Categoria Resena " + System.nanoTime());
        cat = categoriaRepository.save(cat);

        Marca marca = new Marca();
        marca.setNombre("Marca Resena " + System.nanoTime());
        marca = marcaRepository.save(marca);

        Producto prod = new Producto();
        prod.setNombre("Producto Resena " + System.nanoTime());
        prod.setCategoria(cat);
        prod.setMarca(marca);
        prod.setPrecioReferencia(new BigDecimal("1500000"));
        prod.setEstado(true);
        this.idProductoValido = productoRepository.save(prod).getIdProducto();

        Rol rolUsuario = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol para usuarios registrados");
                    return rolRepository.save(r);
                });

        if (usuarioRepository.findBySupabaseUid(TEST_SUB).isEmpty()) {
            Usuario u = new Usuario();
            u.setNombre("Usuario Resenas Test");
            u.setCorreo("resenas_test@example.com");
            u.setSupabaseUid(TEST_SUB);
            u.setRol(rolUsuario);
            u.setEstado(true);
            u.setFechaRegistro(LocalDateTime.now());
            usuarioRepository.save(u);
        }
    }

    private String generarToken(String sub, String email) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .subject(sub)
                .audience(TEST_AUDIENCE)
                .claim("email", email)
                .claim("user_metadata", Map.of("full_name", "Usuario Resenas Test"))
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600000))
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claims);
        signedJWT.sign(new ECDSASigner(testPrivateKey));
        return signedJWT.serialize();
    }


    private Usuario crearUsuarioConRol(String sub, String correo, String nombreRol) {
        Rol rol = rolRepository.findByNombre(nombreRol).orElseGet(() -> {
            Rol nuevo = new Rol();
            nuevo.setNombre(nombreRol);
            nuevo.setDescripcion("Rol para pruebas de seguridad");
            return rolRepository.save(nuevo);
        });
        Usuario usuario = new Usuario();
        usuario.setNombre("Usuario " + nombreRol);
        usuario.setCorreo(correo);
        usuario.setSupabaseUid(sub);
        usuario.setRol(rol);
        usuario.setEstado(true);
        usuario.setFechaRegistro(LocalDateTime.now());
        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setRol(rol);
        asignacion.setEstado(true);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(asignacion);
        return usuarioRepository.saveAndFlush(usuario);
    }

    private ReporteResena crearReportePendiente() {
        Usuario reportante = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        Usuario autor = crearUsuarioConRol(
                "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f90a1",
                "autor_moderacion@example.com",
                "Usuario registrado");
        Resena resena = new Resena();
        resena.setUsuario(autor);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña reportada para prueba de moderación");
        resena.setPuntuacion(1);
        resena.setEstado(true);
        resena.setOcultaPorReportes(false);
        resena = resenaRepository.saveAndFlush(resena);

        ReporteResena reporte = new ReporteResena();
        reporte.setUsuario(reportante);
        reporte.setResena(resena);
        reporte.setMotivo("spam");
        reporte.setEstado(EstadoReporte.PENDIENTE);
        reporte.setFechaCreacion(LocalDateTime.now());
        reporte.setFechaActualizacion(LocalDateTime.now());
        return reporteResenaRepository.saveAndFlush(reporte);
    }

    @Test
    @DisplayName("La bandeja de moderación rechaza al usuario ordinario")
    void usuarioOrdinarioNoPuedeConsultarBandejaModeracion() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");
        mockMvc.perform(get("/api/moderacion/reportes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("El moderador puede consultar la bandeja y avanzar un reporte")
    void moderadorPuedeRevisarYResolverReporte() throws Exception {
        String subModerador = "a7b8c9d0-e1f2-3a4b-5c6d-7e8f90a1b2c3";
        crearUsuarioConRol(subModerador, "moderador_test@example.com", "Moderador");
        ReporteResena reporte = crearReportePendiente();
        String token = generarToken(subModerador, "moderador_test@example.com");

        mockMvc.perform(get("/api/moderacion/reportes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idReporte").value(reporte.getIdReporte()));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                "/api/moderacion/reportes/" + reporte.getIdReporte() + "/estado")
                         .header("Authorization", "Bearer " + token)
                        .param("estado", "EN_REVISION")
                        .param("observacion", "Se inicia la revisión del reporte"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("EN_REVISION"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                "/api/moderacion/reportes/" + reporte.getIdReporte() + "/estado")
                         .header("Authorization", "Bearer " + token)
                        .param("estado", "ACEPTADO")
                        .param("observacion", "Se confirma el incumplimiento"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ACEPTADO"));

        mockMvc.perform(get("/api/moderacion/reportes/" + reporte.getIdReporte() + "/historial")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[0].estadoAnterior").value("EN_REVISION"))
                 .andExpect(jsonPath("$[0].estadoNuevo").value("ACEPTADO"))
                .andExpect(jsonPath("$[0].observacion").value("Se confirma el incumplimiento"))
                .andExpect(jsonPath("$[0].idModerador").isNumber())
                .andExpect(jsonPath("$[1].estadoAnterior").value("PENDIENTE"))
                .andExpect(jsonPath("$[1].estadoNuevo").value("EN_REVISION"));

        org.junit.jupiter.api.Assertions.assertEquals(2,
                reporteDecisionAuditoriaRepository.findByReporteIdReporteOrderByFechaEventoDesc(
                        reporte.getIdReporte()).size());
    }

    @Test
    @DisplayName("El moderador no puede moderar un reporte que él mismo creó")
    void moderadorNoPuedeResolverSuPropioReporte() throws Exception {
        String subModerador = "b8c9d0e1-f2a3-4b5c-6d7e-8f90a1b2c3d4";
        Usuario moderador = crearUsuarioConRol(subModerador, "moderador_autoreporte@example.com", "Moderador");
        Resena resena = new Resena();
        Usuario autor = crearUsuarioConRol(
                "c9d0e1f2-a3b4-5c6d-7e8f-90a1b2c3d4e5",
                "autor_autoreporte@example.com",
                "Usuario registrado");
        resena.setUsuario(autor);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña para reporte propio");
        resena.setPuntuacion(2);
        resena.setEstado(true);
        resena = resenaRepository.saveAndFlush(resena);
        ReporteResena reporte = new ReporteResena();
        reporte.setUsuario(moderador);
        reporte.setResena(resena);
        reporte.setMotivo("spam");
        reporte.setEstado(EstadoReporte.PENDIENTE);
        reporte.setFechaCreacion(LocalDateTime.now());
        reporte.setFechaActualizacion(LocalDateTime.now());
        reporte = reporteResenaRepository.saveAndFlush(reporte);
        String token = generarToken(subModerador, "moderador_autoreporte@example.com");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                                "/api/moderacion/reportes/" + reporte.getIdReporte() + "/estado")
                        .header("Authorization", "Bearer " + token)
                        .param("estado", "EN_REVISION"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/resenas es público y devuelve 200 OK sin autenticación")
    void getResenasEsPublico() throws Exception {
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/productos/{id}/resenas es público y devuelve 200 OK")
    void getResenasPorProductoEsPublico() throws Exception {
        mockMvc.perform(get("/api/productos/" + idProductoValido + "/resenas"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/resenas sin autenticación devuelve 401 Unauthorized")
    void postResenaAnonimoDevuelve401() throws Exception {
        mockMvc.perform(post("/api/resenas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Comentario anónimo no permitido\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"));
    }

    @Test
    @DisplayName("POST /api/resenas con token JWT válido de Supabase guarda la reseña y devuelve 201 Created")
    void postResenaAutenticadoGuardaResena() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Excelente producto verificado\",\"puntuacion\":5}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").isNumber())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.comentario").value("Excelente producto verificado"))
                .andExpect(jsonPath("$.puntuacion").value(5))
                .andExpect(jsonPath("$.nombreUsuario").value("Usuario Resenas Test"));
    }

    @Test
    @DisplayName("POST /api/resenas para producto inexistente devuelve 404 Not Found")
    void postResenaProductoInexistenteDevuelve404() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":999999,\"comentario\":\"Intento de reseña para producto falso\",\"puntuacion\":5}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/resenas con comentario vacío devuelve 400 Bad Request")
    void postResenaComentarioVacioDevuelve400() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/resenas con comentario superior a 1000 caracteres devuelve 400 Bad Request")
    void postResenaComentarioExcesivoDevuelve400() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");
        String comentarioLargo = "A".repeat(1001);

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"" + comentarioLargo + "\",\"puntuacion\":5}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // Pruebas de integración S2-17: Actualización de reseñas (PUT)
    // =========================================================================

    @Test
    @DisplayName("PUT /api/resenas/{id} anónimo devuelve 401 Unauthorized (S2-17)")
    void putResenaAnonimoDevuelve401() throws Exception {
        mockMvc.perform(put("/api/resenas/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento anónimo de edición\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} por el autor auténtico actualiza en BD y devuelve 200 OK (S2-17)")
    void putResenaAutorActualizaCorrectamente() throws Exception {
        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");

        // 1. Crear reseña inicial con puntuación 3
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Comentario inicial\",\"puntuacion\":3}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        var fechaOriginal = resenaRepository.findById(idResena).orElseThrow().getFechaCreacion();

        // 2. Actualizar reseña con nuevos datos y puntuación 5
        mockMvc.perform(put("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario modificado con éxito\",\"puntuacion\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(idResena))
                .andExpect(jsonPath("$.comentario").value("Comentario modificado con éxito"))
                .andExpect(jsonPath("$.puntuacion").value(5));

        // 3. Verificar en BD que comentario y puntuación cambiaron, pero fechaCreacion se conserva
        var resenaActualizada = resenaRepository.findById(idResena).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals("Comentario modificado con éxito", resenaActualizada.getComentario());
        org.junit.jupiter.api.Assertions.assertEquals(5, resenaActualizada.getPuntuacion());
        org.junit.jupiter.api.Assertions.assertEquals(fechaOriginal, resenaActualizada.getFechaCreacion());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} sin puntuación conserva la puntuación anterior (S2-17)")
    void putResenaSinPuntuacionConservaPuntuacionAnterior() throws Exception {
        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");

        // 1. Crear reseña inicial con puntuación 4
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Comentario inicial\",\"puntuacion\":4}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        // 2. Actualizar solo comentario
        mockMvc.perform(put("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario actualizado sin puntuación\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(idResena))
                .andExpect(jsonPath("$.comentario").value("Comentario actualizado sin puntuación"))
                .andExpect(jsonPath("$.puntuacion").value(4));

        var resenaActualizada = resenaRepository.findById(idResena).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(4, resenaActualizada.getPuntuacion());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} sobre reseña inactiva devuelve 404 Not Found (S2-17)")
    void putResenaInactivaDevuelve404() throws Exception {
        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");

        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Reseña que quedará inactiva\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long idResena = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta).get("idResena").asLong();

        var resena = resenaRepository.findById(idResena).orElseThrow();
        resena.setEstado(false);
        resenaRepository.save(resena);

        mockMvc.perform(put("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento de actualizar reseña inactiva\"}"))
                .andExpect(status().isNotFound());
    }



    @Test
    @DisplayName("PUT /api/resenas/{id} por otro usuario distinto al autor devuelve 403 Forbidden (S2-17)")
    void putResenaOtroUsuarioDevuelve403() throws Exception {
        String subImpostor = "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f";
        Rol rolUsuario = rolRepository.findByNombre("Usuario registrado").orElse(null);
        Usuario impostor = new Usuario();
        impostor.setNombre("Usuario Impostor");
        impostor.setCorreo("impostor@example.com");
        impostor.setSupabaseUid(subImpostor);
        impostor.setRol(rolUsuario);
        impostor.setEstado(true);
        impostor.setFechaRegistro(LocalDateTime.now());
        usuarioRepository.save(impostor);

        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");
        String tokenImpostor = generarToken(subImpostor, "impostor@example.com");

        // 1. Crear reseña con el autor
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Opinión original del autor\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        // 2. Intentar modificar con otro usuario
        mockMvc.perform(put("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenImpostor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento de modificación maliciosa\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/resenas/{id} para reseña inexistente devuelve 404 Not Found (S2-17)")
    void putResenaInexistenteDevuelve404() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(put("/api/resenas/999999")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Actualización de reseña fantasma\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} anónimo devuelve 401 Unauthorized (S2-18)")
    void deleteResenaAnonimoDevuelve401() throws Exception {
        mockMvc.perform(delete("/api/resenas/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} por el autor desactiva lógicamente en BD y devuelve 204 No Content (S2-18)")
    void deleteResenaAutorDesactivaEnBDYDevuelve204() throws Exception {
        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");

        // 1. Crear reseña
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Reseña que será eliminada por su autor\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        // 2. Eliminar reseña por el autor
        mockMvc.perform(delete("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAutor))
                .andExpect(status().isNoContent());

        // 3. Verificar en BD que estado es false (eliminación lógica)
        var resenaOpt = resenaRepository.findById(idResena);
        org.junit.jupiter.api.Assertions.assertTrue(resenaOpt.isPresent());
        org.junit.jupiter.api.Assertions.assertFalse(resenaOpt.get().getEstado());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} por otro usuario sin permisos devuelve 403 Forbidden (S2-18)")
    void deleteResenaOtroUsuarioDevuelve403() throws Exception {
        String subImpostor = "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90";
        Rol rolUsuario = rolRepository.findByNombre("Usuario registrado").orElse(null);
        Usuario impostor = new Usuario();
        impostor.setNombre("Usuario Impostor Delete");
        impostor.setCorreo("impostor_delete@example.com");
        impostor.setSupabaseUid(subImpostor);
        impostor.setRol(rolUsuario);
        impostor.setEstado(true);
        impostor.setFechaRegistro(LocalDateTime.now());
        usuarioRepository.save(impostor);

        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");
        String tokenImpostor = generarToken(subImpostor, "impostor_delete@example.com");

        // 1. Crear reseña con el autor
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Reseña protegida contra eliminación ajena\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        // 2. Intentar eliminar con otro usuario normal
        mockMvc.perform(delete("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenImpostor))
                .andExpect(status().isForbidden());

        // 3. Verificar que sigue activa en BD
        var resenaOpt = resenaRepository.findById(idResena);
        org.junit.jupiter.api.Assertions.assertTrue(resenaOpt.isPresent());
        org.junit.jupiter.api.Assertions.assertTrue(resenaOpt.get().getEstado());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} por un Administrador desactiva la reseña y devuelve 204 No Content (S2-18)")
    void deleteResenaAdminDesactivaEnBDYDevuelve204() throws Exception {
        String subAdmin = "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f90a1";
        Rol rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol de administración");
            return rolRepository.save(r);
        });
        Usuario admin = new Usuario();
        admin.setNombre("Usuario Admin Moderador");
        admin.setCorreo("admin_moderador@example.com");
        admin.setSupabaseUid(subAdmin);
        admin.setRol(rolAdmin);
        admin.setEstado(true);
        admin.setFechaRegistro(LocalDateTime.now());
        UsuarioRol asignacionAdmin = new UsuarioRol();
        asignacionAdmin.setUsuario(admin);
        asignacionAdmin.setRol(rolAdmin);
        asignacionAdmin.setEstado(true);
        asignacionAdmin.setFechaAsignacion(LocalDateTime.now());
        admin.agregarRol(asignacionAdmin);

        usuarioRepository.saveAndFlush(admin);

        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");
        String tokenAdmin = generarToken(subAdmin, "admin_moderador@example.com");

        // 1. Crear reseña con el usuario autor
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Reseña que será moderada por admin\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        // 2. Administrador elimina la reseña por moderación
        mockMvc.perform(delete("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNoContent());

        // 3. Verificar que quedó desactivada en BD
        var resenaOpt = resenaRepository.findById(idResena);
        org.junit.jupiter.api.Assertions.assertTrue(resenaOpt.isPresent());
        org.junit.jupiter.api.Assertions.assertFalse(resenaOpt.get().getEstado());
    }


    @Test
    @DisplayName("DELETE /api/resenas/{id} rechaza administrador con asignación revocada aunque conserve el rol heredado")
    void deleteResenaAdminConRolRevocadoDevuelve403() throws Exception {
        String subAdminRevocado = "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f90a1b2";
        Rol rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol de administración");
            return rolRepository.save(r);
        });

        Usuario adminRevocado = new Usuario();
        adminRevocado.setNombre("Administrador Revocado");
        adminRevocado.setCorreo("admin_revocado@example.com");
        adminRevocado.setSupabaseUid(subAdminRevocado);
        adminRevocado.setRol(rolAdmin);
        adminRevocado.setEstado(true);

        UsuarioRol asignacionRevocada = new UsuarioRol();
        asignacionRevocada.setRol(rolAdmin);
        asignacionRevocada.setEstado(false);
        asignacionRevocada.setFechaAsignacion(LocalDateTime.now().minusDays(1));
        asignacionRevocada.setFechaRevocacion(LocalDateTime.now());
        asignacionRevocada.setMotivoRevocacion("Prueba de revocación");
        adminRevocado.agregarRol(asignacionRevocada);
        usuarioRepository.saveAndFlush(adminRevocado);

        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");
        String tokenAdminRevocado = generarToken(subAdminRevocado, "admin_revocado@example.com");
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Reseña protegida ante rol revocado\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long idResena = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta).get("idResena").asLong();

        mockMvc.perform(delete("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAdminRevocado))
                .andExpect(status().isForbidden());

        org.junit.jupiter.api.Assertions.assertTrue(resenaRepository.findById(idResena).orElseThrow().getEstado());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} rechaza cuenta suspendida aunque tenga asignación administrativa activa")
    void deleteResenaCuentaSuspendidaConAdminActivoDevuelve403() throws Exception {
        String subAdminSuspendido = "a7b8c9d0-e1f2-3a4b-5c6d-7e8f90a1b2c3";
        Rol rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol de administración");
            return rolRepository.save(r);
        });

        Usuario adminSuspendido = new Usuario();
        adminSuspendido.setNombre("Administrador Suspendido");
        adminSuspendido.setCorreo("admin_suspendido@example.com");
        adminSuspendido.setSupabaseUid(subAdminSuspendido);
        adminSuspendido.setRol(rolAdmin);
        adminSuspendido.setEstado(false);

        UsuarioRol asignacionAdmin = new UsuarioRol();
        asignacionAdmin.setRol(rolAdmin);
        asignacionAdmin.setEstado(true);
        asignacionAdmin.setFechaAsignacion(LocalDateTime.now());
        adminSuspendido.agregarRol(asignacionAdmin);
        usuarioRepository.saveAndFlush(adminSuspendido);

        String tokenAutor = generarToken(TEST_SUB, "resenas_test@example.com");
        String tokenAdminSuspendido = generarToken(subAdminSuspendido, "admin_suspendido@example.com");
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Reseña protegida ante cuenta suspendida\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long idResena = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta).get("idResena").asLong();

        mockMvc.perform(delete("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAdminSuspendido))
                .andExpect(status().isForbidden());

        org.junit.jupiter.api.Assertions.assertTrue(resenaRepository.findById(idResena).orElseThrow().getEstado());
    }

    @Test
    @DisplayName("DELETE /api/resenas/{id} para reseña inexistente devuelve 404 Not Found (S2-18)")
    void deleteResenaInexistenteDevuelve404() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(delete("/api/resenas/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Moderador oculta y restaura reseña dejando trazabilidad de ambas decisiones")
    void moderadorPuedeOcultarYRestaurarConAuditoria() throws Exception {
        String subModerador = "d0e1f2a3-b4c5-6d7e-8f90-a1b2c3d4e5f6";
        Usuario moderador = crearUsuarioConRol(subModerador, "moderador_ocultamiento@example.com", "Moderador");
        Usuario autor = crearUsuarioConRol(
                "e1f2a3b4-c5d6-7e8f-90a1-b2c3d4e5f607",
                "autor_ocultamiento@example.com",
                "Usuario registrado");
        Resena resena = new Resena();
        resena.setUsuario(autor);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña que incumple normas");
        resena.setPuntuacion(1);
        resena.setEstado(true);
        resena.setOcultaPorReportes(false);
        resena = resenaRepository.saveAndFlush(resena);
        Long idResena = resena.getIdResena();
        String token = generarToken(subModerador, "moderador_ocultamiento@example.com");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/moderacion/resenas/" + idResena + "/ocultamiento")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocultar\":true,\"motivo\":\"Incumple las normas de la comunidad\"}"))
                .andExpect(status().isNoContent());

        Resena oculta = resenaRepository.findById(idResena).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(oculta.getOcultaPorModeracion());
        org.junit.jupiter.api.Assertions.assertEquals(moderador.getIdUsuario(), oculta.getModeradaPor().getIdUsuario());
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idResena == " + idResena + ")]").doesNotExist());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/moderacion/resenas/" + idResena + "/ocultamiento")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocultar\":false,\"motivo\":\"Revisión completada; contenido restaurado\"}"))
                .andExpect(status().isNoContent());

        Resena restaurada = resenaRepository.findById(idResena).orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(restaurada.getOcultaPorModeracion());
        org.junit.jupiter.api.Assertions.assertNull(restaurada.getModeradaPor());
        org.junit.jupiter.api.Assertions.assertFalse(restaurada.getOcultaPorReportes());

        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idResena == " + idResena + ")]").exists());

        mockMvc.perform(get("/api/moderacion/resenas/" + idResena + "/historial")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[0].accion").value("RESTAURAR"))
                .andExpect(jsonPath("$[1].accion").value("OCULTAR"));

        org.junit.jupiter.api.Assertions.assertEquals(2,
                moderacionAuditoriaRepository.findByResenaIdResenaOrderByFechaEventoDesc(idResena).size());
    }

    @Test
    @DisplayName("Restaurar ocultamiento manual no elimina el ocultamiento automático por reportes")
    void restaurarOcultamientoManualConservaOcultamientoPorReportes() throws Exception {
        String subModerador = "f2a3b4c5-d6e7-8f90-a1b2-c3d4e5f60718";
        crearUsuarioConRol(subModerador, "moderador_independencia@example.com", "Moderador");
        Usuario autor = crearUsuarioConRol(
                "a3b4c5d6-e7f8-90a1-b2c3-d4e5f6071829",
                "autor_independencia@example.com",
                "Usuario registrado");
        Resena resena = new Resena();
        resena.setUsuario(autor);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña oculta por ambas causas");
        resena.setPuntuacion(1);
        resena.setEstado(true);
        resena.setOcultaPorReportes(true);
        resena.setOcultaPorModeracion(true);
        resena.setModeradaPor(usuarioRepository.findBySupabaseUid(subModerador).orElseThrow());
        resena.setFechaModeracion(LocalDateTime.now());
        resena.setMotivoModeracion("Ocultamiento manual inicial");
        resena = resenaRepository.saveAndFlush(resena);
        Long idResena = resena.getIdResena();
        String token = generarToken(subModerador, "moderador_independencia@example.com");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/moderacion/resenas/" + idResena + "/ocultamiento")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocultar\":false,\"motivo\":\"Se retira únicamente la medida manual\"}"))
                .andExpect(status().isNoContent());

        Resena restaurada = resenaRepository.findById(idResena).orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(restaurada.getOcultaPorModeracion());
        org.junit.jupiter.api.Assertions.assertTrue(restaurada.getOcultaPorReportes());
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idResena == " + idResena + ")]").doesNotExist());
    }

    @Test
    @DisplayName("Usuario ordinario no puede ocultar reseñas")
    void usuarioOrdinarioNoPuedeOcultarResenas() throws Exception {
        Usuario autor = crearUsuarioConRol(
                "b4c5d6e7-f890-a1b2-c3d4-e5f60718293a",
                "autor_usuario_ordinario@example.com",
                "Usuario registrado");
        Resena resena = new Resena();
        resena.setUsuario(autor);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña protegida");
        resena.setPuntuacion(4);
        resena.setEstado(true);
        resena.setOcultaPorReportes(false);
        resena = resenaRepository.saveAndFlush(resena);
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/moderacion/resenas/" + resena.getIdResena() + "/ocultamiento")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocultar\":true,\"motivo\":\"Intento no autorizado\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Moderador suspendido no puede ocultar reseñas")
    void moderadorSuspendidoNoPuedeOcultarResenas() throws Exception {
        String subModerador = "c5d6e7f8-90a1-b2c3-d4e5-f60718293a4b";
        Usuario moderador = crearUsuarioConRol(subModerador, "moderador_suspendido@example.com", "Moderador");
        moderador.setEstado(false);
        usuarioRepository.saveAndFlush(moderador);
        Usuario autor = crearUsuarioConRol(
                "d6e7f890-a1b2-c3d4-e5f6-0718293a4b5c",
                "autor_suspendido@example.com",
                "Usuario registrado");
        Resena resena = new Resena();
        resena.setUsuario(autor);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña de prueba");
        resena.setPuntuacion(3);
        resena.setEstado(true);
        resena.setOcultaPorReportes(false);
        resena = resenaRepository.saveAndFlush(resena);
        String token = generarToken(subModerador, "moderador_suspendido@example.com");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/moderacion/resenas/" + resena.getIdResena() + "/ocultamiento")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocultar\":true,\"motivo\":\"Intento suspendido\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Moderador no puede ocultar su propia reseña")
    void moderadorNoPuedeOcultarSuPropiaResena() throws Exception {
        String subModerador = "e7f890a1-b2c3-d4e5-f607-18293a4b5c6d";
        Usuario moderador = crearUsuarioConRol(subModerador, "moderador_autor@example.com", "Moderador");
        Resena resena = new Resena();
        resena.setUsuario(moderador);
        resena.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resena.setComentario("Reseña escrita por el moderador");
        resena.setPuntuacion(5);
        resena.setEstado(true);
        resena.setOcultaPorReportes(false);
        resena = resenaRepository.saveAndFlush(resena);
        String token = generarToken(subModerador, "moderador_autor@example.com");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/moderacion/resenas/" + resena.getIdResena() + "/ocultamiento")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ocultar\":true,\"motivo\":\"Conflicto de interés\"}"))
                .andExpect(status().isForbidden());
    }

}
