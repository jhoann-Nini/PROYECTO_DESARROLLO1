package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.entity.ReporteOferta;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteOfertaRepository;
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
@DisplayName("TEC-147: integración de reportes de ofertas")
class ReporteOfertaIntegrationTest {

  @Autowired
  private WebApplicationContext context;

  @Autowired
  private CategoriaRepository categoriaRepository;

  @Autowired
  private MarcaRepository marcaRepository;

  @Autowired
  private ProductoRepository productoRepository;

  @Autowired
  private EstablecimientoRepository establecimientoRepository;

  @Autowired
  private ProductoEstablecimientoRepository productoEstablecimientoRepository;

  @Autowired
  private UsuarioRepository usuarioRepository;

  @Autowired
  private RolRepository rolRepository;

  @Autowired
  private ReporteOfertaRepository reporteOfertaRepository;

  private MockMvc mockMvc;
  private Usuario usuario;
  private Producto producto;
  private Establecimiento establecimiento;
  private String subject;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context)
      .apply(springSecurity())
      .build();

    Rol rol = rolRepository.findByNombre("Usuario registrado")
      .orElseGet(() -> {
        Rol nuevo = new Rol();
        nuevo.setNombre("Usuario registrado");
        nuevo.setDescripcion("Rol de usuario registrado para pruebas");
        return rolRepository.save(nuevo);
      });

    subject = UUID.randomUUID().toString();
    usuario = new Usuario();
    usuario.setNombre("Usuario reportante");
    usuario.setCorreo("reportante-" + UUID.randomUUID() + "@test.com");
    usuario.setSupabaseUid(subject);
    usuario.setRol(rol);
    usuario.setEstado(true);
    usuario.setFechaRegistro(LocalDateTime.now());
    usuario = usuarioRepository.saveAndFlush(usuario);

    var categoria = new com.example.backend.entity.Categoria();
    categoria.setNombre("Categoria " + UUID.randomUUID());
    categoria.setDescripcion("Categoria de prueba");
    categoria.setEstado(true);
    categoria = categoriaRepository.save(categoria);

    var marca = new com.example.backend.entity.Marca();
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

    establecimiento = new Establecimiento();
    establecimiento.setNombre("Establecimiento " + UUID.randomUUID());
    establecimiento.setEstado(true);
    establecimiento = establecimientoRepository.saveAndFlush(establecimiento);

    ProductoEstablecimiento oferta = new ProductoEstablecimiento();
    oferta.setProducto(producto);
    oferta.setEstablecimiento(establecimiento);
    oferta.setPrecio(new BigDecimal("95000.00"));
    oferta.setDisponibilidad(true);
    productoEstablecimientoRepository.saveAndFlush(oferta);
  }

  @Test
  @DisplayName("Usuario autenticado registra reporte y la identidad se toma del JWT")
  void usuarioAutenticadoCreaReporteYPersisteIdentidadDelJwt() throws Exception {
    mockMvc.perform(post("/api/reportes/ofertas")
        .with(jwt().jwt(builder -> builder
          .subject(subject)
          .claim("email", usuario.getCorreo())))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {
            "idProducto": %d,
            "idEstablecimiento": %d,
            "motivo": "precio_incorrecto",
            "descripcion": "El precio publicado no coincide"
          }
          """.formatted(producto.getIdProducto(), establecimiento.getIdEstablecimiento())))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.idReporte").isNumber())
      .andExpect(jsonPath("$.idProducto").value(producto.getIdProducto()))
      .andExpect(jsonPath("$.idEstablecimiento").value(establecimiento.getIdEstablecimiento()))
      .andExpect(jsonPath("$.motivo").value("precio_incorrecto"))
      .andExpect(jsonPath("$.estado").value("PENDIENTE"));

    ReporteOferta guardado = reporteOfertaRepository.findAll().stream()
      .findFirst()
      .orElseThrow();

    assertEquals(usuario.getIdUsuario(), guardado.getUsuario().getIdUsuario());
    assertEquals(producto.getIdProducto(), guardado.getProducto().getIdProducto());
    assertEquals(establecimiento.getIdEstablecimiento(),
      guardado.getEstablecimiento().getIdEstablecimiento());
  }

  @Test
  @DisplayName("Usuario anónimo no puede registrar un reporte")
  void usuarioAnonimoNoPuedeCrearReporte() throws Exception {
    mockMvc.perform(post("/api/reportes/ofertas")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {
            "idProducto": %d,
            "idEstablecimiento": %d,
            "motivo": "precio_incorrecto"
          }
          """.formatted(producto.getIdProducto(), establecimiento.getIdEstablecimiento())))
      .andExpect(status().isUnauthorized());

    assertTrue(reporteOfertaRepository.findAll().isEmpty());
  }

  @Test
  @DisplayName("Oferta inexistente devuelve 404 y no guarda el reporte")
  void ofertaInexistenteNoCreaReporte() throws Exception {
    mockMvc.perform(post("/api/reportes/ofertas")
        .with(jwt().jwt(builder -> builder
          .subject(subject)
          .claim("email", usuario.getCorreo())))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {
            "idProducto": 999999,
            "idEstablecimiento": 999999,
            "motivo": "enlace_incorrecto"
          }
          """))
      .andExpect(status().isNotFound());

    assertTrue(reporteOfertaRepository.findAll().isEmpty());
  }

  @Test
  @DisplayName("Motivo no permitido devuelve 400 y no guarda el reporte")
  void motivoInvalidoNoCreaReporte() throws Exception {
    mockMvc.perform(post("/api/reportes/ofertas")
        .with(jwt().jwt(builder -> builder
          .subject(subject)
          .claim("email", usuario.getCorreo())))
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {
            "idProducto": %d,
            "idEstablecimiento": %d,
            "motivo": "otro"
          }
          """.formatted(producto.getIdProducto(), establecimiento.getIdEstablecimiento())))
      .andExpect(status().isBadRequest());

    assertTrue(reporteOfertaRepository.findAll().isEmpty());
  }
}
