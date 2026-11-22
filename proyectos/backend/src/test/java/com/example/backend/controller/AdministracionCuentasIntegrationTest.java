package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.AuditoriaUsuarioEstado;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.AuditoriaUsuarioEstadoRepository;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
 * Caso 6: suspensión y reactivación auditadas de cuentas. Corre sobre H2; los
 * triggers de la migración 024 se validaron aparte en PostgreSQL.
 */
@SpringBootTest
@Transactional
@DisplayName("Caso 6: suspensión de cuentas")
class AdministracionCuentasIntegrationTest {

  @Autowired private WebApplicationContext context;
  @Autowired private UsuarioRepository usuarioRepository;
  @Autowired private RolRepository rolRepository;
  @Autowired private UsuarioRolRepository usuarioRolRepository;
  @Autowired private AuditoriaUsuarioEstadoRepository auditoriaRepository;
  @Autowired private CategoriaRepository categoriaRepository;
  @Autowired private MarcaRepository marcaRepository;
  @Autowired private ProductoRepository productoRepository;

  private MockMvc mockMvc;
  private Usuario usuario;
  private Usuario moderador;
  private Usuario administrador;
  private Usuario otroAdministrador;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    usuario = usuario("Usuario", rol("Usuario registrado"));
    moderador = usuario("Moderador", rol("Moderador"));
    administrador = usuario("Administrador", rol("Administrador"));
    otroAdministrador = usuario("Otro administrador", rol("Administrador"));
  }

  @Test
  @DisplayName("Suspender registra el motivo y la cuenta ya no puede publicar reseñas")
  void suspenderYEfecto() throws Exception {
    cambiar(administrador, usuario, false, "Insultos reiterados")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.activo").value(false))
      .andExpect(jsonPath("$.idUsuario").value(usuario.getIdUsuario().intValue()));

    assertFalse(usuarioRepository.findById(usuario.getIdUsuario()).orElseThrow().getEstado());
    List<AuditoriaUsuarioEstado> eventos = auditoriaRepository
      .findByUsuarioIdUsuarioOrderByFechaEventoDescIdAuditoriaDesc(usuario.getIdUsuario());
    assertEquals(1, eventos.size());
    assertEquals("Insultos reiterados", eventos.get(0).getMotivo());
    assertEquals(administrador.getIdUsuario(), eventos.get(0).getAdministrador().getIdUsuario());

    Producto producto = producto();
    mockMvc.perform(post("/api/resenas").with(como(usuario)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"idProducto\":" + producto.getIdProducto() + ",\"comentario\":\"Muy bueno\",\"puntuacion\":5}"))
      .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Reactivar devuelve el acceso y deja su propio evento")
  void reactivar() throws Exception {
    cambiar(administrador, usuario, false, "Spam").andExpect(status().isOk());
    cambiar(administrador, usuario, true, "Apelación aceptada")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.activo").value(true));
    assertEquals(2, auditoriaRepository
      .findByUsuarioIdUsuarioOrderByFechaEventoDescIdAuditoriaDesc(usuario.getIdUsuario()).size());
  }

  @Test
  @DisplayName("Reglas: no a sí mismo (403), no a un administrador activo (409), sin cambio (409)")
  void reglas() throws Exception {
    cambiar(administrador, administrador, false, "x").andExpect(status().isForbidden());
    cambiar(administrador, otroAdministrador, false, "x")
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value("No se puede suspender a un administrador activo; primero retira su rol."));
    cambiar(administrador, usuario, true, "Ya activa")
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value("La cuenta ya está activa."));
    assertEquals(0, auditoriaRepository.count());
  }

  @Test
  @DisplayName("Validación (400) y cuenta inexistente (404)")
  void validacionYNoEncontrado() throws Exception {
    mockMvc.perform(put("/api/admin/usuarios/" + usuario.getIdUsuario() + "/estado").with(como(administrador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false,\"motivo\":\"   \"}"))
      .andExpect(status().isBadRequest());
    mockMvc.perform(put("/api/admin/usuarios/" + usuario.getIdUsuario() + "/estado").with(como(administrador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Sin estado\"}"))
      .andExpect(status().isBadRequest());
    mockMvc.perform(put("/api/admin/usuarios/999999/estado").with(como(administrador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false,\"motivo\":\"x\"}"))
      .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Sin token 401; moderador y usuario registrado 403")
  void autorizacion() throws Exception {
    String cuerpo = "{\"activo\":false,\"motivo\":\"x\"}";
    mockMvc.perform(put("/api/admin/usuarios/" + usuario.getIdUsuario() + "/estado")
        .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
      .andExpect(status().isUnauthorized());
    cambiar(moderador, usuario, false, "x").andExpect(status().isForbidden());
    cambiar(usuario, moderador, false, "x").andExpect(status().isForbidden());
    assertEquals(0, auditoriaRepository.count());
  }

  private ResultActions cambiar(Usuario actor, Usuario objetivo, boolean activo, String motivo) throws Exception {
    return mockMvc.perform(put("/api/admin/usuarios/" + objetivo.getIdUsuario() + "/estado").with(como(actor))
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"activo\":" + activo + ",\"motivo\":\"" + motivo + "\"}"));
  }

  private Producto producto() {
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
    Producto p = new Producto();
    p.setNombre("Producto " + UUID.randomUUID());
    p.setDescripcion("Producto de prueba");
    p.setCategoria(categoria);
    p.setMarca(marca);
    p.setPrecioReferencia(new BigDecimal("100000.00"));
    p.setEstado(true);
    return productoRepository.saveAndFlush(p);
  }

  private RequestPostProcessor como(Usuario u) {
    return jwt().jwt(b -> b.subject(u.getSupabaseUid()).claim("email", u.getCorreo()));
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
    u.setCorreo("cuentas_" + UUID.randomUUID() + "@tecreview.test");
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
