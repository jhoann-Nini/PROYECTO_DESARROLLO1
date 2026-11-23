package com.example.backend.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Categoria;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Caso 6, prioridad media: señales de spam (teléfono y mismo texto en varios
 * productos) y contador de pendientes del panel de moderación.
 */
@SpringBootTest
@Transactional
@DisplayName("Señales de spam y contador de pendientes")
class SenalesSpamYContadorIntegrationTest {

    private static final String RESUMEN = "/api/moderacion/pendientes/resumen";
    private static final String COLA = "/api/moderacion/resenas/en-revision";
    private static final String TEXTO_LARGO =
            "Excelente equipo, la batería dura todo el día y la cámara es muy buena";

    @Autowired private WebApplicationContext context;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRolRepository usuarioRolRepository;
    @Autowired private ResenaRepository resenaRepository;

    private MockMvc mockMvc;
    private Categoria categoria;
    private Marca marca;
    private Producto producto;
    private Producto otroProducto;
    private Usuario autor;
    private Usuario moderador;
    private Usuario usuarioNormal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        categoria = new Categoria();
        categoria.setNombre("Spam " + UUID.randomUUID());
        categoria.setDescripcion("Categoria de prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);

        marca = new Marca();
        marca.setNombre("Marca " + UUID.randomUUID());
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        producto = producto();
        otroProducto = producto();

        Rol rolUsuario = rol("Usuario registrado");
        autor = usuario("Autor", rolUsuario);
        usuarioNormal = usuario("Usuario normal", rolUsuario);
        moderador = usuario("Moderador", rol("Moderador"));
    }

    @Test
    @DisplayName("El mismo texto largo en un segundo producto queda en revisión con su motivo")
    void mismoTextoEnOtroProductoQuedaEnRevision() throws Exception {
        publicar(producto, TEXTO_LARGO)
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
        String respuesta = publicar(otroProducto, TEXTO_LARGO.toUpperCase())
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"))
                .andReturn().getResponse().getContentAsString();
        long idCopia = Long.parseLong(respuesta.replaceAll(".*\"idResena\":(\\d+).*", "$1"));

        mockMvc.perform(get(COLA).with(como(moderador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idResena == " + idCopia + ")].motivosDeteccion[0]")
                        .value("Texto idéntico a otra reseña del mismo autor"));
    }

    @Test
    @DisplayName("Un texto corto repetido en varios productos se publica")
    void textoCortoRepetidoSePublica() throws Exception {
        publicar(producto, "Excelente producto, muy recomendado")
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
        publicar(otroProducto, "Excelente producto, muy recomendado")
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
    }

    @Test
    @DisplayName("Editar una reseña publicada para copiar otra del mismo autor la devuelve a revisión")
    void edicionQueCopiaOtraResenaVuelveARevision() throws Exception {
        publicar(producto, TEXTO_LARGO);
        Resena segunda = resena(otroProducto, "Buen precio y llegó rápido", EstadoModeracion.PUBLICADA);

        mockMvc.perform(put("/api/resenas/" + segunda.getIdResena()).with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"" + TEXTO_LARGO + "\",\"puntuacion\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
    }

    @Test
    @DisplayName("Un comentario con teléfono queda en revisión con su motivo")
    void comentarioConTelefonoQuedaEnRevision() throws Exception {
        String respuesta = publicar(producto, "Te lo vendo más barato, escríbeme al 300 123 4567")
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"))
                .andReturn().getResponse().getContentAsString();
        long id = Long.parseLong(respuesta.replaceAll(".*\"idResena\":(\\d+).*", "$1"));

        mockMvc.perform(get(COLA).with(como(moderador)))
                .andExpect(jsonPath("$[?(@.idResena == " + id + ")].motivosDeteccion[0]")
                        .value("Contiene un número de teléfono"));
    }

    @Test
    @DisplayName("Un precio en pesos no se confunde con un teléfono")
    void precioNoEsTelefono() throws Exception {
        publicar(producto, "Lo compré en $1.299.000 y vale cada peso")
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
    }

    @Test
    @DisplayName("El resumen exige autenticación")
    void resumenSinTokenDevuelve401() throws Exception {
        mockMvc.perform(get(RESUMEN)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un usuario sin rol de moderación no ve el resumen")
    void resumenUsuarioNormalDevuelve403() throws Exception {
        mockMvc.perform(get(RESUMEN).with(como(usuarioNormal))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("El resumen cuenta la revisión automática y los reportes abiertos")
    void resumenCuentaPendientes() throws Exception {
        long revisionAntes = resenaRepository.countPendientesDeRevision();
        String antes = mockMvc.perform(get(RESUMEN).with(como(moderador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisionAutomatica").value((int) revisionAntes))
                .andReturn().getResponse().getContentAsString();
        int reportesAntes = Integer.parseInt(antes.replaceAll(".*\"reportesResenas\":(\\d+).*", "$1"));
        int totalAntes = Integer.parseInt(antes.replaceAll(".*\"total\":(\\d+).*", "$1"));

        resena(producto, "Visita www.ejemplo.com", EstadoModeracion.PENDIENTE);
        Resena publicada = resena(otroProducto, "Muy buen producto", EstadoModeracion.PUBLICADA);
        mockMvc.perform(post("/api/resenas/" + publicada.getIdResena() + "/reportes").with(como(usuarioNormal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"spam\",\"descripcion\":\"Publicidad\"}"))
                .andExpect(status().is2xxSuccessful());

        mockMvc.perform(get(RESUMEN).with(como(moderador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revisionAutomatica").value((int) revisionAntes + 1))
                .andExpect(jsonPath("$.reportesResenas").value(reportesAntes + 1))
                .andExpect(jsonPath("$.total").value(totalAntes + 2));
    }

    private org.springframework.test.web.servlet.ResultActions publicar(Producto destino, String comentario)
            throws Exception {
        return mockMvc.perform(post("/api/resenas").with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + destino.getIdProducto()
                                + ",\"comentario\":\"" + comentario + "\",\"puntuacion\":4}"))
                .andExpect(status().isCreated());
    }

    private Producto producto() {
        Producto p = new Producto();
        p.setNombre("Producto spam " + UUID.randomUUID());
        p.setDescripcion("Producto de prueba");
        p.setCategoria(categoria);
        p.setMarca(marca);
        p.setPrecioReferencia(new BigDecimal("1000000"));
        p.setEstado(true);
        return productoRepository.save(p);
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
        u.setCorreo("spam_" + UUID.randomUUID() + "@tecreview.test");
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

    private Resena resena(Producto destino, String comentario, EstadoModeracion estado) {
        Resena r = new Resena();
        r.setProducto(destino);
        r.setUsuario(autor);
        r.setComentario(comentario);
        r.setPuntuacion(4);
        r.setEstado(true);
        r.setEstadoModeracion(estado);
        r.setFechaCreacion(LocalDateTime.now());
        return resenaRepository.saveAndFlush(r);
    }
}
