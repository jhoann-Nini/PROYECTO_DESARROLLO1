package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
 * TEC-117: Pruebas de integración para criterios de validación de productos.
 *
 * Criterios evaluados:
 * 1. Solo un administrador escribe (POST, PUT, DELETE protegidos; sin token 401, no-admin 403, admin 201/200/204).
 * 2. Los enlaces deben empezar por http o https (validación en campo 'imagen'; rechaza protocolos ajenos o texto plano con 400).
 * 3. El precio no puede ser negativo (validación en 'precioReferencia'; rechaza valores < 0.0 con 400).
 */
@SpringBootTest
class ProductoCriteriosValidacionIntegrationTest {

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

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    private MockMvc mockMvc;
    private static final ObjectMapper mapper = new ObjectMapper();

    private Rol rolAdmin;
    private Rol rolUsuario;
    private Long idCategoriaValida;
    private Long idMarcaValida;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair kp = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) kp.getPublic();
        testPrivateKey = (ECPrivateKey) kp.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-criterios-key")
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
            r.setDescripcion("Rol de administración");
            return rolRepository.save(r);
        });

        this.rolUsuario = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Usuario registrado");
            r.setDescripcion("Rol de usuario común");
            return rolRepository.save(r);
        });

        Categoria cat = new Categoria();
        cat.setNombre("Categoria Test " + System.nanoTime());
        cat.setDescripcion("Prueba");
        cat.setEstado(true);
        this.idCategoriaValida = categoriaRepository.save(cat).getIdCategoria();

        Marca marca = new Marca();
        marca.setNombre("Marca Test " + System.nanoTime());
        marca.setDescripcion("Prueba");
        marca.setEstado(true);
        this.idMarcaValida = marcaRepository.save(marca).getIdMarca();
    }

    @AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    private String generarToken(String sub, String email) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(testJwk.getKeyID())
                .type(JOSEObjectType.JWT)
                .build();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .audience(TEST_AUDIENCE)
                .subject(sub)
                .claim("email", email)
                .claim("email_verified", true)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600_000))
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claims);
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

        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setRol(rol);
        asignacion.setEstado(true);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        u.agregarRol(asignacion);

        return usuarioRepository.save(u);
    }

    private ObjectNode crearPayloadValido(String nombre, BigDecimal precio, String imagen) {
        ObjectNode node = mapper.createObjectNode();
        node.put("nombre", nombre);
        node.put("descripcion", "Descripción de " + nombre);
        node.put("idCategoria", idCategoriaValida);
        node.put("idMarca", idMarcaValida);
        if (imagen != null) {
            node.put("imagen", imagen);
        } else {
            node.putNull("imagen");
        }
        if (precio != null) {
            node.put("precioReferencia", precio);
        } else {
            node.putNull("precioReferencia");
        }
        return node;
    }

    private Producto persistirProducto(String nombre) {
        Producto p = new Producto();
        p.setNombre(nombre);
        p.setDescripcion("Descripción inicial");
        p.setCategoria(categoriaRepository.findById(idCategoriaValida).orElseThrow());
        p.setMarca(marcaRepository.findById(idMarcaValida).orElseThrow());
        p.setPrecioReferencia(new BigDecimal("1000.00"));
        p.setEstado(true);
        return productoRepository.save(p);
    }

    // =========================================================================
    // Criterio 1: Solo un administrador escribe
    // =========================================================================

    @Test
    @DisplayName("Criterio 1: Solicitud anónima para crear producto responde 401 Unauthorized")
    void crearProducto_sinToken_retorna401() throws Exception {
        ObjectNode payload = crearPayloadValido("Laptop Gaming", new BigDecimal("1500.00"), "https://img.com/laptop.png");

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Criterio 1: Usuario con rol no-admin recibe 403 Forbidden al intentar crear producto")
    void crearProducto_usuarioNoAdmin_retorna403() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "cliente@test.com", rolUsuario);
        String token = generarToken(sub, "cliente@test.com");

        ObjectNode payload = crearPayloadValido("Laptop Gaming", new BigDecimal("1500.00"), "https://img.com/laptop.png");

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Criterio 1: Usuario con rol no-admin recibe 403 Forbidden al intentar actualizar o eliminar producto")
    void actualizarYEliminarProducto_usuarioNoAdmin_retorna403() throws Exception {
        Producto p = persistirProducto("Monitor 4K");
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "cliente@test.com", rolUsuario);
        String token = generarToken(sub, "cliente@test.com");

        ObjectNode updatePayload = crearPayloadValido("Monitor 4K Actualizado", new BigDecimal("1200.00"), "https://img.com/mon.png");

        // Intento de PUT
        mockMvc.perform(put("/api/productos/" + p.getIdProducto())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updatePayload)))
                .andExpect(status().isForbidden());

        // Intento de DELETE
        mockMvc.perform(delete("/api/productos/" + p.getIdProducto())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Criterio 1: Usuario con rol Administrador puede crear, actualizar y eliminar productos")
    void operacionesEscritura_usuarioAdmin_exitoso() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        // 1. Crear producto (POST)
        ObjectNode payload = crearPayloadValido("Smartphone Pro", new BigDecimal("800.00"), "https://img.com/phone.png");

        String responseJson = mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idProducto", notNullValue()))
                .andExpect(jsonPath("$.nombre", is("Smartphone Pro")))
                .andReturn().getResponse().getContentAsString();

        Long idCreado = mapper.readTree(responseJson).get("idProducto").asLong();

        // 2. Actualizar producto (PUT)
        ObjectNode updatePayload = crearPayloadValido("Smartphone Pro Max", new BigDecimal("950.00"), "https://img.com/phonemax.png");

        mockMvc.perform(put("/api/productos/" + idCreado)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updatePayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre", is("Smartphone Pro Max")));

        // 3. Eliminar producto (DELETE)
        mockMvc.perform(delete("/api/productos/" + idCreado)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // =========================================================================
    // Criterio 2: Los enlaces deben empezar por http o https
    // =========================================================================

    @Test
    @DisplayName("Criterio 2: Enlace de imagen con protocolo no http/https (ftp://) es rechazado con 400 Bad Request")
    void crearProducto_imagenConProtocoloFtp_retorna400ConMensaje() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        ObjectNode payload = crearPayloadValido("Tablet Air", new BigDecimal("500.00"), "ftp://servidor.com/tablet.jpg");

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Los enlaces deben empezar por http o https")));
    }

    @Test
    @DisplayName("Criterio 2: Enlace de imagen sin protocolo (ruta relativa o texto) es rechazado con 400 Bad Request")
    void crearProducto_imagenSinProtocolo_retorna400ConMensaje() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        ObjectNode payload = crearPayloadValido("Tablet Air", new BigDecimal("500.00"), "tablet.png");

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Los enlaces deben empezar por http o https")));
    }

    @Test
    @DisplayName("Criterio 2: Enlaces con http:// y https:// son aceptados correctamente")
    void crearProducto_imagenConHttpYHttps_sonAceptados() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        // Con http://
        ObjectNode payloadHttp = crearPayloadValido("Tablet 1", new BigDecimal("500.00"), "http://servidor.com/tablet1.jpg");
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadHttp)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagen", is("http://servidor.com/tablet1.jpg")));

        // Con https://
        ObjectNode payloadHttps = crearPayloadValido("Tablet 2", new BigDecimal("550.00"), "https://servidor.com/tablet2.jpg");
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadHttps)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagen", is("https://servidor.com/tablet2.jpg")));
    }

    @Test
    @DisplayName("Criterio 2: Imagen nula o vacía es permitida cuando es opcional")
    void crearProducto_imagenNulaOVacia_esAceptada() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        // Nula
        ObjectNode payloadNull = crearPayloadValido("Mouse USB", new BigDecimal("25.00"), null);
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadNull)))
                .andExpect(status().isCreated());

        // Vacía
        ObjectNode payloadVacia = crearPayloadValido("Teclado USB", new BigDecimal("35.00"), "");
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadVacia)))
                .andExpect(status().isCreated());
    }

    // =========================================================================
    // Criterio 3: El precio no puede ser negativo
    // =========================================================================

    @Test
    @DisplayName("Criterio 3: Precio negativo en creación es rechazado con 400 Bad Request")
    void crearProducto_precioNegativo_retorna400ConMensaje() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        ObjectNode payload = crearPayloadValido("Audífonos Bluetooth", new BigDecimal("-25.50"), "https://img.com/audi.png");

        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("El precio no puede ser negativo")));
    }

    @Test
    @DisplayName("Criterio 3: Precio igual a cero (0.0) y precio positivo son aceptados")
    void crearProducto_precioCeroOPositivo_esAceptado() throws Exception {
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        // Precio 0.00
        ObjectNode payloadCero = crearPayloadValido("Software Libre", BigDecimal.ZERO, "https://img.com/soft.png");
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadCero)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.precioReferencia", is(0)));

        // Precio positivo
        ObjectNode payloadPositivo = crearPayloadValido("Licencia Pro", new BigDecimal("129.99"), "https://img.com/soft.png");
        mockMvc.perform(post("/api/productos")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadPositivo)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.precioReferencia", is(129.99)));
    }

    @Test
    @DisplayName("Criterios 2 y 3: Validaciones aplican igualmente al actualizar (PUT)")
    void actualizarProducto_validaProtocoloYPrecioNegativo() throws Exception {
        Producto p = persistirProducto("Parlante BT");
        String sub = UUID.randomUUID().toString();
        crearUsuario(sub, "admin@test.com", rolAdmin);
        String token = generarToken(sub, "admin@test.com");

        // Intento con precio negativo
        ObjectNode payloadPrecioNeg = crearPayloadValido("Parlante BT", new BigDecimal("-1.00"), "https://img.com/parlante.png");
        mockMvc.perform(put("/api/productos/" + p.getIdProducto())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadPrecioNeg)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("El precio no puede ser negativo")));

        // Intento con enlace no http/https
        ObjectNode payloadEnlaceInvalido = crearPayloadValido("Parlante BT", new BigDecimal("50.00"), "ftp://servidor.com/foto.jpg");
        mockMvc.perform(put("/api/productos/" + p.getIdProducto())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadEnlaceInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Los enlaces deben empezar por http o https")));
    }
}
