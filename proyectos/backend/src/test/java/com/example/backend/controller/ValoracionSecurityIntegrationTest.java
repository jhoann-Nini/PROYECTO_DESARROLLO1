package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.ValoracionRepository;
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
class ValoracionSecurityIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";
    private static final String TEST_SUB = "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f";
    private static final String TEST_SUB_2 = "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a";

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
    private ValoracionRepository valoracionRepository;

    private MockMvc mockMvc;
    private Long idProductoValido;
    private Long idProductoInactivo;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));

        KeyPair testKeyPair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) testKeyPair.getPublic();
        testPrivateKey = (ECPrivateKey) testKeyPair.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-supabase-es256-val-key")
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
        cat.setNombre("Categoria Valoracion " + System.nanoTime());
        cat = categoriaRepository.save(cat);

        Marca marca = new Marca();
        marca.setNombre("Marca Valoracion " + System.nanoTime());
        marca = marcaRepository.save(marca);

        Producto prodActivo = new Producto();
        prodActivo.setNombre("Producto Para Valorar " + System.nanoTime());
        prodActivo.setCategoria(cat);
        prodActivo.setMarca(marca);
        prodActivo.setPrecioReferencia(new BigDecimal("1200000"));
        prodActivo.setEstado(true);
        this.idProductoValido = productoRepository.save(prodActivo).getIdProducto();

        Producto prodInactivo = new Producto();
        prodInactivo.setNombre("Producto Inactivo " + System.nanoTime());
        prodInactivo.setCategoria(cat);
        prodInactivo.setMarca(marca);
        prodInactivo.setPrecioReferencia(new BigDecimal("800000"));
        prodInactivo.setEstado(false);
        this.idProductoInactivo = productoRepository.save(prodInactivo).getIdProducto();

        Rol rolUsuario = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol para usuarios registrados");
                    return rolRepository.save(r);
                });

        if (usuarioRepository.findBySupabaseUid(TEST_SUB).isEmpty()) {
            Usuario u = new Usuario();
            u.setNombre("Usuario Valoraciones Test");
            u.setCorreo("val_test@example.com");
            u.setSupabaseUid(TEST_SUB);
            u.setRol(rolUsuario);
            u.setEstado(true);
            u.setFechaRegistro(LocalDateTime.now());
            usuarioRepository.save(u);
        }

        if (usuarioRepository.findBySupabaseUid(TEST_SUB_2).isEmpty()) {
            Usuario u2 = new Usuario();
            u2.setNombre("Segundo Usuario Test");
            u2.setCorreo("val_test2@example.com");
            u2.setSupabaseUid(TEST_SUB_2);
            u2.setRol(rolUsuario);
            u2.setEstado(true);
            u2.setFechaRegistro(LocalDateTime.now());
            usuarioRepository.save(u2);
        }
    }

    private String generarToken(String sub, String email, String nombre) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .subject(sub)
                .audience(TEST_AUDIENCE)
                .claim("email", email)
                .claim("user_metadata", Map.of("full_name", nombre))
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600000))
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claims);
        signedJWT.sign(new ECDSASigner(testPrivateKey));
        return signedJWT.serialize();
    }

    @Test
    @DisplayName("Crear una valoración válida con token autenticado")
    void crearValoracionValida() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 5
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idValoracion").isNumber())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.puntuacion").value(5))
                .andExpect(jsonPath("$.nombreUsuario").value("Usuario Valoraciones Test"))
                .andExpect(jsonPath("$.estado").value(true));
    }

    @Test
    @DisplayName("Rechazar peticiones no autenticadas")
    void postValoracionSinAutenticacionDevuelve401() throws Exception {
        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 5
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Rechazar puntuaciones menores que 1")
    void rechazarPuntuacionMenorQueUno() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 0
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Rechazar puntuaciones mayores que 5")
    void rechazarPuntuacionMayorQueCinco() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 6
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Rechazar productos inexistentes")
    void rechazarProductoInexistente() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": 99999999,
                "puntuacion": 4
            }
            """;

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Rechazar productos inactivos")
    void rechazarProductoInactivo() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 4
            }
            """.formatted(idProductoInactivo);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Actualizar valoración activa existente sin duplicar registros")
    void actualizarValoracionActivaExistente() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload1 = """
            {
                "idProducto": %d,
                "puntuacion": 3
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.puntuacion").value(3));

        // Enviar segunda valoración para el mismo producto por el mismo usuario
        String payload2 = """
            {
                "idProducto": %d,
                "puntuacion": 5
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.puntuacion").value(5));

        // Comprobar que en base de datos solo existe una valoración activa para este usuario y producto
        Usuario u = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        var lista = valoracionRepository.findByProductoIdProductoAndEstadoTrue(idProductoValido);
        assertEquals(1, lista.size(), "No debe duplicarse la valoración activa");
        assertEquals(5, lista.get(0).getPuntuacion(), "La puntuación debe actualizarse a 5");
    }

    @Test
    @DisplayName("Consultar mi valoración para un producto")
    void obtenerMiValoracionPorProducto() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        // Inicialmente no tiene valoración
        mockMvc.perform(get("/api/valoraciones/mi-valoracion")
                        .param("idProducto", idProductoValido.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Crea una valoración
        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 4
            }
            """.formatted(idProductoValido);

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        // Ahora debe retornar la valoración
        mockMvc.perform(get("/api/valoraciones/mi-valoracion")
                        .param("idProducto", idProductoValido.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.puntuacion").value(4));
    }

    @Test
    @DisplayName("El ranking mejor valorados refleja media y recuento, y excluye valoraciones inactivas")
    void rankingReflejaMediaYExcluyeInactivas() throws Exception {
        String token1 = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");
        String token2 = generarToken(TEST_SUB_2, "val_test2@example.com", "Segundo Usuario Test");

        // Usuario 1 califica con 4
        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\": " + idProductoValido + ", \"puntuacion\": 4}"))
                .andExpect(status().isCreated());

        // Usuario 2 califica con 5
        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\": " + idProductoValido + ", \"puntuacion\": 5}"))
                .andExpect(status().isCreated());

        // Verificar el ranking
        mockMvc.perform(get("/api/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].promedioPuntuacion").value(4.5))
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].cantidadValoraciones").value(2));

        // Marcar una valoración como inactiva (estado = false)
        var valUsuario1 = valoracionRepository.findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                usuarioRepository.findBySupabaseUid(TEST_SUB).get().getIdUsuario(),
                idProductoValido
        ).orElseThrow();
        valUsuario1.setEstado(false);
        valoracionRepository.saveAndFlush(valUsuario1);

        // Ahora el ranking debe reflejar solo la valoración activa (media = 5.0, cantidad = 1)
        mockMvc.perform(get("/api/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].promedioPuntuacion").value(5.0))
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].cantidadValoraciones").value(1));
    }
}
