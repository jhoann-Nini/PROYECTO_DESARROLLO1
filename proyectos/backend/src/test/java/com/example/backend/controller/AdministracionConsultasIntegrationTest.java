package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
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
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Pruebas de las consultas administrativas de usuarios y roles. */
@SpringBootTest
@Transactional
class AdministracionConsultasIntegrationTest {

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

    private MockMvc mockMvc;
    private Rol rolAdmin;
    private Rol rolUsuario;
    private Rol rolModerador;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) pair.getPublic();
        testPrivateKey = (ECPrivateKey) pair.getPrivate();
        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-admin-consultas-es256-key")
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
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(springSecurity())
                .build();
        rolAdmin = obtenerOCrearRol("Administrador");
        rolUsuario = obtenerOCrearRol("Usuario registrado");
        rolModerador = obtenerOCrearRol("Moderador");
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre(nombre);
            rol.setDescripcion("Rol para pruebas administrativas");
            return rolRepository.save(rol);
        });
    }

    private Usuario crearUsuario(String correo, Rol rolPrincipal, Rol... rolesAdicionales) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Usuario " + correo);
        usuario.setCorreo(correo);
        usuario.setSupabaseUid(UUID.randomUUID().toString());
        usuario.setRol(rolPrincipal);
        usuario.setEstado(true);
        usuario.setFechaRegistro(LocalDateTime.now());

        UsuarioRol asignacionPrincipal = new UsuarioRol();
        asignacionPrincipal.setRol(rolPrincipal);
        asignacionPrincipal.setEstado(true);
        asignacionPrincipal.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(asignacionPrincipal);

        for (Rol rolAdicional : rolesAdicionales) {
            UsuarioRol asignacion = new UsuarioRol();
            asignacion.setRol(rolAdicional);
            asignacion.setEstado(true);
            asignacion.setFechaAsignacion(LocalDateTime.now());
            usuario.agregarRol(asignacion);
        }

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

    @Test
    @DisplayName("Las consultas administrativas anónimas responden 401")
    void consultasAnonimasResponden401() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/roles"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un usuario sin rol Administrador recibe 403 en las consultas administrativas")
    void consultasPorUsuarioOrdinarioResponden403() throws Exception {
        Usuario usuario = crearUsuario("usuario_sin_admin@test.com", rolUsuario);
        String token = "Bearer " + generarToken(usuario);

        mockMvc.perform(get("/api/admin/usuarios").header("Authorization", token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/roles").header("Authorization", token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("El administrador consulta usuarios con sus roles activos y sin datos sensibles")
    void administradorListaUsuariosConRolesActivos() throws Exception {
        crearUsuario("admin_consultas@test.com", rolAdmin);
        crearUsuario("usuario_consulta@test.com", rolUsuario, rolModerador);
        Usuario admin = usuarioRepository.findByCorreo("admin_consultas@test.com").orElseThrow();

        MvcResult result = mockMvc.perform(get("/api/admin/usuarios")
                        .header("Authorization", "Bearer " + generarToken(admin)))
                .andExpect(status().isOk())
                .andReturn();

        String json = result.getResponse().getContentAsString();
        assertThat(json).doesNotContain("password").doesNotContain("supabaseUid");

        JsonNode usuarios = JsonMapper.builder().build().readTree(json);
        JsonNode objetivo = null;
        long coincidencias = 0;
        for (JsonNode usuario : usuarios) {
            if ("usuario_consulta@test.com".equals(usuario.path("correo").asText())) {
                objetivo = usuario;
                coincidencias++;
            }
        }

        assertThat(coincidencias).isEqualTo(1);
        assertThat(objetivo).isNotNull();
        assertThat(objetivo.path("activo").asBoolean()).isTrue();
        assertThat(objetivo.path("roles").isArray()).isTrue();
        assertThat(objetivo.path("roles").toString())
                .contains("Usuario registrado")
                .contains("Moderador");
        assertThat(objetivo.path("rol").asText()).isIn("Usuario registrado", "Moderador");
    }

    @Test
    @DisplayName("La búsqueda administrativa filtra por coincidencia parcial de correo")
    void administradorFiltraUsuariosPorCorreo() throws Exception {
        crearUsuario("admin_filtro@test.com", rolAdmin);
        crearUsuario("usuario_filtro_unico@test.com", rolUsuario);
        Usuario admin = usuarioRepository.findByCorreo("admin_filtro@test.com").orElseThrow();

        MvcResult result = mockMvc.perform(get("/api/admin/usuarios")
                        .param("correo", "FILTRO_UNICO")
                        .header("Authorization", "Bearer " + generarToken(admin)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode usuarios = JsonMapper.builder().build()
                .readTree(result.getResponse().getContentAsString());
        assertThat(usuarios.size()).isEqualTo(1);
        assertThat(usuarios.get(0).path("correo").asText())
                .isEqualTo("usuario_filtro_unico@test.com");
    }

    @Test
    @DisplayName("El administrador consulta el catálogo de roles")
    void administradorListaCatalogoDeRoles() throws Exception {
        Usuario admin = crearUsuario("admin_roles@test.com", rolAdmin);

        mockMvc.perform(get("/api/admin/roles")
                        .header("Authorization", "Bearer " + generarToken(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].nombre", hasItem("Administrador")))
                .andExpect(jsonPath("$[*].nombre", hasItem("Usuario registrado")))
                .andExpect(jsonPath("$[*].nombre", hasItem("Moderador")))
                .andExpect(jsonPath("$[0].idRol").exists())
                .andExpect(jsonPath("$[0].descripcion").exists());
    }
}
