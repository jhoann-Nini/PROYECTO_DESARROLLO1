package com.example.backend.controller;

import static org.hamcrest.Matchers.nullValue;
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
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.Valoracion;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
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

    @Autowired
    private ResenaRepository resenaRepository;

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

        long countBefore = valoracionRepository.count();
        long countResBefore = resenaRepository.count();
        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isGone());
        long countAfter = valoracionRepository.count();
        long countResAfter = resenaRepository.count();
        assertEquals(countBefore, countAfter, "No debe crearse ninguna valoración");
        assertEquals(countResBefore, countResAfter, "No debe crearse ninguna reseña");
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
    @DisplayName("Rechazar productos inexistentes respondiendo 410 Gone sin persistir datos")
    void rechazarProductoInexistente() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": 99999999,
                "puntuacion": 4
            }
            """;

        long countValBefore = valoracionRepository.count();
        long countResBefore = resenaRepository.count();

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isGone());

        assertEquals(countValBefore, valoracionRepository.count(), "No debe crearse ninguna valoración");
        assertEquals(countResBefore, resenaRepository.count(), "No debe crearse ninguna reseña");
    }

    @Test
    @DisplayName("Rechazar productos inactivos respondiendo 410 Gone sin persistir datos")
    void rechazarProductoInactivo() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        String payload = """
            {
                "idProducto": %d,
                "puntuacion": 4
            }
            """.formatted(idProductoInactivo);

        long countValBefore = valoracionRepository.count();
        long countResBefore = resenaRepository.count();

        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isGone());

        assertEquals(countValBefore, valoracionRepository.count(), "No debe crearse ninguna valoración");
        assertEquals(countResBefore, resenaRepository.count(), "No debe crearse ninguna reseña");
    }

    @Test
    @DisplayName("Actualizar valoración activa existente responde 410 Gone sin modificar registros existentes")
    void actualizarValoracionActivaExistente() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        // Preparar una valoración existente para el usuario y producto
        Usuario u = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        Producto p = productoRepository.findById(idProductoValido).orElseThrow();

        Valoracion valExistente = new Valoracion();
        valExistente.setUsuario(u);
        valExistente.setProducto(p);
        valExistente.setPuntuacion(3);
        valExistente.setEstado(true);
        valExistente.setFechaCreacion(LocalDateTime.now());
        valoracionRepository.save(valExistente);

        long countValBefore = valoracionRepository.count();
        long countResBefore = resenaRepository.count();

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
                .andExpect(status().isGone());

        // Comprobar que en base de datos la valoración no cambió y no se duplicó ni crearon nuevos registros
        assertEquals(countValBefore, valoracionRepository.count(), "No debe duplicarse ni crearse ninguna valoración");
        assertEquals(countResBefore, resenaRepository.count(), "No debe crearse ninguna reseña");
        var lista = valoracionRepository.findByProductoIdProductoAndEstadoTrue(idProductoValido);
        assertEquals(1, lista.size(), "Debe existir exactamente una valoración activa");
        assertEquals(3, lista.get(0).getPuntuacion(), "La puntuación original no debe ser modificada por POST 410");
    }

    @Test
    @DisplayName("Consultar mi valoración para un producto")
    void obtenerMiValoracionPorProducto() throws Exception {
        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        // Inicialmente no tiene reseña/valoración
        mockMvc.perform(get("/api/valoraciones/mi-valoracion")
                        .param("idProducto", idProductoValido.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Intento de crear mediante endpoint antiguo responde 410 Gone y no persiste
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
                .andExpect(status().isGone());

        // Verifica que sigue sin existir valoración
        mockMvc.perform(get("/api/valoraciones/mi-valoracion")
                        .param("idProducto", idProductoValido.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Preparar una Resena activa directamente en el repositorio (fuente de datos de ValoracionService)
        Usuario u = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        Producto p = productoRepository.findById(idProductoValido).orElseThrow();

        Resena resena = new Resena();
        resena.setUsuario(u);
        resena.setProducto(p);
        resena.setComentario("Reseña de prueba para mi valoración");
        resena.setPuntuacion(4);
        resena.setEstado(true);
        resena.setFechaCreacion(LocalDateTime.now());
        resenaRepository.save(resena);

        // Ahora GET /api/valoraciones/mi-valoracion retorna la valoración basada en la reseña
        mockMvc.perform(get("/api/valoraciones/mi-valoracion")
                        .param("idProducto", idProductoValido.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.puntuacion").value(4))
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.nombreUsuario").value("Usuario Valoraciones Test"));
    }

    @Test
    @DisplayName("Una cuenta suspendida no puede consultar su valoración")
    void cuentaSuspendidaNoPuedeConsultarMiValoracion() throws Exception {
        Usuario usuario = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        usuario.setEstado(false);
        usuarioRepository.saveAndFlush(usuario);

        String token = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        mockMvc.perform(get("/api/valoraciones/mi-valoracion")
                        .param("idProducto", idProductoValido.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("El ranking mejor valorados refleja media y recuento, y excluye valoraciones inactivas")
    void rankingReflejaMediaYExcluyeInactivas() throws Exception {
        String token1 = generarToken(TEST_SUB, "val_test@example.com", "Usuario Valoraciones Test");

        // Verificar que el POST antiguo devuelve 410 y no crea datos
        long countValBefore = valoracionRepository.count();
        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\": " + idProductoValido + ", \"puntuacion\": 4}"))
                .andExpect(status().isGone());
        assertEquals(countValBefore, valoracionRepository.count(), "POST 410 no debe crear valoraciones");

        // Preparar reseñas mediante ResenaRepository (fuente única de datos del ranking)
        Usuario u1 = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        Usuario u2 = usuarioRepository.findBySupabaseUid(TEST_SUB_2).orElseThrow();
        Producto prod = productoRepository.findById(idProductoValido).orElseThrow();

        Resena r1 = new Resena();
        r1.setUsuario(u1);
        r1.setProducto(prod);
        r1.setComentario("Excelente producto para ranking");
        r1.setPuntuacion(4);
        r1.setEstado(true);
        r1.setFechaCreacion(LocalDateTime.now());
        resenaRepository.save(r1);

        Resena r2 = new Resena();
        r2.setUsuario(u2);
        r2.setProducto(prod);
        r2.setComentario("Magnífico producto para ranking");
        r2.setPuntuacion(5);
        r2.setEstado(true);
        r2.setFechaCreacion(LocalDateTime.now());
        resenaRepository.save(r2);

        // Verificar el ranking
        mockMvc.perform(get("/api/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].promedioPuntuacion").value(4.5))
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].cantidadValoraciones").value(2));

        // Marcar una reseña como inactiva (estado = false)
        var resenaUsuario1 = resenaRepository.findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                u1.getIdUsuario(),
                idProductoValido
        ).orElseThrow();
        resenaUsuario1.setEstado(false);
        resenaRepository.saveAndFlush(resenaUsuario1);

        // Ahora el ranking debe reflejar solo la reseña activa (media = 5.0, cantidad = 1)
        mockMvc.perform(get("/api/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].promedioPuntuacion").value(5.0))
                .andExpect(jsonPath("$[?(@.idProducto == " + idProductoValido + ")].cantidadValoraciones").value(1));
    }

    @Test
    @DisplayName("Endpoint público de estadísticas de valoración GET /api/productos/{idProducto}/valoracion-stats es accesible sin token y calcula datos independientes por producto")
    void estadisticasValoracionPublicaPorProducto() throws Exception {
        // 1. Producto sin valoraciones retorna cantidadValoraciones 0
        mockMvc.perform(get("/api/productos/{idProducto}/valoracion-stats", idProductoValido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.cantidadValoraciones").value(0));

        // 2. Verificar que POST /api/valoraciones responde 410 Gone y no persiste
        String token1 = generarToken(TEST_SUB, "user1@example.com", "Usuario Uno");
        long countValBefore = valoracionRepository.count();
        mockMvc.perform(post("/api/valoraciones")
                        .header("Authorization", "Bearer " + token1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\": " + idProductoValido + ", \"puntuacion\": 4}"))
                .andExpect(status().isGone());
        assertEquals(countValBefore, valoracionRepository.count(), "POST 410 no debe crear valoraciones");

        // 3. Preparar reseñas mediante ResenaRepository (fuente única de estadísticas)
        Usuario u1 = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        Usuario u2 = usuarioRepository.findBySupabaseUid(TEST_SUB_2).orElseThrow();
        Producto prod = productoRepository.findById(idProductoValido).orElseThrow();

        Resena r1 = new Resena();
        r1.setUsuario(u1);
        r1.setProducto(prod);
        r1.setComentario("Comentario estadística 1");
        r1.setPuntuacion(4);
        r1.setEstado(true);
        r1.setFechaCreacion(LocalDateTime.now());
        resenaRepository.save(r1);

        Resena r2 = new Resena();
        r2.setUsuario(u2);
        r2.setProducto(prod);
        r2.setComentario("Comentario estadística 2");
        r2.setPuntuacion(5);
        r2.setEstado(true);
        r2.setFechaCreacion(LocalDateTime.now());
        resenaRepository.save(r2);

        // 4. Consultar estadísticas públicas (sin autenticación)
        mockMvc.perform(get("/api/productos/{idProducto}/valoracion-stats", idProductoValido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.promedioPuntuacion").value(4.5))
                .andExpect(jsonPath("$.cantidadValoraciones").value(2));

        // Al ocultar una reseña, no debe influir en el promedio público.
        var resenaOculta = resenaRepository
                .findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                        u1.getIdUsuario(),
                        idProductoValido
                )
                .orElseThrow();
        resenaOculta.setEstado(false);
        resenaRepository.saveAndFlush(resenaOculta);

        mockMvc.perform(get("/api/productos/{idProducto}/valoracion-stats", idProductoValido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.promedioPuntuacion").value(5.0))
                .andExpect(jsonPath("$.cantidadValoraciones").value(1));
    }

    @Test
    @DisplayName("Un registro residual en Valoracion sin Resena equivalente no afecta las estadísticas públicas")
    void registroResidualEnValoracionNoAfectaEstadisticasPublicas() throws Exception {
        Usuario u = usuarioRepository.findBySupabaseUid(TEST_SUB).orElseThrow();
        Producto prod1 = productoRepository.findById(idProductoValido).orElseThrow();

        // 1. Crear producto con una reseña activa de puntuación 5
        Resena resena = new Resena();
        resena.setUsuario(u);
        resena.setProducto(prod1);
        resena.setComentario("Excelente reseña para estadísticas");
        resena.setPuntuacion(5);
        resena.setEstado(true);
        resena.setFechaCreacion(LocalDateTime.now());
        resenaRepository.save(resena);

        // 2. Insertar directamente una Valoracion activa de puntuación 1 para el mismo producto
        Valoracion val1 = new Valoracion();
        val1.setUsuario(u);
        val1.setProducto(prod1);
        val1.setPuntuacion(1);
        val1.setEstado(true);
        val1.setFechaCreacion(LocalDateTime.now());
        valoracionRepository.save(val1);

        // 3 y 4. Consultar estadísticas de prod1 y verificar que solo toma en cuenta la Resena
        mockMvc.perform(get("/api/productos/{idProducto}/valoracion-stats", idProductoValido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(idProductoValido))
                .andExpect(jsonPath("$.promedioPuntuacion").value(5.0))
                .andExpect(jsonPath("$.cantidadValoraciones").value(1));

        // 5. Crear un segundo producto que tenga una valoración antigua, pero ninguna reseña
        Categoria cat = categoriaRepository.findAll().get(0);
        Marca marca = marcaRepository.findAll().get(0);
        Producto prod2 = new Producto();
        prod2.setNombre("Producto Solo Con Valoracion Antigua " + System.nanoTime());
        prod2.setCategoria(cat);
        prod2.setMarca(marca);
        prod2.setPrecioReferencia(new BigDecimal("990000"));
        prod2.setEstado(true);
        prod2 = productoRepository.save(prod2);

        Valoracion val2 = new Valoracion();
        val2.setUsuario(u);
        val2.setProducto(prod2);
        val2.setPuntuacion(4);
        val2.setEstado(true);
        val2.setFechaCreacion(LocalDateTime.now());
        valoracionRepository.save(val2);

        // 6 y 7. Consultar estadísticas de prod2 y verificar que devuelve null y 0
        mockMvc.perform(get("/api/productos/{idProducto}/valoracion-stats", prod2.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto").value(prod2.getIdProducto()))
                .andExpect(jsonPath("$.promedioPuntuacion").value(nullValue()))
                .andExpect(jsonPath("$.cantidadValoraciones").value(0));
    }
}
