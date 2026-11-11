package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.AuditoriaUsuarioEstablecimiento;
import com.example.backend.entity.AuditoriaUsuarioRol;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioEstablecimiento;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.AuditoriaUsuarioEstablecimientoRepository;
import com.example.backend.repository.AuditoriaUsuarioRolRepository;
import com.example.backend.repository.EstablecimientoRepository;
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
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.web.context.WebApplicationContext;

/**
 * Suite integral de pruebas para los cuatro endpoints de asignación y revocación
 * de roles y representación de establecimientos (/api/admin/**).
 *
 * Valida la matriz completa de roles:
 * - Sin autenticación (401 Unauthorized).
 * - Roles no administrativos: Usuario registrado, Moderador, Representante (403 Forbidden).
 * - Administrador activo: Asignación, revocación y auditoría (201 Created / 204 No Content).
 * - Conflicto por última asignación de administrador (409 Conflict).
 * - Multirrol y estados revocados/inactivos.
 */
@SpringBootTest
class AdministracionAsignacionesIntegrationTest {

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

    @Autowired
    private UsuarioEstablecimientoRepository usuarioEstablecimientoRepository;

    @Autowired
    private AuditoriaUsuarioRolRepository auditoriaUsuarioRolRepository;

    @Autowired
    private AuditoriaUsuarioEstablecimientoRepository auditoriaUsuarioEstablecimientoRepository;

    private MockMvc mockMvc;

    private Rol rolAdmin;
    private Rol rolUsuario;
    private Rol rolModerador;
    private Rol rolRepresentante;
    private Establecimiento establecimientoTest;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair testKeyPair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) testKeyPair.getPublic();
        testPrivateKey = (ECPrivateKey) testKeyPair.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-admin-assign-es256-key")
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

        limpiarBaseDeDatos();

        this.rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol Administrador");
            return rolRepository.save(r);
        });

        this.rolUsuario = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Usuario registrado");
            r.setDescripcion("Rol Usuario");
            return rolRepository.save(r);
        });

        this.rolModerador = rolRepository.findByNombre("Moderador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Moderador");
            r.setDescripcion("Rol Moderador");
            return rolRepository.save(r);
        });

        this.rolRepresentante = rolRepository.findByNombre("Representante de establecimiento").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Representante de establecimiento");
            r.setDescripcion("Rol Representante");
            return rolRepository.save(r);
        });

        Establecimiento est = new Establecimiento();
        est.setNombre("Tienda Test Integracion");
        est.setDireccion("Calle Test 123");
        est.setTelefono("3001234567");
        est.setCorreo("tienda@test.com");
        est.setEstado(true);
        this.establecimientoTest = establecimientoRepository.save(est);
    }

    @AfterEach
    void tearDown() {
        limpiarBaseDeDatos();
    }

    private void limpiarBaseDeDatos() {
        auditoriaUsuarioEstablecimientoRepository.deleteAll();
        auditoriaUsuarioRolRepository.deleteAll();
        usuarioEstablecimientoRepository.deleteAll();
        usuarioRolRepository.deleteAll();
        establecimientoRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    private String generarToken(String sub, String email) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .audience(TEST_AUDIENCE)
                .subject(sub)
                .claim("email", email)
                .claim("email_verified", true)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600_000))
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claimsSet);
        signedJWT.sign(new ECDSASigner(testPrivateKey));
        return signedJWT.serialize();
    }

    private Usuario crearUsuarioConRol(String sub, String email, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre("Usuario " + rol.getNombre());
        u.setCorreo(email);
        u.setSupabaseUid(sub);
        u.setRol(rol);
        u.setEstado(true);
        u.setFechaRegistro(LocalDateTime.now());

        UsuarioRol ur = new UsuarioRol();
        ur.setRol(rol);
        ur.setEstado(true);
        ur.setFechaAsignacion(LocalDateTime.now());
        u.agregarRol(ur);

        return usuarioRepository.save(u);
    }

    // --- 1. Escrituras anónimas sin token responden 401 en los cuatro endpoints ---

    @Test
    @DisplayName("P1: Solicitudes anónimas sin token a los 4 endpoints responden 401 Unauthorized")
    void solicitudesAnonimasResponden401() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios/1/roles/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/admin/usuarios/1/roles/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/admin/usuarios/1/establecimientos/1/representacion"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/admin/usuarios/1/establecimientos/1/representacion"))
                .andExpect(status().isUnauthorized());
    }

    // --- 2. Roles no administrativos reciben 403 Forbidden en los cuatro endpoints ---

    @Test
    @DisplayName("P2: Usuario registrado recibe 403 Forbidden en los cuatro endpoints")
    void usuarioRegistradoRecibe403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuarioConRol(sub, "normal@tecreview.com", rolUsuario);
        String token = generarToken(sub, "normal@tecreview.com");

        probarCuatroEndpointsConForbidden(token);
    }

    @Test
    @DisplayName("P3: Moderador recibe 403 Forbidden en los cuatro endpoints")
    void moderadorRecibe403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuarioConRol(sub, "moderador@tecreview.com", rolModerador);
        String token = generarToken(sub, "moderador@tecreview.com");

        probarCuatroEndpointsConForbidden(token);
    }

    @Test
    @DisplayName("P4: Representante de establecimiento recibe 403 Forbidden en los cuatro endpoints")
    void representanteRecibe403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuarioConRol(sub, "rep@tecreview.com", rolRepresentante);
        String token = generarToken(sub, "rep@tecreview.com");

        probarCuatroEndpointsConForbidden(token);
    }

    private void probarCuatroEndpointsConForbidden(String token) throws Exception {
        mockMvc.perform(post("/api/admin/usuarios/100/roles/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"intento no autorizado\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/usuarios/100/roles/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"intento no autorizado\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/usuarios/100/establecimientos/100/representacion")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"intento no autorizado\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/usuarios/100/establecimientos/100/representacion")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"intento no autorizado\"}"))
                .andExpect(status().isForbidden());
    }

    // --- 3. Administrador ejecuta asignación y revocación de rol exitosamente ---

    @Test
    @DisplayName("P5: Administrador asigna rol con 201 Created y registra auditoría")
    void administradorAsignaRolExitoso() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario admin = crearUsuarioConRol(adminSub, "admin1@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "admin1@tecreview.com");

        String targetSub = UUID.randomUUID().toString();
        Usuario target = crearUsuarioConRol(targetSub, "target@tecreview.com", rolUsuario);

        mockMvc.perform(post("/api/admin/usuarios/" + target.getIdUsuario() + "/roles/" + rolModerador.getIdRol())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Promoción a moderador\"}"))
                .andExpect(status().isCreated());

        UsuarioRol asignacion = usuarioRolRepository
                .findByUsuario_IdUsuarioAndRol_IdRol(target.getIdUsuario(), rolModerador.getIdRol())
                .orElseThrow();
        assertThat(asignacion.getEstado()).isTrue();
        assertThat(asignacion.getAsignadoPor().getIdUsuario()).isEqualTo(admin.getIdUsuario());

        List<AuditoriaUsuarioRol> auditoria = auditoriaUsuarioRolRepository.findAll();
        assertThat(auditoria).anyMatch(a ->
                a.getIdUsuario().equals(target.getIdUsuario())
                && a.getIdRol().equals(rolModerador.getIdRol())
                && a.getActorId().equals(admin.getIdUsuario())
                && "ASIGNADO".equals(a.getAccion())
                && "Promoción a moderador".equals(a.getMotivo())
        );
    }

    @Test
    @DisplayName("P6: Administrador asigna rol ya activo y recibe 409 Conflict")
    void administradorAsignaRolYaActivoResponde409() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        crearUsuarioConRol(adminSub, "admin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "admin@tecreview.com");

        String targetSub = UUID.randomUUID().toString();
        Usuario target = crearUsuarioConRol(targetSub, "target@tecreview.com", rolUsuario);

        mockMvc.perform(post("/api/admin/usuarios/" + target.getIdUsuario() + "/roles/" + rolUsuario.getIdRol())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Reasignación duplicada\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("P7: Administrador revoca rol no admin con 204 No Content y registra auditoría")
    void administradorRevocaRolExitoso() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario admin = crearUsuarioConRol(adminSub, "admin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "admin@tecreview.com");

        String targetSub = UUID.randomUUID().toString();
        Usuario target = crearUsuarioConRol(targetSub, "target@tecreview.com", rolModerador);

        mockMvc.perform(delete("/api/admin/usuarios/" + target.getIdUsuario() + "/roles/" + rolModerador.getIdRol())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Cese de funciones\"}"))
                .andExpect(status().isNoContent());

        UsuarioRol asignacion = usuarioRolRepository
                .findByUsuario_IdUsuarioAndRol_IdRol(target.getIdUsuario(), rolModerador.getIdRol())
                .orElseThrow();
        assertThat(asignacion.getEstado()).isFalse();
        assertThat(asignacion.getRevocadoPor().getIdUsuario()).isEqualTo(admin.getIdUsuario());
        assertThat(asignacion.getFechaRevocacion()).isNotNull();

        List<AuditoriaUsuarioRol> auditoria = auditoriaUsuarioRolRepository.findAll();
        assertThat(auditoria).anyMatch(a ->
                a.getIdUsuario().equals(target.getIdUsuario())
                && a.getIdRol().equals(rolModerador.getIdRol())
                && a.getActorId().equals(admin.getIdUsuario())
                && "REVOCADO".equals(a.getAccion())
                && "Cese de funciones".equals(a.getMotivo())
        );
    }

    @Test
    @DisplayName("P8: Intento de revocar el único Administrador activo responde 409 Conflict")
    void intentoRevocarUltimoAdminResponde409() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario unicoAdmin = crearUsuarioConRol(adminSub, "unico.admin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "unico.admin@tecreview.com");

        mockMvc.perform(delete("/api/admin/usuarios/" + unicoAdmin.getIdUsuario() + "/roles/" + rolAdmin.getIdRol())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Intento de renuncia única\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("No se puede revocar el último rol de Administrador activo."));

        UsuarioRol asignacion = usuarioRolRepository
                .findByUsuario_IdUsuarioAndRol_IdRol(unicoAdmin.getIdUsuario(), rolAdmin.getIdRol())
                .orElseThrow();
        assertThat(asignacion.getEstado()).isTrue();
    }

    // --- 4. Administrador ejecuta asignación y revocación de representante ---

    @Test
    @DisplayName("P9: Administrador asigna representante con 201 Created y registra auditoría")
    void administradorAsignaRepresentanteExitoso() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario admin = crearUsuarioConRol(adminSub, "admin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "admin@tecreview.com");

        String repSub = UUID.randomUUID().toString();
        Usuario rep = crearUsuarioConRol(repSub, "rep@tecreview.com", rolRepresentante);

        mockMvc.perform(post("/api/admin/usuarios/" + rep.getIdUsuario() + "/establecimientos/"
                        + establecimientoTest.getIdEstablecimiento() + "/representacion")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Designación como representante legal\"}"))
                .andExpect(status().isCreated());

        UsuarioEstablecimiento vinculacion = usuarioEstablecimientoRepository
                .findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(
                        rep.getIdUsuario(), establecimientoTest.getIdEstablecimiento())
                .orElseThrow();
        assertThat(vinculacion.getEstado()).isTrue();
        assertThat(vinculacion.getAsignadoPor().getIdUsuario()).isEqualTo(admin.getIdUsuario());

        List<AuditoriaUsuarioEstablecimiento> auditoria = auditoriaUsuarioEstablecimientoRepository.findAll();
        assertThat(auditoria).anyMatch(a ->
                a.getIdUsuario().equals(rep.getIdUsuario())
                && a.getIdEstablecimiento().equals(establecimientoTest.getIdEstablecimiento())
                && a.getActorId().equals(admin.getIdUsuario())
                && "ASIGNADO".equals(a.getAccion())
                && "Designación como representante legal".equals(a.getMotivo())
        );
    }

    @Test
    @DisplayName("P10: Administrador revoca representante con 204 No Content y registra auditoría")
    void administradorRevocaRepresentanteExitoso() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario admin = crearUsuarioConRol(adminSub, "admin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "admin@tecreview.com");

        String repSub = UUID.randomUUID().toString();
        Usuario rep = crearUsuarioConRol(repSub, "rep@tecreview.com", rolRepresentante);

        UsuarioEstablecimiento ue = new UsuarioEstablecimiento();
        ue.setUsuario(rep);
        ue.setEstablecimiento(establecimientoTest);
        ue.setEstado(true);
        ue.setFechaAsignacion(LocalDateTime.now());
        ue.setAsignadoPor(admin);
        usuarioEstablecimientoRepository.save(ue);

        mockMvc.perform(delete("/api/admin/usuarios/" + rep.getIdUsuario() + "/establecimientos/"
                        + establecimientoTest.getIdEstablecimiento() + "/representacion")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Fin de contrato laboral\"}"))
                .andExpect(status().isNoContent());

        UsuarioEstablecimiento vinculacion = usuarioEstablecimientoRepository
                .findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(
                        rep.getIdUsuario(), establecimientoTest.getIdEstablecimiento())
                .orElseThrow();
        assertThat(vinculacion.getEstado()).isFalse();
        assertThat(vinculacion.getRevocadoPor().getIdUsuario()).isEqualTo(admin.getIdUsuario());
        assertThat(vinculacion.getFechaRevocacion()).isNotNull();

        List<AuditoriaUsuarioEstablecimiento> auditoria = auditoriaUsuarioEstablecimientoRepository.findAll();
        assertThat(auditoria).anyMatch(a ->
                a.getIdUsuario().equals(rep.getIdUsuario())
                && a.getIdEstablecimiento().equals(establecimientoTest.getIdEstablecimiento())
                && a.getActorId().equals(admin.getIdUsuario())
                && "REVOCADO".equals(a.getAccion())
                && "Fin de contrato laboral".equals(a.getMotivo())
        );
    }

    @Test
    @DisplayName("P11: Reactivación de rol previamente revocado genera evento REACTIVADO")
    void administradorReactivaRolRevocado() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario admin = crearUsuarioConRol(adminSub, "admin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "admin@tecreview.com");

        String targetSub = UUID.randomUUID().toString();
        Usuario target = crearUsuarioConRol(targetSub, "target@tecreview.com", rolUsuario);

        // Desactivar la asignación
        UsuarioRol ur = usuarioRolRepository
                .findByUsuario_IdUsuarioAndRol_IdRol(target.getIdUsuario(), rolUsuario.getIdRol())
                .orElseThrow();
        ur.setEstado(false);
        ur.setFechaRevocacion(LocalDateTime.now());
        usuarioRolRepository.save(ur);

        mockMvc.perform(post("/api/admin/usuarios/" + target.getIdUsuario() + "/roles/" + rolUsuario.getIdRol())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Reactivación de cuenta\"}"))
                .andExpect(status().isCreated());

        UsuarioRol reactivado = usuarioRolRepository
                .findByUsuario_IdUsuarioAndRol_IdRol(target.getIdUsuario(), rolUsuario.getIdRol())
                .orElseThrow();
        assertThat(reactivado.getEstado()).isTrue();
        assertThat(reactivado.getFechaRevocacion()).isNull();
        assertThat(reactivado.getRevocadoPor()).isNull();

        List<AuditoriaUsuarioRol> auditoria = auditoriaUsuarioRolRepository.findAll();
        assertThat(auditoria).anyMatch(a ->
                "REACTIVADO".equals(a.getAccion()) && "Reactivación de cuenta".equals(a.getMotivo())
        );
    }

    @Test
    @DisplayName("P12: Administrador con rol revocado recibe 403 Forbidden")
    void adminConRolRevocadoRecibe403() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario exAdmin = crearUsuarioConRol(adminSub, "exadmin@tecreview.com", rolAdmin);
        String token = generarToken(adminSub, "exadmin@tecreview.com");

        UsuarioRol ur = usuarioRolRepository
                .findByUsuario_IdUsuarioAndRol_IdRol(exAdmin.getIdUsuario(), rolAdmin.getIdRol())
                .orElseThrow();
        ur.setEstado(false);
        usuarioRolRepository.save(ur);

        mockMvc.perform(post("/api/admin/usuarios/1/roles/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}

