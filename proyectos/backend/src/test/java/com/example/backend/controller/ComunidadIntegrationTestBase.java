package com.example.backend.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

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
import com.example.backend.service.GeneralRateLimiterService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Datos y ayudas comunes de las pruebas de la comunidad (H2). */
@SpringBootTest
@Transactional
abstract class ComunidadIntegrationTestBase {

  @Autowired protected WebApplicationContext context;
  @Autowired protected UsuarioRepository usuarioRepository;
  @Autowired protected RolRepository rolRepository;
  @Autowired protected UsuarioRolRepository usuarioRolRepository;
  @Autowired protected ProductoRepository productoRepository;
  @Autowired protected CategoriaRepository categoriaRepository;
  @Autowired protected MarcaRepository marcaRepository;
  @Autowired protected ResenaRepository resenaRepository;
  @Autowired protected ResenaModeracionAuditoriaRepository auditoriaRepository;
  @Autowired protected GeneralRateLimiterService limitadorGeneral;

  protected MockMvc mockMvc;
  protected Usuario autor;
  protected Usuario otro;
  protected Usuario moderador;
  protected Producto producto;

  @BeforeEach
  void prepararComunidad() {
    limitadorGeneral.reset();
    mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    Rol rolUsuario = rol("Usuario registrado");
    autor = usuario("Autor comunidad", rolUsuario);
    otro = usuario("Otro comunidad", rolUsuario);
    moderador = usuario("Moderador comunidad", rol("Moderador"));
    producto = producto(true);
  }

  /** Estas pruebas hacen muchas peticiones: no deben gastar el límite general de las siguientes. */
  @AfterEach
  void liberarLimiteGeneral() {
    limitadorGeneral.reset();
  }

  protected static String json(String valor) {
    return "\"" + valor.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }

  /** Faltas recientes de reseñas: 2 dan revisión previa y 3 dan bloqueo. */
  protected void faltas(Usuario usuario, int cantidad) {
    for (int i = 0; i < cantidad; i++) {
      Resena r = new Resena();
      r.setProducto(producto(true));
      r.setUsuario(usuario);
      r.setComentario("Contenido rechazado");
      r.setPuntuacion(2);
      r.setEstado(true);
      // Orden de los triggers de la 020: la reseña está PENDIENTE cuando se
      // audita el rechazo y pasa a RECHAZADA después.
      r.setEstadoModeracion(EstadoModeracion.PENDIENTE);
      r.setFechaCreacion(LocalDateTime.now().minusDays(2));
      r = resenaRepository.saveAndFlush(r);
      ResenaModeracionAuditoria e = new ResenaModeracionAuditoria();
      e.setResena(r);
      e.setModerador(moderador);
      e.setAccion("RECHAZAR");
      e.setMotivo("Lenguaje ofensivo");
      e.setComentarioRevisado(r.getComentario());
      e.setFechaEvento(LocalDateTime.now().minusDays(1 + i));
      auditoriaRepository.saveAndFlush(e);
      r.setEstadoModeracion(EstadoModeracion.RECHAZADA);
      resenaRepository.saveAndFlush(r);
    }
  }

  protected Producto producto(boolean activo) {
    Categoria categoria = new Categoria();
    categoria.setNombre("Comunidad " + UUID.randomUUID());
    categoria.setDescripcion("Categoría de prueba");
    categoria.setEstado(true);
    categoria = categoriaRepository.save(categoria);
    Marca marca = new Marca();
    marca.setNombre("Marca " + UUID.randomUUID());
    marca.setDescripcion("Marca de prueba");
    marca.setEstado(true);
    marca = marcaRepository.save(marca);
    Producto p = new Producto();
    p.setNombre("Producto comunidad " + UUID.randomUUID());
    p.setDescripcion("Producto de prueba");
    p.setCategoria(categoria);
    p.setMarca(marca);
    p.setPrecioReferencia(new BigDecimal("1000000"));
    p.setEstado(activo);
    return productoRepository.save(p);
  }

  protected RequestPostProcessor como(Usuario usuario) {
    return jwt().jwt(b -> b.subject(usuario.getSupabaseUid()).claim("email", usuario.getCorreo()));
  }

  protected Rol rol(String nombre) {
    return rolRepository.findByNombre(nombre).orElseGet(() -> {
      Rol r = new Rol();
      r.setNombre(nombre);
      r.setDescripcion(nombre);
      return rolRepository.save(r);
    });
  }

  protected Usuario usuario(String nombre, Rol rol) {
    Usuario u = new Usuario();
    u.setNombre(nombre);
    u.setCorreo("comunidad_" + UUID.randomUUID() + "@tecreview.test");
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
