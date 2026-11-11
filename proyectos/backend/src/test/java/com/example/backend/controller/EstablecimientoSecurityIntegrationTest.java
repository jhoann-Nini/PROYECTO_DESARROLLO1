package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioEstablecimiento;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioEstablecimientoRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Pruebas de autorización por rol y alcance de asignación de establecimientos. */
@SpringBootTest
@Transactional
class EstablecimientoSecurityIntegrationTest {

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
    private UsuarioEstablecimientoRepository usuarioEstablecimientoRepository;

    private MockMvc mockMvc;
    private Rol rolRepresentante;
    private Rol rolUsuario;
    private Rol rolAdmin;
    private Establecimiento establecimientoUno;
    private Establecimiento establecimientoDos;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) pair.getPublic();
        testPrivateKey = (ECPrivateKey) pair.getPrivate();
        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-representative-es256-key")
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

        rolRepresentante = obtenerOCrearRol("Representante de establecimiento");
        rolUsuario = obtenerOCrearRol("Usuario registrado");
        rolAdmin = obtenerOCrearRol("Administrador");

        establecimientoUno = crearEstablecimiento("Tienda representante A");
        establecimientoDos = crearEstablecimiento("Tienda ajena B");
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre(nombre);
            rol.setDescripcion("Rol para pruebas de autorización");
            return rolRepository.save(rol);
        });
    }

    private Establecimiento crearEstablecimiento(String nombre) {
        Establecimiento establecimiento = new Establecimiento();
        establecimiento.setNombre(nombre);
        establecimiento.setDireccion("Dirección de prueba");
        establecimiento.setEstado(true);
        return establecimientoRepository.saveAndFlush(establecimiento);
    }

    private Usuario crearUsuario(String correo, Rol rol, boolean activo) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Cuenta de prueba");
        usuario.setCorreo(correo);
        usuario.setSupabaseUid(UUID.randomUUID().toString());
        usuario.setRol(rol);
        usuario.setEstado(activo);
        usuario.setFechaRegistro(LocalDateTime.now());

        UsuarioRol asignacionRol = new UsuarioRol();
        asignacionRol.setRol(rol);
        asignacionRol.setEstado(true);
        asignacionRol.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(asignacionRol);
        return usuarioRepository.saveAndFlush(usuario);
    }

    private void asignarEstablecimiento(Usuario usuario, Establecimiento establecimiento, boolean activo) {
        UsuarioEstablecimiento asignacion = new UsuarioEstablecimiento();
        asignacion.setUsuario(usuario);
        asignacion.setEstablecimiento(establecimiento);
        asignacion.setEstado(activo);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        usuarioEstablecimientoRepository.saveAndFlush(asignacion);
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
    @DisplayName("GET anónimo a establecimientos del representante responde 401")
    void anonimoNoPuedeConsultarEstablecimientos() throws Exception {
        mockMvc.perform(get("/api/representante/establecimientos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Representante solo lista establecimientos con asignación activa")
    void representanteSoloListaSusEstablecimientos() throws Exception {
        Usuario representante = crearUsuario("representante_lista@test.com", rolRepresentante, true);
        asignarEstablecimiento(representante, establecimientoUno, true);
        asignarEstablecimiento(representante, establecimientoDos, false);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(representante)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].idEstablecimiento").value(establecimientoUno.getIdEstablecimiento()));
    }

    @Test
    @DisplayName("Representante no puede consultar un establecimiento no asignado")
    void representanteNoConsultaEstablecimientoAjeno() throws Exception {
        Usuario representante = crearUsuario("representante_ajeno@test.com", rolRepresentante, true);
        asignarEstablecimiento(representante, establecimientoUno, true);

        mockMvc.perform(get("/api/representante/establecimientos/" + establecimientoDos.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(representante)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Representante puede actualizar los datos básicos de su establecimiento")
    void representanteActualizaSuEstablecimiento() throws Exception {
        Usuario representante = crearUsuario("representante_edita@test.com", rolRepresentante, true);
        asignarEstablecimiento(representante, establecimientoUno, true);

        mockMvc.perform(put("/api/representante/establecimientos/" + establecimientoUno.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(representante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda actualizada",
                                  "direccion": "Carrera 10 # 20-30",
                                  "telefono": "3001234567",
                                  "correo": "tienda.actualizada@test.com",
                                  "descripcion": "Descripción actualizada",
                                  "latitud": 4.08,
                                  "longitud": -76.19
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Tienda actualizada"));

        Establecimiento actualizado = establecimientoRepository.findById(establecimientoUno.getIdEstablecimiento()).orElseThrow();
        assertThat(actualizado.getNombre()).isEqualTo("Tienda actualizada");
        assertThat(actualizado.getEstado()).isTrue();
    }

    @Test
    @DisplayName("Representante no puede modificar un establecimiento ajeno")
    void representanteNoActualizaEstablecimientoAjeno() throws Exception {
        Usuario representante = crearUsuario("representante_modifica_ajeno@test.com", rolRepresentante, true);
        asignarEstablecimiento(representante, establecimientoUno, true);

        mockMvc.perform(put("/api/representante/establecimientos/" + establecimientoDos.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(representante))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Intento de modificación",
                                  "direccion": "Dirección manipulada",
                                  "telefono": "3000000000",
                                  "correo": "ataque@test.com",
                                  "descripcion": "No debe guardarse",
                                  "latitud": 4.0,
                                  "longitud": -76.0
                                }
                                """))
                .andExpect(status().isNotFound());

        assertThat(establecimientoRepository.findById(establecimientoDos.getIdEstablecimiento())
                .orElseThrow().getNombre()).isEqualTo("Tienda ajena B");
    }

    @Test
    @DisplayName("Cuenta suspendida no puede gestionar establecimientos aunque conserve el rol")
    void cuentaSuspendidaNoPuedeGestionarEstablecimientos() throws Exception {
        Usuario suspendido = crearUsuario("representante_suspendido@test.com", rolRepresentante, false);
        asignarEstablecimiento(suspendido, establecimientoUno, true);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(suspendido)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Usuario sin rol de representante ni administrador recibe 403")
    void usuarioOrdinarioNoPuedeGestionarEstablecimientos() throws Exception {
        Usuario usuario = crearUsuario("usuario_ordinario@test.com", rolUsuario, true);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(usuario)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Administrador activo puede consultar todos los establecimientos activos")
    void administradorPuedeConsultarTodosLosEstablecimientos() throws Exception {
        Usuario admin = crearUsuario("admin_establecimientos@test.com", rolAdmin, true);

        mockMvc.perform(get("/api/representante/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }
}
