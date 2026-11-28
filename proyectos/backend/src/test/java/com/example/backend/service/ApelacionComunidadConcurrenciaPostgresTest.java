package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.dto.ApelacionResponse;
import com.example.backend.dto.ResolverApelacionRequest;
import com.example.backend.dto.comunidad.ApelacionComunidadModeracionResponse;
import com.example.backend.dto.comunidad.CrearApelacionComunidadRequest;
import com.example.backend.dto.comunidad.CrearRespuestaRequest;
import com.example.backend.dto.comunidad.RespuestaResponse;
import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.Rol;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
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
 * Concurrencia real de las apelaciones del foro (031): cada operación en su
 * propia transacción, a la vez. Sin @Transactional: los datos quedan
 * confirmados y no se pueden borrar (tablas de solo inserción), así que se
 * ejecuta solo con -Dtecreview.postgres.real=true contra una base local
 * desechable.
 */
@SpringBootTest
@EnabledIfSystemProperty(named = "tecreview.postgres.real", matches = "true")
@DisplayName("Comunidad: concurrencia de apelaciones (PostgreSQL)")
class ApelacionComunidadConcurrenciaPostgresTest {

  @Autowired ApelacionComunidadService apelacionService;
  @Autowired ModeracionComunidadService moderacionService;
  @Autowired RespuestaComunidadService respuestaService;
  @Autowired PublicacionComunidadRepository publicacionRepository;
  @Autowired ModeracionComunidadAuditoriaRepository auditoriaRepository;
  @Autowired UsuarioRepository usuarioRepository;
  @Autowired RolRepository rolRepository;
  @Autowired UsuarioRolRepository usuarioRolRepository;

  @Test
  @DisplayName("Dos moderadoras aceptan a la vez la misma apelación: una gana y la otra recibe 409")
  void dosModeradorasResuelvenLaMismaApelacion() throws Exception {
    Usuario autor = usuario("Autor", "Usuario registrado");
    Usuario moderador = usuario("Mod original", "Moderador");
    Long id = publicacion(autor, EstadoModeracion.PENDIENTE);
    moderacionService.decidirPublicacion(jwt(moderador), id, AccionModeracionComunidad.RECHAZAR, "Incumple");
    long idApelacion = apelacionService.crear(
      new CrearApelacionComunidadRequest(ultimaDecision(id), "Fue un error"), jwt(autor)).idApelacion();
    List<Usuario> moderadoras = List.of(usuario("Mod A", "Moderador"), usuario("Mod B", "Moderador"));
    int[] siguiente = {0};

    List<Object> resultados = ComunidadPostgresIntegrationTest.simultaneos(2, () -> {
      Usuario m;
      synchronized (siguiente) {
        m = moderadoras.get(siguiente[0]++);
      }
      return apelacionService.aceptar(idApelacion, new ResolverApelacionRequest(null), jwt(m));
    });

    long exitos = resultados.stream().filter(ApelacionComunidadModeracionResponse.class::isInstance).count();
    long conflictos = resultados.stream().filter(ConflictException.class::isInstance).count();
    assertEquals(1, exitos, "resultados: " + resultados);
    assertEquals(1, conflictos, "resultados: " + resultados);
    assertEquals(EstadoModeracion.PUBLICADA, publicacionRepository.findById(id).orElseThrow().getEstadoModeracion());
  }

  @Test
  @DisplayName("El autor apela y responde en el mismo hilo a la vez sin interbloqueo")
  void apelarYResponderALaVez() throws Exception {
    // Prueba de humo de la nota de la segunda revisión de la 031: las dos
    // operaciones terminan. No reproduce el cruce de forma fiable (depende de
    // tiempos); el orden de bloqueo (usuario y después contenido) lo garantiza
    // el trigger de la 031 y se demostró con SQL al revisarla.
    Usuario moderador = usuario("Mod original", "Moderador");
    for (int vuelta = 0; vuelta < 5; vuelta++) {
      Usuario autor = usuario("Autor " + vuelta, "Usuario registrado");  // cada ocultamiento es una falta
      Long id = publicacion(autor, EstadoModeracion.PUBLICADA);
      moderacionService.decidirPublicacion(jwt(moderador), id, AccionModeracionComunidad.OCULTAR, "Incumple");
      long decision = ultimaDecision(id);
      // Responde en la misma publicación que apela: la autora la sigue viendo aunque esté oculta,
      // y al responder se actualiza su actividad (la fila que la apelación tiene con FOR SHARE).
      Long hilo = id;
      int[] turno = {0};

      List<Object> resultados = ComunidadPostgresIntegrationTest.simultaneos(2, () -> {
        int mio;
        synchronized (turno) {
          mio = turno[0]++;
        }
        if (mio == 0) {
          return apelacionService.crear(new CrearApelacionComunidadRequest(decision, "Fue un error"), jwt(autor));
        }
        return respuestaService.crear(jwt(autor), hilo, new CrearRespuestaRequest("Respuesta a la vez", null));
      });

      assertTrue(resultados.stream().anyMatch(ApelacionResponse.class::isInstance), "vuelta " + vuelta + ": " + resultados);
      assertTrue(resultados.stream().anyMatch(RespuestaResponse.class::isInstance), "vuelta " + vuelta + ": " + resultados);
    }
  }

  private long ultimaDecision(Long idPublicacion) {
    return auditoriaRepository.findByPublicacionIdPublicacionOrderByFechaEventoDesc(idPublicacion).stream()
      .mapToLong(ModeracionComunidadAuditoria::getIdAuditoria).max().orElseThrow();
  }

  private Long publicacion(Usuario autor, EstadoModeracion estado) {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Apelación " + UUID.randomUUID().toString().substring(0, 8));
    p.setContenido("Contenido");
    p.setEstadoModeracion(estado);
    return publicacionRepository.save(p).getIdPublicacion();
  }

  private static org.springframework.security.oauth2.jwt.Jwt jwt(Usuario u) {
    return ComunidadPostgresIntegrationTest.jwt(u);
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
    u.setCorreo("apel_" + UUID.randomUUID() + "@tecreview.test");
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
