package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.AccionModeracionComunidad;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.ModeracionComunidadAuditoria;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.ModeracionComunidadAuditoriaRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.service.ModeracionComunidadService;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/**
 * Apelaciones del foro contra los triggers reales de la 031. Se ejecuta solo
 * con -Dtecreview.postgres.real=true, con el datasource en un PostgreSQL
 * local con las migraciones. Cada prueba es una transacción que se deshace;
 * SET CONSTRAINTS ALL IMMEDIATE fuerza los triggers diferidos sin COMMIT.
 */
@EnabledIfSystemProperty(named = "tecreview.postgres.real", matches = "true")
@DisplayName("Comunidad: apelaciones con triggers reales (PostgreSQL)")
class ApelacionesComunidadPostgresTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private ModeracionComunidadAuditoriaRepository auditoriaComunidadRepository;
  @Autowired private ModeracionComunidadService moderacionService;
  @PersistenceContext private EntityManager entityManager;

  private Usuario otraModeradora;
  private PublicacionComunidad pendiente;

  @BeforeEach
  void preparar() {
    otraModeradora = usuario("Otra moderadora", rol("Moderador"));
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Publicación retenida");
    p.setContenido("Contenido");
    p.setEstadoModeracion(EstadoModeracion.PENDIENTE);  // así se inserta: sin pasar por PUBLICADA
    pendiente = publicacionRepository.saveAndFlush(p);
  }

  @Test
  void aceptarRechazoPasaLosTriggers() throws Exception {
    long apelacion = apelar(rechazar(pendiente));

    mockMvc.perform(put("/api/moderacion/comunidad/apelaciones/" + apelacion + "/aceptar").with(como(otraModeradora)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.contenidoRevertido").value(true));
    confirmarRestricciones();

    assertEquals(EstadoModeracion.PUBLICADA, recargar().getEstadoModeracion());
    Object transaccion = entityManager.createNativeQuery(
        "SELECT id_transaccion_resolucion IS NOT NULL FROM apelacion_comunidad WHERE id_apelacion = :id")
      .setParameter("id", apelacion).getSingleResult();
    assertEquals(Boolean.TRUE, transaccion, "la base no fijó id_transaccion_resolucion");
  }

  @Test
  void aceptarOcultamientoPasaLosTriggers() throws Exception {
    decidir("aprobar");
    long ocultar = decidir("ocultar");
    long apelacion = apelar(ocultar);

    mockMvc.perform(put("/api/moderacion/comunidad/apelaciones/" + apelacion + "/aceptar").with(como(otraModeradora)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.contenidoRevertido").value(true));
    confirmarRestricciones();

    assertEquals(false, recargar().isOcultaPorModeracion());
  }

  @Test
  void aprobarRechazadaSinApelacionFalla() throws Exception {
    rechazar(pendiente);
    PublicacionComunidad p = recargar();

    // El servicio de moderación traduce el rechazo del trigger de la 031 a 409.
    assertThrows(ConflictException.class, () ->
      moderacionService.revertirPorApelacion(otraModeradora, p, null, AccionModeracionComunidad.APROBAR));
  }

  @Test
  void publicarRechazadaSinApelacionFallaAlConfirmar() throws Exception {
    rechazar(pendiente);
    PublicacionComunidad p = recargar();
    p.setEstadoModeracion(EstadoModeracion.PUBLICADA);
    publicacionRepository.saveAndFlush(p);

    assertThrows(Exception.class, this::confirmarRestricciones);
  }

  @Test
  void apelarContenidoQueElAutorEliminoMientrasTanto409() throws Exception {
    long decision = rechazar(pendiente);
    recargar();  // queda en la caché de JPA sin eliminar
    entityManager.createNativeQuery("UPDATE publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(),"
        + " eliminada_por = id_autor WHERE id_publicacion = :id")
      .setParameter("id", pendiente.getIdPublicacion()).executeUpdate();

    mockMvc.perform(post("/api/comunidad/apelaciones").with(como(autor)).contentType(MediaType.APPLICATION_JSON)
        .content("{\"idAuditoria\":" + decision + ",\"motivo\":\"Tarde\"}"))
      .andExpect(status().isConflict());
  }

  // ---------- Ayudas ----------

  private long rechazar(PublicacionComunidad p) throws Exception {
    long id = decidir("rechazar");
    assertEquals(p.getIdPublicacion(), auditoriaComunidadRepository.findById(id).orElseThrow()
      .getPublicacion().getIdPublicacion());
    return id;
  }

  private long decidir(String accion) throws Exception {
    mockMvc.perform(put("/api/moderacion/comunidad/publicaciones/" + pendiente.getIdPublicacion() + "/" + accion)
        .with(como(moderador)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Incumple\"}"))
      .andExpect(status().isOk());
    confirmarRestricciones();
    return auditoriaComunidadRepository.findByPublicacionIdPublicacionOrderByFechaEventoDesc(pendiente.getIdPublicacion())
      .stream().mapToLong(ModeracionComunidadAuditoria::getIdAuditoria).max().orElseThrow();
  }

  private long apelar(long idAuditoria) throws Exception {
    String cuerpo = mockMvc.perform(post("/api/comunidad/apelaciones").with(como(autor))
        .contentType(MediaType.APPLICATION_JSON).content("{\"idAuditoria\":" + idAuditoria + ",\"motivo\":\"Error\"}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    confirmarRestricciones();
    return ((Number) JsonPath.read(cuerpo, "$.idApelacion")).longValue();
  }

  private PublicacionComunidad recargar() {
    entityManager.flush();
    entityManager.clear();
    return publicacionRepository.findById(pendiente.getIdPublicacion()).orElseThrow();
  }

  private void confirmarRestricciones() {
    entityManager.flush();
    entityManager.createNativeQuery("SET CONSTRAINTS ALL IMMEDIATE").executeUpdate();
    entityManager.createNativeQuery("SET CONSTRAINTS ALL DEFERRED").executeUpdate();
  }
}
