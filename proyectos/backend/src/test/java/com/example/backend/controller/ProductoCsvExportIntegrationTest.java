package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Date;
import java.util.LinkedHashMap;
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
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@Transactional
class ProductoCsvExportIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";
    private static final String ADMIN_SUB = java.util.UUID.randomUUID().toString();
    private static final String USER_SUB = java.util.UUID.randomUUID().toString();
    private static final String INACTIVE_ADMIN_SUB = java.util.UUID.randomUUID().toString();

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

    private MockMvc mockMvc;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) kp.getPublic();
        testPrivateKey = (ECPrivateKey) kp.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-es256-export-key")
                .algorithm(JWSAlgorithm.ES256)
                .keyUse(KeyUse.SIGNATURE)
                .build();
    }

    @TestConfiguration
    static class TestSecurityConfig {
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

    private String generarToken(String sub) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .audience(TEST_AUDIENCE)
                .subject(sub)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600_000))
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claims);
        signedJWT.sign(new ECDSASigner(testPrivateKey));
        return signedJWT.serialize();
    }

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac)
                .apply(springSecurity())
                .build();

        Rol rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol administrativo");
            return rolRepository.save(r);
        });

        Rol rolUsuario = rolRepository.findByNombre("Usuario").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Usuario");
            r.setDescripcion("Usuario regular");
            return rolRepository.save(r);
        });

        Usuario admin = new Usuario();
        admin.setNombre("Admin CSV Test");
        admin.setCorreo("admin.csv@tecreview.com");
        admin.setSupabaseUid(ADMIN_SUB);
        admin.setRol(rolAdmin);
        admin.setEstado(true);
        usuarioRepository.save(admin);

        Usuario user = new Usuario();
        user.setNombre("Usuario Regular Test");
        user.setCorreo("user.csv@tecreview.com");
        user.setSupabaseUid(USER_SUB);
        user.setRol(rolUsuario);
        user.setEstado(true);
        usuarioRepository.save(user);

        Usuario inactiveAdmin = new Usuario();
        inactiveAdmin.setNombre("Admin Inactivo");
        inactiveAdmin.setCorreo("admin.inactivo@tecreview.com");
        inactiveAdmin.setSupabaseUid(INACTIVE_ADMIN_SUB);
        inactiveAdmin.setRol(rolAdmin);
        inactiveAdmin.setEstado(false);
        usuarioRepository.save(inactiveAdmin);
    }

    @Test
    @DisplayName("GET /api/productos/exportar-csv sin credenciales devuelve 401 Unauthorized")
    void exportarCsvSinTokenDevuelve401() throws Exception {
        mockMvc.perform(get("/api/productos/exportar-csv"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", containsString("Bearer")));
    }

    @Test
    @DisplayName("GET /api/productos/exportar-csv con rol Usuario regular devuelve 403 Forbidden")
    void exportarCsvConRolUsuarioDevuelve403() throws Exception {
        String tokenUser = generarToken(USER_SUB);

        mockMvc.perform(get("/api/productos/exportar-csv")
                .header("Authorization", "Bearer " + tokenUser))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/productos/exportar-csv con administrador inactivo devuelve 403 Forbidden")
    void exportarCsvConAdminInactivoDevuelve403() throws Exception {
        String tokenInactive = generarToken(INACTIVE_ADMIN_SUB);

        mockMvc.perform(get("/api/productos/exportar-csv")
                .header("Authorization", "Bearer " + tokenInactive))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/productos/exportar-csv con administrador autorizado devuelve 200 OK y CSV válido")
    void exportarCsvConAdminAutorizadoDevuelve200YCsvValido() throws Exception {
        Categoria cat = new Categoria();
        cat.setNombre("Portátiles y Ultrabooks");
        cat = categoriaRepository.save(cat);

        Marca marca = new Marca();
        marca.setNombre("Dell, Inc.");
        marca = marcaRepository.save(marca);

        Producto prod = new Producto();
        prod.setNombre("Dell XPS 13 \"Plus\"");
        prod.setCategoria(cat);
        prod.setMarca(marca);
        prod.setImagen("https://cdn.ejemplo.com/xps13.jpg");
        prod.setPrecioReferencia(new BigDecimal("1499.50"));
        prod.setEstado(true);

        Map<String, Object> specs = new LinkedHashMap<>();
        specs.put("procesador", "Intel Core Ultra 7");
        specs.put("pantalla", "13.4\" OLED, 3K");
        prod.setCaracteristicas(specs);
        productoRepository.save(prod);

        String tokenAdmin = generarToken(ADMIN_SUB);

        MvcResult result = mockMvc.perform(get("/api/productos/exportar-csv")
                .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", containsString("attachment; filename=\"catalogo_productos_")))
                .andExpect(header().string("Content-Disposition", containsString(".csv\"")))
                .andReturn();

        byte[] contentBytes = result.getResponse().getContentAsByteArray();
        assertNotNull(contentBytes);
        assertTrue(contentBytes.length >= 3);

        // Validar BOM UTF-8 (0xEF, 0xBB, 0xBF)
        assertEquals((byte) 0xEF, contentBytes[0]);
        assertEquals((byte) 0xBB, contentBytes[1]);
        assertEquals((byte) 0xBF, contentBytes[2]);

        String csvString = new String(contentBytes, 3, contentBytes.length - 3, StandardCharsets.UTF_8);
        assertTrue(csvString.startsWith("id_producto,nombre,categoria,marca,imagen_url,precio_referencia,caracteristicas_json"));
        assertTrue(csvString.contains("\"Dell XPS 13 \"\"Plus\"\"\""));
        assertTrue(csvString.contains("Portátiles y Ultrabooks"));
        assertTrue(csvString.contains("\"Dell, Inc.\""));
        assertTrue(csvString.contains("Intel Core Ultra 7"));
        assertTrue(csvString.contains("OLED, 3K"));
    }
}
