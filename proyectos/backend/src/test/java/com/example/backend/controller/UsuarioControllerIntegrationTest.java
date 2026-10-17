package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
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
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
import org.springframework.web.context.WebApplicationContext;

/**
 * Pruebas de integración de extremo a extremo para el aprovisionamiento JIT (GET /api/usuarios/me).
 *
 * Valida la cadena completa de Spring Security con validación criptográfica ES256,
 * el aprovisionamiento y persistencia en base de datos H2, la protección ante colisiones
 * y ataques de elevación de privilegios, y la recuperación ante accesos concurrentes.
 */
@SpringBootTest
class UsuarioControllerIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";

    private static ECPublicKey testPublicKey;
    private static ECPrivateKey testPrivateKey;
    private static ECKey testJwk;
    private static ECPrivateKey attackerPrivateKey;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    private MockMvc mockMvc;
    private Rol rolDefault;

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

        usuarioRepository.deleteAll();

        this.rolDefault = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Usuario registrado");
            r.setDescripcion("Rol predeterminado para usuarios autenticados");
            return rolRepository.save(r);
        });
    }

    private String generarToken(String sub, String email, Boolean emailVerified,
                                Map<String, Object> userMetadata, ECPrivateKey signingKey) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .audience(TEST_AUDIENCE)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600_000));

        if (sub != null) {
            builder.subject(sub);
        }
        if (email != null) {
            builder.claim("email", email);
        }
        if (emailVerified != null) {
            builder.claim("email_verified", emailVerified);
        }
        if (userMetadata != null) {
            builder.claim("user_metadata", userMetadata);
        }

        SignedJWT signedJWT = new SignedJWT(header, builder.build());
        signedJWT.sign(new ECDSASigner(signingKey));
        return signedJWT.serialize();
    }

    private String tokenValido(String sub, String email, Map<String, Object> metadata) throws Exception {
        return generarToken(sub, email, true, metadata, testPrivateKey);
    }

    // --- 1. Seguridad: Petición sin token y con token inválido ---

    @Test
    @DisplayName("Petición sin token a GET /api/usuarios/me es rechazada con 401 Unauthorized")
    void peticionSinTokenResponde401() throws Exception {
        mockMvc.perform(get("/api/usuarios/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", containsString("Bearer")));
    }

    @Test
    @DisplayName("Petición con token malformado responde 401 Unauthorized")
    void peticionConTokenMalformadoResponde401() throws Exception {
        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Petición con token firmado por clave atacante responde 401 Unauthorized")
    void peticionConFirmaInvalidaResponde401() throws Exception {
        String sub = UUID.randomUUID().toString();
        String tokenFalso = generarToken(sub, "atacante@test.com", true, null, attackerPrivateKey);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + tokenFalso))
                .andExpect(status().isUnauthorized());
    }

    // --- 2. Aprovisionamiento JIT de Usuario Nuevo ---

    @Test
    @DisplayName("Usuario nuevo: aprovisiona perfil en base de datos con rol predeterminado y responde 200 OK")
    void usuarioNuevoConRolPredeterminadoResponde200YPersiste() throws Exception {
        String sub = UUID.randomUUID().toString();
        String email = "juan.perez@tecreview.com";
        Map<String, Object> metadata = Map.of("full_name", "Juan Pérez");

        String token = tokenValido(sub, email, metadata);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Juan Pérez")))
                .andExpect(jsonPath("$.correo", is(email)))
                .andExpect(jsonPath("$.rol", is("Usuario registrado")))
                .andExpect(jsonPath("$.activo", is(true)))
                .andExpect(jsonPath("$.idUsuario").isNumber())
                .andExpect(jsonPath("$.fechaRegistro").isNotEmpty());

        Usuario usuarioEnBd = usuarioRepository.findBySupabaseUid(sub).orElse(null);
        assertThat(usuarioEnBd).isNotNull();
        assertThat(usuarioEnBd.getNombre()).isEqualTo("Juan Pérez");
        assertThat(usuarioEnBd.getCorreo()).isEqualTo(email);
        assertThat(usuarioEnBd.getRol().getNombre()).isEqualTo("Usuario registrado");
        assertThat(usuarioEnBd.getEstado()).isTrue();
        assertThat(usuarioEnBd.getPassword()).isNull();
    }

    // --- 3. Usuario Existente ---

    @Test
    @DisplayName("Usuario existente: responde 200 OK sin duplicar registros en base de datos")
    void usuarioExistenteResponde200SinDuplicar() throws Exception {
        String sub = UUID.randomUUID().toString();
        String email = "existente@tecreview.com";

        Usuario existente = new Usuario();
        existente.setNombre("Usuario Ya Existente");
        existente.setCorreo(email);
        existente.setSupabaseUid(sub);
        existente.setRol(rolDefault);
        existente.setEstado(true);
        existente.setFechaRegistro(LocalDateTime.now().minusDays(10));
        usuarioRepository.save(existente);

        long countAntes = usuarioRepository.count();

        String token = tokenValido(sub, email, null);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Usuario Ya Existente")))
                .andExpect(jsonPath("$.correo", is(email)))
                .andExpect(jsonPath("$.rol", is("Usuario registrado")));

        assertThat(usuarioRepository.count()).isEqualTo(countAntes);
    }

    // --- 4. Zero-Trust: Intento de elevación de privilegios en user_metadata ---

    @Test
    @DisplayName("Metadatos con intento de rol administrativo: asigna estrictamente 'Usuario registrado'")
    void metadatosConRolAdministrativoSonIgnorados() throws Exception {
        String sub = UUID.randomUUID().toString();
        String email = "hacker@test.com";
        Map<String, Object> maliciousMetadata = Map.of(
                "full_name", "Hacker",
                "role", "admin",
                "roles", List.of("ADMIN", "SUPERUSER")
        );

        String token = tokenValido(sub, email, maliciousMetadata);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol", is("Usuario registrado")));

        Usuario guardado = usuarioRepository.findBySupabaseUid(sub).orElseThrow();
        assertThat(guardado.getRol().getNombre()).isEqualTo("Usuario registrado");
    }

    // --- 5. Validaciones de sub y email ---

    @Test
    @DisplayName("Claim sub ausente o no UUID responde 400 Bad Request")
    void subInvalidoResponde400() throws Exception {
        String tokenSubNoUuid = generarToken("not-a-valid-uuid", "user@test.com", true, null, testPrivateKey);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + tokenSubNoUuid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("UUID válido")));
    }

    @Test
    @DisplayName("Claim email ausente o inválido responde 400 Bad Request")
    void emailInvalidoResponde400() throws Exception {
        String sub = UUID.randomUUID().toString();
        String tokenSinEmail = generarToken(sub, null, true, null, testPrivateKey);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + tokenSinEmail))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("claim 'email'")));
    }

    // --- 6. Cuenta Histórica Sin Vincular ---

    @Test
    @DisplayName("Cuenta histórica con el mismo correo y sin supabase_uid devuelve 409 Conflict")
    void cuentaHistoricaConMismoCorreoResponde409Conflict() throws Exception {
        String email = "historico@tecreview.com";

        Usuario cuentaHistorica = new Usuario();
        cuentaHistorica.setNombre("Cuenta Antigua");
        cuentaHistorica.setCorreo(email);
        cuentaHistorica.setSupabaseUid(null); // Sin vincular a Supabase
        cuentaHistorica.setRol(rolDefault);
        cuentaHistorica.setEstado(true);
        usuarioRepository.save(cuentaHistorica);

        String sub = UUID.randomUUID().toString();
        String tokenNuevo = tokenValido(sub, email, null);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + tokenNuevo))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("sin vinculación segura")));
    }

    // --- 7. Verificación de Correo (email_verified) ---

    @Test
    @DisplayName("Token con email_verified=false explícito es rechazado con 403 Forbidden")
    void correoNoVerificadoResponde403Forbidden() throws Exception {
        String sub = UUID.randomUUID().toString();
        String email = "unverified@tecreview.com";

        String token = generarToken(sub, email, false, null, testPrivateKey);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("no ha sido verificado")));
    }

    @Test
    @DisplayName("Token sin claim email_verified permite el aprovisionamiento (comportamiento estándar Supabase)")
    void tokenSinClaimEmailVerifiedPermiteAprovisionamiento() throws Exception {
        String sub = UUID.randomUUID().toString();
        String email = "standard-supabase@tecreview.com";

        String token = generarToken(sub, email, null, null, testPrivateKey);

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo", is(email)));
    }

    // --- 8. Concurrencia y Recuperación ante Conflicto ---

    @Test
    @DisplayName("Concurrencia: Peticiones paralelas simultáneas con el mismo sub crean exactamente un usuario y responden 200 OK")
    void peticionesConcurrentesMismoSubCreanUnSoloUsuario() throws Exception {
        String sub = UUID.randomUUID().toString();
        String email = "concurrente@tecreview.com";
        String token = tokenValido(sub, email, Map.of("full_name", "Usuario Paralelo"));

        int hilos = 5;
        ExecutorService executor = Executors.newFixedThreadPool(hilos);
        List<Callable<Integer>> tasks = new ArrayList<>();

        for (int i = 0; i < hilos; i++) {
            tasks.add(() -> {
                MvcResult result = mockMvc.perform(get("/api/usuarios/me")
                        .header("Authorization", "Bearer " + token))
                        .andReturn();
                return result.getResponse().getStatus();
            });
        }

        List<Future<Integer>> futures = executor.invokeAll(tasks);
        executor.shutdown();

        for (Future<Integer> f : futures) {
            assertThat(f.get()).isEqualTo(200);
        }

        List<Usuario> usuarios = usuarioRepository.findAll().stream()
                .filter(u -> sub.equals(u.getSupabaseUid()))
                .toList();

        assertThat(usuarios).hasSize(1);
        assertThat(usuarios.get(0).getNombre()).isEqualTo("Usuario Paralelo");
        assertThat(usuarios.get(0).getCorreo()).isEqualTo(email);
    }
}
