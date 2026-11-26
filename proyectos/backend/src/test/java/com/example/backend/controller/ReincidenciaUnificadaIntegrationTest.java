package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.ApelacionComunidad;
import com.example.backend.entity.EstadoApelacion;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.ApelacionComunidadRepository;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Comunidad, fase 3 (CA-14, P2): las faltas del foro y de las reseñas suman
 * en un solo historial y el bloqueo aplica en los dos espacios. Las faltas se
 * crean insertando la auditoría (H2 no ejecuta triggers).
 */
@DisplayName("Reincidencia unificada: reseñas y foro")
class ReincidenciaUnificadaIntegrationTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private ModeracionComunidadAuditoriaRepository auditoriaComunidadRepository;
  @Autowired private ApelacionComunidadRepository apelacionComunidadRepository;

  @Test
  void tresFaltasDelForoBloqueanPublicarUnaResena() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 3, 1);

    mockMvc.perform(post("/api/resenas").with(como(autor)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"idProducto\":" + producto.getIdProducto() + ",\"comentario\":\"Muy buen producto\",\"puntuacion\":5}"))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.message", containsString("por reincidencia")));
  }

  @Test
  void tresFaltasDelForoBloqueanPublicarEnElForo() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 3, 1);

    publicarEnElForo(autor).andExpect(status().isForbidden());
  }

  @Test
  void dosDeResenasYUnaDelForoBloquean() throws Exception {
    faltas(autor, 2);
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 1, 1);

    publicarEnElForo(autor).andExpect(status().isForbidden());
  }

  @Test
  void eliminarComoModeradorCuentaComoFalta() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.ELIMINAR_MODERADOR, 3, 1);

    publicarEnElForo(autor).andExpect(status().isForbidden());
  }

  @Test
  void dosFaltasDelForoDanRevisionPrevia() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 2, 1);

    publicarEnElForo(autor)
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
  }

  @Test
  void ocultarYRestaurarNoCuenta() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 2, 1);
    PublicacionComunidad p = publicacion(autor);
    auditoria(p, AccionModeracionComunidad.OCULTAR, LocalDateTime.now().minusHours(3));
    auditoria(p, AccionModeracionComunidad.RESTAURAR, LocalDateTime.now().minusHours(2));

    publicarEnElForo(autor).andExpect(status().isCreated());
  }

  @Test
  void restaurarPosteriorConFechaAnteriorNoCuenta() throws Exception {
    // El orden lo da el id, no fecha_evento (reloj de la JVM; revisión de la 031).
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 2, 1);
    PublicacionComunidad p = publicacion(autor);
    auditoria(p, AccionModeracionComunidad.OCULTAR, LocalDateTime.now().minusHours(2));
    auditoria(p, AccionModeracionComunidad.RESTAURAR, LocalDateTime.now().minusHours(3));

    publicarEnElForo(autor).andExpect(status().isCreated());
  }

  @Test
  void faltaConApelacionAceptadaNoCuenta() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 2, 1);
    ModeracionComunidadAuditoria tercera = auditoria(pendiente(autor), AccionModeracionComunidad.RECHAZAR,
      LocalDateTime.now().minusHours(1));
    // Como exige la 031: se crea PENDIENTE y se resuelve después.
    ApelacionComunidad apelacion = apelacionComunidadRepository.saveAndFlush(
      new ApelacionComunidad(tercera, autor, "No insulté a nadie"));
    apelacion.resolver(EstadoApelacion.ACEPTADA, usuario("Otra moderadora", rol("Moderador")), "Tiene razón");
    apelacionComunidadRepository.saveAndFlush(apelacion);

    publicarEnElForo(autor).andExpect(status().isCreated());
  }

  @Test
  void faltasDeHaceMasDe90DiasNoCuentan() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 3, 91);

    publicarEnElForo(autor)
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));
  }

  @Test
  void faltasSimultaneasEnAmbosEspaciosSuman() throws Exception {
    faltas(autor, 1);
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 2, 1);

    mockMvc.perform(get("/api/usuarios/me/reincidencia").with(como(autor)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.faltas").value(3))
      .andExpect(jsonPath("$.nivel").value("BLOQUEO"));
  }

  @Test
  void bloqueoNoImpideMeGusta() throws Exception {
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 3, 1);
    PublicacionComunidad ajena = publicacion(otro);

    mockMvc.perform(put("/api/comunidad/publicaciones/" + ajena.getIdPublicacion() + "/me-gusta").with(como(autor)))
      .andExpect(status().isOk());
  }

  @Test
  void listaDeReincidentesSumaAmbosEspacios() throws Exception {
    Usuario admin = usuario("Administradora", rol("Administrador"));
    faltas(autor, 2);
    faltasDelForo(autor, AccionModeracionComunidad.RECHAZAR, 2, 1);
    faltasDelForo(otro, AccionModeracionComunidad.RECHAZAR, 3, 1);

    mockMvc.perform(get("/api/admin/usuarios/reincidentes").with(como(admin)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[?(@.idUsuario == " + autor.getIdUsuario() + ")].faltas").value(org.hamcrest.Matchers.hasItem(4)))
      .andExpect(jsonPath("$[?(@.idUsuario == " + otro.getIdUsuario() + ")]").isEmpty());
  }

  // ---------- Ayudas ----------

  private ResultActions publicarEnElForo(Usuario u) throws Exception {
    return mockMvc.perform(post("/api/comunidad/publicaciones").with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content("{\"tipo\":\"GENERAL\",\"titulo\":\"Pregunta normal\",\"contenido\":\"Contenido normal\"}"));
  }

  private PublicacionComunidad publicacion(Usuario u) {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(u);
    p.setTitulo("Publicación de " + u.getNombre());
    p.setContenido("Contenido");
    return publicacionRepository.saveAndFlush(p);
  }

  /**
   * Decisión completa, en el orden que exigen los triggers de la 030: el
   * contenido está en el estado previo, se audita y después cambia. Así la
   * prueba vale en H2 y en PostgreSQL.
   */
  private ModeracionComunidadAuditoria auditoria(PublicacionComunidad p, AccionModeracionComunidad accion, LocalDateTime fecha) {
    ModeracionComunidadAuditoria a = new ModeracionComunidadAuditoria(p, null, moderador, accion, "Motivo", "Texto revisado");
    a.setFechaEvento(fecha);
    a = auditoriaComunidadRepository.saveAndFlush(a);
    switch (accion) {
      case RECHAZAR -> p.setEstadoModeracion(com.example.backend.entity.EstadoModeracion.RECHAZADA);
      case OCULTAR -> p.setOcultaPorModeracion(true);
      case RESTAURAR -> p.setOcultaPorModeracion(false);
      case ELIMINAR_MODERADOR -> {
        p.setEliminada(true);
        p.setFechaEliminacion(LocalDateTime.now());
        p.setEliminadaPor(moderador);
      }
      default -> { }
    }
    publicacionRepository.saveAndFlush(p);
    return a;
  }

  /** Publicación pendiente: lo único que se puede rechazar. */
  private PublicacionComunidad pendiente(Usuario u) {
    PublicacionComunidad p = publicacion(u);
    p.setEstadoModeracion(com.example.backend.entity.EstadoModeracion.PENDIENTE);
    return publicacionRepository.saveAndFlush(p);
  }

  /** {@code cantidad} faltas del foro; la más reciente hace {@code diasUltima} días. */
  private void faltasDelForo(Usuario u, AccionModeracionComunidad accion, int cantidad, int diasUltima) {
    for (int i = 0; i < cantidad; i++) {
      PublicacionComunidad p = accion == AccionModeracionComunidad.RECHAZAR ? pendiente(u) : publicacion(u);
      auditoria(p, accion, LocalDateTime.now().minusDays(diasUltima + i));
    }
  }
}
