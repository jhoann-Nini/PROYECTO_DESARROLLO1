package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.RolRepository;
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
import java.util.Map;
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
 * Suite integral de pruebas 403 para la historia TEC-128 (HU-S2-15 — Tienda verificada / S2-77: Pruebas 403 / TEC-154).
 *
 * Valida de forma exhaustiva la matriz de autorización:
 * 1. Intentos de creación, actualización y eliminación de tiendas/establecimientos (/api/establecimientos/**)
 *    por cuentas sin rol 'Administrador' son rechazados con HTTP 403 Forbidden (y 401 para anónimos).
 * 2. Intentos de gestión de establecimientos desde las rutas de representante (/api/representante/**)
 *    por usuarios ordinarios, moderadores o cuentas suspendidas son rechazados con HTTP 403 Forbidden.
 * 3. Intentos de acceso a la gestión y consulta administrativa (/api/admin/**)
 *    por usuarios ordinarios, moderadores o representantes son rechazados con HTTP 403 Forbidden.
 * 4. Inmutabilidad y Fail-Closed: los recursos en base de datos permanecen estrictamente inalterados ante cada 403.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TiendaVerificada403IntegrationTest {

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
    private EstablecimientoRepository establecimientoRepository;

    @Autowired
    private UsuarioRolRepository usuarioRolRepository;

    private MockMvc mockMvc;
    private Rol rolAdmin;
    private Rol rolModerador;
    private Rol rolRepresentante;
    private Rol rolUsuario;

    private Establecimiento tiendaExistente;

    private final String payloadCreacion = """
            {
              "nombre": "Nueva Tienda Intento No Autorizado",
              "direccion": "Calle Falsa 123",
              "telefono": "3119999999",
              "correo": "noautorizado@tienda.com",
              "descripcion": "Intento de registro sin privilegios administrativos",
              "latitud": 4.123456,
              "longitud": -76.654321
            }
            """;

    private final String payloadActualizacion = """
            {
              "nombre": "Nombre Modificado Sin Autorización",
              "direccion": "Dirección Alterada",
              "telefono": "3000000000",
              "correo": "hack@tienda.com",
              "descripcion": "Intento de modificación no autorizada",
              "latitud": 1.0,
              "longitud": -1.0
            }
            """;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) pair.getPublic();
        testPrivateKey = (ECPrivateKey) pair.getPrivate();
        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-tienda-verificada-403-key")
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

        tiendaExistente = new Establecimiento();
        tiendaExistente.setNombre("Tienda Oficial Verificada");
        tiendaExistente.setDireccion("Avenida Central # 123");
        tiendaExistente.setTelefono("3001234567");
        tiendaExistente.setCorreo("contacto@tiendaoficial.com");
        tiendaExistente.setDescripcion("Tienda certificada en el catálogo");
        tiendaExistente.setLatitud(new BigDecimal("3.451600"));
        tiendaExistente.setLongitud(new BigDecimal("-76.532000"));
        tiendaExistente.setEstado(true);
        tiendaExistente = establecimientoRepository.saveAndFlush(tiendaExistente);
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre(nombre);
            r.setDescripcion("Rol " + nombre + " para pruebas 403");
            return rolRepository.save(r);
        });
    }

    private Usuario crearUsuario(String correo, Rol rol, boolean activo) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Usuario " + rol.getNombre());
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

    private String generarToken(String supabaseUid, String email) throws Exception {
        return generarToken(supabaseUid, email, null);
    }

    private String generarToken(String supabaseUid, String email, Map<String, Object> extraClaims) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .subject(supabaseUid)
                .audience(TEST_AUDIENCE)
                .claim("email", email)
                .claim("email_verified", true)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600000));

        if (extraClaims != null) {
            extraClaims.forEach(builder::claim);
        }

        SignedJWT jwt = new SignedJWT(header, builder.build());
        jwt.sign(new ECDSASigner(testPrivateKey));
        return jwt.serialize();
    }

    private String tokenDeUsuario(Usuario usuario) throws Exception {
        return generarToken(usuario.getSupabaseUid(), usuario.getCorreo());
    }

    private void verificarTiendaIntacta() {
        Establecimiento tienda = establecimientoRepository.findById(tiendaExistente.getIdEstablecimiento()).orElseThrow();
        assertThat(tienda.getNombre()).isEqualTo("Tienda Oficial Verificada");
        assertThat(tienda.getDireccion()).isEqualTo("Avenida Central # 123");
        assertThat(tienda.getTelefono()).isEqualTo("3001234567");
        assertThat(tienda.getCorreo()).isEqualTo("contacto@tiendaoficial.com");
        assertThat(tienda.getEstado()).isTrue();
    }

    // =========================================================================
    // 1. Matriz de rechazo 403 en creación de tiendas (POST /api/establecimientos)
    // =========================================================================

    @Test
    @DisplayName("S2-77-01: Petición anónima en creación de tienda responde 401 Unauthorized")
    void creacionAnonimaResponde401() throws Exception {
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isUnauthorized());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("S2-77-02: Usuario registrado estándar en POST tienda recibe 403 Forbidden")
    void usuarioRegistradoRecibe403EnCreacion() throws Exception {
        Usuario usuario = crearUsuario("usuario_std_post@test.com", rolUsuario, true);
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(usuario))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("S2-77-03: Moderador en POST tienda recibe 403 Forbidden (la moderación no confiere alta de tiendas)")
    void moderadorRecibe403EnCreacion() throws Exception {
        Usuario moderador = crearUsuario("moderador_post@test.com", rolModerador, true);
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(moderador))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("S2-77-04: Representante de establecimiento en POST tienda recibe 403 Forbidden (solo administra sus asignadas)")
    void representanteRecibe403EnCreacionGlobal() throws Exception {
        Usuario representante = crearUsuario("representante_post@test.com", rolRepresentante, true);
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(representante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("S2-77-05: Usuario con cuenta suspendida/inactiva en POST tienda recibe 403 Forbidden")
    void cuentaSuspendidaRecibe403EnCreacion() throws Exception {
        Usuario suspendido = crearUsuario("admin_suspendido_post@test.com", rolAdmin, false);
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(suspendido))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("S2-77-06: Token JWT válido pero sin registro de usuario en BD en POST tienda recibe 403 Forbidden")
    void tokenSinUsuarioEnBdRecibe403EnCreacion() throws Exception {
        String token = generarToken(UUID.randomUUID().toString(), "fantasma@test.com");
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("S2-77-07: Intento de spoofing con claims falsos en metadata de JWT en POST tienda recibe 403 Forbidden")
    void spoofingDeClaimsFalsosRecibe403EnCreacion() throws Exception {
        Usuario usuario = crearUsuario("usuario_spoofing@test.com", rolUsuario, true);
        Map<String, Object> fakeClaims = Map.of(
                "role", "Administrador",
                "user_metadata", Map.of("role", "Administrador")
        );
        String tokenSpoofed = generarToken(usuario.getSupabaseUid(), usuario.getCorreo(), fakeClaims);
        long totalAntes = establecimientoRepository.count();

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + tokenSpoofed)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadCreacion))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.count()).isEqualTo(totalAntes);
    }

    // =========================================================================
    // 2. Matriz de rechazo 403 en actualización de tiendas (PUT /api/establecimientos/{id})
    // =========================================================================

    @Test
    @DisplayName("S2-77-08: Petición anónima en PUT tienda responde 401 Unauthorized")
    void actualizacionAnonimaResponde401() throws Exception {
        mockMvc.perform(put("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadActualizacion))
                .andExpect(status().isUnauthorized());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-09: Usuario registrado estándar en PUT tienda recibe 403 Forbidden")
    void usuarioRegistradoRecibe403EnActualizacion() throws Exception {
        Usuario usuario = crearUsuario("usuario_std_put@test.com", rolUsuario, true);

        mockMvc.perform(put("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(usuario))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadActualizacion))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-10: Moderador en PUT tienda recibe 403 Forbidden")
    void moderadorRecibe403EnActualizacion() throws Exception {
        Usuario moderador = crearUsuario("moderador_put@test.com", rolModerador, true);

        mockMvc.perform(put("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(moderador))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadActualizacion))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-11: Representante en PUT administrativo global de tienda recibe 403 Forbidden")
    void representanteRecibe403EnActualizacionGlobal() throws Exception {
        Usuario representante = crearUsuario("representante_put@test.com", rolRepresentante, true);

        mockMvc.perform(put("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(representante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadActualizacion))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-12: Usuario suspendido en PUT tienda recibe 403 Forbidden")
    void suspendidoRecibe403EnActualizacion() throws Exception {
        Usuario suspendido = crearUsuario("admin_suspendido_put@test.com", rolAdmin, false);

        mockMvc.perform(put("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(suspendido))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadActualizacion))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    // =========================================================================
    // 3. Matriz de rechazo 403 en eliminación lógica de tiendas (DELETE /api/establecimientos/{id})
    // =========================================================================

    @Test
    @DisplayName("S2-77-13: Petición anónima en DELETE tienda responde 401 Unauthorized")
    void eliminacionAnonimaResponde401() throws Exception {
        mockMvc.perform(delete("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento()))
                .andExpect(status().isUnauthorized());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-14: Usuario registrado estándar en DELETE tienda recibe 403 Forbidden")
    void usuarioRegistradoRecibe403EnEliminacion() throws Exception {
        Usuario usuario = crearUsuario("usuario_std_del@test.com", rolUsuario, true);

        mockMvc.perform(delete("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(usuario)))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-15: Moderador en DELETE tienda recibe 403 Forbidden")
    void moderadorRecibe403EnEliminacion() throws Exception {
        Usuario moderador = crearUsuario("moderador_del@test.com", rolModerador, true);

        mockMvc.perform(delete("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(moderador)))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-16: Representante en DELETE administrativo recibe 403 Forbidden")
    void representanteRecibe403EnEliminacion() throws Exception {
        Usuario representante = crearUsuario("representante_del@test.com", rolRepresentante, true);

        mockMvc.perform(delete("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(representante)))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    @Test
    @DisplayName("S2-77-17: Usuario suspendido en DELETE tienda recibe 403 Forbidden")
    void suspendidoRecibe403EnEliminacion() throws Exception {
        Usuario suspendido = crearUsuario("admin_suspendido_del@test.com", rolAdmin, false);

        mockMvc.perform(delete("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(suspendido)))
                .andExpect(status().isForbidden());

        verificarTiendaIntacta();
    }

    // =========================================================================
    // 4. Matriz de rechazo 403 en rutas de representante (/api/representante/**)
    // =========================================================================

    @Test
    @DisplayName("S2-77-18: Usuario ordinario en GET /api/representante/establecimientos recibe 403 Forbidden")
    void usuarioOrdinarioListarRecibe403() throws Exception {
        Usuario usuario = crearUsuario("usuario_rep_get@test.com", rolUsuario, true);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(usuario)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-77-19: Moderador en GET /api/representante/establecimientos recibe 403 Forbidden")
    void moderadorListarRecibe403() throws Exception {
        Usuario moderador = crearUsuario("moderador_rep_get@test.com", rolModerador, true);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(moderador)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-77-20: Representante con rol revocado (estado = false en usuario_rol) recibe 403 Forbidden")
    void representanteConRolRevocadoRecibe403() throws Exception {
        Usuario representante = crearUsuario("rep_revocado@test.com", rolRepresentante, true);
        UsuarioRol asignacion = representante.getRoles().get(0);
        asignacion.setEstado(false);
        usuarioRolRepository.saveAndFlush(asignacion);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(representante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-77-21: Representante con cuenta suspendida recibe 403 Forbidden")
    void representanteCuentaSuspendidaRecibe403() throws Exception {
        Usuario representante = crearUsuario("rep_suspendido@test.com", rolRepresentante, false);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(representante)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-77-22: Usuario ordinario en PUT /api/representante/establecimientos/{id} recibe 403 Forbidden")
    void usuarioOrdinarioPutRecibe403() throws Exception {
        Usuario usuario = crearUsuario("usuario_rep_put@test.com", rolUsuario, true);

        mockMvc.perform(put("/api/representante/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(usuario))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Nombre No Permitido"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 5. Matriz de rechazo 403 en gestión administrativa de roles y tiendas (/api/admin/**)
    // =========================================================================

    @Test
    @DisplayName("S2-77-23: Usuario registrado en GET /api/admin/roles recibe 403 Forbidden")
    void usuarioOrdinarioRolesRecibe403() throws Exception {
        Usuario usuario = crearUsuario("usr_admin_roles@test.com", rolUsuario, true);

        mockMvc.perform(get("/api/admin/roles")
                        .header("Authorization", "Bearer " + tokenDeUsuario(usuario)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-77-24: Moderador en GET /api/admin/usuarios recibe 403 Forbidden")
    void moderadorUsuariosRecibe403() throws Exception {
        Usuario moderador = crearUsuario("mod_admin_users@test.com", rolModerador, true);

        mockMvc.perform(get("/api/admin/usuarios")
                        .header("Authorization", "Bearer " + tokenDeUsuario(moderador)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("S2-77-25: Representante en asignación administrativa POST /api/admin/representantes recibe 403 Forbidden")
    void representanteAsignacionRecibe403() throws Exception {
        Usuario representante = crearUsuario("rep_admin_post@test.com", rolRepresentante, true);

        mockMvc.perform(post("/api/admin/representantes")
                        .header("Authorization", "Bearer " + tokenDeUsuario(representante))
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
    // 6. Contraste Positivo: Administrador activo tiene acceso pleno
    // =========================================================================

    @Test
    @DisplayName("S2-77-26: Administrador activo crea tienda con 201 Created")
    void administradorCreaTiendaExitosamente() throws Exception {
        Usuario admin = crearUsuario("admin_autorizado@test.com", rolAdmin, true);

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + tokenDeUsuario(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda Verificada Oficial Admin",
                                  "direccion": "Calle Principal 100",
                                  "telefono": "3150001122",
                                  "correo": "admin@tienda.com",
                                  "descripcion": "Verificación completada por administrador"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Tienda Verificada Oficial Admin"))
                .andExpect(jsonPath("$.estado").value(true));
    }

    @Test
    @DisplayName("S2-77-27: Administrador activo actualiza tienda con 200 OK")
    void administradorActualizaTiendaExitosamente() throws Exception {
        Usuario admin = crearUsuario("admin_actualiza@test.com", rolAdmin, true);

        mockMvc.perform(put("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda Oficial Verificada Actualizada",
                                  "direccion": "Avenida Central # 123 Modificada",
                                  "telefono": "3001234567",
                                  "correo": "contacto@tiendaoficial.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Tienda Oficial Verificada Actualizada"));
    }

    @Test
    @DisplayName("S2-77-28: Administrador activo elimina lógicamente tienda con 204 No Content")
    void administradorEliminaTiendaExitosamente() throws Exception {
        Usuario admin = crearUsuario("admin_elimina@test.com", rolAdmin, true);

        mockMvc.perform(delete("/api/establecimientos/" + tiendaExistente.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + tokenDeUsuario(admin)))
                .andExpect(status().isNoContent());

        Establecimiento tienda = establecimientoRepository.findById(tiendaExistente.getIdEstablecimiento()).orElseThrow();
        assertThat(tienda.getEstado()).isFalse();
    }
}
