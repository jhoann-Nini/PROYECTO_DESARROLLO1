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
