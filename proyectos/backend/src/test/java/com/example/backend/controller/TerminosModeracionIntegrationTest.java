package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Categoria;
import com.example.backend.service.TerminosModeracionCache;
import com.example.backend.entity.EstadoModeracion;
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
import com.example.backend.repository.UsuarioRolRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Caso 6, lista de palabras administrable: endpoints de administración y su
 * efecto en el filtro de reseñas.
 */
@SpringBootTest
@Transactional
@DisplayName("Términos de moderación administrables")
class TerminosModeracionIntegrationTest {

    private static final String BASE = "/api/admin/terminos-moderacion";

    @Autowired private WebApplicationContext context;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRolRepository usuarioRolRepository;
    @Autowired private ResenaRepository resenaRepository;
    @Autowired private TerminosModeracionCache cache;

    private MockMvc mockMvc;
    private Producto producto;
    private Usuario administrador;
    private Usuario moderador;
    private Usuario autor;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        Categoria categoria = new Categoria();
        categoria.setNombre("Términos " + UUID.randomUUID());
        categoria.setDescripcion("Categoria de prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);
        Marca marca = new Marca();
        marca.setNombre("Marca " + UUID.randomUUID());
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);
        producto = new Producto();
        producto.setNombre("Producto términos " + UUID.randomUUID());
        producto.setDescripcion("Producto de prueba");
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setPrecioReferencia(new BigDecimal("1000000"));
        producto.setEstado(true);
        producto = productoRepository.save(producto);

        administrador = usuario("Administrador", rol("Administrador"));
        moderador = usuario("Moderador", rol("Moderador"));
        autor = usuario("Autor", rol("Usuario registrado"));
    }

    /** La caché es compartida entre pruebas y las transacciones se deshacen. */
    @AfterEach
    void limpiarCache() {
        cache.invalidar();
    }

    @Test
    @DisplayName("Un administrador agrega un término")
    void creaTermino201() throws Exception {
        crear("Imbécil", "INSULTO")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.termino").value("Imbécil"))
                .andExpect(jsonPath("$.categoria").value("INSULTO"))
                .andExpect(jsonPath("$.etiquetaCategoria").value("Insulto"))
                .andExpect(jsonPath("$.activo").value(true))
                .andExpect(jsonPath("$.creadoPor").value("Administrador"));
    }

    @Test
    @DisplayName("No se repite un término activo")
    void duplicadoActivo409() throws Exception {
        crear("imbécil", "INSULTO").andExpect(status().isCreated());

        crear("IMBECIL", "ACOSO")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("ya está activo")));
    }

    @Test
    @DisplayName("No se agrega un término de la lista base")
    void terminoDeListaBase409() throws Exception {
        crear("Idiota", "INSULTO")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("lista base")));
    }

    @Test
    @DisplayName("Un término sin letras se rechaza")
    void terminoSinLetras400() throws Exception {
        crear("$$", "SPAM").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Una categoría desconocida se rechaza")
    void categoriaDesconocida400() throws Exception {
        crear("imbécil", "OTRA").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Un moderador no administra la lista")
    void moderador403() throws Exception {
        mockMvc.perform(post(BASE).with(como(moderador)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"termino\":\"imbécil\",\"categoria\":\"INSULTO\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(BASE).with(como(moderador))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("La lista exige autenticación")
    void sinToken401() throws Exception {
        mockMvc.perform(get(BASE)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Desactivar funciona una sola vez")
    void desactivar200YDosVeces409() throws Exception {
        long id = idDe(crear("imbécil", "INSULTO"));

        desactivar(id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false))
                .andExpect(jsonPath("$.desactivadoPor").value("Administrador"));
        desactivar(id).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Un término desactivado se puede volver a agregar")
    void reagregarTrasDesactivar201() throws Exception {
        desactivar(idDe(crear("imbécil", "INSULTO")));

        crear("imbécil", "INSULTO").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("La lista filtra por estado")
    void listarFiltraPorEstado() throws Exception {
        long activo = idDe(crear("imbécil", "INSULTO"));
        long inactivo = idDe(crear("gana dinero desde casa", "SPAM"));
        desactivar(inactivo);

        mockMvc.perform(get(BASE).with(como(administrador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].idTermino").value(hasItem((int) activo)))
                .andExpect(jsonPath("$[*].idTermino").value(not(hasItem((int) inactivo))));
        mockMvc.perform(get(BASE + "?estado=INACTIVOS").with(como(administrador)))
                .andExpect(jsonPath("$[*].idTermino").value(hasItem((int) inactivo)))
                .andExpect(jsonPath("$[*].idTermino").value(not(hasItem((int) activo))));
        mockMvc.perform(get(BASE + "?estado=TODOS").with(como(administrador)))
                .andExpect(jsonPath("$[*].idTermino").value(hasItem((int) activo)))
                .andExpect(jsonPath("$[*].idTermino").value(hasItem((int) inactivo)));
    }

    @Test
    @DisplayName("Una reseña con un término agregado queda en revisión")
    void resenaConTerminoQuedaPendienteConMotivo() throws Exception {
        crear("imbécil", "INSULTO");

        publicar("El vendedor es un 1mb3cil").andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
    }

    @Test
    @DisplayName("Después de desactivarlo, la reseña se publica sin esperar")
    void trasDesactivarSePublica() throws Exception {
        long id = idDe(crear("imbécil", "INSULTO"));
        publicar("El vendedor es un imbécil").andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
        desactivar(id);

        Producto otro = new Producto();
        otro.setNombre("Otro producto " + UUID.randomUUID());
        otro.setDescripcion("Producto de prueba");
        otro.setCategoria(producto.getCategoria());
        otro.setMarca(producto.getMarca());
        otro.setPrecioReferencia(new BigDecimal("1000000"));
        otro.setEstado(true);
        otro = productoRepository.save(otro);
        mockMvc.perform(post("/api/resenas").with(como(autor)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + otro.getIdProducto()
                                + ",\"comentario\":\"Al final no fue tan imbécil\",\"puntuacion\":4}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
    }

    @Test
    @DisplayName("La cola muestra el término y su categoría")
    void colaMuestraTerminoYCategoria() throws Exception {
        crear("imbécil", "INSULTO");
        long idResena = idResenaDe(publicar("El vendedor es un imbécil"));

        mockMvc.perform(get("/api/moderacion/resenas/en-revision").with(como(moderador)))
                .andExpect(jsonPath("$[?(@.idResena == " + idResena + ")].motivosDeteccion[0]")
                        .value(hasItem("Contiene «imbécil», de la lista de moderación (Insulto)")));
    }

    // ---------- Utilidades ----------

    private ResultActions crear(String termino, String categoria) throws Exception {
        return mockMvc.perform(post(BASE).with(como(administrador)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"termino\":\"" + termino + "\",\"categoria\":\"" + categoria + "\"}"));
    }

    private ResultActions desactivar(long id) throws Exception {
        return mockMvc.perform(put(BASE + "/" + id + "/desactivar").with(como(administrador)));
    }

    private ResultActions publicar(String comentario) throws Exception {
        return mockMvc.perform(post("/api/resenas").with(como(autor)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + producto.getIdProducto()
                                + ",\"comentario\":\"" + comentario + "\",\"puntuacion\":2}"))
                .andExpect(status().isCreated());
    }

    private long idDe(ResultActions r) throws Exception {
        String json = r.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(json.replaceAll(".*\"idTermino\":(\\d+).*", "$1"));
    }

    private long idResenaDe(ResultActions r) throws Exception {
        String json = r.andReturn().getResponse().getContentAsString();
        return Long.parseLong(json.replaceAll(".*\"idResena\":(\\d+).*", "$1"));
    }

    private RequestPostProcessor como(Usuario usuario) {
        return jwt().jwt(b -> b.subject(usuario.getSupabaseUid()).claim("email", usuario.getCorreo()));
    }

    private Rol rol(String nombre) {
        return rolRepository.findByNombre(nombre).orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre(nombre);
            r.setDescripcion(nombre);
            return rolRepository.save(r);
        });
    }

    private Usuario usuario(String nombre, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setCorreo("term_" + UUID.randomUUID() + "@tecreview.test");
        u.setSupabaseUid(UUID.randomUUID().toString());
        u.setRol(rol);
        u.setEstado(true);
        u.setFechaRegistro(LocalDateTime.now());
        u = usuarioRepository.save(u);
        UsuarioRol ur = new UsuarioRol();
        ur.setUsuario(u);
        ur.setRol(rol);
        ur.setEstado(true);
        ur.setFechaAsignacion(LocalDateTime.now());
        u.agregarRol(ur);
        usuarioRolRepository.save(ur);
        return usuarioRepository.save(u);
    }
}
