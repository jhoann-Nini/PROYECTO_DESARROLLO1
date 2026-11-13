package com.example.backend.controller;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.ReporteResenaDecisionAuditoria;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteResenaDecisionAuditoriaRepository;
import com.example.backend.repository.ReporteResenaRepository;
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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Pruebas de integración para las acciones operativas de moderación (S2-43):
 * Ocultar reseña, Publicar reseña y Rechazar reportes (individual y en lote).
 *
 * Valida:
 * - Autorización estricta: Moderador activo y Administrador activo autorizados.
 * - Rechazo (403 Forbidden) para Usuario normal, Representante de tienda y Usuarios suspendidos.
 * - Rechazo (403 Forbidden) para Moderador revocado con rol legado en usuario.id_rol.
 * - Rechazo (401 Unauthorized) para solicitudes no autenticadas.
 * - Conflicto de interés y no automoderación: 403 Forbidden al moderar reseñas propias o resolver reportes propios.
 * - Independencia de flags: ocultaPorModeracion no altera ocultaPorReportes ni borrado lógico.
 * - Máquina de estados de reportes: PENDIENTE -> EN_REVISION -> ACEPTADO/RECHAZADO (409 ante saltos directos).
 * - Umbral de reportes: restablecimiento de ocultaPorReportes al bajar de 3 reportes activos.
 * - Auditoría transaccional append-only conforme a migraciones 010 y 011.
 */
@SpringBootTest
@Transactional
class ModeracionAccionesIntegrationTest {

    @Autowired
    private WebApplicationContext context;

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
    private UsuarioRolRepository usuarioRolRepository;

    @Autowired
    private ResenaRepository resenaRepository;

    @Autowired
    private ReporteResenaRepository reporteResenaRepository;

    @Autowired
    private ResenaModeracionAuditoriaRepository resenaAuditoriaRepository;

    @Autowired
    private ReporteResenaDecisionAuditoriaRepository reporteAuditoriaRepository;

    private MockMvc mockMvc;

    private Producto producto;
    private Usuario autor;
    private Usuario reportante1;
    private Usuario reportante2;
    private Usuario reportante3;
    private Usuario reportante4;

    private Usuario usuarioAdmin;
    private Usuario usuarioModerador;
    private Usuario usuarioNormal;
    private Usuario usuarioRepresentante;
    private Usuario usuarioSuspendido;
    private Usuario moderadorRevocadoConRolLegado;

    private Rol rolAdmin;
    private Rol rolModerador;
    private Rol rolUsuario;
    private Rol rolRepresentante;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        Categoria categoria = new Categoria();
        categoria.setNombre("Dispositivos " + UUID.randomUUID());
        categoria.setDescripcion("Cat prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);

        Marca marca = new Marca();
        marca.setNombre("TechCorp " + UUID.randomUUID());
        marca.setDescripcion("Marca prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        rolUsuario = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol normal");
                    return rolRepository.save(r);
                });

        rolModerador = rolRepository.findByNombre("Moderador")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Moderador");
                    r.setDescripcion("Rol de moderacion");
                    return rolRepository.save(r);
                });

        rolAdmin = rolRepository.findByNombre("Administrador")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Administrador");
                    r.setDescripcion("Rol de administracion");
                    return rolRepository.save(r);
                });

        rolRepresentante = rolRepository.findByNombre("Representante de establecimiento")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Representante de establecimiento");
                    r.setDescripcion("Rol representante");
                    return rolRepository.save(r);
                });

        autor = crearUsuario("Autor Reseña", rolUsuario, true);
        asignarRol(autor, rolUsuario, true);

        reportante1 = crearUsuario("Reportante 1", rolUsuario, true);
        asignarRol(reportante1, rolUsuario, true);

        reportante2 = crearUsuario("Reportante 2", rolUsuario, true);
        asignarRol(reportante2, rolUsuario, true);

        reportante3 = crearUsuario("Reportante 3", rolUsuario, true);
        asignarRol(reportante3, rolUsuario, true);

        reportante4 = crearUsuario("Reportante 4", rolUsuario, true);
        asignarRol(reportante4, rolUsuario, true);

        usuarioNormal = crearUsuario("Usuario Normal", rolUsuario, true);
        asignarRol(usuarioNormal, rolUsuario, true);

        usuarioModerador = crearUsuario("Moderador Activo", rolModerador, true);
        asignarRol(usuarioModerador, rolModerador, true);

        usuarioAdmin = crearUsuario("Admin Activo", rolAdmin, true);
        asignarRol(usuarioAdmin, rolAdmin, true);

        usuarioRepresentante = crearUsuario("Representante Tienda", rolRepresentante, true);
        asignarRol(usuarioRepresentante, rolRepresentante, true);

        usuarioSuspendido = crearUsuario("Moderador Suspendido", rolModerador, false);
        asignarRol(usuarioSuspendido, rolModerador, true);

        // Moderador revocado: rol legado "Moderador" en usuario.id_rol pero asignación multirrol inactiva (estado = false)
        moderadorRevocadoConRolLegado = crearUsuario("Moderador Revocado", rolModerador, true);
        asignarRol(moderadorRevocadoConRolLegado, rolModerador, false);

        producto = new Producto();
        producto.setNombre("Laptop Pro " + UUID.randomUUID());
        producto.setDescripcion("Laptop para pruebas de moderación");
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setPrecioReferencia(new BigDecimal("1299.99"));
        producto.setEstado(true);
        producto = productoRepository.save(producto);
    }

    private Usuario crearUsuario(String nombre, Rol rol, boolean activo) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setCorreo("user_" + UUID.randomUUID() + "@tecreview.test");
        u.setSupabaseUid(UUID.randomUUID().toString());
        u.setRol(rol);
        u.setEstado(activo);
        u.setFechaRegistro(LocalDateTime.now());
        return usuarioRepository.save(u);
    }

    private void asignarRol(Usuario usuario, Rol rol, boolean activo) {
        UsuarioRol ur = new UsuarioRol();
        ur.setUsuario(usuario);
        ur.setRol(rol);
        ur.setEstado(activo);
        ur.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(ur);
        usuarioRolRepository.save(ur);
        usuarioRepository.save(usuario);
    }

    private Resena crearResena(String comentario, boolean estadoAutor, boolean ocultaPorReportes, boolean ocultaPorModeracion) {
        Resena resena = new Resena();
        resena.setProducto(producto);
        resena.setUsuario(autor);
        resena.setComentario(comentario);
        resena.setPuntuacion(4);
        resena.setEstado(estadoAutor);
        resena.setOcultaPorReportes(ocultaPorReportes);
        resena.setOcultaPorModeracion(ocultaPorModeracion);
        if (ocultaPorModeracion) {
            resena.setModeradaPor(usuarioAdmin);
            resena.setFechaModeracion(LocalDateTime.now().minusHours(1));
            resena.setMotivoModeracion("Ocultamiento preventivo");
        }
        resena.setFechaCreacion(LocalDateTime.now());
        return resenaRepository.saveAndFlush(resena);
    }

    private ReporteResena crearReporte(Resena resena, Usuario reportante, String motivo, EstadoReporte estado, Usuario responsable) {
        ReporteResena r = new ReporteResena();
        r.setResena(resena);
        r.setUsuario(reportante);
        r.setMotivo(motivo);
        r.setDescripcion("Detalle de prueba");
        r.setEstado(estado);
        if (estado == EstadoReporte.EN_REVISION || estado == EstadoReporte.RECHAZADO || estado == EstadoReporte.ACEPTADO) {
            r.setResponsable(responsable);
            r.setFechaInicioRevision(LocalDateTime.now().minusMinutes(30));
        }
        if (estado == EstadoReporte.RECHAZADO || estado == EstadoReporte.ACEPTADO) {
            r.setFechaRevision(LocalDateTime.now().minusMinutes(5));
            r.setNotasRevision("Resolución previa");
        }
        r.setFechaCreacion(LocalDateTime.now());
        r.setFechaActualizacion(LocalDateTime.now());
        return reporteResenaRepository.saveAndFlush(r);
    }

    // =========================================================================
    // 1. Autorización de Acciones de Moderación
    // =========================================================================

    @Nested
    @DisplayName("Control de Acceso y Autorización")
    class AutorizacionTests {

        @Test
        @DisplayName("Moderador activo puede ocultar una reseña (200 OK)")
        void moderadorActivoPuedeOcultarResena() throws Exception {
            Resena resena = crearResena("Reseña moderable", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Lenguaje no apropiado\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.idResena").value(resena.getIdResena()))
                    .andExpect(jsonPath("$.ocultaPorModeracion").value(true));

            Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
            assertTrue(enBd.getOcultaPorModeracion());
            assertEquals(usuarioModerador.getIdUsuario(), enBd.getModeradaPor().getIdUsuario());
        }

        @Test
        @DisplayName("Administrador activo puede ocultar una reseña (200 OK)")
        void adminActivoPuedeOcultarResena() throws Exception {
            Resena resena = crearResena("Reseña moderable admin", true, false, false);

            mockMvc.perform(post("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Publicidad no autorizada\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ocultaPorModeracion").value(true));

            Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
            assertTrue(enBd.getOcultaPorModeracion());
        }

        @Test
        @DisplayName("Usuario normal recibe 403 Forbidden al intentar moderar")
        void usuarioNormalRecibe403() throws Exception {
            Resena resena = crearResena("Reseña prueba", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioNormal.getSupabaseUid()).claim("email", usuarioNormal.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento usuario normal\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Representante de establecimiento recibe 403 Forbidden al intentar moderar")
        void representanteTiendaRecibe403() throws Exception {
            Resena resena = crearResena("Reseña prueba", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioRepresentante.getSupabaseUid()).claim("email", usuarioRepresentante.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento representante\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Usuario suspendido recibe 403 Forbidden al intentar moderar")
        void usuarioSuspendidoRecibe403() throws Exception {
            Resena resena = crearResena("Reseña prueba", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioSuspendido.getSupabaseUid()).claim("email", usuarioSuspendido.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento suspendido\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Moderador revocado con rol legado en usuario.id_rol recibe 403 Forbidden")
        void moderadorRevocadoConRolLegadoRecibe403() throws Exception {
            Resena resena = crearResena("Reseña prueba", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(moderadorRevocadoConRolLegado.getSupabaseUid()).claim("email", moderadorRevocadoConRolLegado.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento rol revocado\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Solicitud anónima recibe 401 Unauthorized")
        void solicitudAnonimaRecibe401() throws Exception {
            Resena resena = crearResena("Reseña prueba", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Sin autenticacion\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // 2. Reglas de Negocio y Conflicto de Interés
    // =========================================================================

    @Nested
    @DisplayName("Reglas de Negocio y Conflicto de Interés")
    class ReglasNegocioTests {

        @Test
        @DisplayName("Moderador no puede moderar su propia reseña (403 Forbidden)")
        void moderadorNoPuedeModerarPropiaResena() throws Exception {
            Resena resenaPropia = new Resena();
            resenaPropia.setProducto(producto);
            resenaPropia.setUsuario(usuarioModerador);
            resenaPropia.setComentario("Mi reseña como moderador");
            resenaPropia.setPuntuacion(5);
            resenaPropia.setEstado(true);
            resenaPropia.setOcultaPorReportes(false);
            resenaPropia.setOcultaPorModeracion(false);
            resenaPropia.setFechaCreacion(LocalDateTime.now());
            resenaPropia = resenaRepository.saveAndFlush(resenaPropia);

            mockMvc.perform(put("/api/moderacion/resenas/" + resenaPropia.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento automoderación\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Moderar reseña inexistente devuelve 404 Not Found")
        void moderarResenaInexistenteDevuelve404() throws Exception {
            mockMvc.perform(put("/api/moderacion/resenas/999999/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Inexistente\"}"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("No se puede ocultar una reseña eliminada por su autor (409 Conflict)")
        void noSePuedeOcultarResenaEliminadaPorAutor() throws Exception {
            Resena resenaEliminada = crearResena("Reseña borrada", false, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resenaEliminada.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Ocultar eliminada\"}"))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("No se puede publicar una reseña eliminada por su autor (409 Conflict)")
        void noSePuedePublicarResenaEliminadaPorAutor() throws Exception {
            Resena resenaEliminada = crearResena("Reseña borrada", false, false, true);

            mockMvc.perform(put("/api/moderacion/resenas/" + resenaEliminada.getIdResena() + "/publicar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Publicar eliminada\"}"))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("Ocultar una reseña ya oculta manualmente devuelve 409 Conflict")
        void ocultarResenaYaOcultaDevuelve409() throws Exception {
            Resena resenaOculta = crearResena("Reseña ya oculta", true, false, true);

            mockMvc.perform(put("/api/moderacion/resenas/" + resenaOculta.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Re-ocultar\"}"))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("Publicar una reseña que no está oculta manualmente devuelve 409 Conflict")
        void publicarResenaNoOcultaDevuelve409() throws Exception {
            Resena resenaVisible = crearResena("Reseña visible", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resenaVisible.getIdResena() + "/publicar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Re-publicar\"}"))
                    .andExpect(status().isConflict());
        }

        @Test
        @DisplayName("Ocultar reseña manualmente no altera ocultaPorReportes")
        void ocultarResenaNoAlteraOcultaPorReportes() throws Exception {
            Resena resena = crearResena("Reseña con reportes independientes", true, false, false);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Infracción directa\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ocultaPorModeracion").value(true))
                    .andExpect(jsonPath("$.ocultaPorReportes").value(false));

            Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
            assertTrue(enBd.getOcultaPorModeracion());
            assertFalse(enBd.getOcultaPorReportes(), "ocultaPorReportes debe permanecer intacto");
        }

        @Test
        @DisplayName("Publicar reseña manualmente no altera ocultaPorReportes")
        void publicarResenaNoAlteraOcultaPorReportes() throws Exception {
            // Reseña que estaba oculta manualmente Y además tenía ocultaPorReportes = true
            Resena resena = crearResena("Reseña oculta por ambas vías", true, true, true);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/publicar")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Se retira sanción manual\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ocultaPorModeracion").value(false))
                    .andExpect(jsonPath("$.ocultaPorReportes").value(true));

            Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
            assertFalse(enBd.getOcultaPorModeracion());
            assertTrue(enBd.getOcultaPorReportes(), "ocultaPorReportes no debe ser borrado por la acción manual");
        }
    }

    // =========================================================================
    // 3. Máquina de Estados y Rechazo de Reportes
    // =========================================================================

    @Nested
    @DisplayName("Máquina de Estados de Reportes y Umbral")
    class RechazoReportesTests {

        @Test
        @DisplayName("Rechazar reporte en estado PENDIENTE directamente devuelve 409 Conflict (violación de máquina de estados)")
        void rechazarReportePendienteDevuelve409() throws Exception {
            Resena resena = crearResena("Reseña reportada", true, false, false);
            ReporteResena rep = crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE, null);

            mockMvc.perform(put("/api/moderacion/reportes/" + rep.getIdReporte() + "/rechazar")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Rechazo directo sin revision\"}"))
                    .andExpect(status().isConflict());

            ReporteResena repBd = reporteResenaRepository.findById(rep.getIdReporte()).orElseThrow();
            assertEquals(EstadoReporte.PENDIENTE, repBd.getEstado(), "El reporte debe permanecer PENDIENTE");
        }

        @Test
        @DisplayName("Rechazar reporte en estado EN_REVISION es exitoso (200 OK)")
        void rechazarReporteEnRevisionEsExitoso() throws Exception {
            Resena resena = crearResena("Reseña en revisión", true, false, false);
            ReporteResena rep = crearReporte(resena, reportante1, "spam", EstadoReporte.EN_REVISION, usuarioModerador);

            mockMvc.perform(put("/api/moderacion/reportes/" + rep.getIdReporte() + "/rechazar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Reporte infundado tras verificar\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.idReporte").value(rep.getIdReporte()))
                    .andExpect(jsonPath("$.estado").value("RECHAZADO"));

            ReporteResena repBd = reporteResenaRepository.findById(rep.getIdReporte()).orElseThrow();
            assertEquals(EstadoReporte.RECHAZADO, repBd.getEstado());
        }

        @Test
        @DisplayName("Moderador no puede resolver un reporte si él es el usuario reportante (403 Forbidden)")
        void moderadorNoPuedeResolverReportePropio() throws Exception {
            Resena resena = crearResena("Reseña", true, false, false);
            ReporteResena rep = crearReporte(resena, usuarioModerador, "falso", EstadoReporte.EN_REVISION, usuarioAdmin);

            mockMvc.perform(put("/api/moderacion/reportes/" + rep.getIdReporte() + "/rechazar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Autorresolución\"}"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Rechazar reporte individual restablece ocultaPorReportes a false cuando activos bajan a menos de 3")
        void rechazarReporteIndividualRestableceVisibilidadAlBajarDe3() throws Exception {
            // Reseña oculta por reportes con 3 reportes (2 en revisión, 1 en revisión)
            Resena resena = crearResena("Reseña oculta por 3 reportes", true, true, false);
            ReporteResena rep1 = crearReporte(resena, reportante1, "spam", EstadoReporte.EN_REVISION, usuarioAdmin);
            ReporteResena rep2 = crearReporte(resena, reportante2, "falso", EstadoReporte.EN_REVISION, usuarioAdmin);
            ReporteResena rep3 = crearReporte(resena, reportante3, "otro", EstadoReporte.EN_REVISION, usuarioAdmin);

            // Admin rechaza rep1 -> quedan 2 reportes activos (rep2, rep3), por lo que se desoculta
            mockMvc.perform(put("/api/moderacion/reportes/" + rep1.getIdReporte() + "/rechazar")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Reporte no justificado\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.estado").value("RECHAZADO"));

            Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
            assertFalse(enBd.getOcultaPorReportes(), "La reseña debe volver a mostrarse al bajar de 3 reportes activos");
        }

        @Test
        @DisplayName("Rechazar reportes en lote desestima los reportes EN_REVISION y restablece visibilidad")
        void rechazarReportesEnLoteExitoso() throws Exception {
            Resena resena = crearResena("Reseña con reportes en revisión", true, true, false);
            ReporteResena rep1 = crearReporte(resena, reportante1, "spam", EstadoReporte.EN_REVISION, usuarioAdmin);
            ReporteResena rep2 = crearReporte(resena, reportante2, "falso", EstadoReporte.EN_REVISION, usuarioAdmin);
            ReporteResena rep3 = crearReporte(resena, reportante3, "otro", EstadoReporte.EN_REVISION, usuarioAdmin);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/rechazar-reportes")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Todos los reportes infundados\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.idResena").value(resena.getIdResena()))
                    .andExpect(jsonPath("$.ocultaPorReportes").value(false))
                    .andExpect(jsonPath("$.reportes[0].estado").value("RECHAZADO"))
                    .andExpect(jsonPath("$.reportes[1].estado").value("RECHAZADO"))
                    .andExpect(jsonPath("$.reportes[2].estado").value("RECHAZADO"));

            Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
            assertFalse(enBd.getOcultaPorReportes());
        }

        @Test
        @DisplayName("Rechazar reportes en lote falla con 409 Conflict si existen reportes aún en PENDIENTE")
        void rechazarReportesEnLoteFallaSiHayPendientes() throws Exception {
            Resena resena = crearResena("Reseña con reportes pendientes y revisión", true, true, false);
            crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE, null);
            crearReporte(resena, reportante2, "falso", EstadoReporte.EN_REVISION, usuarioAdmin);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/rechazar-reportes")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento rechazar con pendientes\"}"))
                    .andExpect(status().isConflict());
        }
    }

    // =========================================================================
    // 4. Integridad de Auditoría (Migraciones 010 y 011)
    // =========================================================================

    @Nested
    @DisplayName("Integridad y Verificación de Auditoría")
    class AuditoriaTests {

        @Test
        @DisplayName("Ocultar reseña genera exactamente un registro en resena_moderacion_auditoria")
        void ocultarResenaGeneraEventoAuditoria() throws Exception {
            Resena resena = crearResena("Reseña a auditar", true, false, false);
            long auditoriasPrevias = resenaAuditoriaRepository.count();

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Infracción auditada\"}"))
                    .andExpect(status().isOk());

            List<ResenaModeracionAuditoria> eventos = resenaAuditoriaRepository
                    .findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(resena.getIdResena());
            assertEquals(1, eventos.size());
            assertEquals(auditoriasPrevias + 1, resenaAuditoriaRepository.count());

            ResenaModeracionAuditoria evento = eventos.get(0);
            assertEquals("OCULTAR", evento.getAccion());
            assertEquals("Infracción auditada", evento.getMotivo());
            assertEquals(usuarioModerador.getIdUsuario(), evento.getModerador().getIdUsuario());
            assertEquals(resena.getIdResena(), evento.getResena().getIdResena());
            assertNotNull(evento.getFechaEvento());
        }

        @Test
        @DisplayName("Publicar reseña genera exactamente un registro en resena_moderacion_auditoria")
        void publicarResenaGeneraEventoAuditoria() throws Exception {
            Resena resena = crearResena("Reseña a restaurar", true, false, true);

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/publicar")
                            .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Restauración justificada\"}"))
                    .andExpect(status().isOk());

            List<ResenaModeracionAuditoria> eventos = resenaAuditoriaRepository
                    .findByResenaIdResenaOrderByFechaEventoDescIdAuditoriaDesc(resena.getIdResena());
            assertTrue(eventos.stream().anyMatch(e -> "RESTAURAR".equals(e.getAccion())
                    && "Restauración justificada".equals(e.getMotivo())
                    && usuarioModerador.getIdUsuario().equals(e.getModerador().getIdUsuario())));
        }

        @Test
        @DisplayName("Rechazar reporte genera registro de decisión en reporte_resena_decision_auditoria")
        void rechazarReporteGeneraEventoAuditoria() throws Exception {
            Resena resena = crearResena("Reseña", true, false, false);
            ReporteResena rep = crearReporte(resena, reportante1, "spam", EstadoReporte.EN_REVISION, usuarioAdmin);

            mockMvc.perform(put("/api/moderacion/reportes/" + rep.getIdReporte() + "/rechazar")
                            .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Auditoría de desestimación\"}"))
                    .andExpect(status().isOk());

            List<ReporteResenaDecisionAuditoria> decisiones = reporteAuditoriaRepository
                    .findByReporteIdReporteOrderByFechaEventoDescIdAuditoriaDesc(rep.getIdReporte());
            assertEquals(1, decisiones.size());

            ReporteResenaDecisionAuditoria dec = decisiones.get(0);
            assertEquals("EN_REVISION", dec.getEstadoAnterior());
            assertEquals("RECHAZADO", dec.getEstadoNuevo());
            assertEquals("Auditoría de desestimación", dec.getObservacion());
            assertEquals(usuarioAdmin.getIdUsuario(), dec.getModerador().getIdUsuario());
        }

        @Test
        @DisplayName("Operación rechazada por 403 Forbidden no genera eventos de auditoría")
        void operacionRechazadaNoGeneraAuditoria() throws Exception {
            Resena resena = crearResena("Reseña", true, false, false);
            long auditoriasAntes = resenaAuditoriaRepository.count();

            mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                            .with(jwt().jwt(b -> b.subject(usuarioNormal.getSupabaseUid()).claim("email", usuarioNormal.getCorreo())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"motivo\":\"Intento sin rol\"}"))
                    .andExpect(status().isForbidden());

            assertEquals(auditoriasAntes, resenaAuditoriaRepository.count(),
                    "No deben generarse eventos de auditoría ante solicitudes denegadas");
        }
    }
}

