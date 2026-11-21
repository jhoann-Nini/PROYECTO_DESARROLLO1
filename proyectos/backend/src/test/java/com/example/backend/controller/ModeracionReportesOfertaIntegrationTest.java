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
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ReporteOferta;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteOfertaHistorialRepository;
import com.example.backend.repository.ReporteOfertaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import com.example.backend.service.LimiteReportesService;
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
 * Fase 2 (H-05, H-07): moderación de reportes de ofertas, un reporte abierto
 * por usuario y oferta, y límite de reportes por hora.
 * <p>
 * Corre sobre H2: valida la lógica de la aplicación. Los triggers de la
 * migración 021 se validaron aparte en PostgreSQL.
 */
@SpringBootTest
@Transactional
@DisplayName("Fase 2: moderación de reportes de ofertas")
class ModeracionReportesOfertaIntegrationTest {

  private static final String BASE = "/api/moderacion/ofertas/reportes";

  @Autowired private WebApplicationContext context;
  @Autowired private CategoriaRepository categoriaRepository;
  @Autowired private MarcaRepository marcaRepository;
  @Autowired private ProductoRepository productoRepository;
  @Autowired private EstablecimientoRepository establecimientoRepository;
  @Autowired private ProductoEstablecimientoRepository productoEstablecimientoRepository;
  @Autowired private UsuarioRepository usuarioRepository;
  @Autowired private RolRepository rolRepository;
  @Autowired private UsuarioRolRepository usuarioRolRepository;
  @Autowired private ReporteOfertaRepository reporteOfertaRepository;
  @Autowired private ReporteOfertaHistorialRepository historialRepository;
  @Autowired private ResenaRepository resenaRepository;

  private MockMvc mockMvc;
  private Producto producto;
  private Establecimiento establecimiento;
  private Usuario reportante;
  private Usuario moderador;
  private Usuario administrador;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

    Categoria categoria = new Categoria();
    categoria.setNombre("Categoria " + UUID.randomUUID());
    categoria.setDescripcion("Categoria de prueba");
    categoria.setEstado(true);
    categoria = categoriaRepository.save(categoria);

    Marca marca = new Marca();
    marca.setNombre("Marca " + UUID.randomUUID());
    marca.setDescripcion("Marca de prueba");
    marca.setEstado(true);
    marca = marcaRepository.save(marca);

    producto = new Producto();
    producto.setNombre("Producto " + UUID.randomUUID());
    producto.setDescripcion("Producto de prueba");
    producto.setCategoria(categoria);
    producto.setMarca(marca);
    producto.setPrecioReferencia(new BigDecimal("100000.00"));
    producto.setEstado(true);
    producto = productoRepository.saveAndFlush(producto);

    establecimiento = establecimiento();
    oferta(establecimiento, "95000.00");

    reportante = usuario("Reportante", rol("Usuario registrado"));
    moderador = usuario("Moderador", rol("Moderador"));
    administrador = usuario("Administrador", rol("Administrador"));
  }

  @Test
  @DisplayName("Un segundo reporte abierto sobre la misma oferta devuelve 409")
  void reporteAbiertoDuplicadoEsConflicto() throws Exception {
    crearReporte(reportante).andExpect(status().isCreated());
    crearReporte(reportante)
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value(
        "Ya tienes un reporte abierto sobre esta oferta. Espera a que moderación lo revise."));
  }

  @Test
  @DisplayName("Cuando el reporte se cierra, el usuario puede volver a reportar la oferta")
  void trasCerrarSePuedeReportarDeNuevo() throws Exception {
    ReporteOferta cerrado = reporte(reportante, EstadoReporte.RECHAZADO, LocalDateTime.now());
    assertEquals(EstadoReporte.RECHAZADO, cerrado.getEstado());

    crearReporte(reportante).andExpect(status().isCreated());
  }

  @Test
  @DisplayName("El reporte 11 en una hora devuelve 429, también para reseñas")
  void limiteDeReportesPorHora() throws Exception {
    for (int i = 0; i < LimiteReportesService.MAX_REPORTES_POR_HORA; i++) {
      Establecimiento otro = establecimiento();
      oferta(otro, "90000.00");
      ReporteOferta r = nuevoReporte(reportante, otro, EstadoReporte.PENDIENTE, LocalDateTime.now());
      reporteOfertaRepository.saveAndFlush(r);
    }

    crearReporte(reportante)
      .andExpect(status().isTooManyRequests())
      .andExpect(jsonPath("$.message").value(LimiteReportesService.MENSAJE_LIMITE_REPORTES));

    Resena ajena = resenaDe(moderador);
    mockMvc.perform(post("/api/resenas/" + ajena.getIdResena() + "/reportes").with(como(reportante))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"motivo\":\"spam\",\"descripcion\":\"Publicidad\"}"))
      .andExpect(status().isTooManyRequests());
  }

  @Test
  @DisplayName("Los reportes de hace más de una hora no cuentan para el límite")
  void reportesAntiguosNoCuentan() throws Exception {
    for (int i = 0; i < LimiteReportesService.MAX_REPORTES_POR_HORA; i++) {
      Establecimiento otro = establecimiento();
      oferta(otro, "90000.00");
      reporteOfertaRepository.saveAndFlush(
        nuevoReporte(reportante, otro, EstadoReporte.RECHAZADO, LocalDateTime.now().minusHours(2)));
    }

    crearReporte(reportante).andExpect(status().isCreated());
  }

  @Test
  @DisplayName("La cola lista con precio actual y filtra por estado")
  void listarYFiltrar() throws Exception {
    ReporteOferta pendiente = reporte(reportante, EstadoReporte.PENDIENTE, LocalDateTime.now());

    mockMvc.perform(get(BASE).with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[*].idReporte").value(hasItem(pendiente.getIdReporte().intValue())))
      .andExpect(jsonPath("$[0].nombreProducto").value(producto.getNombre()))
      .andExpect(jsonPath("$[0].nombreEstablecimiento").value(establecimiento.getNombre()))
      .andExpect(jsonPath("$[0].precioActual").value(95000.00))
      .andExpect(jsonPath("$[0].nombreUsuario").value("Reportante"));

    mockMvc.perform(get(BASE).param("estado", "ACEPTADO").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[*].idReporte").value(not(hasItem(pendiente.getIdReporte().intValue()))));

    mockMvc.perform(get(BASE).param("estado", "INVENTADO").with(como(moderador)))
      .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Tomar un reporte lo pasa a EN_REVISION y deja un evento")
  void tomarReporte() throws Exception {
    ReporteOferta pendiente = reporte(reportante, EstadoReporte.PENDIENTE, LocalDateTime.now());

    mockMvc.perform(put(BASE + "/" + pendiente.getIdReporte() + "/en-revision").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("EN_REVISION"))
      .andExpect(jsonPath("$.historial", hasSize(1)))
      .andExpect(jsonPath("$.historial[0].estadoAnterior").value("PENDIENTE"))
      .andExpect(jsonPath("$.historial[0].estadoNuevo").value("EN_REVISION"))
      .andExpect(jsonPath("$.historial[0].nombreModerador").value("Moderador"));

    mockMvc.perform(put(BASE + "/" + pendiente.getIdReporte() + "/en-revision").with(como(moderador)))
      .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("Aceptar un reporte pendiente registra los dos pasos en el historial")
  void aceptarDesdePendiente() throws Exception {
    ReporteOferta pendiente = reporte(reportante, EstadoReporte.PENDIENTE, LocalDateTime.now());

    mockMvc.perform(put(BASE + "/" + pendiente.getIdReporte() + "/aceptar").with(como(administrador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"El precio real es 120.000\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("ACEPTADO"))
      .andExpect(jsonPath("$.historial", hasSize(2)))
      .andExpect(jsonPath("$.historial[0].estadoNuevo").value("EN_REVISION"))
      .andExpect(jsonPath("$.historial[1].estadoNuevo").value("ACEPTADO"))
      .andExpect(jsonPath("$.historial[1].justificacion").value("El precio real es 120.000"));

    assertEquals(2, historialRepository.count());
    // Aceptar no modifica el precio de la oferta.
    mockMvc.perform(get(BASE + "/" + pendiente.getIdReporte()).with(como(moderador)))
      .andExpect(jsonPath("$.precioActual").value(95000.00));

    mockMvc.perform(put(BASE + "/" + pendiente.getIdReporte() + "/rechazar").with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Tarde\"}"))
      .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("Rechazar exige justificación")
  void rechazarExigeJustificacion() throws Exception {
    ReporteOferta pendiente = reporte(reportante, EstadoReporte.PENDIENTE, LocalDateTime.now());
    String url = BASE + "/" + pendiente.getIdReporte() + "/rechazar";

    mockMvc.perform(put(url).with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"   \"}"))
      .andExpect(status().isBadRequest());
    assertEquals(0, historialRepository.count());

    mockMvc.perform(put(url).with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"El precio coincide con la tienda\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("RECHAZADO"))
      .andExpect(jsonPath("$.historial[1].justificacion").value("El precio coincide con la tienda"));
  }

  @Test
  @DisplayName("Un moderador no puede resolver un reporte creado por él")
  void moderadorNoResuelveSuPropioReporte() throws Exception {
    ReporteOferta propio = reporte(moderador, EstadoReporte.PENDIENTE, LocalDateTime.now());

    mockMvc.perform(put(BASE + "/" + propio.getIdReporte() + "/aceptar").with(como(moderador)))
      .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Usuario sin rol recibe 403, anónimo 401 y un id inexistente 404")
  void autorizacionYNoEncontrado() throws Exception {
    ReporteOferta pendiente = reporte(reportante, EstadoReporte.PENDIENTE, LocalDateTime.now());

    mockMvc.perform(get(BASE).with(como(reportante))).andExpect(status().isForbidden());
    mockMvc.perform(put(BASE + "/" + pendiente.getIdReporte() + "/aceptar").with(como(reportante)))
      .andExpect(status().isForbidden());
    mockMvc.perform(get(BASE)).andExpect(status().isUnauthorized());
    mockMvc.perform(get(BASE + "/999999").with(como(moderador))).andExpect(status().isNotFound());
  }

  private org.springframework.test.web.servlet.ResultActions crearReporte(Usuario usuario) throws Exception {
    return mockMvc.perform(post("/api/reportes/ofertas").with(como(usuario))
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"idProducto\":" + producto.getIdProducto()
        + ",\"idEstablecimiento\":" + establecimiento.getIdEstablecimiento()
        + ",\"motivo\":\"precio_incorrecto\",\"descripcion\":\"El precio no coincide\"}"));
  }

  private ReporteOferta reporte(Usuario usuario, EstadoReporte estado, LocalDateTime fecha) {
    return reporteOfertaRepository.saveAndFlush(nuevoReporte(usuario, establecimiento, estado, fecha));
  }

  private ReporteOferta nuevoReporte(
    Usuario usuario, Establecimiento tienda, EstadoReporte estado, LocalDateTime fecha) {
    ReporteOferta r = new ReporteOferta();
    r.setProducto(producto);
    r.setEstablecimiento(tienda);
    r.setUsuario(usuario);
    r.setMotivo("precio_incorrecto");
    r.setDescripcion("Precio desactualizado");
    r.setEstado(estado);
    r.setFechaCreacion(fecha);
    r.setFechaActualizacion(fecha);
    return r;
  }

  private Establecimiento establecimiento() {
    Establecimiento e = new Establecimiento();
    e.setNombre("Tienda " + UUID.randomUUID());
    e.setEstado(true);
    return establecimientoRepository.saveAndFlush(e);
  }

  private void oferta(Establecimiento tienda, String precio) {
    ProductoEstablecimiento oferta = new ProductoEstablecimiento();
    oferta.setProducto(producto);
    oferta.setEstablecimiento(tienda);
    oferta.setPrecio(new BigDecimal(precio));
    oferta.setDisponibilidad(true);
    productoEstablecimientoRepository.saveAndFlush(oferta);
  }

  private Resena resenaDe(Usuario autor) {
    Resena r = new Resena();
    r.setProducto(producto);
    r.setUsuario(autor);
    r.setComentario("Buen producto");
    r.setPuntuacion(4);
    r.setEstado(true);
    r.setEstadoModeracion(EstadoModeracion.PUBLICADA);
    r.setFechaCreacion(LocalDateTime.now());
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
    u.setCorreo("ofertas_" + UUID.randomUUID() + "@tecreview.test");
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
