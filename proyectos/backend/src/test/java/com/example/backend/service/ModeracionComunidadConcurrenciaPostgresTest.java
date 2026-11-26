package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.dto.comunidad.CrearReporteComunidadRequest;
import com.example.backend.dto.comunidad.ReporteComunidadResponse;
import com.example.backend.dto.comunidad.ResolverReporteComunidadRequest;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.Rol;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReporteComunidadRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Concurrencia real de la moderación (punto de atención 1 del plan de la
 * fase 2): cada operación en su propia transacción, a la vez, contra los
 * triggers de la 030. Sin @Transactional: los datos quedan confirmados y no
 * se pueden borrar (tablas de solo inserción), así que se ejecuta solo con
 * -Dtecreview.postgres.real=true contra una base local desechable.
 */
@SpringBootTest
@EnabledIfSystemProperty(named = "tecreview.postgres.real", matches = "true")
@DisplayName("Comunidad: concurrencia de reportes y moderación (PostgreSQL)")
class ModeracionComunidadConcurrenciaPostgresTest {

  @Autowired ReporteComunidadService reporteService;
  @Autowired ModeracionComunidadService moderacionService;
  @Autowired PublicacionComunidadRepository publicacionRepository;
  @Autowired ReporteComunidadRepository reporteRepository;
  @Autowired UsuarioRepository usuarioRepository;
  @Autowired RolRepository rolRepository;
  @Autowired UsuarioRolRepository usuarioRolRepository;

  @Test
  @DisplayName("Tres reportes simultáneos ocultan exactamente una vez y sin interbloqueo")
  void tresReportesSimultaneos() throws Exception {
    Usuario autor = usuario("Autor", "Usuario registrado");
    Long id = publicacion(autor);
    List<Usuario> reportantes = List.of(usuario("R1", "Usuario registrado"), usuario("R2", "Usuario registrado"),
      usuario("R3", "Usuario registrado"));
    int[] siguiente = {0};

    List<Object> resultados = ComunidadPostgresIntegrationTest.simultaneos(3, () -> {
      Usuario u;
      synchronized (siguiente) {
        u = reportantes.get(siguiente[0]++);
      }
      return reporteService.reportarPublicacion(ComunidadPostgresIntegrationTest.jwt(u), id,
        new CrearReporteComunidadRequest("spam", null));
    });

    resultados.forEach(r -> assertTrue(r instanceof ReporteComunidadResponse, "resultado inesperado: " + r));
    assertEquals(3, reporteRepository.contarActivosDePublicacion(id));
    assertTrue(publicacionRepository.findById(id).orElseThrow().isOcultaPorReportes(), "no quedó oculta");
  }

  @Test
  @DisplayName("Dos moderadoras resuelven a la vez el mismo reporte: una gana y la otra recibe 409")
  void dosResolucionesSimultaneas() throws Exception {
    Usuario autor = usuario("Autor", "Usuario registrado");
    Long id = publicacion(autor);
    Usuario reportante = usuario("Reportante", "Usuario registrado");
    long idReporte = reporteService.reportarPublicacion(ComunidadPostgresIntegrationTest.jwt(reportante), id,
      new CrearReporteComunidadRequest("spam", null)).idReporte();
    List<Usuario> moderadoras = List.of(usuario("Mod A", "Moderador"), usuario("Mod B", "Moderador"));
    int[] siguiente = {0};

    List<Object> resultados = ComunidadPostgresIntegrationTest.simultaneos(2, () -> {
      Usuario m;
      synchronized (siguiente) {
        m = moderadoras.get(siguiente[0]++);
      }
      return moderacionService.rechazar(ComunidadPostgresIntegrationTest.jwt(m), idReporte,
        new ResolverReporteComunidadRequest("No incumple", null, null));
    });

    long exitos = resultados.stream().filter(r -> !(r instanceof Throwable)).count();
    long conflictos = resultados.stream().filter(ConflictException.class::isInstance).count();
    assertEquals(1, exitos, "resultados: " + resultados);
    assertEquals(1, conflictos, "resultados: " + resultados);
  }

  private Long publicacion(Usuario autor) {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Concurrencia " + UUID.randomUUID().toString().substring(0, 8));
    p.setContenido("Contenido");
    return publicacionRepository.save(p).getIdPublicacion();
  }

  private Usuario usuario(String nombre, String nombreRol) {
    Rol rol = rolRepository.findByNombre(nombreRol).orElseGet(() -> {
      Rol r = new Rol();
      r.setNombre(nombreRol);
      r.setDescripcion(nombreRol);
      return rolRepository.save(r);
    });
    Usuario u = new Usuario();
    u.setNombre(nombre);
    u.setCorreo("conc_" + UUID.randomUUID() + "@tecreview.test");
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
    usuarioRolRepository.save(ur);
    return u;
  }
}
