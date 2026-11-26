package com.example.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.ReporteComunidad;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReporteComunidadRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import com.example.backend.service.LimiteReportesService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** Comunidad, fase 2: reportes de publicaciones y respuestas (CA-12, RN-15, RN-16). */
@DisplayName("Comunidad: reportes")
class ComunidadReportesIntegrationTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private RespuestaComunidadRepository respuestaRepository;
  @Autowired private ReporteComunidadRepository reporteRepository;
  @Autowired private ReporteResenaRepository reporteResenaRepository;

  private PublicacionComunidad publicacion;
  private RespuestaComunidad respuesta;

  @BeforeEach
  void crearContenido() {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Publicación reportable");
    p.setContenido("Contenido");
    publicacion = publicacionRepository.saveAndFlush(p);
    RespuestaComunidad r = new RespuestaComunidad();
    r.setPublicacion(publicacion);
    r.setAutor(autor);
    r.setContenido("Respuesta reportable");
    r.setProfundidad((short) 0);
    respuesta = respuestaRepository.saveAndFlush(r);
  }

  @Test
  void reportarPublicacion201() throws Exception {
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null)
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.idReporte").isNumber())
      .andExpect(jsonPath("$.estado").value("PENDIENTE"))
      .andExpect(jsonPath("$.motivo").value("spam"));
  }

  @Test
  void reportarRespuesta201() throws Exception {
    reportar(otro, "respuestas", respuesta.getIdRespuesta(), "lenguaje-ofensivo", null)
      .andExpect(status().isCreated());
  }

  @Test
  void reportarLoPropio403() throws Exception {
    reportar(autor, "publicaciones", publicacion.getIdPublicacion(), "spam", null).andExpect(status().isForbidden());
    reportar(autor, "respuestas", respuesta.getIdRespuesta(), "spam", null).andExpect(status().isForbidden());
  }

  @Test
  void duplicadoAbierto409() throws Exception {
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null).andExpect(status().isCreated());
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "acoso", null).andExpect(status().isConflict());
  }

  @Test
  void trasRechazadoPuedeVolverAReportar201() throws Exception {
    String creado = reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null)
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    long idPrevio = ((Number) com.jayway.jsonpath.JsonPath.read(creado, "$.idReporte")).longValue();
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
        .put("/api/moderacion/comunidad/reportes/" + idPrevio + "/rechazar").with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"justificacion\":\"No incumple\"}"))
      .andExpect(status().isOk());

    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "acoso", null).andExpect(status().isCreated());
  }

  @Test
  void otroSinDescripcion400() throws Exception {
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "otro", null).andExpect(status().isBadRequest());
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "otro", " ").andExpect(status().isBadRequest());
  }

  @Test
  void otroConDescripcion201() throws Exception {
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "otro", "Información engañosa")
      .andExpect(status().isCreated());
  }

  @Test
  void motivoDesconocido400() throws Exception {
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "no-me-gusta", null).andExpect(status().isBadRequest());
  }

  @Test
  void descripcionDe501Caracteres400() throws Exception {
    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "otro", "x".repeat(501)).andExpect(status().isBadRequest());
  }

  @Test
  void cuentaSuspendida403() throws Exception {
    otro.setEstado(false);
    usuarioRepository.save(otro);

    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null).andExpect(status().isForbidden());
  }

  @Test
  void bloqueoReincidencia403() throws Exception {
    faltas(otro, 3);

    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null).andExpect(status().isForbidden());
  }

  @Test
  void contenidoNoVisible404() throws Exception {
    publicacion.setEstadoModeracion(EstadoModeracion.PENDIENTE);
    publicacionRepository.saveAndFlush(publicacion);

    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null).andExpect(status().isNotFound());
  }

  @Test
  void contenidoEliminado404() throws Exception {
    respuesta.setEliminada(true);
    respuesta.setFechaEliminacion(LocalDateTime.now());
    respuesta.setEliminadaPor(autor);
    respuestaRepository.saveAndFlush(respuesta);

    reportar(otro, "respuestas", respuesta.getIdRespuesta(), "spam", null).andExpect(status().isNotFound());
  }

  @Test
  void elReporteOnceEnUnaHora429() throws Exception {
    // Nueve reportes de reseñas (una reseña distinta cada vez: un usuario reporta
    // cada reseña una sola vez) más uno de la comunidad llenan el límite compartido.
    for (int i = 0; i < LimiteReportesService.MAX_REPORTES_POR_HORA - 1; i++) {
      Resena resena = new Resena();
      resena.setProducto(producto(true));
      resena.setUsuario(autor);
      resena.setComentario("Reseña reportada " + i);
      resena.setPuntuacion(3);
      resena.setEstado(true);
      resena = resenaRepository.saveAndFlush(resena);
      ReporteResena r = new ReporteResena();
      r.setResena(resena);
      r.setUsuario(otro);
      r.setMotivo("spam");
      reporteResenaRepository.save(r);
    }
    reporteResenaRepository.flush();

    reportar(otro, "publicaciones", publicacion.getIdPublicacion(), "spam", null).andExpect(status().isCreated());
    reportar(otro, "respuestas", respuesta.getIdRespuesta(), "spam", null).andExpect(status().isTooManyRequests());
  }

  @Test
  void sinSesion401() throws Exception {
    mockMvc.perform(post("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/reportes")
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"spam\"}"))
      .andExpect(status().isUnauthorized());
  }

  private ResultActions reportar(Usuario u, String tipo, long id, String motivo, String descripcion) throws Exception {
    String cuerpo = "{\"motivo\":" + json(motivo) + ",\"descripcion\":" + (descripcion == null ? "null" : json(descripcion)) + "}";
    return mockMvc.perform(post("/api/comunidad/" + tipo + "/" + id + "/reportes").with(como(u))
      .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
  }
}
