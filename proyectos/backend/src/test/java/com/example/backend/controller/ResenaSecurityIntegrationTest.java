package com.example.backend.controller;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
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
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Excelente producto verificado\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").isNumber())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.comentario").value("Excelente producto verificado"))
                .andExpect(jsonPath("$.nombreUsuario").value("Usuario Resenas Test"));
    }

    @Test
    @DisplayName("POST /api/resenas para producto inexistente devuelve 404 Not Found")
    void postResenaProductoInexistenteDevuelve404() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":999999,\"comentario\":\"Intento de reseña para producto falso\"}"))
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
    @DisplayName("POST /api/resenas con título, ventajas y desventajas (S2-12) persiste y retorna todos los campos")
    void postResenaConTituloVentajasDesventajasPersiste() throws Exception {
        String token = generarToken(TEST_SUB, "resenas_test@example.com");

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Excelente desempeño en juegos.\",\"titulo\":\"Gran rendimiento\",\"ventajas\":\"Pantalla fluida y buena batería\",\"desventajas\":\"Calienta un poco al jugar\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").isNumber())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.comentario").value("Excelente desempeño en juegos."))
                .andExpect(jsonPath("$.titulo").value("Gran rendimiento"))
                .andExpect(jsonPath("$.ventajas").value("Pantalla fluida y buena batería"))
                .andExpect(jsonPath("$.desventajas").value("Calienta un poco al jugar"))
                .andExpect(jsonPath("$.nombreUsuario").value("Usuario Resenas Test"));
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

        // 1. Crear reseña inicial
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idProductoValido + ",\"comentario\":\"Comentario inicial\",\"titulo\":\"Título inicial\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
        long idResena = json.get("idResena").asLong();

        // 2. Actualizar reseña con nuevos datos
        mockMvc.perform(put("/api/resenas/" + idResena)
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario modificado con éxito\",\"titulo\":\"Título actualizado\",\"ventajas\":\"Ahora tiene mejor rendimiento\",\"desventajas\":\"Ninguna relevante\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(idResena))
                .andExpect(jsonPath("$.comentario").value("Comentario modificado con éxito"))
                .andExpect(jsonPath("$.titulo").value("Título actualizado"))
                .andExpect(jsonPath("$.ventajas").value("Ahora tiene mejor rendimiento"))
                .andExpect(jsonPath("$.desventajas").value("Ninguna relevante"));
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
}