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
import com.example.backend.repository.ReporteResenaDecisionAuditoriaRepository;
import com.example.backend.repository.ReporteResenaRepository;
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
    private UsuarioRolRepository usuarioRolRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private ResenaRepository resenaRepository;

    @Autowired
    private ReporteResenaRepository reporteResenaRepository;

    @Autowired
    private ReporteResenaDecisionAuditoriaRepository decisionAuditoriaRepository;

    @Autowired
    private ResenaModeracionAuditoriaRepository resenaModeracionAuditoriaRepository;

    private MockMvc mockMvc;

    private Producto producto1;
    private Producto producto2;

    private Usuario autor;
    private Usuario reportante1;
    private Usuario reportante2;

    private Usuario usuarioModerador;
    private Usuario usuarioAdmin;
    private Usuario usuarioNormal;
    private Usuario usuarioTienda;
    private Usuario usuarioSuspendido;
    private Usuario moderadorRevocadoConRolLegado;

    private Resena resenaReportada1;
    private Resena resenaReportada2;
    private Resena resenaLimpiaSinReportes;

    private Rol rolUsuario;
    private Rol rolModerador;
    private Rol rolAdmin;
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
                    r.setDescripcion("Rol representante tienda");
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

        usuarioTienda = crearUsuario("Usuario Tienda", rolRepresentante, true);
        vincularRol(usuarioTienda, rolRepresentante, true);

        usuarioSuspendido = crearUsuario("Usuario Suspendido", rolModerador, false);
        vincularRol(usuarioSuspendido, rolModerador, true);

        // Usuario con rol legado 'Moderador' pero cuya asignación multirrol está revocada (estado=false)
        moderadorRevocadoConRolLegado = crearUsuario("Mod Revocado", rolModerador, true);
        vincularRol(moderadorRevocadoConRolLegado, rolModerador, false);

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
        usuarioRolRepository.save(ur);
        if (usuario.getRoles() != null) {
            usuario.getRoles().add(ur);
        }
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
    // 14 Pruebas Obligatorias S2-42
    // =========================================================================

    @Test
    @DisplayName("1. Administrador activo puede consultar reseñas reportadas")
    void administradorActivoPuedeConsultarResenasReportadas() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioAdmin.getSupabaseUid())
                                .claim("email", usuarioAdmin.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @DisplayName("2. Moderador activo puede consultar reseñas reportadas")
    void moderadorActivoPuedeConsultarResenasReportadas() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    @DisplayName("3. Usuario regular recibe 403")
    void usuarioRegularRecibe403() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioNormal.getSupabaseUid())
                                .claim("email", usuarioNormal.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("4. Tienda sin permisos de moderación recibe 403")
    void tiendaSinPermisosModeracionRecibe403() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioTienda.getSupabaseUid())
                                .claim("email", usuarioTienda.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. Usuario suspendido recibe 403")
    void usuarioSuspendidoRecibe403() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioSuspendido.getSupabaseUid())
                                .claim("email", usuarioSuspendido.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Usuario sin autenticación recibe 401")
    void usuarioSinAutenticacionRecibe401() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("7. El filtro por estado funciona")
    void filtroPorEstadoFunciona() throws Exception {
        // Filtrar por PENDIENTE: debe retornar solo resenaReportada1
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("estado", "PENDIENTE")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].reportes", hasSize(2)))
                .andExpect(jsonPath("$[0].reportes[*].estado", everyItem(equalTo("PENDIENTE"))));

        // Filtrar por ACEPTADO: debe retornar solo resenaReportada2
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("estado", "ACEPTADO")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada2.getIdResena()))
                .andExpect(jsonPath("$[0].reportes[0].estado").value("ACEPTADO"));
    }

    @Test
    @DisplayName("8. El filtro por producto funciona")
    void filtroPorProductoFunciona() throws Exception {
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
    @DisplayName("9. El filtro oculta funciona")
    void filtroOcultaFunciona() throws Exception {
        // resenaReportada2 tiene ocultaPorReportes=true
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

        // resenaReportada1 tiene ocultaPorReportes=false
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("oculta", "false")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].ocultaPorReportes").value(false));
    }

    @Test
    @DisplayName("10. Las reseñas sin reportes no aparecen")
    void resenasSinReportesNoAparecen() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].idResena", not(hasItem(resenaLimpiaSinReportes.getIdResena().intValue()))));
    }

    @Test
    @DisplayName("11. La agrupación de reportes por reseña es correcta")
    void agrupacionReportesPorResenaEsCorrecta() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].idProducto").value(producto1.getIdProducto()))
                .andExpect(jsonPath("$[0].nombreProducto").value(producto1.getNombre()))
                .andExpect(jsonPath("$[0].idAutor").value(autor.getIdUsuario()))
                .andExpect(jsonPath("$[0].nombreAutor").value(autor.getNombre()))
                .andExpect(jsonPath("$[0].comentario").value(resenaReportada1.getComentario()))
                .andExpect(jsonPath("$[0].puntuacion").value(1))
                .andExpect(jsonPath("$[0].reportes", hasSize(2)));
    }

    @Test
    @DisplayName("12. Los conteos de reportes pendientes y totales son correctos")
    void conteosReportesPendientesYTotalesSonCorrectos() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].totalReportes").value(2))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2))
                .andExpect(jsonPath("$[1].idResena").value(resenaReportada2.getIdResena()))
                .andExpect(jsonPath("$[1].totalReportes").value(1))
                .andExpect(jsonPath("$[1].reportesPendientes").value(0));
    }

    @Test
    @DisplayName("13. Un usuario con rol Moderador revocado no conserva acceso por su rol legado")
    void moderadorConRolRevocadoNoConservaAccesoPorRolLegado() throws Exception {
        // moderadorRevocadoConRolLegado tiene usuario.rol = Moderador, pero UsuarioRol.estado = false
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(moderadorRevocadoConRolLegado.getSupabaseUid())
                                .claim("email", moderadorRevocadoConRolLegado.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("14. Las consultas no modifican estados ni campos de auditoría")
    void consultasNoModificanEstadosNiAuditoria() throws Exception {
        long conteoAuditoriaDecisionAntes = decisionAuditoriaRepository.count();
        long conteoAuditoriaResenaAntes = resenaModeracionAuditoriaRepository.count();

        // Estados y flags de visibilidad antes de las consultas
        Boolean estadoResena1Antes = resenaReportada1.getEstado();
        Boolean ocultaRepResena1Antes = resenaReportada1.getOcultaPorReportes();
        Boolean ocultaModResena1Antes = resenaReportada1.getOcultaPorModeracion();

        Boolean estadoResena2Antes = resenaReportada2.getEstado();
        Boolean ocultaRepResena2Antes = resenaReportada2.getOcultaPorReportes();
        Boolean ocultaModResena2Antes = resenaReportada2.getOcultaPorModeracion();

        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/moderacion/resenas/pendientes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/moderacion/reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        long conteoAuditoriaDecisionDespues = decisionAuditoriaRepository.count();
        long conteoAuditoriaResenaDespues = resenaModeracionAuditoriaRepository.count();

        // 1. Verificación de inmutabilidad en auditoría
        assertEquals(conteoAuditoriaDecisionAntes, conteoAuditoriaDecisionDespues,
                "No deben crearse registros en auditoria de decisiones sobre reportes");
        assertEquals(conteoAuditoriaResenaAntes, conteoAuditoriaResenaDespues,
                "No deben crearse registros en auditoria de moderacion de resenas");

        // 2. Verificación de inmutabilidad en estados de reportes
        ReporteResena reporte1 = reporteResenaRepository.findAll().stream()
                .filter(r -> r.getResena().getIdResena().equals(resenaReportada1.getIdResena()))
                .findFirst().orElseThrow();
        assertEquals(EstadoReporte.PENDIENTE, reporte1.getEstado(),
                "El estado del reporte 1 no debe cambiar tras las consultas");

        ReporteResena reporte2 = reporteResenaRepository.findAll().stream()
                .filter(r -> r.getResena().getIdResena().equals(resenaReportada2.getIdResena()))
                .findFirst().orElseThrow();
        assertEquals(EstadoReporte.ACEPTADO, reporte2.getEstado(),
                "El estado del reporte 2 no debe cambiar tras las consultas");

        // 3. Verificación de inmutabilidad en estado y flags de visibilidad de las reseñas
        Resena resena1Despues = resenaRepository.findById(resenaReportada1.getIdResena()).orElseThrow();
        assertEquals(estadoResena1Antes, resena1Despues.getEstado(),
                "El estado activo/inactivo de la reseña 1 no debe cambiar");
        assertEquals(ocultaRepResena1Antes, resena1Despues.getOcultaPorReportes(),
                "ocultaPorReportes de la reseña 1 no debe cambiar");
        assertEquals(ocultaModResena1Antes, resena1Despues.getOcultaPorModeracion(),
                "ocultaPorModeracion de la reseña 1 no debe cambiar");

        Resena resena2Despues = resenaRepository.findById(resenaReportada2.getIdResena()).orElseThrow();
        assertEquals(estadoResena2Antes, resena2Despues.getEstado(),
                "El estado activo/inactivo de la reseña 2 no debe cambiar");
        assertEquals(ocultaRepResena2Antes, resena2Despues.getOcultaPorReportes(),
                "ocultaPorReportes de la reseña 2 no debe cambiar");
        assertEquals(ocultaModResena2Antes, resena2Despues.getOcultaPorModeracion(),
                "ocultaPorModeracion de la reseña 2 no debe cambiar");
    }

    // =========================================================================
    // Pruebas adicionales para /pendientes y /reportes plano
    // =========================================================================

    @Test
    @DisplayName("Atajo /api/moderacion/resenas/pendientes solo retorna reseñas con reportes pendientes")
    void listarResenasPendientesAtajo() throws Exception {
        mockMvc.perform(get("/api/moderacion/resenas/pendientes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2));
    }

    @Test
    @DisplayName("Consulta plana /api/moderacion/reportes retorna reportes PENDIENTE por defecto y admite filtrado")
    void listarReportesPlano() throws Exception {
        // Sin parámetro estado: por defecto filtra por PENDIENTE (compatibilidad Fase 2)
        mockMvc.perform(get("/api/moderacion/reportes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].estado", everyItem(equalTo("PENDIENTE"))))
                .andExpect(jsonPath("$[0].idReporte").isNumber())
                .andExpect(jsonPath("$[0].motivo").isNotEmpty());

        // Con parámetro explícito estado=ACEPTADO
        mockMvc.perform(get("/api/moderacion/reportes")
                        .param("estado", "ACEPTADO")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].estado").value("ACEPTADO"));
    }

    // =========================================================================
    // Prueba de regresión S2-42: Conteos globales con reportes mixtos y filtros
    // =========================================================================

    @Test
    @DisplayName("17. Regresión S2-42: Conteo global exacto (totalReportes=3, reportesPendientes=2) al filtrar por estado=PENDIENTE, /pendientes y sin filtro")
    void regresionConteosConFiltroEstado() throws Exception {
        // resenaReportada1 ya tiene 2 reportes PENDIENTE en setUp().
        // Agregamos un tercer reporte con estado ACEPTADO a la misma resenaReportada1.
        Usuario reportante3 = crearUsuario("Reportante 3", rolUsuario, true);
        crearReporte(resenaReportada1, reportante3, "contenido-inapropiado", "Reporte ya evaluado y aceptado", EstadoReporte.ACEPTADO);

        // 1. Consulta con filtro estado=PENDIENTE
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .param("estado", "PENDIENTE")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                // Solo resenaReportada1 califica porque tiene reportes pendientes (resenaReportada2 solo tiene ACEPTADO)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].totalReportes").value(3))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2))
                .andExpect(jsonPath("$[0].reportes", hasSize(3)))
                .andExpect(jsonPath("$[0].reportes[?(@.estado == 'PENDIENTE')]", hasSize(2)))
                .andExpect(jsonPath("$[0].reportes[?(@.estado == 'ACEPTADO')]", hasSize(1)));

        // 2. Consulta en el atajo de pendientes (/api/moderacion/resenas/pendientes)
        mockMvc.perform(get("/api/moderacion/resenas/pendientes")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].totalReportes").value(3))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2))
                .andExpect(jsonPath("$[0].reportes", hasSize(3)))
                .andExpect(jsonPath("$[0].reportes[?(@.estado == 'PENDIENTE')]", hasSize(2)))
                .andExpect(jsonPath("$[0].reportes[?(@.estado == 'ACEPTADO')]", hasSize(1)));

        // 3. Consulta sin filtro de estado
        mockMvc.perform(get("/api/moderacion/resenas/reportadas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuarioModerador.getSupabaseUid())
                                .claim("email", usuarioModerador.getCorreo())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                // Aparecen ambas resenas (resenaReportada1 con 2 pendientes y 3 totales; resenaReportada2 con 0 pendientes y 1 total)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].idResena").value(resenaReportada1.getIdResena()))
                .andExpect(jsonPath("$[0].totalReportes").value(3))
                .andExpect(jsonPath("$[0].reportesPendientes").value(2))
                .andExpect(jsonPath("$[0].reportes", hasSize(3)))
                .andExpect(jsonPath("$[1].idResena").value(resenaReportada2.getIdResena()))
                .andExpect(jsonPath("$[1].totalReportes").value(1))
                .andExpect(jsonPath("$[1].reportesPendientes").value(0));
    }
}

