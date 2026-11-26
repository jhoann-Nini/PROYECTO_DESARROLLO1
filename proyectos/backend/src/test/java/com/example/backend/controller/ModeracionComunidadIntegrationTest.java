package com.example.backend.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.ReporteComunidad;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReporteComunidadHistorialRepository;
import com.example.backend.repository.ReporteComunidadRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** Comunidad, fase 2: moderación del foro con auditoría (CA-12, CA-13, RN-11, RN-16). */
@DisplayName("Comunidad: moderación")
class ModeracionComunidadIntegrationTest extends ComunidadIntegrationTestBase {

  private static final String BASE = "/api/moderacion/comunidad";

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private RespuestaComunidadRepository respuestaRepository;
  @Autowired private ReporteComunidadRepository reporteRepository;
  @Autowired private ReporteComunidadHistorialRepository historialRepository;
  @Autowired private ModeracionComunidadAuditoriaRepository auditoriaRepository;

  private Usuario moderador2;
  private PublicacionComunidad publicada;
  private PublicacionComunidad pendiente;

  @BeforeEach
  void crearContenido() {
    moderador2 = usuario("Moderador dos", rol("Moderador"));
    publicada = publicacion(autor, "Publicación publicada", "Texto publicado", EstadoModeracion.PUBLICADA);
    pendiente = publicacion(autor, "Publicación retenida", "el vendedor es un idiota", EstadoModeracion.PENDIENTE);
  }

  // ---------- Revisión de lo retenido por el filtro ----------

  @Test
  void colaEnRevisionMuestraRiesgoYMotivos() throws Exception {
    mockMvc.perform(get(BASE + "/en-revision").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].tipo").value("PUBLICACION"))
      .andExpect(jsonPath("$[0].id").value(pendiente.getIdPublicacion()))
      .andExpect(jsonPath("$[0].riesgo").value("MEDIO"))
      .andExpect(jsonPath("$[0].motivos").isNotEmpty());
  }

  @Test
  void colaEnRevisionOrdenaAltoPrimero() throws Exception {
    PublicacionComunidad amenaza = publicacion(otro, "Aviso", "te voy a matar", EstadoModeracion.PENDIENTE);

    mockMvc.perform(get(BASE + "/en-revision").with(como(moderador)))
      .andExpect(jsonPath("$[0].id").value(amenaza.getIdPublicacion()))
      .andExpect(jsonPath("$[0].riesgo").value("ALTO"));
  }

  @Test
  void colaIncluyeRespuestasPendientes() throws Exception {
    RespuestaComunidad r = respuesta(otro, publicada, "eres un idiota", EstadoModeracion.PENDIENTE);

    mockMvc.perform(get(BASE + "/en-revision").with(como(moderador)))
      .andExpect(jsonPath("$[*].id", hasItem(r.getIdRespuesta().intValue())))
      .andExpect(jsonPath("$[?(@.tipo == 'RESPUESTA')].titulo").value(hasItem("Publicación publicada")));
  }

  @Test
  void aprobarPendientePublica() throws Exception {
    decidir(moderador, "publicaciones", pendiente.getIdPublicacion(), "aprobar", "Es una crítica al servicio")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"));

    mockMvc.perform(get("/api/comunidad/publicaciones/" + pendiente.getIdPublicacion()))
      .andExpect(status().isOk());
  }

  @Test
  void rechazarPendienteLoDejaVisibleSoloAlAutor() throws Exception {
    decidir(moderador, "publicaciones", pendiente.getIdPublicacion(), "rechazar", "Insulto a una persona")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("RECHAZADA"));

    mockMvc.perform(get("/api/comunidad/publicaciones/" + pendiente.getIdPublicacion()).with(como(otro)))
      .andExpect(status().isNotFound());
    mockMvc.perform(get("/api/comunidad/publicaciones/" + pendiente.getIdPublicacion()).with(como(autor)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("RECHAZADA"));
  }

  @Test
  void aprobarPublicada409() throws Exception {
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "aprobar", "Correcto")
      .andExpect(status().isConflict());
  }

  // ---------- Ocultar, restaurar y eliminar ----------

  @Test
  void ocultarYRestaurarConMotivo() throws Exception {
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "ocultar", "Información falsa")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.ocultaPorModeracion").value(true));
    mockMvc.perform(get("/api/comunidad/publicaciones/" + publicada.getIdPublicacion()).with(como(otro)))
      .andExpect(status().isNotFound());

    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "restaurar", "Revisado de nuevo")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.ocultaPorModeracion").value(false));
    mockMvc.perform(get("/api/comunidad/publicaciones/" + publicada.getIdPublicacion()).with(como(otro)))
      .andExpect(status().isOk());
  }

  @Test
  void restaurarNoOculta409() throws Exception {
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "restaurar", "x").andExpect(status().isConflict());
  }

  @Test
  void ocultarSinMotivo400() throws Exception {
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "ocultar", "  ").andExpect(status().isBadRequest());
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "ocultar", "x".repeat(501)).andExpect(status().isBadRequest());
  }

  @Test
  void moderarLoPropio403() throws Exception {
    PublicacionComunidad delModerador = publicacion(moderador, "Publicación del moderador", "Texto", EstadoModeracion.PUBLICADA);

    decidir(moderador, "publicaciones", delModerador.getIdPublicacion(), "ocultar", "x").andExpect(status().isForbidden());
  }

  @Test
  void usuarioSinRol403() throws Exception {
    decidir(otro, "publicaciones", publicada.getIdPublicacion(), "ocultar", "x").andExpect(status().isForbidden());
    mockMvc.perform(get(BASE + "/en-revision").with(como(otro))).andExpect(status().isForbidden());
  }

  @Test
  void sinSesion401() throws Exception {
    mockMvc.perform(get(BASE + "/en-revision")).andExpect(status().isUnauthorized());
  }

  @Test
  void eliminarComoModeradorQuedaAuditadoYNoSePuedeEditar() throws Exception {
    RespuestaComunidad r = respuesta(otro, publicada, "spam spam", EstadoModeracion.PUBLICADA);

    decidir(moderador, "respuestas", r.getIdRespuesta(), "eliminar", "Publicidad no permitida")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.eliminada").value(true));

    mockMvc.perform(put("/api/comunidad/respuestas/" + r.getIdRespuesta()).with(como(otro))
        .contentType(MediaType.APPLICATION_JSON).content("{\"contenido\":\"otro texto\"}"))
      .andExpect(status().isNotFound());
    decidir(moderador, "respuestas", r.getIdRespuesta(), "eliminar", "otra vez").andExpect(status().isConflict());
    mockMvc.perform(get(BASE + "/respuestas/" + r.getIdRespuesta() + "/historial").with(como(moderador)))
      .andExpect(jsonPath("$[0].accion").value("ELIMINAR_MODERADOR"))
      .andExpect(jsonPath("$[0].contenidoRevisado").value("spam spam"))
      .andExpect(jsonPath("$[0].motivo").value("Publicidad no permitida"))
      .andExpect(jsonPath("$[0].moderador").value("Moderador comunidad"));
  }

  @Test
  void cadaDecisionGuardaElTextoRevisado() throws Exception {
    decidir(moderador, "publicaciones", pendiente.getIdPublicacion(), "rechazar", "Insulto").andExpect(status().isOk());

    var auditorias = auditoriaRepository.findAll();
    if (auditorias.size() != 1 || !auditorias.get(0).getContenidoRevisado().contains("el vendedor es un idiota")
        || !auditorias.get(0).getContenidoRevisado().contains("Publicación retenida")) {
      throw new AssertionError("La auditoría no guardó título y texto revisados: " + auditorias);
    }
  }

  @Test
  void editarOcultoPorReportesSigueOculto() throws Exception {
    publicada.setOcultaPorReportes(true);
    publicacionRepository.saveAndFlush(publicada);

    mockMvc.perform(put("/api/comunidad/publicaciones/" + publicada.getIdPublicacion()).with(como(autor))
        .contentType(MediaType.APPLICATION_JSON).content("{\"titulo\":\"Título editado\",\"contenido\":\"Texto editado\"}"))
      .andExpect(status().isOk());

    if (!publicacionRepository.findById(publicada.getIdPublicacion()).orElseThrow().isOcultaPorReportes()) {
      throw new AssertionError("Editar desocultó una publicación oculta por reportes");
    }
  }

  // ---------- Reportes ----------

  @Test
  void listaReportesAbiertosConContenidoYConteo() throws Exception {
    long idReporte = reportar(otro, publicada);

    mockMvc.perform(get(BASE + "/reportes").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].idReporte").value(idReporte))
      .andExpect(jsonPath("$[0].tipo").value("PUBLICACION"))
      .andExpect(jsonPath("$[0].titulo").value("Publicación publicada"))
      .andExpect(jsonPath("$[0].reportante").value("Otro comunidad"))
      .andExpect(jsonPath("$[0].reportesActivos").value(1))
      .andExpect(jsonPath("$[0].estado").value("PENDIENTE"));
  }

  @Test
  void aceptarReporteConOcultarAuditaAmbos() throws Exception {
    long idReporte = reportar(otro, publicada);

    resolver(moderador, idReporte, "aceptar", "{\"justificacion\":\"Es spam\",\"accion\":\"OCULTAR\",\"motivo\":\"Publicidad\"}")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("ACEPTADO"));

    if (!publicacionRepository.findById(publicada.getIdPublicacion()).orElseThrow().isOcultaPorModeracion()) {
      throw new AssertionError("Aceptar con OCULTAR no ocultó la publicación");
    }
    if (historialRepository.findByReporteIdReporteOrderByFechaEventoAsc(idReporte).size() != 2) {
      throw new AssertionError("Se esperaban dos eventos de historial (EN_REVISION y ACEPTADO)");
    }
    if (auditoriaRepository.findAll().stream().noneMatch(a -> a.getAccion().name().equals("OCULTAR"))) {
      throw new AssertionError("Falta la auditoría OCULTAR");
    }
  }

  @Test
  void aceptarConJustificacionLargaYOcultar() throws Exception {
    long idReporte = reportar(otro, publicada);
    String larga = "Es publicidad reiterada. ".repeat(30);

    resolver(moderador, idReporte, "aceptar", "{\"justificacion\":" + json(larga) + ",\"accion\":\"OCULTAR\"}")
      .andExpect(status().isOk());

    if (!publicacionRepository.findById(publicada.getIdPublicacion()).orElseThrow().isOcultaPorModeracion()) {
      throw new AssertionError("No se ocultó con una justificación de más de 500 caracteres");
    }
  }

  @Test
  void restaurarContenidoEliminado409SinCulparAOtraDecision() throws Exception {
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "ocultar", "Incumple").andExpect(status().isOk());
    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "eliminar", "Spam").andExpect(status().isOk());

    decidir(moderador, "publicaciones", publicada.getIdPublicacion(), "restaurar", "Revisado")
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value("La acción no corresponde al estado actual del contenido."));
  }

  @Test
  void moderadorSuspendidoNoVeLoPendienteEnLecturasPublicas() throws Exception {
    moderador.setEstado(false);
    usuarioRepository.save(moderador);

    mockMvc.perform(get("/api/comunidad/publicaciones/" + pendiente.getIdPublicacion()).with(como(moderador)))
      .andExpect(status().isNotFound());
  }

  @Test
  void aceptarSinAccionNoOculta() throws Exception {
    long idReporte = reportar(otro, publicada);

    resolver(moderador, idReporte, "aceptar", "{\"justificacion\":\"Tiene razón\",\"accion\":\"NINGUNA\"}")
      .andExpect(status().isOk());

    if (publicacionRepository.findById(publicada.getIdPublicacion()).orElseThrow().isOcultaPorModeracion()) {
      throw new AssertionError("Aceptar sin acción ocultó la publicación");
    }
  }

  @Test
  void rechazarReporteRegistraHistorial() throws Exception {
    long idReporte = reportar(otro, publicada);

    resolver(moderador, idReporte, "rechazar", "{\"justificacion\":\"No incumple las normas\"}")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("RECHAZADO"));
    resolver(moderador, idReporte, "rechazar", "{\"justificacion\":\"otra vez\"}").andExpect(status().isConflict());
  }

  @Test
  void resolverSinJustificacion400() throws Exception {
    long idReporte = reportar(otro, publicada);

    resolver(moderador, idReporte, "rechazar", "{\"justificacion\":\" \"}").andExpect(status().isBadRequest());
  }

  @Test
  void resolverReporteDeContenidoPropio403() throws Exception {
    PublicacionComunidad delModerador = publicacion(moderador, "Del moderador", "Texto", EstadoModeracion.PUBLICADA);
    long idReporte = reportar(otro, delModerador);

    resolver(moderador, idReporte, "rechazar", "{\"justificacion\":\"No\"}").andExpect(status().isForbidden());
    resolver(moderador2, idReporte, "rechazar", "{\"justificacion\":\"No incumple\"}").andExpect(status().isOk());
  }

  @Test
  void resolverReporteQueHiceYo403() throws Exception {
    long idReporte = reportar(moderador, publicada);

    resolver(moderador, idReporte, "rechazar", "{\"justificacion\":\"No\"}").andExpect(status().isForbidden());
  }

  @Test
  void resumenCuentaLaComunidad() throws Exception {
    reportar(otro, publicada);

    mockMvc.perform(get("/api/moderacion/pendientes/resumen").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.comunidadRevision").value(1))
      .andExpect(jsonPath("$.comunidadReportes").value(1));
  }

  // ---------- Ayudas ----------

  private PublicacionComunidad publicacion(Usuario u, String titulo, String contenido, EstadoModeracion estado) {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(u);
    p.setTitulo(titulo);
    p.setContenido(contenido);
    p.setEstadoModeracion(estado);
    return publicacionRepository.saveAndFlush(p);
  }

  private RespuestaComunidad respuesta(Usuario u, PublicacionComunidad p, String contenido, EstadoModeracion estado) {
    RespuestaComunidad r = new RespuestaComunidad();
    r.setPublicacion(p);
    r.setAutor(u);
    r.setContenido(contenido);
    r.setProfundidad((short) 0);
    r.setEstadoModeracion(estado);
    return respuestaRepository.saveAndFlush(r);
  }

  private long reportar(Usuario u, PublicacionComunidad p) throws Exception {
    String cuerpo = mockMvc.perform(post("/api/comunidad/publicaciones/" + p.getIdPublicacion() + "/reportes").with(como(u))
        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"spam\"}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(cuerpo, "$.idReporte")).longValue();
  }

  private ResultActions decidir(Usuario u, String tipo, long id, String accion, String motivo) throws Exception {
    return mockMvc.perform(put(BASE + "/" + tipo + "/" + id + "/" + accion).with(como(u))
      .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":" + json(motivo) + "}"));
  }

  private ResultActions resolver(Usuario u, long idReporte, String accion, String cuerpo) throws Exception {
    return mockMvc.perform(put(BASE + "/reportes/" + idReporte + "/" + accion).with(como(u))
      .contentType(MediaType.APPLICATION_JSON).content(cuerpo));
  }

  @SuppressWarnings("unused")
  private ReporteComunidad reporteDirecto(Usuario u, PublicacionComunidad p, EstadoReporte estado) {
    ReporteComunidad r = new ReporteComunidad();
    r.setUsuario(u);
    r.setPublicacion(p);
    r.setMotivo("spam");
    r.setEstado(estado);
    return reporteRepository.saveAndFlush(r);
  }
}
