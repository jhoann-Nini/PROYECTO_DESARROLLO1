package com.example.backend.controller;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.config.SecurityConfig;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.junit.jupiter.api.Assertions;
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
 * Pruebas de integración de seguridad dedicadas a la tarea S2-19:
 * "Validar la propiedad de las reseñas en el backend".
 *
 * Verifica que solo el autor legítimo pueda modificar su reseña,
 * que solo el autor o un Administrador puedan eliminarla,
 * que usuarios inactivos no puedan operar, y que no exista suplantación de identidad.
 */
@SpringBootTest
@Transactional
class ResenaPropiedadIntegrationTest {

    private static final String TEST_ISSUER = "https://xjepyqdynspdekuixuoe.supabase.co/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";

    private static final String SUB_AUTOR = "11111111-1111-1111-1111-111111111111";
    private static final String SUB_IMPOSTOR = "22222222-2222-2222-2222-222222222222";
    private static final String SUB_ADMIN = "33333333-3333-3333-3333-333333333333";
    private static final String SUB_INACTIVO = "44444444-4444-4444-4444-444444444444";

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
    private ResenaRepository resenaRepository;

    private MockMvc mockMvc;
    private Long idProductoValido;
    private Long idOtroProducto;
    private Long idUsuarioAutor;
    private Long idUsuarioImpostor;
    private Long idUsuarioInactivo;
    private Long idResenaAutor;

    @BeforeAll
    static void initKeys() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));

        KeyPair testKeyPair = kpg.generateKeyPair();
        testPublicKey = (ECPublicKey) testKeyPair.getPublic();
        testPrivateKey = (ECPrivateKey) testKeyPair.getPrivate();

        testJwk = new ECKey.Builder(Curve.P_256, testPublicKey)
                .keyID("test-propiedad-es256-key")
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
    void setUp() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac)
                .apply(springSecurity())
                .build();

        Categoria cat = new Categoria();
        cat.setNombre("Categoria Propiedad " + System.nanoTime());
        cat = categoriaRepository.save(cat);

        Marca marca = new Marca();
        marca.setNombre("Marca Propiedad " + System.nanoTime());
        marca = marcaRepository.save(marca);

        Producto prod1 = new Producto();
        prod1.setNombre("Producto Test Propiedad 1");
        prod1.setMarca(marca);
        prod1.setCategoria(cat);
        prod1.setPrecioReferencia(new BigDecimal("1200000.00"));
        prod1.setEstado(true);
        idProductoValido = productoRepository.save(prod1).getIdProducto();

        Producto prod2 = new Producto();
        prod2.setNombre("Producto Test Propiedad 2");
        prod2.setMarca(marca);
        prod2.setCategoria(cat);
        prod2.setPrecioReferencia(new BigDecimal("850000.00"));
        prod2.setEstado(true);
        idOtroProducto = productoRepository.save(prod2).getIdProducto();

        Rol rolUsuario = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Usuario registrado");
            r.setDescripcion("Rol base");
            return rolRepository.save(r);
        });

        Rol rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol admin");
            return rolRepository.save(r);
        });

        // 1. Autor legítimo
        Usuario autor = new Usuario();
        autor.setNombre("Autor Original");
        autor.setCorreo("autor@example.com");
        autor.setSupabaseUid(SUB_AUTOR);
        autor.setRol(rolUsuario);
        asignarRolActivo(autor, rolUsuario);
        autor.setEstado(true);
        autor.setFechaRegistro(LocalDateTime.now());
        idUsuarioAutor = usuarioRepository.save(autor).getIdUsuario();

        // 2. Impostor (otro usuario registrado)
        Usuario impostor = new Usuario();
        impostor.setNombre("Usuario Impostor");
        impostor.setCorreo("impostor@example.com");
        impostor.setSupabaseUid(SUB_IMPOSTOR);
        impostor.setRol(rolUsuario);
        asignarRolActivo(impostor, rolUsuario);
        impostor.setEstado(true);
        impostor.setFechaRegistro(LocalDateTime.now());
        idUsuarioImpostor = usuarioRepository.save(impostor).getIdUsuario();

        // 3. Administrador
        Usuario admin = new Usuario();
        admin.setNombre("Admin Moderador");
        admin.setCorreo("admin@example.com");
        admin.setSupabaseUid(SUB_ADMIN);
        admin.setRol(rolAdmin);
        asignarRolActivo(admin, rolAdmin);
        admin.setEstado(true);
        admin.setFechaRegistro(LocalDateTime.now());
        usuarioRepository.save(admin);

        // 4. Usuario inactivo
        Usuario inactivo = new Usuario();
        inactivo.setNombre("Usuario Inactivo");
        inactivo.setCorreo("inactivo@example.com");
        inactivo.setSupabaseUid(SUB_INACTIVO);
        inactivo.setRol(rolUsuario);
        asignarRolActivo(inactivo, rolUsuario);
        inactivo.setEstado(false);
        inactivo.setFechaRegistro(LocalDateTime.now());
        idUsuarioInactivo = usuarioRepository.save(inactivo).getIdUsuario();

        // Crear una reseña inicial perteneciente al autor legítimo
        Resena resena = new Resena();
        resena.setProducto(prod1);
        resena.setUsuario(autor);
        resena.setComentario("Reseña legítima creada por el autor.");
        resena.setPuntuacion(5);
        resena.setEstado(true);
        resena.setFechaCreacion(LocalDateTime.now());
        idResenaAutor = resenaRepository.save(resena).getIdResena();
    }

    private void asignarRolActivo(Usuario usuario, Rol rol) {
        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setRol(rol);
        asignacion.setEstado(true);
        asignacion.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(asignacion);
    }

    private String generarToken(String sub, String email) throws Exception {
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .type(JOSEObjectType.JWT)
                .keyID(testJwk.getKeyID())
                .build();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(TEST_ISSUER)
                .subject(sub)
                .audience(TEST_AUDIENCE)
                .claim("email", email)
                .claim("user_metadata", Map.of("full_name", "Test User"))
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3600000))
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claims);
        signedJWT.sign(new ECDSASigner(testPrivateKey));
        return signedJWT.serialize();
    }

    // =========================================================================
    // S2-19: Validaciones de propiedad en actualización (PUT)
    // =========================================================================

    @Test
    @DisplayName("[S2-19/S2-20] PUT /api/resenas/{id} por otro usuario devuelve 403 Forbidden")
    void putResena_usuarioNoAutor_devuelve403Forbidden_S2_19() throws Exception {
        String tokenImpostor = generarToken(SUB_IMPOSTOR, "impostor@example.com");

        mockMvc.perform(put("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenImpostor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento indebido de editar reseña ajena\",\"puntuacion\":1}"))
                .andExpect(status().isForbidden());

        // Verificar en BD que la reseña del autor NO cambió
        Resena resenaBd = resenaRepository.findById(idResenaAutor).orElseThrow();
        Assertions.assertEquals("Reseña legítima creada por el autor.", resenaBd.getComentario());
        Assertions.assertEquals(5, resenaBd.getPuntuacion());
    }

    @Test
    @DisplayName("[S2-19] PUT /api/productos/{idProducto}/resenas/{idResena} por otro usuario devuelve 403 Forbidden")
    void putResenaAnidada_usuarioNoAutor_devuelve403Forbidden_S2_19() throws Exception {
        String tokenImpostor = generarToken(SUB_IMPOSTOR, "impostor@example.com");

        mockMvc.perform(put("/api/productos/" + idProductoValido + "/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenImpostor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento indebido en ruta anidada\",\"puntuacion\":2}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-19/S2-20] PUT /api/resenas/{id} por el autor legítimo actualiza exitosamente y devuelve 200 OK")
    void putResena_autorLegitimo_actualizaExitosamente_S2_19() throws Exception {
        String tokenAutor = generarToken(SUB_AUTOR, "autor@example.com");

        mockMvc.perform(put("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Comentario editado por su autor real\",\"puntuacion\":4}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(idResenaAutor))
                .andExpect(jsonPath("$.comentario").value("Comentario editado por su autor real"))
                .andExpect(jsonPath("$.puntuacion").value(4))
                .andExpect(jsonPath("$.idUsuario").value(idUsuarioAutor));

        Resena resenaBd = resenaRepository.findById(idResenaAutor).orElseThrow();
        Assertions.assertEquals("Comentario editado por su autor real", resenaBd.getComentario());
        Assertions.assertEquals(4, resenaBd.getPuntuacion());
    }

    @Test
    @DisplayName("[S2-19] PUT /api/resenas/{id} por un usuario inactivo devuelve 403 Forbidden")
    void putResena_usuarioInactivo_devuelve403Forbidden_S2_19() throws Exception {
        // Asignar la reseña al usuario inactivo para probar que aunque sea el autor, si está inactivo no puede editar
        Resena resenaInactivo = new Resena();
        resenaInactivo.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resenaInactivo.setUsuario(usuarioRepository.findById(idUsuarioInactivo).orElseThrow());
        resenaInactivo.setComentario("Reseña previa de usuario luego suspendido");
        resenaInactivo.setPuntuacion(3);
        resenaInactivo.setEstado(true);
        resenaInactivo.setFechaCreacion(LocalDateTime.now());
        Long idResenaInactivo = resenaRepository.save(resenaInactivo).getIdResena();

        String tokenInactivo = generarToken(SUB_INACTIVO, "inactivo@example.com");

        mockMvc.perform(put("/api/resenas/" + idResenaInactivo)
                        .header("Authorization", "Bearer " + tokenInactivo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento de edición por cuenta inactiva\"}"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // S2-19: Validaciones de propiedad en eliminación (DELETE)
    // =========================================================================

    @Test
    @DisplayName("[S2-19/S2-20] DELETE /api/resenas/{id} por otro usuario devuelve 403 Forbidden")
    void deleteResena_usuarioNoAutor_devuelve403Forbidden_S2_19() throws Exception {
        String tokenImpostor = generarToken(SUB_IMPOSTOR, "impostor@example.com");

        mockMvc.perform(delete("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenImpostor))
                .andExpect(status().isForbidden());

        // Verificar en BD que la reseña sigue activa
        Resena resenaBd = resenaRepository.findById(idResenaAutor).orElseThrow();
        Assertions.assertTrue(resenaBd.getEstado());
    }

    @Test
    @DisplayName("[S2-19] DELETE /api/productos/{idProducto}/resenas/{idResena} por otro usuario devuelve 403 Forbidden")
    void deleteResenaAnidada_usuarioNoAutor_devuelve403Forbidden_S2_19() throws Exception {
        String tokenImpostor = generarToken(SUB_IMPOSTOR, "impostor@example.com");

        mockMvc.perform(delete("/api/productos/" + idProductoValido + "/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenImpostor))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-19/S2-20] DELETE /api/resenas/{id} por el autor legítimo desactiva la reseña y devuelve 204 No Content")
    void deleteResena_autorLegitimo_eliminaExitosamente_S2_19() throws Exception {
        String tokenAutor = generarToken(SUB_AUTOR, "autor@example.com");

        mockMvc.perform(delete("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAutor))
                .andExpect(status().isNoContent());

        Resena resenaBd = resenaRepository.findById(idResenaAutor).orElseThrow();
        Assertions.assertFalse(resenaBd.getEstado(), "La reseña debe ser desactivada lógicamente");
    }

    @Test
    @DisplayName("[S2-19] DELETE /api/resenas/{id} por Administrador elimina exitosamente reseña ajena (moderación) con 204 No Content")
    void deleteResena_administrador_eliminaExitosamenteResenaAjena_S2_19() throws Exception {
        String tokenAdmin = generarToken(SUB_ADMIN, "admin@example.com");

        mockMvc.perform(delete("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNoContent());

        Resena resenaBd = resenaRepository.findById(idResenaAutor).orElseThrow();
        Assertions.assertFalse(resenaBd.getEstado());
    }

    @Test
    @DisplayName("[S2-19] DELETE /api/resenas/{id} por usuario inactivo devuelve 403 Forbidden")
    void deleteResena_usuarioInactivo_devuelve403Forbidden_S2_19() throws Exception {
        Resena resenaInactivo = new Resena();
        resenaInactivo.setProducto(productoRepository.findById(idProductoValido).orElseThrow());
        resenaInactivo.setUsuario(usuarioRepository.findById(idUsuarioInactivo).orElseThrow());
        resenaInactivo.setComentario("Reseña de usuario inactivo");
        resenaInactivo.setPuntuacion(2);
        resenaInactivo.setEstado(true);
        resenaInactivo.setFechaCreacion(LocalDateTime.now());
        Long idResenaInactivo = resenaRepository.save(resenaInactivo).getIdResena();

        String tokenInactivo = generarToken(SUB_INACTIVO, "inactivo@example.com");

        mockMvc.perform(delete("/api/resenas/" + idResenaInactivo)
                        .header("Authorization", "Bearer " + tokenInactivo))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // S2-19: Validaciones de producto disconforme y peticiones anónimas
    // =========================================================================

    @Test
    @DisplayName("[S2-19] PUT anónimo devuelve 401 Unauthorized")
    void putResena_anonimo_devuelve401Unauthorized_S2_19() throws Exception {
        mockMvc.perform(put("/api/resenas/" + idResenaAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento anónimo\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("[S2-19] DELETE anónimo devuelve 401 Unauthorized")
    void deleteResena_anonimo_devuelve401Unauthorized_S2_19() throws Exception {
        mockMvc.perform(delete("/api/resenas/" + idResenaAutor))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("[S2-19] PUT sobre producto disconforme por Administrador devuelve 404 Not Found")
    void putResena_productoDisconforme_devuelve404NotFound_S2_19() throws Exception {
        String tokenAdmin = generarToken(SUB_ADMIN, "admin@example.com");

        mockMvc.perform(put("/api/productos/" + idOtroProducto + "/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Producto no coincide\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("[S2-19] DELETE sobre producto disconforme por Administrador devuelve 404 Not Found")
    void deleteResena_productoDisconforme_devuelve404NotFound_S2_19() throws Exception {
        String tokenAdmin = generarToken(SUB_ADMIN, "admin@example.com");

        mockMvc.perform(delete("/api/productos/" + idOtroProducto + "/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // S2-19: Validaciones en creación (POST)
    // =========================================================================

    @Test
    @DisplayName("[S2-19] POST /api/resenas asocia irrevocablemente la reseña al usuario del token JWT")
    void postResena_propiedadVinculadaExclusivamenteAJwt_S2_19() throws Exception {
        String tokenAutor = generarToken(SUB_AUTOR, "autor@example.com");

        // Aunque se intentara inyectar otro usuario en el cuerpo JSON, el backend solo toma la identidad del JWT
        String respuesta = mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idOtroProducto + ",\"comentario\":\"Nueva reseña autorizada\",\"puntuacion\":5,\"idUsuario\":999}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = new ObjectMapper().readTree(respuesta);
        long idNuevaResena = json.get("idResena").asLong();

        Resena resenaGuardada = resenaRepository.findById(idNuevaResena).orElseThrow();
        Assertions.assertEquals(idUsuarioAutor, resenaGuardada.getUsuario().getIdUsuario(),
                "La propiedad debe pertenecer exclusivamente al usuario autenticado por JWT");
    }

    // =========================================================================
    // S2-20: Pruebas específicas de permisos de edición y eliminación
    // =========================================================================

    @Test
    @DisplayName("[S2-20] PUT /api/resenas/{id} por Administrador no autor devuelve 403 Forbidden")
    void putResena_administradorNoAutor_devuelve403Forbidden_S2_20() throws Exception {
        String tokenAdmin = generarToken(SUB_ADMIN, "admin@example.com");

        mockMvc.perform(put("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento de administrador de alterar reseña ajena\"}"))
                .andExpect(status().isForbidden());

        Resena resenaBd = resenaRepository.findById(idResenaAutor).orElseThrow();
        Assertions.assertEquals("Reseña legítima creada por el autor.", resenaBd.getComentario());
    }

    @Test
    @DisplayName("[S2-20] PUT /api/resenas/{id} sobre reseña eliminada (estado=false) devuelve 404 Not Found")
    void putResena_resenaEliminada_devuelve404NotFound_S2_20() throws Exception {
        Resena resena = resenaRepository.findById(idResenaAutor).orElseThrow();
        resena.setEstado(false);
        resenaRepository.save(resena);

        String tokenAutor = generarToken(SUB_AUTOR, "autor@example.com");

        mockMvc.perform(put("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAutor)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento de revivir o editar reseña eliminada\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("[S2-20] DELETE /api/resenas/{id} sobre reseña ya eliminada devuelve 404 Not Found")
    void deleteResena_resenaYaEliminada_devuelve404NotFound_S2_20() throws Exception {
        Resena resena = resenaRepository.findById(idResenaAutor).orElseThrow();
        resena.setEstado(false);
        resenaRepository.save(resena);

        String tokenAutor = generarToken(SUB_AUTOR, "autor@example.com");

        mockMvc.perform(delete("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer " + tokenAutor))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("[S2-20] PUT /api/resenas/{id} con token Bearer inválido o malformado devuelve 401 Unauthorized")
    void putResena_tokenInvalido_devuelve401Unauthorized_S2_20() throws Exception {
        mockMvc.perform(put("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer token_completamente_invalido_12345")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Intento con token corrupto\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"));
    }

    @Test
    @DisplayName("[S2-20] DELETE /api/resenas/{id} con token Bearer inválido devuelve 401 Unauthorized")
    void deleteResena_tokenInvalido_devuelve401Unauthorized_S2_20() throws Exception {
        mockMvc.perform(delete("/api/resenas/" + idResenaAutor)
                        .header("Authorization", "Bearer token_falso_invalido"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"));
    }

    @Test
    @DisplayName("[S2-19] POST /api/resenas por usuario inactivo devuelve 403 Forbidden")
    void postResena_usuarioInactivo_devuelve403Forbidden_S2_19() throws Exception {
        String tokenInactivo = generarToken(SUB_INACTIVO, "inactivo@example.com");

        mockMvc.perform(post("/api/resenas")
                        .header("Authorization", "Bearer " + tokenInactivo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + idOtroProducto + ",\"comentario\":\"Intento de publicar por cuenta inactiva\",\"puntuacion\":4}"))
                .andExpect(status().isForbidden());
    }
}
