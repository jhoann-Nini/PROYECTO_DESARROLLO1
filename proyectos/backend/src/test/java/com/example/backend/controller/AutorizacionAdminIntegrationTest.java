package com.example.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.AdminAuthorizationManager;
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
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Suite integral de pruebas para la política de autorización administrativa en TecReview.
 *
 * Valida la matriz completa de permisos:
 * - Consultas GET públicas (sin token) para productos, categorías y marcas.
 * - Escrituras anónimas (sin token) rechazadas con 401 Unauthorized.
 * - Escrituras por usuario normal (rol 'Usuario registrado') rechazadas con 403 Forbidden
 *   en POST, PUT y DELETE para productos, categorías y marcas, garantizando recursos intactos.
 * - Escrituras por usuario sin fila en BD rechazadas con 403 Forbidden.
 * - Intentos de elevación de privilegios en user_metadata rechazados con 403 Forbidden.
 * - Escrituras por usuario con rol 'Administrador' exitosas:
 *     - POST (201 Created)
 *     - PUT (200 OK)
 *     - DELETE (204 No Content)
 * - Funcionamiento intacto del flujo JIT en GET /api/usuarios/me.
 * - Resiliencia y Fail-Closed ante fallos de base de datos tanto unitariamente como en MockMvc.
 */
@SpringBootTest
class AutorizacionAdminIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";

    private static ECPublicKey testPublicKey;
    private static ECPrivateKey testPrivateKey;
    private static ECKey testJwk;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @MockitoSpyBean
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    private MockMvc mockMvc;

    private Rol rolAdmin;
    private Rol rolUsuario;
    private Long idCategoriaTest;
    private Long idMarcaTest;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));

        KeyPair testKeyPair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) testKeyPair.getPublic();
        testPrivateKey = (ECPrivateKey) testKeyPair.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-admin-auth-es256-key")
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

        productoRepository.deleteAll();
        usuarioRepository.deleteAll();

        this.rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol de administración del catálogo");
            return rolRepository.save(r);
        });

        this.rolUsuario = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Usuario registrado");
            r.setDescripcion("Rol predeterminado para usuarios autenticados");
            return rolRepository.save(r);
        });

        Categoria cat = new Categoria();
        cat.setNombre("Cat Auth Test " + System.nanoTime());
        cat.setDescripcion("Desc");
        cat.setEstado(true);
        this.idCategoriaTest = categoriaRepository.save(cat).getIdCategoria();

        Marca marca = new Marca();
        marca.setNombre("Marca Auth Test " + System.nanoTime());
        marca.setDescripcion("Desc");
        marca.setEstado(true);
        this.idMarcaTest = marcaRepository.save(marca).getIdMarca();
    }

    @AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        usuarioRepository.deleteAll();
        reset(usuarioRepository);
    }

    private String generarToken(String sub, String email, Map<String, Object> userMetadata) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .audience(TEST_AUDIENCE)
                .subject(sub)
                .claim("email", email)
                .claim("email_verified", true)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600_000));

        if (userMetadata != null) {
            builder.claim("user_metadata", userMetadata);
        }

        SignedJWT signedJWT = new SignedJWT(header, builder.build());
        signedJWT.sign(new ECDSASigner(testPrivateKey));
        return signedJWT.serialize();
    }

    private Usuario crearUsuario(String sub, String email, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre("Usuario " + rol.getNombre());
        u.setCorreo(email);
        u.setSupabaseUid(sub);
        u.setRol(rol);
        u.setEstado(true);
        u.setFechaRegistro(LocalDateTime.now());
        return usuarioRepository.save(u);
    }

    private Producto crearProducto(String nombre) {
        Producto p = new Producto();
        p.setNombre(nombre);
        p.setDescripcion("Descripción de prueba previa");
        p.setCategoria(categoriaRepository.findById(idCategoriaTest).orElseThrow());
        p.setMarca(marcaRepository.findById(idMarcaTest).orElseThrow());
        p.setPrecioReferencia(new BigDecimal("2500000.00"));
        p.setEstado(true);
        return productoRepository.save(p);
    }

    private Categoria crearCategoria(String nombre) {
        Categoria c = new Categoria();
        c.setNombre(nombre);
        c.setDescripcion("Descripción previa categoría");
        c.setEstado(true);
        return categoriaRepository.save(c);
    }

    private Marca crearMarca(String nombre) {
        Marca m = new Marca();
        m.setNombre(nombre);
        m.setDescripcion("Descripción previa marca");
        m.setEstado(true);
        return marcaRepository.save(m);
    }

    private String buildProductoJson(String nombre) {
        return """
            {
                "nombre": "%s",
                "descripcion": "Descripción de prueba",
                "idCategoria": %d,
                "idMarca": %d,
                "precioReferencia": 2500000.00
            }
            """.formatted(nombre, idCategoriaTest, idMarcaTest);
    }

    // --- 1. Lecturas Públicas (Visitante sin credenciales) ---

    @Test
    @DisplayName("T-01: Visitante sin credenciales puede consultar el catálogo público con 200 OK")
    void visitanteConsultaCatalogoPublicoResponde200() throws Exception {
        mockMvc.perform(get("/api/productos")).andExpect(status().isOk());
        mockMvc.perform(get("/api/categorias")).andExpect(status().isOk());
        mockMvc.perform(get("/api/marcas")).andExpect(status().isOk());
    }

    // --- 2. Escrituras Anónimas (Rechazadas con 401) ---

    @Test
    @DisplayName("T-02: Escrituras anónimas sin token son rechazadas con 401 Unauthorized")
    void escriturasAnonimasSinTokenResponden401() throws Exception {
        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Anonimo")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", containsString("Bearer")));

        mockMvc.perform(post("/api/categorias")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Cat Anonima\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/marcas")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Marca Anonima\"}"))
                .andExpect(status().isUnauthorized());
    }

    // --- 3. Escrituras por Usuario Normal (Rechazadas con 403 y Recursos Intactos) ---

    @Test
    @DisplayName("T-03: Usuario normal recibe 403 Forbidden en POST, PUT y DELETE de productos y el recurso permanece intacto")
    void usuarioNormalEscribirProductosResponde403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "normal@tecreview.com", rolUsuario);
        String token = generarToken(sub, "normal@tecreview.com", null);

        Producto prodExistente = crearProducto("Producto Intacto Normal");
        Long idProd = prodExistente.getIdProducto();

        // POST -> 403
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Intento Normal")))
                .andExpect(status().isForbidden())
                .andExpect(header().string("WWW-Authenticate", containsString("insufficient_scope")));

        // PUT -> 403
        mockMvc.perform(put("/api/productos/" + idProd)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Intento Modificar")))
                .andExpect(status().isForbidden());

        // DELETE -> 403
        mockMvc.perform(delete("/api/productos/" + idProd)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        // Comprobación de recurso intacto en base de datos
        Producto prodActual = productoRepository.findById(idProd).orElseThrow();
        assertThat(prodActual.getNombre()).isEqualTo("Producto Intacto Normal");
        assertThat(prodActual.getEstado()).isTrue();
    }

    @Test
    @DisplayName("T-04: Usuario normal recibe 403 Forbidden en POST, PUT y DELETE de categorías y marcas y los recursos permanecen intactos")
    void usuarioNormalEscribirCategoriasOMarcasResponde403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "normal2@tecreview.com", rolUsuario);
        String token = generarToken(sub, "normal2@tecreview.com", null);

        Categoria catExistente = crearCategoria("Cat Intacta Normal");
        Long idCat = catExistente.getIdCategoria();

        Marca marcaExistente = crearMarca("Marca Intacta Normal");
        Long idMar = marcaExistente.getIdMarca();

        // Categoría: POST -> 403
        mockMvc.perform(post("/api/categorias")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Nueva Cat No Autorizada\"}"))
                .andExpect(status().isForbidden());

        // Categoría: PUT -> 403
        mockMvc.perform(put("/api/categorias/" + idCat)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Cat Modificada No Autorizada\",\"descripcion\":\"Desc\"}"))
                .andExpect(status().isForbidden());

        // Categoría: DELETE -> 403
        mockMvc.perform(delete("/api/categorias/" + idCat)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        // Marca: POST -> 403
        mockMvc.perform(post("/api/marcas")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Nueva Marca No Autorizada\"}"))
                .andExpect(status().isForbidden());

        // Marca: PUT -> 403
        mockMvc.perform(put("/api/marcas/" + idMar)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Marca Modificada No Autorizada\",\"descripcion\":\"Desc\"}"))
                .andExpect(status().isForbidden());

        // Marca: DELETE -> 403
        mockMvc.perform(delete("/api/marcas/" + idMar)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        // Comprobación de recursos intactos en base de datos
        Categoria catActual = categoriaRepository.findById(idCat).orElseThrow();
        assertThat(catActual.getNombre()).isEqualTo("Cat Intacta Normal");
        assertThat(catActual.getEstado()).isTrue();

        Marca marcaActual = marcaRepository.findById(idMar).orElseThrow();
        assertThat(marcaActual.getNombre()).isEqualTo("Marca Intacta Normal");
        assertThat(marcaActual.getEstado()).isTrue();
    }

    // --- 4. Usuario sin fila en BD (Rechazado con 403) ---

    @Test
    @DisplayName("T-05: Usuario autenticado sin fila en public.usuario recibe 403 Forbidden al escribir")
    void usuarioSinFilaEnBdRecibe403AlEscribir() throws Exception {
        String subInexistente = UUID.randomUUID().toString();
        String token = generarToken(subInexistente, "nuevo.sin.fila@tecreview.com", null);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Sin Fila")))
                .andExpect(status().isForbidden());
    }

    // --- 5. Intento de elevación de privilegios en metadatos (Rechazado con 403) ---

    @Test
    @DisplayName("T-06: Intento de elevación vía user_metadata con 'admin' es ignorado y responde 403 Forbidden")
    void intentoElevacionPrivilegiosEnMetadatosResponde403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "hacker@test.com", rolUsuario);

        Map<String, Object> maliciousMetadata = Map.of(
                "role", "Administrador",
                "roles", List.of("Administrador", "ROLE_ADMINISTRADOR")
        );
        String token = generarToken(sub, "hacker@test.com", maliciousMetadata);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Exploit")))
                .andExpect(status().isForbidden());
    }

    // --- 6. Administrador autorizado (Permitido CRUD completo) ---

    @Test
    @DisplayName("T-07: Administrador activo crea producto, categoría y marca mediante POST (201 Created)")
    void administradorAutorizadoCreaRecursos() throws Exception {
        String subAdmin = UUID.randomUUID().toString();
        crearUsuario(subAdmin, "admin.post@tecreview.com", rolAdmin);
        String tokenAdmin = generarToken(subAdmin, "admin.post@tecreview.com", null);

        // POST Producto -> 201 Created
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Creado por Admin")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre", is("Producto Creado por Admin")));

        // POST Categoria -> 201 Created
        mockMvc.perform(post("/api/categorias")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Cat Creada por Admin\",\"descripcion\":\"Desc\"}"))
                .andExpect(status().isCreated());

        // POST Marca -> 201 Created
        mockMvc.perform(post("/api/marcas")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Marca Creada por Admin\",\"descripcion\":\"Desc\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("T-07b: Administrador activo actualiza producto, categoría y marca mediante PUT (200 OK)")
    void administradorAutorizadoActualizaRecursos() throws Exception {
        String subAdmin = UUID.randomUUID().toString();
        crearUsuario(subAdmin, "admin.put@tecreview.com", rolAdmin);
        String tokenAdmin = generarToken(subAdmin, "admin.put@tecreview.com", null);

        Producto prod = crearProducto("Producto Antes De PUT");
        Categoria cat = crearCategoria("Cat Antes De PUT");
        Marca marca = crearMarca("Marca Antes De PUT");

        // PUT Producto -> 200 OK
        mockMvc.perform(put("/api/productos/" + prod.getIdProducto())
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Modificado Por Admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Producto Modificado Por Admin")));

        assertThat(productoRepository.findById(prod.getIdProducto()).orElseThrow().getNombre())
                .isEqualTo("Producto Modificado Por Admin");

        // PUT Categoría -> 200 OK
        mockMvc.perform(put("/api/categorias/" + cat.getIdCategoria())
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Cat Modificada Por Admin\",\"descripcion\":\"Nueva desc\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Cat Modificada Por Admin")));

        assertThat(categoriaRepository.findById(cat.getIdCategoria()).orElseThrow().getNombre())
                .isEqualTo("Cat Modificada Por Admin");

        // PUT Marca -> 200 OK
        mockMvc.perform(put("/api/marcas/" + marca.getIdMarca())
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Marca Modificada Por Admin\",\"descripcion\":\"Nueva desc\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Marca Modificada Por Admin")));

        assertThat(marcaRepository.findById(marca.getIdMarca()).orElseThrow().getNombre())
                .isEqualTo("Marca Modificada Por Admin");
    }

    @Test
    @DisplayName("T-07c: Administrador activo elimina producto, categoría y marca mediante DELETE (204 No Content)")
    void administradorAutorizadoEliminaRecursos() throws Exception {
        String subAdmin = UUID.randomUUID().toString();
        crearUsuario(subAdmin, "admin.del@tecreview.com", rolAdmin);
        String tokenAdmin = generarToken(subAdmin, "admin.del@tecreview.com", null);

        Producto prod = crearProducto("Producto Para Borrar");
        Categoria cat = crearCategoria("Cat Para Borrar");
        Marca marca = crearMarca("Marca Para Borrar");

        // DELETE Producto -> 204 No Content
        mockMvc.perform(delete("/api/productos/" + prod.getIdProducto())
                .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNoContent());

        assertThat(productoRepository.findById(prod.getIdProducto()).orElseThrow().getEstado())
                .isFalse();

        // DELETE Categoría -> 204 No Content
        mockMvc.perform(delete("/api/categorias/" + cat.getIdCategoria())
                .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNoContent());

        assertThat(categoriaRepository.findById(cat.getIdCategoria()).orElseThrow().getEstado())
                .isFalse();

        // DELETE Marca -> 204 No Content
        mockMvc.perform(delete("/api/marcas/" + marca.getIdMarca())
                .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNoContent());

        assertThat(marcaRepository.findById(marca.getIdMarca()).orElseThrow().getEstado())
                .isFalse();
    }

    // --- 7. Flujo JIT Intacto (/api/usuarios/me) ---

    @Test
    @DisplayName("T-08: Aprovisionamiento JIT de usuario nuevo en GET /api/usuarios/me funciona sin interferencia")
    void flujoJitFuncionaSinInterferencia() throws Exception {
        String subNuevo = UUID.randomUUID().toString();
        String emailNuevo = "jit.nuevo." + System.nanoTime() + "@tecreview.com";
        String tokenNuevo = generarToken(subNuevo, emailNuevo, Map.of("full_name", "Usuario JIT"));

        mockMvc.perform(get("/api/usuarios/me")
                .header("Authorization", "Bearer " + tokenNuevo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo", is(emailNuevo)))
                .andExpect(jsonPath("$.rol", is("Usuario registrado")));

        Usuario creado = usuarioRepository.findBySupabaseUid(subNuevo).orElse(null);
        assertThat(creado).isNotNull();
        assertThat(creado.getRol().getNombre()).isEqualTo("Usuario registrado");
    }

    // --- 8. Casos Límite y Resiliencia ante Fallos ---

    @Test
    @DisplayName("T-09: Administrador con cuenta inactiva (estado = false) recibe 403 Forbidden")
    void administradorInactivoRecibe403() throws Exception {
        String subInactivo = UUID.randomUUID().toString();
        Usuario adminInactivo = new Usuario();
        adminInactivo.setNombre("Admin Inactivo");
        adminInactivo.setCorreo("inactivo@tecreview.com");
        adminInactivo.setSupabaseUid(subInactivo);
        adminInactivo.setRol(rolAdmin);
        adminInactivo.setEstado(false);
        usuarioRepository.save(adminInactivo);

        String token = generarToken(subInactivo, "inactivo@tecreview.com", null);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Inactivo")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("T-10: Token con claim sub que no tiene formato UUID válido recibe 403 Forbidden sin error 500")
    void subNoUuidRecibe403() throws Exception {
        String tokenSubInvalido = generarToken("not-a-valid-uuid-string", "test@tecreview.com", null);

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenSubInvalido)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto Sub Invalido")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("T-11: Usuario con rol nulo en base de datos es denegado de forma segura (Fail-Closed)")
    void usuarioConRolNuloEsDenegado() {
        UsuarioRepository mockRepo = mock(UsuarioRepository.class);
        AdminAuthorizationManager manager = new AdminAuthorizationManager(mockRepo);

        Usuario usuarioRolNulo = new Usuario();
        usuarioRolNulo.setEstado(true);
        usuarioRolNulo.setRol(null);
        given(mockRepo.findBySupabaseUid(any())).willReturn(Optional.of(usuarioRolNulo));

        Jwt jwt = mock(Jwt.class);
        given(jwt.getSubject()).willReturn(UUID.randomUUID().toString());
        Authentication auth = new TestingAuthenticationToken(jwt, null);

        AuthorizationDecision decision = manager.authorize(() -> auth, null);
        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isFalse();
    }

    @Test
    @DisplayName("T-12: Error de acceso a datos (DataAccessException) durante la autorización deniega el acceso unitario (Fail-Closed)")
    void errorAccesoDatosDeniegaAcceso() {
        UsuarioRepository mockRepo = mock(UsuarioRepository.class);
        AdminAuthorizationManager manager = new AdminAuthorizationManager(mockRepo);
        given(mockRepo.findBySupabaseUid(any())).willThrow(new DataAccessResourceFailureException("PostgreSQL no disponible"));

        Jwt jwt = mock(Jwt.class);
        given(jwt.getSubject()).willReturn(UUID.randomUUID().toString());
        Authentication auth = new TestingAuthenticationToken(jwt, null);

        AuthorizationDecision decision = manager.authorize(() -> auth, null);
        assertThat(decision).isNotNull();
        assertThat(decision.isGranted()).isFalse();
    }

    @Test
    @DisplayName("T-13: Fallo de acceso a PostgreSQL durante la autorización deniega la solicitud HTTP (403) y no modifica ningún recurso")
    void falloBaseDatosEnAutorizacionDeniegaHttpYNoModificaRecurso() throws Exception {
        Producto prod = crearProducto("Producto Intacto Ante Fallo BD");
        Long idProd = prod.getIdProducto();

        String subFalloBd = UUID.randomUUID().toString();
        String tokenFalloBd = generarToken(subFalloBd, "fallo.db@tecreview.com", null);

        // Simular fallo de base de datos exclusivamente para este sub
        doThrow(new DataAccessResourceFailureException("Conexión perdida con PostgreSQL"))
                .when(usuarioRepository).findBySupabaseUid(subFalloBd);

        // 1. Intento de creación con POST -> 403 Forbidden
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + tokenFalloBd)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Producto No Debe Crearse")))
                .andExpect(status().isForbidden());

        // 2. Intento de modificación con PUT -> 403 Forbidden
        mockMvc.perform(put("/api/productos/" + idProd)
                .header("Authorization", "Bearer " + tokenFalloBd)
                .contentType(MediaType.APPLICATION_JSON)
                .content(buildProductoJson("Nombre Modificado Ilegítimamente")))
                .andExpect(status().isForbidden());

        // 3. Intento de eliminación con DELETE -> 403 Forbidden
        mockMvc.perform(delete("/api/productos/" + idProd)
                .header("Authorization", "Bearer " + tokenFalloBd))
                .andExpect(status().isForbidden());

        // Verificar que el recurso en base de datos permanece estrictamente intacto
        Producto prodActual = productoRepository.findById(idProd).orElseThrow();
        assertThat(prodActual.getNombre()).isEqualTo("Producto Intacto Ante Fallo BD");
        assertThat(prodActual.getEstado()).isTrue();

        // Verificar que no se creó ningún producto nuevo
        assertThat(productoRepository.findAll())
                .noneMatch(p -> "Producto No Debe Crearse".equals(p.getNombre()));
    }
}
