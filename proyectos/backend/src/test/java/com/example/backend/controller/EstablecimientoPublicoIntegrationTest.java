package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Pruebas de consulta pública y CRUD administrativo de establecimientos. */
@SpringBootTest
@Transactional
class EstablecimientoPublicoIntegrationTest {

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

    private MockMvc mockMvc;
    private Rol rolAdmin;
    private Rol rolUsuario;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) pair.getPublic();
        testPrivateKey = (ECPrivateKey) pair.getPrivate();
        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-public-establishment-es256-key")
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
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre(nombre);
            rol.setDescripcion("Rol para pruebas de establecimientos");
            return rolRepository.save(rol);
        });
    }

    private Establecimiento crearEstablecimiento(String nombre, boolean activo) {
        Establecimiento establecimiento = new Establecimiento();
        establecimiento.setNombre(nombre);
        establecimiento.setDireccion("Dirección de prueba");
        establecimiento.setEstado(activo);
        return establecimientoRepository.saveAndFlush(establecimiento);
    }

    private Usuario crearUsuario(String correo, Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Cuenta de prueba");
        usuario.setCorreo(correo);
        usuario.setSupabaseUid(UUID.randomUUID().toString());
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
    @DisplayName("El listado público incluye activos y oculta inactivos")
    void listadoPublicoIncluyeActivosYOcultaInactivos() throws Exception {
        crearEstablecimiento("Tienda Pública A", true);
        crearEstablecimiento("Tienda Pública B", true);
        crearEstablecimiento("Tienda Pública Inactiva", false);

        mockMvc.perform(get("/api/establecimientos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].nombre", hasItem("Tienda Pública A")))
                .andExpect(jsonPath("$[*].nombre", hasItem("Tienda Pública B")))
                .andExpect(jsonPath("$[*].nombre", not(hasItem("Tienda Pública Inactiva"))));
    }

    @Test
    @DisplayName("El detalle público devuelve un establecimiento activo")
    void detallePublicoDevuelveEstablecimientoActivo() throws Exception {
        Establecimiento establecimiento = crearEstablecimiento("Tienda Pública Detalle", true);

        mockMvc.perform(get("/api/establecimientos/" + establecimiento.getIdEstablecimiento()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idEstablecimiento").value(establecimiento.getIdEstablecimiento()))
                .andExpect(jsonPath("$.nombre").value("Tienda Pública Detalle"))
                .andExpect(jsonPath("$.estado").value(true));
    }

    @Test
    @DisplayName("El detalle público de un establecimiento inactivo responde 404")
    void detallePublicoDeInactivoResponde404() throws Exception {
        Establecimiento establecimiento = crearEstablecimiento("Tienda Pública Ocultable", false);

        mockMvc.perform(get("/api/establecimientos/" + establecimiento.getIdEstablecimiento()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("La creación anónima de establecimientos responde 401")
    void creacionAnonimaResponde401() throws Exception {
        mockMvc.perform(post("/api/establecimientos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda no autorizada",
                                  "direccion": "Calle 1"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un usuario sin rol Administrador no puede crear establecimientos")
    void creacionPorUsuarioOrdinarioResponde403() throws Exception {
        Usuario usuario = crearUsuario("usuario_establecimiento@test.com", rolUsuario);

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(usuario))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda no autorizada",
                                  "direccion": "Calle 1"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un administrador crea un establecimiento activo")
    void administradorCreaEstablecimiento() throws Exception {
        Usuario admin = crearUsuario("admin_crea_establecimiento@test.com", rolAdmin);

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "  Tienda Nueva  ",
                                  "direccion": "Carrera 10 # 20-30",
                                  "telefono": "3001234567",
                                  "correo": "tienda.nueva@test.com",
                                  "descripcion": "Tienda creada desde administración",
                                  "latitud": 4.08,
                                  "longitud": -76.19
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Tienda Nueva"))
                .andExpect(jsonPath("$.correo").value("tienda.nueva@test.com"))
                .andExpect(jsonPath("$.estado").value(true));

        Establecimiento persistido = establecimientoRepository.findAll().stream()
                .filter(establecimiento -> "Tienda Nueva".equals(establecimiento.getNombre()))
                .findFirst()
                .orElseThrow();
        assertThat(persistido.getEstado()).isTrue();
        assertThat(persistido.getDireccion()).isEqualTo("Carrera 10 # 20-30");
    }

    @Test
    @DisplayName("La creación sin nombre responde 400")
    void creacionSinNombreResponde400() throws Exception {
        Usuario admin = crearUsuario("admin_crea_invalido@test.com", rolAdmin);

        mockMvc.perform(post("/api/establecimientos")
                        .header("Authorization", "Bearer " + generarToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "direccion": "Calle sin nombre"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Un administrador actualiza los datos básicos de un establecimiento")
    void administradorActualizaEstablecimiento() throws Exception {
        Establecimiento establecimiento = crearEstablecimiento("Tienda por actualizar", true);
        Usuario admin = crearUsuario("admin_actualiza_establecimiento@test.com", rolAdmin);

        mockMvc.perform(put("/api/establecimientos/" + establecimiento.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Tienda actualizada",
                                  "direccion": "Calle 50 # 10-20",
                                  "telefono": "3100000000",
                                  "correo": "tienda.actualizada@test.com",
                                  "descripcion": "Datos actualizados",
                                  "latitud": 4.1,
                                  "longitud": -76.2
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Tienda actualizada"))
                .andExpect(jsonPath("$.estado").value(true));

        Establecimiento actualizado = establecimientoRepository
                .findById(establecimiento.getIdEstablecimiento())
                .orElseThrow();
        assertThat(actualizado.getNombre()).isEqualTo("Tienda actualizada");
        assertThat(actualizado.getEstado()).isTrue();
    }

    @Test
    @DisplayName("La actualización anónima responde 401 y la de un usuario ordinario 403")
    void actualizacionNoAutorizadaEsRechazada() throws Exception {
        Establecimiento establecimiento = crearEstablecimiento("Tienda protegida", true);
        Usuario usuario = crearUsuario("usuario_actualiza_establecimiento@test.com", rolUsuario);

        String cuerpo = """
                {
                  "nombre": "Intento de actualización",
                  "direccion": "Calle manipulada"
                }
                """;

        mockMvc.perform(put("/api/establecimientos/" + establecimiento.getIdEstablecimiento())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/establecimientos/" + establecimiento.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(usuario))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.findById(establecimiento.getIdEstablecimiento())
                .orElseThrow().getNombre()).isEqualTo("Tienda protegida");
    }

    @Test
    @DisplayName("La eliminación administrativa es lógica y no permite repetirse")
    void administradorEliminaLogicamente() throws Exception {
        Establecimiento establecimiento = crearEstablecimiento("Tienda eliminable", true);
        Usuario admin = crearUsuario("admin_elimina_establecimiento@test.com", rolAdmin);
        String token = "Bearer " + generarToken(admin);

        mockMvc.perform(delete("/api/establecimientos/" + establecimiento.getIdEstablecimiento())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());

        assertThat(establecimientoRepository.findById(establecimiento.getIdEstablecimiento())
                .orElseThrow().getEstado()).isFalse();

        mockMvc.perform(delete("/api/establecimientos/" + establecimiento.getIdEstablecimiento())
                        .header("Authorization", token))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/establecimientos/" + establecimiento.getIdEstablecimiento()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/establecimientos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].nombre", not(hasItem("Tienda eliminable"))));
    }

    @Test
    @DisplayName("La eliminación anónima responde 401 y la de un usuario ordinario 403")
    void eliminacionNoAutorizadaEsRechazada() throws Exception {
        Establecimiento establecimiento = crearEstablecimiento("Tienda no eliminable", true);
        Usuario usuario = crearUsuario("usuario_elimina_establecimiento@test.com", rolUsuario);

        mockMvc.perform(delete("/api/establecimientos/" + establecimiento.getIdEstablecimiento()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/establecimientos/" + establecimiento.getIdEstablecimiento())
                        .header("Authorization", "Bearer " + generarToken(usuario)))
                .andExpect(status().isForbidden());

        assertThat(establecimientoRepository.findById(establecimiento.getIdEstablecimiento())
                .orElseThrow().getEstado()).isTrue();
    }
}
