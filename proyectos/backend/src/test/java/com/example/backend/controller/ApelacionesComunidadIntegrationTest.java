package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Comunidad, fase 3 (CA-15): el autor apela una decisión del foro y otra
 * persona la resuelve. Aceptar revierte la decisión si sigue vigente y anula
 * la falta. Las decisiones se toman con los endpoints reales de moderación,
 * salvo cuando hace falta una fecha antigua.
 */
@DisplayName("Comunidad: apelaciones de decisiones del foro")
class ApelacionesComunidadIntegrationTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private RespuestaComunidadRepository respuestaRepository;
  @Autowired private ModeracionComunidadAuditoriaRepository auditoriaComunidadRepository;
  @PersistenceContext private EntityManager entityManager;

  private Usuario otraModeradora;

  @BeforeEach
  void prepararModeradoras() {
    otraModeradora = usuario("Otra moderadora", rol("Moderador"));
  }

  // ---------- Apelar ----------

  @Test
  void apelarUnRechazo201() throws Exception {
    long decision = decidir(pendiente(autor), "rechazar");

    apelar(autor, decision, "No insulté a nadie")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.estado").value("PENDIENTE"))
      .andExpect(jsonPath("$.motivo").value("No insulté a nadie"));
  }

  @Test
  void apelarDecisionAjena403() throws Exception {
    long decision = decidir(pendiente(autor), "rechazar");

    apelar(otro, decision, "Quiero apelar").andExpect(status().isForbidden());
  }

  @Test
  void apelarDecisionInexistente404() throws Exception {
    apelar(autor, 999_999L, "No existe").andExpect(status().isNotFound());
  }

  @Test
  void apelarSinMotivo400() throws Exception {
    long decision = decidir(pendiente(autor), "rechazar");

    apelar(autor, decision, "   ").andExpect(status().isBadRequest());
    apelar(autor, decision, "x".repeat(1001)).andExpect(status().isBadRequest());
  }

  @Test
  void apelarDosVeces409() throws Exception {
    long decision = decidir(pendiente(autor), "rechazar");
    apelar(autor, decision, "Primera").andExpect(status().isCreated());

    apelar(autor, decision, "Segunda")
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message", containsString("Ya apelaste")));
  }

  @Test
  void apelarFueraDePlazo409() throws Exception {
    ModeracionComunidadAuditoria vieja = auditoria(pendiente(autor), AccionModeracionComunidad.RECHAZAR,
      LocalDateTime.now().minusDays(16));

    apelar(autor, vieja.getIdAuditoria(), "Tarde")
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message", containsString("plazo")));
  }

  @Test
  void apelarUnaAprobacion409() throws Exception {
    long decision = decidir(pendiente(autor), "aprobar");

    apelar(autor, decision, "Nada que apelar").andExpect(status().isConflict());
  }

  @Test
  void apelarOcultamientoYaRestaurado409() throws Exception {
    PublicacionComunidad p = publicacion(autor);
    long ocultar = decidir(p, "ocultar");
    decidir(p, "restaurar");

    apelar(autor, ocultar, "Ya está visible").andExpect(status().isConflict());
  }

  @Test
  void apelarDecisionQueYaNoEsLaMasReciente409() throws Exception {
    // Rechazada y después oculta: solo se apela la última decisión.
    PublicacionComunidad p = pendiente(autor);
    long rechazo = decidir(p, "rechazar");
    long ocultar = decidir(p, "ocultar");

    apelar(autor, rechazo, "El rechazo")
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.message", containsString("más reciente")));
    apelar(autor, ocultar, "El ocultamiento").andExpect(status().isCreated());
  }

  @Test
  // En PostgreSQL toda la prueba es una transacción y la 030 no deja registrar
  // dos OCULTAR del mismo contenido en una transacción; en producción son
  // peticiones distintas. La regla la cubre también la prueba anterior.
  @DisabledIfSystemProperty(named = "tecreview.postgres.real", matches = "true")
  void apelarOcultamientoAnterior409() throws Exception {
    // Punto de atención 1: ocultar, restaurar y volver a ocultar; solo se apela el último.
    PublicacionComunidad p = publicacion(autor);
    long primero = decidir(p, "ocultar");
    decidir(p, "restaurar");
    long ultimo = decidir(p, "ocultar");

    apelar(autor, primero, "El primero").andExpect(status().isConflict());
    apelar(autor, ultimo, "El último").andExpect(status().isCreated());
  }

  @Test
  void apelarContenidoQueElAutorElimino409() throws Exception {
    PublicacionComunidad p = publicacion(autor);
    long decision = decidir(p, "ocultar");
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
        .delete("/api/comunidad/publicaciones/" + p.getIdPublicacion()).with(como(autor)))
      .andExpect(status().is2xxSuccessful());

    apelar(autor, decision, "Ya lo borré").andExpect(status().isConflict());
  }

  @Test
  void apelarAunqueEsteBloqueadoPorReincidencia() throws Exception {
    faltas(autor, 3);
    long decision = decidir(pendiente(autor), "rechazar");

    apelar(autor, decision, "Apelar es la forma de impugnar").andExpect(status().isCreated());
  }

  @Test
  void misDecisionesMuestraPlazoYEstado() throws Exception {
    PublicacionComunidad p = pendiente(autor);
    long rechazo = decidir(p, "rechazar");
    apelar(autor, rechazo, "No insulté a nadie").andExpect(status().isCreated());
    RespuestaComunidad r = respuesta(autor, publicacion(otro));
    long ocultar = decidirRespuesta(r, "ocultar");
    decidir(publicacion(otro), "ocultar");  // ajena: no aparece

    mockMvc.perform(get("/api/comunidad/apelaciones/mias").with(como(autor)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(2)))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + rechazo + ")].tipo").value("PUBLICACION"))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + rechazo + ")].titulo").value(p.getTitulo()))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + rechazo + ")].apelable").value(false))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + rechazo + ")].apelacion.estado").value("PENDIENTE"))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + rechazo + ")].plazoHasta").exists())
      .andExpect(jsonPath("$[?(@.idAuditoria == " + ocultar + ")].tipo").value("RESPUESTA"))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + ocultar + ")].idPublicacion")
        .value(r.getPublicacion().getIdPublicacion().intValue()))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + ocultar + ")].accion").value("OCULTAR"))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + ocultar + ")].apelable").value(true))
      .andExpect(jsonPath("$[?(@.idAuditoria == " + ocultar + ")].contenidoEliminado").value(false));
  }

  @Test
  void misDecisionesExigeSesion() throws Exception {
    mockMvc.perform(get("/api/comunidad/apelaciones/mias")).andExpect(status().isUnauthorized());
  }

  // ---------- Resolver ----------

  @Test
  void aceptarRechazoPublicaYAnulaLaFalta() throws Exception {
    // CA-15: con 3 faltas está bloqueada; aceptar una la desbloquea en la misma respuesta.
    faltas(autor, 2);
    PublicacionComunidad p = pendiente(autor);
    long apelacion = apelacionDe(decidir(p, "rechazar"));
    publicar(autor).andExpect(status().isForbidden());

    aceptar(otraModeradora, apelacion, null)
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("ACEPTADA"))
      .andExpect(jsonPath("$.contenidoRevertido").value(true))
      .andExpect(jsonPath("$.respuesta").isNotEmpty());

    PublicacionComunidad recargada = recargar(p);
    assertTrue(recargada.getEstadoModeracion() == EstadoModeracion.PUBLICADA, String.valueOf(recargada.getEstadoModeracion()));
    publicar(autor).andExpect(status().isCreated());
  }

  @Test
  void aceptarOcultamientoRestaura() throws Exception {
    PublicacionComunidad p = publicacion(autor);
    long apelacion = apelacionDe(decidir(p, "ocultar"));

    aceptar(otraModeradora, apelacion, "Revisado: no incumple")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.contenidoRevertido").value(true));

    assertTrue(!recargar(p).isOcultaPorModeracion(), "sigue oculta");
    mockMvc.perform(get("/api/moderacion/comunidad/publicaciones/" + p.getIdPublicacion() + "/historial")
        .with(como(otraModeradora)))
      .andExpect(jsonPath("$[0].accion").value("RESTAURAR"))
      .andExpect(jsonPath("$[0].moderador").value(otraModeradora.getNombre()));
  }

  @Test
  void aceptarOcultamientoDeUnaRespuestaLaRestaura() throws Exception {
    RespuestaComunidad r = respuesta(autor, publicacion(otro));
    long apelacion = apelacionDe(decidirRespuesta(r, "ocultar"));

    aceptar(otraModeradora, apelacion, null).andExpect(status().isOk());

    entityManager.flush();
    entityManager.clear();
    assertTrue(!respuestaRepository.findById(r.getIdRespuesta()).orElseThrow().isOcultaPorModeracion(), "sigue oculta");
  }

  @Test
  void aceptarEliminacionAnulaLaFaltaPeroSigueEliminada() throws Exception {
    faltas(autor, 2);
    PublicacionComunidad p = publicacion(autor);
    long apelacion = apelacionDe(decidir(p, "eliminar"));
    publicar(autor).andExpect(status().isForbidden());

    aceptar(otraModeradora, apelacion, null)
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.contenidoRevertido").value(false));

    assertTrue(recargar(p).isEliminada(), "la eliminación no se deshace");
    publicar(autor).andExpect(status().isCreated());
  }

  @Test
  void editarDuranteLaApelacionYAceptar() throws Exception {
    // Punto de atención 2: la edición la devuelve a PENDIENTE; aceptar solo anula la falta.
    PublicacionComunidad p = pendiente(autor);
    long apelacion = apelacionDe(decidir(p, "rechazar"));
    mockMvc.perform(put("/api/comunidad/publicaciones/" + p.getIdPublicacion()).with(como(autor))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"titulo\":\"Pregunta corregida\",\"contenido\":\"Texto corregido\"}"))
      .andExpect(status().isOk());
    // Entre peticiones reales la edición ya está confirmada; aquí comparten transacción.
    entityManager.flush();
    entityManager.clear();

    aceptar(otraModeradora, apelacion, null)
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.contenidoRevertido").value(false));

    assertTrue(recargar(p).getEstadoModeracion() == EstadoModeracion.PENDIENTE, "no debía publicarse sin revisión");
  }

  @Test
  void rechazarSinRespuesta400() throws Exception {
    long apelacion = apelacionDe(decidir(pendiente(autor), "rechazar"));

    rechazar(otraModeradora, apelacion, null).andExpect(status().isBadRequest());
    rechazar(otraModeradora, apelacion, "  ").andExpect(status().isBadRequest());
  }

  @Test
  void rechazarDejaLaDecisionFirme() throws Exception {
    PublicacionComunidad p = pendiente(autor);
    long apelacion = apelacionDe(decidir(p, "rechazar"));

    rechazar(otraModeradora, apelacion, "El texto incumple las normas")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estado").value("RECHAZADA"))
      .andExpect(jsonPath("$.contenidoRevertido").value(false));

    assertTrue(recargar(p).getEstadoModeracion() == EstadoModeracion.RECHAZADA, "cambió el contenido");
  }

  @Test
  void resolverElAutorOElModeradorDeLaDecision403() throws Exception {
    long apelacion = apelacionDe(decidir(pendiente(autor), "rechazar"));

    aceptar(moderador, apelacion, null)
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.message", containsString("decisión original")));
    Usuario autoraModeradora = usuario("Autora moderadora", rol("Moderador"));
    PublicacionComunidad propia = pendiente(autoraModeradora);
    long propiaApelacion = apelacionDe(decidir(propia, "rechazar"), autoraModeradora);
    aceptar(autoraModeradora, propiaApelacion, null).andExpect(status().isForbidden());
  }

  @Test
  void resolverSinRolDeModeracion403() throws Exception {
    long apelacion = apelacionDe(decidir(pendiente(autor), "rechazar"));

    aceptar(otro, apelacion, null).andExpect(status().isForbidden());
  }

  @Test
  void resolverDosVeces409() throws Exception {
    long apelacion = apelacionDe(decidir(pendiente(autor), "rechazar"));
    aceptar(otraModeradora, apelacion, null).andExpect(status().isOk());

    rechazar(usuario("Tercera", rol("Moderador")), apelacion, "Tarde").andExpect(status().isConflict());
  }

  @Test
  void resolverInexistente404() throws Exception {
    aceptar(otraModeradora, 999_999L, null).andExpect(status().isNotFound());
  }

  @Test
  void colaMuestraLasPendientesConSuContexto() throws Exception {
    PublicacionComunidad p = pendiente(autor);
    long apelacion = apelacionDe(decidir(p, "rechazar"));
    long resuelta = apelacionDe(decidir(publicacion(autor), "ocultar"));
    aceptar(otraModeradora, resuelta, null).andExpect(status().isOk());

    mockMvc.perform(get("/api/moderacion/comunidad/apelaciones").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].idApelacion").value((int) apelacion))
      .andExpect(jsonPath("$[0].tipo").value("PUBLICACION"))
      .andExpect(jsonPath("$[0].titulo").value(p.getTitulo()))
      .andExpect(jsonPath("$[0].accion").value("RECHAZAR"))
      .andExpect(jsonPath("$[0].motivoApelacion").value("Motivo de la apelación"))
      .andExpect(jsonPath("$[0].nombreAutor").value(autor.getNombre()))
      // Quien tomó la decisión la ve, pero no la puede resolver.
      .andExpect(jsonPath("$[0].puedeResolver").value(false));
    mockMvc.perform(get("/api/moderacion/comunidad/apelaciones?estado=ACEPTADA").with(como(moderador)))
      .andExpect(jsonPath("$", hasSize(1)))
      .andExpect(jsonPath("$[0].idApelacion").value((int) resuelta));
  }

  @Test
  void colaExigeRolDeModeracion() throws Exception {
    mockMvc.perform(get("/api/moderacion/comunidad/apelaciones").with(como(otro)))
      .andExpect(status().isForbidden());
  }

  @Test
  void resumenCuentaApelacionesDelForo() throws Exception {
    apelacionDe(decidir(pendiente(autor), "rechazar"));

    mockMvc.perform(get("/api/moderacion/pendientes/resumen").with(como(moderador)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.comunidadApelaciones").value(1))
      .andExpect(jsonPath("$.total").value(1));
  }

  // ---------- Ayudas ----------

  private ResultActions apelar(Usuario u, long idAuditoria, String motivo) throws Exception {
    return mockMvc.perform(post("/api/comunidad/apelaciones").with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content("{\"idAuditoria\":" + idAuditoria + ",\"motivo\":" + json(motivo) + "}"));
  }

  private long apelacionDe(long idAuditoria) throws Exception {
    return apelacionDe(idAuditoria, autor);
  }

  private long apelacionDe(long idAuditoria, Usuario u) throws Exception {
    String cuerpo = apelar(u, idAuditoria, "Motivo de la apelación")
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(cuerpo, "$.idApelacion")).longValue();
  }

  private ResultActions aceptar(Usuario u, long idApelacion, String respuesta) throws Exception {
    var peticion = put("/api/moderacion/comunidad/apelaciones/" + idApelacion + "/aceptar").with(como(u));
    if (respuesta != null) {
      peticion = peticion.contentType(MediaType.APPLICATION_JSON).content("{\"respuesta\":" + json(respuesta) + "}");
    }
    return mockMvc.perform(peticion);
  }

  private ResultActions rechazar(Usuario u, long idApelacion, String respuesta) throws Exception {
    var peticion = put("/api/moderacion/comunidad/apelaciones/" + idApelacion + "/rechazar").with(como(u));
    if (respuesta != null) {
      peticion = peticion.contentType(MediaType.APPLICATION_JSON).content("{\"respuesta\":" + json(respuesta) + "}");
    }
    return mockMvc.perform(peticion);
  }

  private ResultActions publicar(Usuario u) throws Exception {
    return mockMvc.perform(post("/api/comunidad/publicaciones").with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content("{\"tipo\":\"GENERAL\",\"titulo\":\"Pregunta normal\",\"contenido\":\"Contenido normal\"}"));
  }

  /** Decisión con el endpoint real de moderación; devuelve el id de su auditoría. */
  private long decidir(PublicacionComunidad p, String accion) throws Exception {
    mockMvc.perform(put("/api/moderacion/comunidad/publicaciones/" + p.getIdPublicacion() + "/" + accion)
        .with(como(moderador)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Incumple las normas\"}"))
      .andExpect(status().isOk());
    return auditoriaComunidadRepository.findByPublicacionIdPublicacionOrderByFechaEventoDesc(p.getIdPublicacion())
      .stream().mapToLong(ModeracionComunidadAuditoria::getIdAuditoria).max().orElseThrow();
  }

  private long decidirRespuesta(RespuestaComunidad r, String accion) throws Exception {
    mockMvc.perform(put("/api/moderacion/comunidad/respuestas/" + r.getIdRespuesta() + "/" + accion)
        .with(como(moderador)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Incumple las normas\"}"))
      .andExpect(status().isOk());
    return auditoriaComunidadRepository.findByRespuestaIdRespuestaOrderByFechaEventoDesc(r.getIdRespuesta())
      .stream().mapToLong(ModeracionComunidadAuditoria::getIdAuditoria).max().orElseThrow();
  }

  /** Decisión con fecha propia, en el orden de los triggers de la 030 (solo RECHAZAR). */
  private ModeracionComunidadAuditoria auditoria(PublicacionComunidad p, AccionModeracionComunidad accion,
      LocalDateTime fecha) {
    ModeracionComunidadAuditoria a = new ModeracionComunidadAuditoria(p, null, moderador, accion, "Motivo", "Texto");
    a.setFechaEvento(fecha);
    a = auditoriaComunidadRepository.saveAndFlush(a);
    p.setEstadoModeracion(EstadoModeracion.RECHAZADA);
    publicacionRepository.saveAndFlush(p);
    return a;
  }

  private PublicacionComunidad publicacion(Usuario u) {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(u);
    p.setTitulo("Publicación de " + u.getNombre());
    p.setContenido("Contenido");
    return publicacionRepository.saveAndFlush(p);
  }

  private PublicacionComunidad pendiente(Usuario u) {
    PublicacionComunidad p = publicacion(u);
    p.setEstadoModeracion(EstadoModeracion.PENDIENTE);
    return publicacionRepository.saveAndFlush(p);
  }

  private RespuestaComunidad respuesta(Usuario u, PublicacionComunidad p) {
    RespuestaComunidad r = new RespuestaComunidad();
    r.setPublicacion(p);
    r.setAutor(u);
    r.setContenido("Respuesta de " + u.getNombre());
    r.setProfundidad((short) 0);
    return respuestaRepository.saveAndFlush(r);
  }

  private PublicacionComunidad recargar(PublicacionComunidad p) {
    entityManager.flush();
    entityManager.clear();
    return publicacionRepository.findById(p.getIdPublicacion()).orElseThrow();
  }
}
