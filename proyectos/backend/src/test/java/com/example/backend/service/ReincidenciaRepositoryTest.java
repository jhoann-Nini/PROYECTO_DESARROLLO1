package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** Qué eventos del historial cuentan como falta (consulta JPQL sobre H2). */
@SpringBootTest
@Transactional
class ReincidenciaRepositoryTest {

  @Autowired private ResenaModeracionAuditoriaRepository auditoriaRepository;
  @Autowired private ResenaRepository resenaRepository;
  @Autowired private ProductoRepository productoRepository;
  @Autowired private CategoriaRepository categoriaRepository;
  @Autowired private MarcaRepository marcaRepository;
  @Autowired private UsuarioRepository usuarioRepository;
  @Autowired private RolRepository rolRepository;

  private final LocalDateTime ahora = LocalDateTime.now();
  private Usuario autor;
  private Usuario moderador;
  private Categoria categoria;
  private Marca marca;

  @BeforeEach
  void setUp() {
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
    Rol rol = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
      Rol r = new Rol();
      r.setNombre("Usuario registrado");
      r.setDescripcion("Usuario registrado");
      return rolRepository.save(r);
    });
    autor = usuario("Autor", rol);
    moderador = usuario("Moderador", rol);
  }

  private long faltas() {
    return auditoriaRepository.findFechasFaltasDelAutorDesde(autor.getIdUsuario(), ahora.minusDays(90)).size();
  }

  @Test
  void cuentaRechazarYOcultarNoRevertido() {
    evento(resena(true), "RECHAZAR", ahora.minusDays(3));
    evento(resena(true), "OCULTAR", ahora.minusDays(2));

    assertEquals(2, faltas());
  }

  @Test
  void ocultarRestaurarOcultarCuentaUna() {
    Resena r = resena(true);
    evento(r, "OCULTAR", ahora.minusDays(10));
    evento(r, "RESTAURAR", ahora.minusDays(9));
    evento(r, "OCULTAR", ahora.minusDays(8));

    assertEquals(1, faltas());
  }

  @Test
  void ocultarRevertidoNoCuenta() {
    Resena r = resena(true);
    evento(r, "OCULTAR", ahora.minusDays(10));
    evento(r, "RESTAURAR", ahora.minusDays(9));

    assertEquals(0, faltas());
  }

  @Test
  void cuentaFaltasDeResenasEliminadas() {
    evento(resena(false), "RECHAZAR", ahora.minusDays(1));

    assertEquals(1, faltas());
  }

  @Test
  void ignoraEventosAnterioresALaVentana() {
    evento(resena(true), "RECHAZAR", ahora.minusDays(91));
    evento(resena(true), "RECHAZAR", ahora.minusDays(89));

    assertEquals(1, faltas());
  }

  @Test
  void ignoraAprobarYRestaurar() {
    evento(resena(true), "APROBAR", ahora.minusDays(1));
    evento(resena(true), "RESTAURAR", ahora.minusDays(1));

    assertEquals(0, faltas());
  }

  private Resena resena(boolean activa) {
    Producto p = new Producto();
    p.setNombre("Producto " + UUID.randomUUID());
    p.setDescripcion("Producto de prueba");
    p.setCategoria(categoria);
    p.setMarca(marca);
    p.setPrecioReferencia(new BigDecimal("1000000"));
    p.setEstado(true);
    p = productoRepository.save(p);

    Resena r = new Resena();
    r.setProducto(p);
    r.setUsuario(autor);
    r.setComentario("Comentario de prueba");
    r.setPuntuacion(3);
    r.setEstado(activa);
    r.setEstadoModeracion(EstadoModeracion.RECHAZADA);
    r.setFechaCreacion(ahora.minusDays(100));
    return resenaRepository.saveAndFlush(r);
  }

  private void evento(Resena r, String accion, LocalDateTime fecha) {
    ResenaModeracionAuditoria e = new ResenaModeracionAuditoria();
    e.setResena(r);
    e.setModerador(moderador);
    e.setAccion(accion);
    e.setMotivo("Prueba");
    e.setComentarioRevisado(r.getComentario());
    e.setFechaEvento(fecha);
    auditoriaRepository.saveAndFlush(e);
  }

  private Usuario usuario(String nombre, Rol rol) {
    Usuario u = new Usuario();
    u.setNombre(nombre);
    u.setCorreo("reinc_" + UUID.randomUUID() + "@tecreview.test");
    u.setSupabaseUid(UUID.randomUUID().toString());
    u.setRol(rol);
    u.setEstado(true);
    u.setFechaRegistro(LocalDateTime.now());
    return usuarioRepository.save(u);
  }
}
