package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
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
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoEstablecimientoRepository;
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
 * Caso 6, reincidencia: bloqueo, revisión previa, motivo en la cola y
 * endpoints de consulta. Las faltas se crean insertando eventos en el
 * historial (H2 no ejecuta los triggers de PostgreSQL).
 */
@SpringBootTest
@Transactional
@DisplayName("Reincidencia con restricciones graduales")
class ReincidenciaIntegrationTest {

    @Autowired private WebApplicationContext context;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRolRepository usuarioRolRepository;
    @Autowired private ResenaRepository resenaRepository;
    @Autowired private ResenaModeracionAuditoriaRepository auditoriaRepository;
    @Autowired private EstablecimientoRepository establecimientoRepository;
    @Autowired private ProductoEstablecimientoRepository productoEstablecimientoRepository;

    private MockMvc mockMvc;
    private Categoria categoria;
    private Marca marca;
    private Producto producto;
    private Usuario autor;
    private Usuario otroUsuario;
    private Usuario moderador;
    private Usuario administrador;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        categoria = new Categoria();
        categoria.setNombre("Reincidencia " + UUID.randomUUID());
        categoria.setDescripcion("Categoria de prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);
        marca = new Marca();
        marca.setNombre("Marca " + UUID.randomUUID());
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);
        producto = producto();

        Rol rolUsuario = rol("Usuario registrado");
        autor = usuario("Autor reincidente", rolUsuario);
        otroUsuario = usuario("Otro usuario", rolUsuario);
        moderador = usuario("Moderador", rol("Moderador"));
        administrador = usuario("Administrador", rol("Administrador"));
    }

    // ---------- Bloqueo (3 faltas, la última hace menos de 7 días) ----------

    @Test
    @DisplayName("Con bloqueo no puede publicar una reseña")
    void bloqueoImpidePublicar403() throws Exception {
        faltas(autor, 3, 1);

        publicar(producto, "Muy buen producto")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("por reincidencia")));
    }

    @Test
    @DisplayName("Con bloqueo no puede editar una reseña")
    void bloqueoImpideEditar403() throws Exception {
        Resena propia = resena(autor, producto, "Buen producto", EstadoModeracion.PUBLICADA, true);
        faltas(autor, 3, 1);

        mockMvc.perform(put("/api/resenas/" + propia.getIdResena()).with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Ahora es mejor\",\"puntuacion\":5}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Con bloqueo tampoco puede publicar sobre una reseña que ya tenía")
    void bloqueoImpideCrearSobreResenaExistente403() throws Exception {
        resena(autor, producto, "Buen producto", EstadoModeracion.PUBLICADA, true);
        faltas(autor, 3, 1);

        publicar(producto, "Cambio mi opinión").andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Con bloqueo no puede reportar una reseña")
    void bloqueoImpideReportarResena403() throws Exception {
        Resena ajena = resena(otroUsuario, producto, "Buen producto", EstadoModeracion.PUBLICADA, true);
        faltas(autor, 3, 1);

        mockMvc.perform(post("/api/resenas/" + ajena.getIdResena() + "/reportes").with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"spam\",\"descripcion\":\"Publicidad\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Con bloqueo no puede reportar una oferta")
    void bloqueoImpideReportarOferta403() throws Exception {
        Establecimiento tienda = new Establecimiento();
        tienda.setNombre("Tienda " + UUID.randomUUID());
        tienda.setEstado(true);
        tienda = establecimientoRepository.saveAndFlush(tienda);
        ProductoEstablecimiento oferta = new ProductoEstablecimiento();
        oferta.setProducto(producto);
        oferta.setEstablecimiento(tienda);
        oferta.setPrecio(new BigDecimal("100000"));
        oferta.setDisponibilidad(true);
        productoEstablecimientoRepository.saveAndFlush(oferta);
        faltas(autor, 3, 1);

        mockMvc.perform(post("/api/reportes/ofertas").with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idProducto\":" + producto.getIdProducto()
                                + ",\"idEstablecimiento\":" + tienda.getIdEstablecimiento()
                                + ",\"motivo\":\"precio_incorrecto\",\"descripcion\":\"El precio no coincide\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Con bloqueo puede eliminar su propia reseña")
    void bloqueoPermiteEliminarSuResena() throws Exception {
        Resena propia = resena(autor, producto, "Buen producto", EstadoModeracion.PUBLICADA, true);
        faltas(autor, 3, 1);

        mockMvc.perform(delete("/api/resenas/" + propia.getIdResena()).with(como(autor)))
                .andExpect(status().is2xxSuccessful());
    }

    // ---------- Revisión previa (2 faltas, la última hace menos de 30 días) ----------

    @Test
    @DisplayName("Con revisión previa un texto limpio queda en revisión")
    void revisionPreviaDejaPendienteUnTextoLimpio() throws Exception {
        faltas(autor, 2, 5);

        publicar(producto, "Muy buen producto")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
    }

    @Test
    @DisplayName("Con revisión previa, editar una reseña publicada la devuelve a revisión")
    void revisionPreviaDejaPendienteAlEditarUnaPublicada() throws Exception {
        Resena propia = resena(autor, producto, "Buen producto", EstadoModeracion.PUBLICADA, true);
        faltas(autor, 2, 5);

        mockMvc.perform(put("/api/resenas/" + propia.getIdResena()).with(como(autor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comentario\":\"Sigue siendo bueno\",\"puntuacion\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
    }

    @Test
    @DisplayName("Con una sola falta se publica con normalidad")
    void conUnaFaltaSePublicaNormal() throws Exception {
        faltas(autor, 1, 1);

        publicar(producto, "Muy buen producto")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
    }

    // ---------- Cola de revisión y endpoints de consulta ----------

    @Test
    @DisplayName("La cola muestra el motivo de revisión previa en un texto limpio")
    void colaMuestraMotivoRevisionPrevia() throws Exception {
        faltas(autor, 2, 5);
        Resena retenida = resena(autor, producto, "Muy buen producto", EstadoModeracion.PENDIENTE, true);

        mockMvc.perform(get("/api/moderacion/resenas/en-revision").with(como(moderador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idResena == " + retenida.getIdResena() + ")].riesgo").value(hasItem("MEDIO")))
                .andExpect(jsonPath("$[?(@.idResena == " + retenida.getIdResena() + ")].motivosDeteccion[0]")
                        .value(hasItem("Revisión previa por reincidencia")));
    }

    @Test
    @DisplayName("La cola conserva el motivo aunque la revisión previa ya haya vencido")
    void colaConservaElMotivoAunqueLaRevisionPreviaHayaVencido() throws Exception {
        faltas(autor, 2, 40);
        Resena retenida = resena(autor, producto, "Muy buen producto", EstadoModeracion.PENDIENTE, true);

        mockMvc.perform(get("/api/moderacion/resenas/en-revision").with(como(moderador)))
                .andExpect(jsonPath("$[?(@.idResena == " + retenida.getIdResena() + ")].motivosDeteccion[0]")
                        .value(hasItem("Revisión previa por reincidencia")));
    }

    @Test
    @DisplayName("El usuario consulta su nivel y sus fechas")
    void meReincidenciaDevuelveNivelYFechas() throws Exception {
        faltas(autor, 3, 1);

        mockMvc.perform(get("/api/usuarios/me/reincidencia").with(como(autor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faltas").value(3))
                .andExpect(jsonPath("$.nivel").value("BLOQUEO"))
                .andExpect(jsonPath("$.bloqueoHasta").exists())
                .andExpect(jsonPath("$.revisionPreviaHasta").exists())
                .andExpect(jsonPath("$.proximaCaducidad").exists())
                // Los métodos de ayuda del record no se exponen.
                .andExpect(jsonPath("$.bloqueoActivo").doesNotExist())
                .andExpect(jsonPath("$.revisionPreviaActiva").doesNotExist());
    }

    @Test
    @DisplayName("Sin faltas, el nivel es NINGUNO")
    void meReincidenciaSinFaltas() throws Exception {
        mockMvc.perform(get("/api/usuarios/me/reincidencia").with(como(autor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faltas").value(0))
                .andExpect(jsonPath("$.nivel").value("NINGUNO"));
    }

    @Test
    @DisplayName("Consultar la reincidencia exige autenticación")
    void meReincidenciaSinToken401() throws Exception {
        mockMvc.perform(get("/api/usuarios/me/reincidencia")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("La lista de reincidentes es solo para administradores")
    void reincidentesSoloAdministrador403() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios/reincidentes").with(como(moderador)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("La lista incluye cuentas activas con 4 faltas o más")
    void reincidentesListaCuatroFaltasYExcluyeSuspendidasYTresFaltas() throws Exception {
        Rol rolUsuario = rol("Usuario registrado");
        Usuario conTres = usuario("Con tres faltas", rolUsuario);
        Usuario suspendido = usuario("Suspendido", rolUsuario);
        faltas(autor, 4, 1);
        faltas(conTres, 3, 1);
        faltas(suspendido, 5, 1);
        suspendido.setEstado(false);
        usuarioRepository.saveAndFlush(suspendido);

        mockMvc.perform(get("/api/admin/usuarios/reincidentes").with(como(administrador)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].idUsuario").value(hasItem(autor.getIdUsuario().intValue())))
                .andExpect(jsonPath("$[?(@.idUsuario == " + autor.getIdUsuario() + ")].faltas").value(hasItem(4)))
                .andExpect(jsonPath("$[?(@.idUsuario == " + autor.getIdUsuario() + ")].correo").value(hasItem(autor.getCorreo())))
                .andExpect(jsonPath("$[*].idUsuario").value(not(hasItem(conTres.getIdUsuario().intValue()))))
                .andExpect(jsonPath("$[*].idUsuario").value(not(hasItem(suspendido.getIdUsuario().intValue()))));
    }

    // ---------- Utilidades ----------

    /** Crea {@code cantidad} faltas (RECHAZAR) del usuario; la más reciente hace {@code diasUltima} días. */
    private void faltas(Usuario usuario, int cantidad, int diasUltima) {
        for (int i = 0; i < cantidad; i++) {
            Resena rechazada = resena(usuario, producto(), "Contenido rechazado", EstadoModeracion.RECHAZADA, true);
            ResenaModeracionAuditoria e = new ResenaModeracionAuditoria();
            e.setResena(rechazada);
            e.setModerador(moderador);
            e.setAccion("RECHAZAR");
            e.setMotivo("Lenguaje ofensivo");
            e.setComentarioRevisado(rechazada.getComentario());
            e.setFechaEvento(LocalDateTime.now().minusDays(diasUltima + i));
            auditoriaRepository.saveAndFlush(e);
        }
    }

    private ResultActions publicar(Producto destino, String comentario) throws Exception {
        return mockMvc.perform(post("/api/resenas").with(como(autor))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idProducto\":" + destino.getIdProducto()
                        + ",\"comentario\":\"" + comentario + "\",\"puntuacion\":4}"));
    }

    private Producto producto() {
        Producto p = new Producto();
        p.setNombre("Producto reincidencia " + UUID.randomUUID());
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
        u.setCorreo("reinc_" + UUID.randomUUID() + "@tecreview.test");
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
