package com.example.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimientoId;
import com.example.backend.entity.ReporteOferta;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteOfertaRepository;
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
 * Fase 3 (H-03, H-06): administración de ofertas y campos nuevos de la
 * consulta pública. Corre sobre H2; el trigger de fecha de la migración 022
 * se validó aparte en PostgreSQL.
 */
@SpringBootTest
@Transactional
@DisplayName("Fase 3: administración de ofertas")
class AdministracionOfertasIntegrationTest {

  @Autowired private WebApplicationContext context;
  @Autowired private CategoriaRepository categoriaRepository;
  @Autowired private MarcaRepository marcaRepository;
  @Autowired private ProductoRepository productoRepository;
  @Autowired private EstablecimientoRepository establecimientoRepository;
  @Autowired private ProductoEstablecimientoRepository ofertaRepository;
  @Autowired private UsuarioRepository usuarioRepository;
  @Autowired private RolRepository rolRepository;
  @Autowired private UsuarioRolRepository usuarioRolRepository;
  @Autowired private ReporteOfertaRepository reporteOfertaRepository;

  private MockMvc mockMvc;
  private Producto producto;
  private Establecimiento tienda;
  private Usuario administrador;
  private Usuario moderador;
  private Usuario usuarioNormal;

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

    tienda = new Establecimiento();
    tienda.setNombre("Tienda " + UUID.randomUUID());
    tienda.setEstado(true);
    tienda.setVerificado(true);
    tienda = establecimientoRepository.saveAndFlush(tienda);

    administrador = usuario("Administrador", rol("Administrador"));
    moderador = usuario("Moderador", rol("Moderador"));
    usuarioNormal = usuario("Usuario", rol("Usuario registrado"));
  }

  @Test
  @DisplayName("Crear una oferta y verla en la consulta pública con sello, enlace y fecha")
  void crearYConsultarPublicamente() throws Exception {
    guardar(administrador, "{\"precio\":95000,\"disponibilidad\":true,\"urlOferta\":\"https://tienda.co/p/1\"}")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.precio").value(95000))
      .andExpect(jsonPath("$.urlOferta").value("https://tienda.co/p/1"))
      .andExpect(jsonPath("$.establecimientoVerificado").value(true))
      .andExpect(jsonPath("$.reportesAbiertos").value(0))
      .andExpect(jsonPath("$.fechaActualizacionPrecio").exists());

    mockMvc.perform(get("/api/productos/" + producto.getIdProducto() + "/establecimientos"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].verificado").value(true))
      .andExpect(jsonPath("$[0].urlOferta").value("https://tienda.co/p/1"))
      .andExpect(jsonPath("$[0].fechaActualizacionPrecio").exists());
  }

  @Test
  @DisplayName("Guardar de nuevo actualiza la misma oferta; un enlace vacío se guarda como null")
  void actualizarOferta() throws Exception {
    guardar(administrador, "{\"precio\":95000,\"disponibilidad\":true,\"urlOferta\":\"https://tienda.co/p/1\"}")
      .andExpect(status().isOk());
    guardar(administrador, "{\"precio\":89900.50,\"disponibilidad\":false,\"urlOferta\":\"  \"}")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.precio").value(89900.50))
      .andExpect(jsonPath("$.disponibilidad").value(false))
      .andExpect(jsonPath("$.urlOferta").value(nullValue()));

    assertEquals(1, ofertaRepository.count());
    // Una oferta no disponible no aparece en la consulta pública.
    mockMvc.perform(get("/api/productos/" + producto.getIdProducto() + "/establecimientos"))
      .andExpect(jsonPath("$", hasSize(0)));
    // Pero el administrador sí la ve.
    mockMvc.perform(get("/api/admin/ofertas").param("idProducto", producto.getIdProducto().toString())
        .with(como(administrador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].disponibilidad").value(false))
      .andExpect(jsonPath("$[0].nombreEstablecimiento").value(tienda.getNombre()));
  }

  @Test
  @DisplayName("Valida precio, disponibilidad y enlace (400)")
  void validaciones() throws Exception {
    guardar(administrador, "{\"precio\":0,\"disponibilidad\":true}").andExpect(status().isBadRequest());
    guardar(administrador, "{\"disponibilidad\":true}").andExpect(status().isBadRequest());
    guardar(administrador, "{\"precio\":1000}").andExpect(status().isBadRequest());
    guardar(administrador, "{\"precio\":1000,\"disponibilidad\":true,\"urlOferta\":\"javascript:alert(1)\"}")
      .andExpect(status().isBadRequest());
    guardar(administrador, "{\"precio\":1000,\"disponibilidad\":true,\"urlOferta\":\"https://a b.co\"}")
      .andExpect(status().isBadRequest());
    guardar(administrador, "{\"precio\":1000,\"disponibilidad\":true,\"urlOferta\":\"HTTPS://TIENDA.CO\"}")
      .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Producto o tienda inexistentes devuelven 404")
  void noEncontrados() throws Exception {
    mockMvc.perform(put("/api/admin/productos/999999/establecimientos/" + tienda.getIdEstablecimiento())
        .with(como(administrador)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"precio\":1000,\"disponibilidad\":true}"))
      .andExpect(status().isNotFound());
    mockMvc.perform(put("/api/admin/productos/" + producto.getIdProducto() + "/establecimientos/999999")
        .with(como(administrador)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"precio\":1000,\"disponibilidad\":true}"))
      .andExpect(status().isNotFound());
    mockMvc.perform(delete(urlOferta()).with(como(administrador))).andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Eliminar una oferta sin reportes devuelve 204; con reportes, 409")
  void eliminar() throws Exception {
    guardar(administrador, "{\"precio\":95000,\"disponibilidad\":true}").andExpect(status().isOk());
    ReporteOferta reporte = new ReporteOferta();
    reporte.setProducto(producto);
    reporte.setEstablecimiento(tienda);
    reporte.setUsuario(usuarioNormal);
    reporte.setMotivo("precio_incorrecto");
    reporte.setEstado(EstadoReporte.PENDIENTE);
    reporteOfertaRepository.saveAndFlush(reporte);

    mockMvc.perform(get("/api/admin/ofertas").with(como(administrador)))
      .andExpect(jsonPath("$[?(@.idProducto == " + producto.getIdProducto() + ")].reportesAbiertos").value(1));

    mockMvc.perform(delete(urlOferta()).with(como(administrador)))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value(
        "La oferta tiene reportes asociados y no se puede eliminar. Márcala como no disponible."));

    reporteOfertaRepository.delete(reporte);
    reporteOfertaRepository.flush();
    mockMvc.perform(delete(urlOferta()).with(como(administrador))).andExpect(status().isNoContent());
    assertFalse(ofertaRepository.existsById(
      new ProductoEstablecimientoId(producto.getIdProducto(), tienda.getIdEstablecimiento())));
  }

  @Test
  @DisplayName("Sin token 401; moderador y usuario registrado 403")
  void autorizacion() throws Exception {
    String cuerpo = "{\"precio\":1000,\"disponibilidad\":true}";
    mockMvc.perform(get("/api/admin/ofertas")).andExpect(status().isUnauthorized());
    mockMvc.perform(put(urlOferta()).contentType(MediaType.APPLICATION_JSON).content(cuerpo))
      .andExpect(status().isUnauthorized());
    mockMvc.perform(delete(urlOferta())).andExpect(status().isUnauthorized());

    for (Usuario sinPermiso : new Usuario[] {moderador, usuarioNormal}) {
      mockMvc.perform(get("/api/admin/ofertas").with(como(sinPermiso))).andExpect(status().isForbidden());
      guardar(sinPermiso, cuerpo).andExpect(status().isForbidden());
      mockMvc.perform(delete(urlOferta()).with(como(sinPermiso))).andExpect(status().isForbidden());
    }
    assertEquals(0, ofertaRepository.count());
  }

  @Test
  @DisplayName("Un administrador suspendido recibe 403")
  void administradorSuspendido() throws Exception {
    administrador.setEstado(false);
    usuarioRepository.saveAndFlush(administrador);

    guardar(administrador, "{\"precio\":1000,\"disponibilidad\":true}").andExpect(status().isForbidden());
  }

  private ResultActions guardar(Usuario usuario, String cuerpo) throws Exception {
    return mockMvc.perform(put(urlOferta()).with(como(usuario))
      .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
  }

  private String urlOferta() {
    return "/api/admin/productos/" + producto.getIdProducto()
      + "/establecimientos/" + tienda.getIdEstablecimiento();
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
    u.setCorreo("ofertas_admin_" + UUID.randomUUID() + "@tecreview.test");
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
