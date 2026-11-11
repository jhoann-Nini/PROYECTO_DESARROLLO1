package com.example.backend.controller;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

@SpringBootTest
@Transactional
class ModeracionResenasIntegrationTest {

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

    private Producto producto1;
    private Producto producto2;

    private Usuario autor;
    private Usuario reportante1;
    private Usuario reportante2;

    private Usuario usuarioModerador;
    private Usuario usuarioAdmin;
    private Usuario usuarioNormal;
    private Usuario moderadorInactivo;

    private Resena resenaReportada1;
    private Resena resenaReportada2;
    private Resena resenaLimpiaSinReportes;

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

        Rol rolUsuario = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol normal");
                    return rolRepository.save(r);
                });

        Rol rolModerador = rolRepository.findByNombre("Moderador")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Moderador");
                    r.setDescripcion("Rol de moderacion");
                    return rolRepository.save(r);
                });

        Rol rolAdmin = rolRepository.findByNombre("Administrador")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Administrador");
                    r.setDescripcion("Rol de administracion");
                    return rolRepository.save(r);
                });

        // Crear usuarios
        autor = crearUsuario("Autor Reseña", rolUsuario, true);
        reportante1 = crearUsuario("Reportante 1", rolUsuario, true);
        reportante2 = crearUsuario("Reportante 2", rolUsuario, true);

        usuarioNormal = crearUsuario("Usuario Normal", rolUsuario, true);

        usuarioModerador = crearUsuario("Usuario Moderador", rolModerador, true);
        vincularRol(usuarioModerador, rolModerador, true);

        usuarioAdmin = crearUsuario("Usuario Admin", rolAdmin, true);
        vincularRol(usuarioAdmin, rolAdmin, true);

        moderadorInactivo = crearUsuario("Mod Inactivo", rolModerador, false);
        vincularRol(moderadorInactivo, rolModerador, true);

        // Crear productos
        producto1 = new Producto();
        producto1.setNombre("Smartphone X " + UUID.randomUUID());
        producto1.setDescripcion("Smartphone de gama alta");
        producto1.setCategoria(categoria);
        producto1.setMarca(marca);
        producto1.setPrecioReferencia(new BigDecimal("999.99"));
        producto1.setEstado(true);
        producto1 = productoRepository.save(producto1);

        producto2 = new Producto();
        producto2.setNombre("Tablet Y " + UUID.randomUUID());
        producto2.setDescripcion("Tablet para creadores");
        producto2.setCategoria(categoria);
        producto2.setMarca(marca);
        producto2.setPrecioReferencia(new BigDecimal("599.99"));
        producto2.setEstado(true);
        producto2 = productoRepository.save(producto2);

        // Crear reseñas
        resenaReportada1 = new Resena();
        resenaReportada1.setProducto(producto1);
        resenaReportada1.setUsuario(autor);
        resenaReportada1.setComentario("Comentario sospechoso con posible spam de otra tienda");
        resenaReportada1.setPuntuacion(1);
        resenaReportada1.setEstado(true);
        resenaReportada1.setOcultaPorReportes(false);
        resenaReportada1.setFechaCreacion(LocalDateTime.now().minusHours(2));
        resenaReportada1 = resenaRepository.save(resenaReportada1);

        resenaReportada2 = new Resena();
        resenaReportada2.setProducto(producto2);
        resenaReportada2.setUsuario(autor);
        resenaReportada2.setComentario("Comentario con insultos y lenguaje inapropiado");
        resenaReportada2.setPuntuacion(2);
        resenaReportada2.setEstado(true);
        resenaReportada2.setOcultaPorReportes(true);
        resenaReportada2.setFechaCreacion(LocalDateTime.now().minusHours(1));
        resenaReportada2 = resenaRepository.save(resenaReportada2);

        resenaLimpiaSinReportes = new Resena();
        resenaLimpiaSinReportes.setProducto(producto1);
        resenaLimpiaSinReportes.setUsuario(autor);
        resenaLimpiaSinReportes.setComentario("Excelente producto, sin ningun reporte ni queja");
        resenaLimpiaSinReportes.setPuntuacion(5);
        resenaLimpiaSinReportes.setEstado(true);
        resenaLimpiaSinReportes.setOcultaPorReportes(false);
        resenaLimpiaSinReportes.setFechaCreacion(LocalDateTime.now().minusMinutes(30));
        resenaLimpiaSinReportes = resenaRepository.save(resenaLimpiaSinReportes);

        // Crear reportes para resenaReportada1 (2 reportes: 2 PENDIENTES)
        crearReporte(resenaReportada1, reportante1, "spam", "Contiene enlaces a sitios dudosos", EstadoReporte.PENDIENTE);
        crearReporte(resenaReportada1, reportante2, "falso", "Opinión falsa", EstadoReporte.PENDIENTE);

        // Crear reporte para resenaReportada2 (1 reporte: ACEPTADO / ya resuelto)
        crearReporte(resenaReportada2, reportante1, "lenguaje-ofensivo", "Insultos explícitos", EstadoReporte.ACEPTADO);
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

    private ReporteResena crearReporte(Resena resena, Usuario reportante, String motivo, String descripcion, EstadoReporte estado) {
        ReporteResena r = new ReporteResena();
        r.setResena(resena);
        r.setUsuario(reportante);
        r.setMotivo(motivo);
        r.setDescripcion(descripcion);
        r.setEstado(estado);
        r.setFechaCreacion(LocalDateTime.now());
        r.setFechaActualizacion(LocalDateTime.now());
        return reporteResenaRepository.save(r);
    }

    // =========================================================================
    // Pruebas S2-42: Control de Acceso y Roles
    // =========================================================================

    @Test
    @DisplayName("[S2-42] Moderador autenticado lista reseñas reportadas exitosamente (200 OK)")
    void listarResenasReportadas_comoModerador_devuelve200OKYListaAgrupada() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                // La resena 1 tiene 2 reportes pendientes y 2 totales
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].nombreProducto").value(producto1.getNombre()))
                .andExpect(jsonPath("$[0].idAutor").value(autor.getIdUsuario()))
                .andExpect(jsonPath("$[0].nombreAutor").value(autor.getNombre()))
                .andExpect(jsonPath("$[0].comentario").value(resenaReportada1.getComentario()))
                .andExpect(jsonPath("$[0].puntuacion").value(1))
                .andExpect(jsonPath("$[0].totalReportes").value(2))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2))
                .andExpect(jsonPath("$[0].reportes", hasSize(2)))
                .andExpect(jsonPath("$[0].reportes[0].motivo").isNotEmpty())
                .andExpect(jsonPath("$[0].reportes[0].estado").value("PENDIENTE"))
                // La resena 2 tiene 0 pendientes y 1 total
                .andExpect(jsonPath("$[1].idResena").value(resenaReportada2.getIdResena()))
                .andExpect(jsonPath("$[1].totalReportes").value(1))
                .andExpect(jsonPath("$[1].reportesPendientes").value(0));
    }

    @Test
    @DisplayName("[S2-42] Administrador autenticado lista reseñas reportadas exitosamente (200 OK)")
    void listarResenasReportadas_comoAdministrador_devuelve200OK() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioAdmin.getSupabaseUid())
                                .claim("email", usuarioAdmin.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @DisplayName("[S2-42] Usuario registrado regular sin permisos de moderación recibe 403 Forbidden")
    void listarResenasReportadas_comoUsuarioRegistrado_devuelve403Forbidden() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioNormal.getSupabaseUid())
                                .claim("email", usuarioNormal.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-42] Cuenta de moderador inactiva o suspendida recibe 403 Forbidden")
    void listarResenasReportadas_comoModeradorInactivo_devuelve403Forbidden() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(moderadorInactivo.getSupabaseUid())
                                .claim("email", moderadorInactivo.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("[S2-42] Petición sin token de autenticación recibe 401 Unauthorized")
    void listarResenasReportadas_sinToken_devuelve401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // Pruebas S2-42: Filtros y Casos de Negocio
    // =========================================================================

    @Test
    @DisplayName("[S2-42] Atajo /pendientes o filtro ?estado=PENDIENTE solo retorna reseñas con reportes pendientes")
    void listarResenasPendientes_filtroPendientes_soloRetornaResenasConReportesPendientes() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/pendientes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2));

        // Mismo resultado usando el query param en la ruta general
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("estado", "PENDIENTE")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()));
    }

    @Test
    @DisplayName("[S2-42] Filtro por idProducto retorna únicamente reseñas del producto indicado")
    void listarResenasReportadas_filtroPorProducto_filtraCorrectamente() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("idProducto", producto2.getIdProducto().toString())
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada2.getIdResena()))
                .andExpect(jsonPath("$[0].nombreProducto").value(producto2.getNombre()));
    }

    @Test
    @DisplayName("[S2-42] Filtro por oculta=true retorna únicamente reseñas ocultas preventivamente")
    void listarResenasReportadas_filtroOcultas_filtraCorrectamente() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("oculta", "true")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada2.getIdResena()))
                .andExpect(jsonPath("$[0].ocultaPorReportes").value(true));
    }

    @Test
    @DisplayName("[S2-42] Reseñas sin reportes nunca aparecen en la cola de moderación")
    void resenasSinReportes_noAparecenEnCola() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].idResena", not(hasItem(resenaLimpiaSinReportes.getIdResena().intValue()))));
    }

    @Test
    @DisplayName("[S2-42] Rutas compatibles (/api/resenas/reportadas y /api/admin/resenas/reportadas) responden 200 OK")
    void listarResenasReportadas_rutasCompatibles_devuelvenMismoResultado() throws Exception {
        mockMvc.perform(get("/api/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioAdmin.getSupabaseUid())
                                .claim("email", usuarioAdmin.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        mockMvc.perform(get("/api/admin/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioAdmin.getSupabaseUid())
                                .claim("email", usuarioAdmin.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @DisplayName("[S2-42] Consulta plana de reportes de moderación en /api/moderacion/reportes devuelve 200 OK")
    void listarReportes_comoModerador_devuelveListaPlana200OK() throws Exception {
        mockMvc.perform(get("/api/moderacion/reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].idReporte").isNumber())
                .andExpect(jsonPath("$[0].motivo").isNotEmpty());
    }
}
