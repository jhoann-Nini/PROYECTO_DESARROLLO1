package com.example.backend.config;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
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
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Date;
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

/**
 * Pruebas de integración de seguridad que atraviesan la cadena real de filtros de Spring Security.
 *
 * Valida la autenticación criptográfica ES256 contra un par de claves EC local,
 * las reglas de acceso público y protegido, y las cabeceras CORS de Authorization.
 */
@SpringBootTest
@Transactional
class SeguridadJwtIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";
    private static final String ALLOWED_ORIGIN = "http://localhost:3000";

    private static ECPublicKey testPublicKey;
    private static ECPrivateKey testPrivateKey;
    private static ECKey testJwk;

    private static ECPrivateKey attackerPrivateKey;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    private MockMvc mockMvc;
    private Long idCategoriaValida;
    private Long idMarcaValida;

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

        KeyPair attackerKeyPair = kpg.generateKeyPair();
        attackerPrivateKey = (ECPrivateKey) attackerKeyPair.getPrivate();
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
        cat.setNombre("Categoria Test " + System.nanoTime());
        this.idCategoriaValida = categoriaRepository.save(cat).getIdCategoria();

        Marca marca = new Marca();
        marca.setNombre("Marca Test " + System.nanoTime());
        this.idMarcaValida = marcaRepository.save(marca).getIdMarca();
    }

    private String generarToken(String issuer, String audience, Date expiration, ECPrivateKey signingKey) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject("usr_test_supabase_sub_12345")
                .issueTime(new Date())
                .expirationTime(expiration);

        if (audience != null) {
            builder.audience(audience);
        }

        SignedJWT signedJWT = new SignedJWT(header, builder.build());
        signedJWT.sign(new ECDSASigner(signingKey));
        return signedJWT.serialize();
    }

    private String generarTokenValido() throws Exception {
        return generarToken(TEST_ISSUER, TEST_AUDIENCE, new Date(System.currentTimeMillis() + 3600_000), testPrivateKey);
    }

    private String buildProductoJson(String nombre) {
        return """
            {
                "nombre": "%s",
                "descripcion": "Descripción de prueba",
                "idCategoria": %d,
                "idMarca": %d,
                "precioReferencia": 150.00
            }
            """.formatted(nombre, idCategoriaValida, idMarcaValida);
    }

    // --- 1. Endpoints Públicos sin token ---

    @Test
    @DisplayName("GET /api/productos sin credenciales responde 200 OK")
    void getPublicoProductosSinTokenResponde200() throws Exception {
        mockMvc.perform(get("/api/productos"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/health sin credenciales responde 200 OK")
    void getPublicoHealthSinTokenResponde200() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    // --- 2. Endpoints Protegidos sin token (401) ---

    @Test
    @DisplayName("POST /api/productos sin token responde 401 Unauthorized")
    void postProtegidoSinTokenResponde401() throws Exception {
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto sin token")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", containsString("Bearer")));
    }

    @Test
    @DisplayName("PUT /api/categorias/1 sin token responde 401 Unauthorized")
    void putProtegidoSinTokenResponde401() throws Exception {
        mockMvc.perform(put("/api/categorias/" + idCategoriaValida)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\": \"Cat Modificada\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DELETE /api/marcas/1 sin token responde 401 Unauthorized")
    void deleteProtegidoSinTokenResponde401() throws Exception {
        mockMvc.perform(delete("/api/marcas/" + idMarcaValida))
                .andExpect(status().isUnauthorized());
    }

    // --- 3. Tokens Inválidos (401) ---

    @Test
    @DisplayName("Solicitud con token malformado responde 401 Unauthorized")
    void tokenMalformadoResponde401() throws Exception {
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer este-no-es-un-jwt-valido")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Malformado")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Solicitud con token firmado por clave EC distinta (firma inválida) responde 401 Unauthorized")
    void tokenFirmaInvalidaResponde401() throws Exception {
        String tokenFalso = generarToken(TEST_ISSUER, TEST_AUDIENCE, new Date(System.currentTimeMillis() + 3600_000), attackerPrivateKey);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenFalso)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Firma Invalida")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Solicitud con token ES256 expirado responde 401 Unauthorized")
    void tokenExpiradoResponde401() throws Exception {
        String tokenExpirado = generarToken(TEST_ISSUER, TEST_AUDIENCE, new Date(System.currentTimeMillis() - 60_000), testPrivateKey);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenExpirado)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Expirado")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Solicitud con emisor (iss) no coincidente responde 401 Unauthorized")
    void tokenEmisorInvalidoResponde401() throws Exception {
        String tokenOtroEmisor = generarToken("https://otro-proyecto.supabase.co/auth/v1", TEST_AUDIENCE, new Date(System.currentTimeMillis() + 3600_000), testPrivateKey);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenOtroEmisor)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Otro Emisor")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Solicitud con audiencia (aud) no coincidente responde 401 Unauthorized")
    void tokenAudienciaInvalidaResponde401() throws Exception {
        String tokenOtraAudiencia = generarToken(TEST_ISSUER, "otra-audiencia-no-autorizada", new Date(System.currentTimeMillis() + 3600_000), testPrivateKey);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenOtraAudiencia)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Otra Audiencia")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Solicitud con token sin claim de audiencia (aud) es rechazada con 401 Unauthorized")
    void tokenSinAudienciaResponde401() throws Exception {
        String tokenSinAud = generarToken(TEST_ISSUER, null, new Date(System.currentTimeMillis() + 3600_000), testPrivateKey);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenSinAud)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Sin Audiencia")))
                .andExpect(status().isUnauthorized());
    }

    // --- 4. Token ES256 Válido Atraviesa Seguridad ---

    @Test
    @DisplayName("Solicitud con token ES256 válido atraviesa la autenticación y crea el recurso (201 Created)")
    void tokenEs256ValidoAtraviesaSeguridad() throws Exception {
        String tokenValido = generarTokenValido();

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenValido)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto ES256 Exitoso")))
                .andExpect(status().isCreated());
    }

    // --- 5. CORS y Preflight con Authorization ---

    @Test
    @DisplayName("Preflight OPTIONS con origen autorizado y cabecera Authorization responde 200 OK con cabeceras CORS")
    void preflightCorsConAuthorizationYContentType() throws Exception {
        mockMvc.perform(options("/api/productos")
                .header("Origin", ALLOWED_ORIGIN)
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization, Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("Authorization")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("Content-Type")));
    }

    @Test
    @DisplayName("Preflight OPTIONS con origen no autorizado es rechazado (403 Forbidden)")
    void preflightCorsOrigenNoPermitidoRechazado() throws Exception {
        mockMvc.perform(options("/api/productos")
                .header("Origin", "http://sitio-malicioso.com")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isForbidden());
    }

    // --- 6. Validación Estricta de Configuración de Audiencia ---

    @Test
    @DisplayName("createJwtValidator lanza IllegalArgumentException si la audiencia requerida es nula, vacía o en blanco")
    void createJwtValidatorConAudienciaVaciaLanzaExcepcion() {
        assertThrows(IllegalArgumentException.class, () ->
            SecurityConfig.createJwtValidator(TEST_ISSUER, null)
        );
        assertThrows(IllegalArgumentException.class, () ->
            SecurityConfig.createJwtValidator(TEST_ISSUER, "")
        );
        assertThrows(IllegalArgumentException.class, () ->
            SecurityConfig.createJwtValidator(TEST_ISSUER, "   ")
        );
    }

    @Test
    @DisplayName("SecurityConfig falla si la propiedad de audiencia requerida está vacía en producción")
    void securityConfigSinAudienciaFallaAlInicializar() {
        SecurityConfig configVacia = new SecurityConfig();
        assertThrows(IllegalStateException.class, configVacia::jwtDecoder);
        assertThrows(IllegalStateException.class, configVacia::validateConfiguration);
    }
}
