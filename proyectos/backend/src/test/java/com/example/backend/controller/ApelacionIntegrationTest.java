package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

import com.example.backend.entity.Apelacion;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.ApelacionRepository;
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
import java.util.UUID;
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
 * Caso 6, apelaciones: creación y consulta de las propias (Tarea 2) y
 * resolución por moderadores (Tarea 3). En H2 no corren los triggers de la
 * 026: las reglas que se prueban aquí son las del servicio.
 */
@SpringBootTest
@Transactional
@DisplayName("Apelaciones de decisiones de moderación")
class ApelacionIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRolRepository usuarioRolRepository;
    @Autowired private ResenaRepository resenaRepository;
    @Autowired private ResenaModeracionAuditoriaRepository auditoriaRepository;
    @Autowired private ApelacionRepository apelacionRepository;

    private MockMvc mockMvc;
    private Categoria categoria;
    private Marca marca;
    private Usuario autor;
    private Usuario otroUsuario;
    private Usuario moderador;
    private Usuario moderador2;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        categoria = new Categoria();
        categoria.setNombre("Apelaciones " + UUID.randomUUID());
        categoria.setDescripcion("Categoria de prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);
        marca = new Marca();
        marca.setNombre("Marca " + UUID.randomUUID());
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        Rol rolUsuario = rol("Usuario registrado");
        autor = usuario("Autor que apela", rolUsuario);
        otroUsuario = usuario("Otro usuario", rolUsuario);
        moderador = usuario("Moderador original", rol("Moderador"));
        moderador2 = usuario("Otro moderador", rol("Moderador"));
    }

    // ---------- Crear ----------

    @Test
    @DisplayName("El autor apela un rechazo")
    void creaApelacionSobreRechazo201() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 1);

        apelar(autor, r, "No era ofensivo, describía el producto")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.motivo").value("No era ofensivo, describía el producto"));
    }

    @Test
    @DisplayName("Un rechazo se puede apelar aunque la reseña se haya editado después")
    void apelaUnRechazoAunqueLaResenaSeHayaEditado() throws Exception {
        Resena r = resena(autor, EstadoModeracion.PENDIENTE, true);
        decision(r, "RECHAZAR", 2);

        apelar(autor, r, "La falta no corresponde").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Una decisión solo se apela una vez")
    void segundaApelacionMismaDecision409() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 1);
        apelar(autor, r, "Primera").andExpect(status().isCreated());

        apelar(autor, r, "Segunda").andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Pasados 15 días no se puede apelar")
    void fueraDePlazo409() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 16);

        apelar(autor, r, "Tarde")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("15 días")));
    }

    @Test
    @DisplayName("No se apela una reseña ajena")
    void resenaAjena403() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 1);

        apelar(otroUsuario, r, "No es mía").andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("No se apela una reseña eliminada")
    void resenaEliminada404() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, false);
        decision(r, "RECHAZAR", 1);

        apelar(autor, r, "Eliminada").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Sin un rechazo u ocultamiento no hay nada que apelar")
    void sinDecisionApelable409() throws Exception {
        Resena r = resena(autor, EstadoModeracion.PUBLICADA, true);
        decision(r, "APROBAR", 1);

        apelar(autor, r, "Nada").andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Un ocultamiento ya restaurado no se apela")
    void ocultamientoYaRestaurado409() throws Exception {
        Resena r = resena(autor, EstadoModeracion.PUBLICADA, true);
        decision(r, "OCULTAR", 3);

        apelar(autor, r, "Ya está visible")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("restaurada")));
    }

    @Test
    @DisplayName("El motivo es obligatorio")
    void motivoVacio400() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 1);

        apelar(autor, r, "   ").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Una cuenta suspendida no apela")
    void cuentaSuspendida403() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 1);
        autor.setEstado(false);
        usuarioRepository.saveAndFlush(autor);

        apelar(autor, r, "Suspendido").andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un usuario bloqueado por reincidencia sí puede apelar")
    void bloqueadoPorReincidenciaPuedeApelar201() throws Exception {
        Resena r1 = resena(autor, EstadoModeracion.RECHAZADA, true);
        Resena r2 = resena(autor, EstadoModeracion.RECHAZADA, true);
        Resena r3 = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r1, "RECHAZAR", 1);
        decision(r2, "RECHAZAR", 2);
        decision(r3, "RECHAZAR", 3);

        apelar(autor, r1, "Esta falta es un error").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Se apela la decisión más reciente de la reseña")
    void apelaLaDecisionMasReciente() throws Exception {
        Resena r = resena(autor, EstadoModeracion.RECHAZADA, true);
        decision(r, "RECHAZAR", 5);
        ResenaModeracionAuditoria reciente = decision(r, "RECHAZAR", 1);

        apelar(autor, r, "La última").andExpect(status().isCreated());
        assertTrue(apelacionRepository.findByDecisionIdAuditoria(reciente.getIdAuditoria()).isPresent());
    }

    @Test
    @DisplayName("El autor ve sus decisiones con plazo y su apelación")
    void miasListaDecisionesConPlazoYApelacion() throws Exception {
        Resena apelada = resena(autor, EstadoModeracion.RECHAZADA, true);
        ResenaModeracionAuditoria dApelada = decision(apelada, "RECHAZAR", 1);
        Resena sinApelar = resena(autor, EstadoModeracion.RECHAZADA, true);
        ResenaModeracionAuditoria dSinApelar = decision(sinApelar, "RECHAZAR", 2);
        apelar(autor, apelada, "Revisen por favor").andExpect(status().isCreated());

        mockMvc.perform(get("/api/apelaciones/mias").with(como(autor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.idAuditoria == " + dApelada.getIdAuditoria() + ")].apelacion.estado")
                        .value(org.hamcrest.Matchers.hasItem("PENDIENTE")))
                .andExpect(jsonPath("$[?(@.idAuditoria == " + dApelada.getIdAuditoria() + ")].apelable")
                        .value(org.hamcrest.Matchers.hasItem(false)))
                .andExpect(jsonPath("$[?(@.idAuditoria == " + dSinApelar.getIdAuditoria() + ")].apelable")
                        .value(org.hamcrest.Matchers.hasItem(true)))
                .andExpect(jsonPath("$[?(@.idAuditoria == " + dSinApelar.getIdAuditoria() + ")].plazoHasta").exists())
                .andExpect(jsonPath("$[?(@.idAuditoria == " + dSinApelar.getIdAuditoria() + ")].comentarioRevisado")
                        .value(org.hamcrest.Matchers.hasItem("Contenido revisado")));
    }

    @Test
    @DisplayName("Consultar las propias exige autenticación")
    void miasSinToken401() throws Exception {
        mockMvc.perform(get("/api/apelaciones/mias")).andExpect(status().isUnauthorized());
    }

    // ---------- Utilidades ----------

    private ResultActions apelar(Usuario quien, Resena r, String motivo) throws Exception {
        return mockMvc.perform(post("/api/apelaciones").with(como(quien))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idResena\":" + r.getIdResena() + ",\"motivo\":\"" + motivo + "\"}"));
    }

    private Resena resena(Usuario usuario, EstadoModeracion estado, boolean activa) {
        Resena r = new Resena();
        r.setProducto(producto());
        r.setUsuario(usuario);
        r.setComentario("Comentario de prueba");
        r.setPuntuacion(3);
        r.setEstado(activa);
        r.setEstadoModeracion(estado);
        r.setFechaCreacion(LocalDateTime.now().minusDays(30));
        return resenaRepository.saveAndFlush(r);
    }

    /** Registra una decisión del moderador original hace {@code dias} días. */
    private ResenaModeracionAuditoria decision(Resena r, String accion, int dias) {
        ResenaModeracionAuditoria e = new ResenaModeracionAuditoria();
        e.setResena(r);
        e.setModerador(moderador);
        e.setAccion(accion);
        e.setMotivo("Motivo de la decisión");
        e.setComentarioRevisado("Contenido revisado");
        e.setFechaEvento(LocalDateTime.now().minusDays(dias));
        return auditoriaRepository.saveAndFlush(e);
    }

    private void ocultar(Resena r) {
        r.setOcultaPorModeracion(true);
        r.setModeradaPor(moderador);
        r.setFechaModeracion(LocalDateTime.now());
        r.setMotivoModeracion("Incumple las normas");
        resenaRepository.saveAndFlush(r);
    }

    private Producto producto() {
        Producto p = new Producto();
        p.setNombre("Producto apelación " + UUID.randomUUID());
        p.setDescripcion("Producto de prueba");
        p.setCategoria(categoria);
        p.setMarca(marca);
        p.setPrecioReferencia(new BigDecimal("1000000"));
        p.setEstado(true);
        return productoRepository.save(p);
    }

    private Resena resena(Usuario usuario, Producto destino, String comentario, EstadoModeracion estado, boolean activa) {
        Resena r = new Resena();
        r.setProducto(destino);
        r.setUsuario(usuario);
        r.setComentario(comentario);
        r.setPuntuacion(4);
        r.setEstado(activa);
        r.setEstadoModeracion(estado);
        r.setFechaCreacion(LocalDateTime.now().minusDays(100));
        return resenaRepository.saveAndFlush(r);
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
        u.setCorreo("apel_" + UUID.randomUUID() + "@tecreview.test");
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
