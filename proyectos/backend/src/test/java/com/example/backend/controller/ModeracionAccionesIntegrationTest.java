package com.example.backend.controller;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
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
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Pruebas de integración para las acciones de moderación de reseñas:
 * Publicar, Ocultar y Rechazar (S2-43).
 *
 * Valida:
 * - Autorización estricta: Solo Administradores activos pueden ejecutar estas acciones.
 * - Restricciones de 403 Forbidden para Moderadores y Usuarios normales.
 * - Rechazo 401 Unauthorized para solicitudes no autenticadas.
 * - Ocultar reseña y actualización de reportes pendientes a ACEPTADO.
 * - Publicar reseña, restauración de visibilidad y actualización de reportes a RECHAZADO.
 * - Rechazo de publicación (409 Conflict) si la reseña fue eliminada por su autor.
 * - Rechazar reportes en lote y restauración de visibilidad si activos < 3.
 * - Rechazar reporte individual y recálculo automático de umbral (Regla 8).
 * - Manejo de 404 Not Found ante recursos inexistentes.
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
    private ResenaRepository resenaRepository;

    @Autowired
    private ReporteResenaRepository reporteResenaRepository;

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
    private Usuario adminInactivo;

    private Rol rolAdmin;
    private Rol rolModerador;
    private Rol rolUsuario;

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

        autor = crearUsuario("Autor Reseña", rolUsuario, true);
        reportante1 = crearUsuario("Reportante 1", rolUsuario, true);
        reportante2 = crearUsuario("Reportante 2", rolUsuario, true);
        reportante3 = crearUsuario("Reportante 3", rolUsuario, true);
        reportante4 = crearUsuario("Reportante 4", rolUsuario, true);

        usuarioNormal = crearUsuario("Usuario Normal", rolUsuario, true);

        usuarioModerador = crearUsuario("Usuario Moderador", rolModerador, true);
        vincularRol(usuarioModerador, rolModerador, true);

        usuarioAdmin = crearUsuario("Usuario Admin", rolAdmin, true);
        vincularRol(usuarioAdmin, rolAdmin, true);

        adminInactivo = crearUsuario("Admin Inactivo", rolAdmin, false);
        vincularRol(adminInactivo, rolAdmin, true);

        producto = new Producto();
        producto.setNombre("Laptop Pro " + UUID.randomUUID());
        producto.setDescripcion("Laptop para desarrolladores");
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setPrecioReferencia(new BigDecimal("1299.99"));
        producto.setEstado(true);
        producto = productoRepository.save(producto);
    }

    private Usuario crearUsuario(String nombre, Rol rol, boolean activo) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setCorreo("test_" + UUID.randomUUID() + "@tecreview.test");
        u.setSupabaseUid(UUID.randomUUID().toString());
        u.setRol(rol);
        u.setEstado(activo);
        u.setFechaRegistro(LocalDateTime.now());
        return usuarioRepository.save(u);
    }

    private void vincularRol(Usuario usuario, Rol rol, boolean activo) {
        UsuarioRol ur = new UsuarioRol();
        ur.setUsuario(usuario);
        ur.setRol(rol);
        ur.setEstado(activo);
        ur.setFechaAsignacion(LocalDateTime.now());
        usuario.agregarRol(ur);
        usuarioRepository.save(usuario);
    }

    private Resena crearResena(String comentario, boolean estadoAutor, boolean ocultaPorReportes) {
        Resena resena = new Resena();
        resena.setProducto(producto);
        resena.setUsuario(autor);
        resena.setComentario(comentario);
        resena.setPuntuacion(3);
        resena.setEstado(estadoAutor);
        resena.setOcultaPorReportes(ocultaPorReportes);
        resena.setFechaCreacion(LocalDateTime.now());
        return resenaRepository.save(resena);
    }

    private ReporteResena crearReporte(Resena resena, Usuario reportante, String motivo, EstadoReporte estado) {
        ReporteResena r = new ReporteResena();
        r.setResena(resena);
        r.setUsuario(reportante);
        r.setMotivo(motivo);
        r.setDescripcion("Detalle de prueba para motivo " + motivo);
        r.setEstado(estado);
        r.setFechaCreacion(LocalDateTime.now());
        r.setFechaActualizacion(LocalDateTime.now());
        return reporteResenaRepository.save(r);
    }

    // =========================================================================
    // 1. Ocultar Reseña (Solo Administrador)
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Administrador oculta reseña exitosamente (200 OK) y actualiza reportes a ACEPTADO")
    void ocultarResena_comoAdmin_devuelve200OKYActualizaEstadoYReportes() throws Exception {
        Resena resena = crearResena("Reseña con posibles infracciones", true, false);
        ReporteResena rep1 = crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE);
        ReporteResena rep2 = crearReporte(resena, reportante2, "falso", EstadoReporte.EN_REVISION);

        mockMvc.perform(put("/api/admin/resenas/" + resena.getIdResena() + "/ocultar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Confirmado contenido publicitario no permitido\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(resena.getIdResena()))
                .andExpect(jsonPath("$.ocultaPorReportes").value(true))
                .andExpect(jsonPath("$.reportesPendientes").value(0))
                .andExpect(jsonPath("$.reportes[0].estado").value("ACEPTADO"))
                .andExpect(jsonPath("$.reportes[1].estado").value("ACEPTADO"));

        // Verificación en BD
        Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
        assertTrue(enBd.getOcultaPorReportes());

        ReporteResena rep1Bd = reporteResenaRepository.findById(rep1.getIdReporte()).orElseThrow();
        assertEquals(EstadoReporte.ACEPTADO, rep1Bd.getEstado());
        ReporteResena rep2Bd = reporteResenaRepository.findById(rep2.getIdReporte()).orElseThrow();
        assertEquals(EstadoReporte.ACEPTADO, rep2Bd.getEstado());
    }

    @Test
    @DisplayName("[S2-43] No se puede ocultar una reseña eliminada por su autor (409 Conflict)")
    void ocultarResena_eliminadaPorAutor_devuelve409Conflict() throws Exception {
        Resena resenaEliminada = crearResena("Reseña borrada por autor", false, false);

        mockMvc.perform(put("/api/admin/resenas/" + resenaEliminada.getIdResena() + "/ocultar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Ocultar eliminada\"}"))
                .andExpect(status().isConflict());
    }

    // =========================================================================
    // 2. Publicar Reseña (Restaurar Visibilidad - Solo Administrador)
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Administrador publica reseña previamente oculta (200 OK) y rechaza reportes pendientes")
    void publicarResena_comoAdmin_devuelve200OKYRestableceVisibilidad() throws Exception {
        Resena resenaOculta = crearResena("Reseña legitima que habia sido ocultada", true, true);
        ReporteResena rep1 = crearReporte(resenaOculta, reportante1, "spam", EstadoReporte.PENDIENTE);
        ReporteResena rep2 = crearReporte(resenaOculta, reportante2, "falso", EstadoReporte.PENDIENTE);

        mockMvc.perform(put("/api/admin/resenas/" + resenaOculta.getIdResena() + "/publicar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Reseña verificada y válida\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(resenaOculta.getIdResena()))
                .andExpect(jsonPath("$.ocultaPorReportes").value(false))
                .andExpect(jsonPath("$.reportesPendientes").value(0))
                .andExpect(jsonPath("$.reportes[0].estado").value("RECHAZADO"))
                .andExpect(jsonPath("$.reportes[1].estado").value("RECHAZADO"));

        // Verificación en BD
        Resena enBd = resenaRepository.findById(resenaOculta.getIdResena()).orElseThrow();
        assertFalse(enBd.getOcultaPorReportes());

        ReporteResena rep1Bd = reporteResenaRepository.findById(rep1.getIdReporte()).orElseThrow();
        assertEquals(EstadoReporte.RECHAZADO, rep1Bd.getEstado());
    }

    @Test
    @DisplayName("[S2-43] No se puede publicar una reseña eliminada por su autor (409 Conflict)")
    void publicarResena_eliminadaPorAutor_devuelve409Conflict() throws Exception {
        Resena resenaEliminada = crearResena("Reseña borrada", false, true);

        mockMvc.perform(put("/api/admin/resenas/" + resenaEliminada.getIdResena() + "/publicar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Intento de publicar eliminada\"}"))
                .andExpect(status().isConflict());
    }

    // =========================================================================
    // 3. Rechazar Reportes de una Reseña en Lote (Solo Administrador)
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Administrador rechaza todos los reportes de una reseña (200 OK) y restaura visibilidad")
    void rechazarReportesDeResena_comoAdmin_devuelve200OKYRestableceVisibilidadSiActivosMenorA3() throws Exception {
        // Reseña oculta que tenía 3 reportes
        Resena resena = crearResena("Reseña con reportes infundados", true, true);
        ReporteResena rep1 = crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE);
        ReporteResena rep2 = crearReporte(resena, reportante2, "falso", EstadoReporte.PENDIENTE);
        ReporteResena rep3 = crearReporte(resena, reportante3, "otro", EstadoReporte.PENDIENTE);

        mockMvc.perform(put("/api/admin/resenas/" + resena.getIdResena() + "/rechazar-reportes")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Reportes infundados tras auditoría\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(resena.getIdResena()))
                .andExpect(jsonPath("$.ocultaPorReportes").value(false))
                .andExpect(jsonPath("$.reportesPendientes").value(0))
                .andExpect(jsonPath("$.reportes[0].estado").value("RECHAZADO"))
                .andExpect(jsonPath("$.reportes[1].estado").value("RECHAZADO"))
                .andExpect(jsonPath("$.reportes[2].estado").value("RECHAZADO"));

        Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
        assertFalse(enBd.getOcultaPorReportes());
    }

    // =========================================================================
    // 4. Rechazar Reporte Individual y Regla de Umbral de 3 Reportes
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Rechazar reporte individual restablece visibilidad cuando activos bajan a menos de 3")
    void rechazarReporteIndividual_restableceVisibilidadCuandoActivosBajanAMenosDe3() throws Exception {
        // Reseña inicialmente oculta con exactamente 3 reportes
        Resena resena = crearResena("Reseña con 3 reportes", true, true);
        ReporteResena rep1 = crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE);
        ReporteResena rep2 = crearReporte(resena, reportante2, "falso", EstadoReporte.PENDIENTE);
        ReporteResena rep3 = crearReporte(resena, reportante3, "otro", EstadoReporte.PENDIENTE);

        // Administrador rechaza rep1 -> quedan 2 activos (rep2, rep3), por lo que se debe desocultar
        mockMvc.perform(put("/api/admin/reportes/" + rep1.getIdReporte() + "/rechazar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idReporte").value(rep1.getIdReporte()))
                .andExpect(jsonPath("$.estado").value("RECHAZADO"));

        Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
        assertFalse(enBd.getOcultaPorReportes(), "La reseña debe volver a mostrarse al bajar de 3 reportes activos");
    }

    @Test
    @DisplayName("[S2-43] Rechazar reporte individual mantiene reseña oculta si todavía quedan >= 3 activos")
    void rechazarReporteIndividual_mantieneOcultaSiQuedanTresOMasActivos() throws Exception {
        // Reseña oculta con 4 reportes
        Resena resena = crearResena("Reseña con 4 reportes", true, true);
        ReporteResena rep1 = crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE);
        ReporteResena rep2 = crearReporte(resena, reportante2, "falso", EstadoReporte.PENDIENTE);
        ReporteResena rep3 = crearReporte(resena, reportante3, "otro", EstadoReporte.PENDIENTE);
        ReporteResena rep4 = crearReporte(resena, reportante4, "lenguaje-ofensivo", EstadoReporte.PENDIENTE);

        // Administrador rechaza rep1 -> quedan 3 activos (rep2, rep3, rep4), debe permanecer oculta
        mockMvc.perform(put("/api/admin/reportes/" + rep1.getIdReporte() + "/rechazar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idReporte").value(rep1.getIdReporte()))
                .andExpect(jsonPath("$.estado").value("RECHAZADO"));

        Resena enBd = resenaRepository.findById(resena.getIdResena()).orElseThrow();
        assertTrue(enBd.getOcultaPorReportes(), "La reseña debe seguir oculta porque quedan 3 reportes activos");
    }

    // =========================================================================
    // 5. Control de Acceso: Moderador NO puede ejecutar acciones (403 Forbidden)
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Moderador no tiene permisos para ocultar reseña (403 Forbidden)")
    void moderador_intentaOcultar_devuelve403Forbidden() throws Exception {
        Resena resena = crearResena("Reseña prueba", true, false);

        mockMvc.perform(put("/api/admin/resenas/" + resena.getIdResena() + "/ocultar")
                        .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/ocultar")
                        .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-43] Moderador no tiene permisos para publicar reseña (403 Forbidden)")
    void moderador_intentaPublicar_devuelve403Forbidden() throws Exception {
        Resena resena = crearResena("Reseña prueba", true, true);

        mockMvc.perform(put("/api/admin/resenas/" + resena.getIdResena() + "/publicar")
                        .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/moderacion/resenas/" + resena.getIdResena() + "/publicar")
                        .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-43] Moderador no tiene permisos para rechazar reportes (403 Forbidden)")
    void moderador_intentaRechazarReporte_devuelve403Forbidden() throws Exception {
        Resena resena = crearResena("Reseña prueba", true, true);
        ReporteResena rep = crearReporte(resena, reportante1, "spam", EstadoReporte.PENDIENTE);

        mockMvc.perform(put("/api/admin/reportes/" + rep.getIdReporte() + "/rechazar")
                        .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/moderacion/reportes/" + rep.getIdReporte() + "/rechazar")
                        .with(jwt().jwt(b -> b.subject(usuarioModerador.getSupabaseUid()).claim("email", usuarioModerador.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 6. Control de Acceso: Usuario Normal, Administrador Inactivo y No Autenticado
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Usuario registrado normal recibe 403 Forbidden")
    void usuarioNormal_recibe403Forbidden() throws Exception {
        Resena resena = crearResena("Reseña", true, false);

        mockMvc.perform(put("/api/admin/resenas/" + resena.getIdResena() + "/ocultar")
                        .with(jwt().jwt(b -> b.subject(usuarioNormal.getSupabaseUid()).claim("email", usuarioNormal.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-43] Administrador inactivo recibe 403 Forbidden")
    void adminInactivo_recibe403Forbidden() throws Exception {
        Resena resena = crearResena("Reseña", true, false);

        mockMvc.perform(put("/api/admin/resenas/" + resena.getIdResena() + "/ocultar")
                        .with(jwt().jwt(b -> b.subject(adminInactivo.getSupabaseUid()).claim("email", adminInactivo.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-43] Solicitud sin autenticación recibe 401 Unauthorized")
    void sinAutenticacion_recibe401Unauthorized() throws Exception {
        mockMvc.perform(put("/api/admin/resenas/1/ocultar")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 7. Manejo de Recursos Inexistentes (404 Not Found)
    // =========================================================================

    @Test
    @DisplayName("[S2-43] Reseña inexistente devuelve 404 Not Found")
    void resenaInexistente_devuelve404NotFound() throws Exception {
        mockMvc.perform(put("/api/admin/resenas/999999/ocultar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("[S2-43] Reporte inexistente devuelve 404 Not Found")
    void reporteInexistente_devuelve404NotFound() throws Exception {
        mockMvc.perform(put("/api/admin/reportes/999999/rechazar")
                        .with(jwt().jwt(b -> b.subject(usuarioAdmin.getSupabaseUid()).claim("email", usuarioAdmin.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}

