package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.ReporteComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ReporteComunidadRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/**
 * Moderación de la comunidad contra los triggers reales de la 030. Se ejecuta
 * solo con -Dtecreview.postgres.real=true, apuntando el datasource a un
 * PostgreSQL local restaurado con las migraciones (receta de la skill
 * supabase-auditor). Cada prueba corre en una transacción que se deshace;
 * SET CONSTRAINTS ALL IMMEDIATE fuerza los triggers diferidos sin COMMIT.
 */
@EnabledIfSystemProperty(named = "tecreview.postgres.real", matches = "true")
@DisplayName("Comunidad: moderación con triggers reales (PostgreSQL)")
class ModeracionComunidadPostgresTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private ReporteComunidadRepository reporteRepository;
  @PersistenceContext private EntityManager entityManager;

  private PublicacionComunidad publicacion;

  @BeforeEach
  void crearPublicacion() {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Publicación reportada");
    p.setContenido("Contenido");
    publicacion = publicacionRepository.saveAndFlush(p);
  }

  @Test
  void tercerReporteOcultaYRechazarRestaura() throws Exception {
    List<Long> reportes = new ArrayList<>();
    for (int i = 0; i < 3; i++) {
      reportes.add(reportar(usuario("Reportante " + i, rol("Usuario registrado"))));
      boolean oculta = recargar().isOcultaPorReportes();
      if (oculta != (i == 2)) {
        throw new AssertionError("Tras " + (i + 1) + " reportes, oculta_por_reportes = " + oculta);
      }
    }

    mockMvc.perform(put("/api/moderacion/comunidad/reportes/" + reportes.get(0) + "/rechazar").with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"justificacion\":\"No incumple\"}"))
      .andExpect(status().isOk());
    confirmarRestricciones();

    assertTrue(!recargar().isOcultaPorReportes(), "Rechazar un reporte no restauró la publicación");
  }

  @Test
  void decisionesDelServicioPasanLosTriggersDiferidos() throws Exception {
    long idReporte = reportar(otro);
    mockMvc.perform(put("/api/moderacion/comunidad/reportes/" + idReporte + "/aceptar").with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"justificacion\":\"Es spam\",\"accion\":\"OCULTAR\",\"motivo\":\"Publicidad\"}"))
      .andExpect(status().isOk());
    // Cada petición real es su propia transacción: se confirma después de cada una.
    confirmarRestricciones();
    mockMvc.perform(put("/api/moderacion/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/restaurar")
        .with(como(moderador)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Revisado\"}"))
      .andExpect(status().isOk());
    confirmarRestricciones();
    mockMvc.perform(put("/api/moderacion/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/eliminar")
        .with(como(moderador)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Spam reiterado\"}"))
      .andExpect(status().isOk());

    confirmarRestricciones();
  }

  @Test
  void moderadorQueOcultaSinAuditoriaFalla() {
    PublicacionComunidad p = recargar();
    p.setOcultaPorModeracion(true);
    publicacionRepository.saveAndFlush(p);

    assertThrows(Exception.class, this::confirmarRestricciones);
  }

  @Test
  void historialObligatorioEnCadaTransicion() throws Exception {
    long idReporte = reportar(otro);
    ReporteComunidad r = reporteRepository.findById(idReporte).orElseThrow();
    r.setEstado(EstadoReporte.EN_REVISION);
    reporteRepository.saveAndFlush(r);

    assertThrows(Exception.class, this::confirmarRestricciones);
  }

  @Test
  void respuestaEnPublicacionEliminadaMientrasTanto409() throws Exception {
    // La publicación queda en la caché de JPA como no eliminada, y en la base se elimina:
    // el servicio la ve abierta y el trigger de la 029 rechaza la respuesta.
    publicacionRepository.findById(publicacion.getIdPublicacion()).orElseThrow();
    entityManager.createNativeQuery("UPDATE publicacion_comunidad SET eliminada = TRUE, fecha_eliminacion = now(),"
        + " eliminada_por = id_autor WHERE id_publicacion = :id")
      .setParameter("id", publicacion.getIdPublicacion()).executeUpdate();

    mockMvc.perform(post("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/respuestas").with(como(otro))
        .contentType(MediaType.APPLICATION_JSON).content("{\"contenido\":\"llego tarde\"}"))
      .andExpect(status().isConflict());
  }

  @Test
  void reporteYaResueltoPorOtroModerador409() throws Exception {
    long idReporte = reportar(otro);
    reporteRepository.findById(idReporte).orElseThrow();  // queda en la caché de JPA como PENDIENTE
    Usuario otraModeradora = usuario("Otra moderadora", rol("Moderador"));
    // Otra moderadora lo resuelve paso a paso, como el backend: evento y luego cambio de estado.
    for (String[] paso : new String[][] {{"PENDIENTE", "EN_REVISION"}, {"EN_REVISION", "RECHAZADO"}}) {
      entityManager.createNativeQuery("INSERT INTO reporte_comunidad_historial (id_reporte, id_moderador, estado_anterior, estado_nuevo, justificacion)"
          + " VALUES (:r, :m, :a, :n, 'No incumple')")
        .setParameter("r", idReporte).setParameter("m", otraModeradora.getIdUsuario())
        .setParameter("a", paso[0]).setParameter("n", paso[1]).executeUpdate();
      entityManager.createNativeQuery("UPDATE reporte_comunidad SET estado = :n WHERE id_reporte = :r")
        .setParameter("n", paso[1]).setParameter("r", idReporte).executeUpdate();
    }

    mockMvc.perform(put("/api/moderacion/comunidad/reportes/" + idReporte + "/aceptar").with(como(moderador))
        .contentType(MediaType.APPLICATION_JSON).content("{\"justificacion\":\"Es spam\",\"accion\":\"NINGUNA\"}"))
      .andExpect(status().isConflict());
  }

  @Test
  void decisionSobreContenidoYaModerado409() throws Exception {
    publicacionRepository.findById(publicacion.getIdPublicacion()).orElseThrow();  // en caché, sin ocultar
    Usuario otraModeradora = usuario("Otra moderadora", rol("Moderador"));
    entityManager.createNativeQuery("INSERT INTO moderacion_comunidad_auditoria (id_publicacion, id_moderador, accion, motivo, contenido_revisado)"
        + " VALUES (:p, :m, 'OCULTAR', 'Incumple', 'Contenido')")
      .setParameter("p", publicacion.getIdPublicacion()).setParameter("m", otraModeradora.getIdUsuario()).executeUpdate();
    entityManager.createNativeQuery("UPDATE publicacion_comunidad SET oculta_por_moderacion = TRUE WHERE id_publicacion = :p")
      .setParameter("p", publicacion.getIdPublicacion()).executeUpdate();

    mockMvc.perform(put("/api/moderacion/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/ocultar")
        .with(como(moderador)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Spam\"}"))
      .andExpect(status().isConflict());
  }

  @Test
  void laFechaDelReporteEsLaGuardada() throws Exception {
    String cuerpo = mockMvc.perform(post("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/reportes")
        .with(como(otro)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"spam\"}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    long id = ((Number) JsonPath.read(cuerpo, "$.idReporte")).longValue();
    String devuelta = JsonPath.read(cuerpo, "$.fechaCreacion");
    entityManager.flush();
    entityManager.clear();
    String guardada = reporteRepository.findById(id).orElseThrow().getFechaCreacion().toString();
    if (!guardada.startsWith(devuelta.replaceAll("0+$", ""))) {
      throw new AssertionError("La respuesta dice " + devuelta + " y se guardó " + guardada);
    }
  }

  private long reportar(Usuario u) throws Exception {
    String cuerpo = mockMvc.perform(post("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/reportes")
        .with(como(u)).contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"spam\"}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(cuerpo, "$.idReporte")).longValue();
  }

  private PublicacionComunidad recargar() {
    entityManager.flush();
    entityManager.clear();
    return publicacionRepository.findById(publicacion.getIdPublicacion()).orElseThrow();
  }

  private void confirmarRestricciones() {
    entityManager.flush();
    entityManager.createNativeQuery("SET CONSTRAINTS ALL IMMEDIATE").executeUpdate();
    entityManager.createNativeQuery("SET CONSTRAINTS ALL DEFERRED").executeUpdate();
  }
}
