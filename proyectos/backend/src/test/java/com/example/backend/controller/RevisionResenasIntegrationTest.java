package com.example.backend.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
 * Fase 1 (H-01): revisión humana de reseñas retenidas por el filtro automático.
 * Cubre la cola, la aprobación, el rechazo, la auditoría y la vuelta a revisión
 * cuando el autor edita una reseña rechazada.
 */
@SpringBootTest
@Transactional
@DisplayName("Revisión de reseñas retenidas por el filtro automático")
class RevisionResenasIntegrationTest {

    private static final String BASE = "/api/moderacion/resenas";

    @Autowired private WebApplicationContext context;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRolRepository usuarioRolRepository;
    @Autowired private ResenaRepository resenaRepository;
    @Autowired private ResenaModeracionAuditoriaRepository auditoriaRepository;

    private MockMvc mockMvc;
    private Producto producto;
    private Usuario autor;
    private Usuario moderador;
    private Usuario administrador;
    private Usuario usuarioNormal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        Categoria categoria = new Categoria();
        categoria.setNombre("Revision " + UUID.randomUUID());
        categoria.setDescripcion("Categoria de prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);

        Marca marca = new Marca();
        marca.setNombre("Marca " + UUID.randomUUID());
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        producto = new Producto();
        producto.setNombre("Producto revision " + UUID.randomUUID());
        producto.setDescripcion("Producto de prueba");
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setPrecioReferencia(new BigDecimal("1000000"));
        producto.setEstado(true);
        producto = productoRepository.save(producto);

        Rol rolUsuario = rol("Usuario registrado");
        Rol rolModerador = rol("Moderador");
        Rol rolAdmin = rol("Administrador");

        autor = usuario("Autor", rolUsuario);
        usuarioNormal = usuario("Usuario normal", rolUsuario);
        moderador = usuario("Moderador", rolModerador);
        administrador = usuario("Administrador", rolAdmin);
    }

    @Test
    @DisplayName("El autor publica un comentario con enlace: queda PENDIENTE y no es público")
    void comentarioRetenidoNoEsPublico() throws Exception {
        mockMvc.perform(post("/api/resenas").with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + producto.getIdProducto()
                                + ",\"comentario\":\"Mejor precio en www.tienda-externa.com\",\"puntuacion\":4}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));

        mockMvc.perform(get("/api/productos/" + producto.getIdProducto() + "/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("La cola lista solo las reseñas PENDIENTE con el motivo de retención")
    void colaListaPendientesConMotivos() throws Exception {
        Resena pendiente = resena("Visita www.ejemplo.com", EstadoModeracion.PENDIENTE);
        Resena publicada = resena("Muy buen producto", EstadoModeracion.PUBLICADA);

        mockMvc.perform(get(BASE + "/en-revision").with(como(moderador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].idResena").value(hasItem(pendiente.getIdResena().intValue())))
                .andExpect(jsonPath("$[*].idResena").value(not(hasItem(publicada.getIdResena().intValue()))))
                .andExpect(jsonPath("$[?(@.idResena == " + pendiente.getIdResena() + ")].motivosDeteccion[0]")
                        .value("Contiene un enlace o dominio web"));
    }

    @Test
    @DisplayName("Aprobar publica la reseña y registra quién y cuándo")
    void aprobarPublicaYAudita() throws Exception {
        Resena pendiente = resena("Visita www.ejemplo.com", EstadoModeracion.PENDIENTE);

        mockMvc.perform(put(BASE + "/" + pendiente.getIdResena() + "/revision/aprobar").with(como(moderador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));

        assertEquals(EstadoModeracion.PUBLICADA,
                resenaRepository.findById(pendiente.getIdResena()).orElseThrow().getEstadoModeracion());
        List<ResenaModeracionAuditoria> eventos = auditoriaRepository
                .findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(pendiente.getIdResena());
        assertEquals(1, eventos.size());
        assertEquals("APROBAR", eventos.get(0).getAccion());
        assertEquals(moderador.getIdUsuario(), eventos.get(0).getModerador().getIdUsuario());

        mockMvc.perform(get("/api/productos/" + producto.getIdProducto() + "/resenas"))
                .andExpect(jsonPath("$[*].idResena").value(hasItem(pendiente.getIdResena().intValue())));
    }

    @Test
    @DisplayName("Rechazar exige justificación, marca RECHAZADA y audita")
    void rechazarExigeJustificacion() throws Exception {
        Resena pendiente = resena("eres un idiota", EstadoModeracion.PENDIENTE);
        String url = BASE + "/" + pendiente.getIdResena() + "/revision/rechazar";

        mockMvc.perform(put(url).with(como(administrador))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"   \"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put(url).with(como(administrador))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Insulto directo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoModeracion").value("RECHAZADA"));

        ResenaModeracionAuditoria evento = auditoriaRepository
                .findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(pendiente.getIdResena()).get(0);
        assertEquals("RECHAZAR", evento.getAccion());
        assertEquals("Insulto directo", evento.getMotivo());
    }

    @Test
    @DisplayName("Una reseña ya decidida no se puede volver a decidir (409)")
    void decisionSobreResenaNoPendienteEsConflicto() throws Exception {
        Resena publicada = resena("Muy buen producto", EstadoModeracion.PUBLICADA);

        mockMvc.perform(put(BASE + "/" + publicada.getIdResena() + "/revision/aprobar").with(como(moderador)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Usuario sin rol recibe 403 y anónimo 401")
    void autorizacion() throws Exception {
        Resena pendiente = resena("Visita www.ejemplo.com", EstadoModeracion.PENDIENTE);

        mockMvc.perform(get(BASE + "/en-revision").with(como(usuarioNormal)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(BASE + "/" + pendiente.getIdResena() + "/revision/aprobar").with(como(usuarioNormal)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(BASE + "/en-revision"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un moderador no puede revisar su propia reseña")
    void moderadorNoRevisaSuPropiaResena() throws Exception {
        Resena propia = resena("Visita www.ejemplo.com", EstadoModeracion.PENDIENTE);
        propia.setUsuario(moderador);
        resenaRepository.saveAndFlush(propia);

        mockMvc.perform(put(BASE + "/" + propia.getIdResena() + "/revision/aprobar").with(como(moderador)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Si el autor edita una reseña rechazada, vuelve a revisión y no se publica sola")
    void edicionDeRechazadaVuelveARevision() throws Exception {
        Resena rechazada = resena("eres un idiota", EstadoModeracion.RECHAZADA);

        mockMvc.perform(put("/api/resenas/" + rechazada.getIdResena()).with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Texto corregido y respetuoso\",\"puntuacion\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
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
        u.setCorreo("revision_" + UUID.randomUUID() + "@tecreview.test");
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

    private Resena resena(String comentario, EstadoModeracion estado) {
        Resena r = new Resena();
        r.setProducto(producto);
        r.setUsuario(autor);
        r.setComentario(comentario);
        r.setPuntuacion(4);
        r.setEstado(true);
        r.setEstadoModeracion(estado);
        r.setFechaCreacion(LocalDateTime.now());
        return resenaRepository.saveAndFlush(r);
    }
}
