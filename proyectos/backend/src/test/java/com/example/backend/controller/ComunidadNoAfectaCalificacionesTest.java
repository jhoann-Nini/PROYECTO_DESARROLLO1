package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Resena;
import com.example.backend.entity.Valoracion;
import com.example.backend.repository.ValoracionRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** CA-10 y RN-17: la actividad del foro no cambia calificaciones, reseñas ni rankings. */
@DisplayName("Comunidad: no afecta calificaciones ni ranking")
class ComunidadNoAfectaCalificacionesTest extends ComunidadIntegrationTestBase {

  @Autowired private ValoracionRepository valoracionRepository;
  @PersistenceContext private EntityManager entityManager;

  @Test
  void elForoNoCambiaCalificacionReseñasNiRanking() throws Exception {
    Resena r = new Resena();
    r.setProducto(producto);
    r.setUsuario(otro);
    r.setComentario("Muy buen producto");
    r.setPuntuacion(4);
    r.setEstado(true);
    r.setFechaCreacion(LocalDateTime.now().minusDays(1));
    resenaRepository.saveAndFlush(r);
    Valoracion v = new Valoracion();
    v.setProducto(producto);
    v.setUsuario(otro);
    v.setPuntuacion(4);
    valoracionRepository.saveAndFlush(v);

    List<String> rutas = List.of(
      "/api/productos/" + producto.getIdProducto() + "/valoracion-stats",
      "/api/productos/" + producto.getIdProducto() + "/resenas",
      "/api/rankings/mejor-valorados",
      "/api/rankings/mas-comentados");
    // Antes y después se leen desde la base de datos, no desde la caché de JPA.
    entityManager.flush();
    entityManager.clear();
    List<String> antes = rutas.stream().map(this::leer).toList();
    long resenas = resenaRepository.count();
    long valoraciones = valoracionRepository.count();

    String cuerpo = mockMvc.perform(post("/api/comunidad/publicaciones").with(como(autor))
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"tipo\":\"PRODUCTO\",\"idProducto\":" + producto.getIdProducto()
          + ",\"titulo\":\"Excelente producto, 5 estrellas\",\"contenido\":\"Lo recomiendo\"}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    long idPublicacion = ((Number) JsonPath.read(cuerpo, "$.idPublicacion")).longValue();
    mockMvc.perform(post("/api/comunidad/publicaciones/" + idPublicacion + "/respuestas").with(como(otro))
        .contentType(MediaType.APPLICATION_JSON).content("{\"contenido\":\"Coincido, es muy bueno\"}"))
      .andExpect(status().isCreated());
    mockMvc.perform(put("/api/comunidad/publicaciones/" + idPublicacion + "/me-gusta").with(como(otro)))
      .andExpect(status().isOk());
    mockMvc.perform(put("/api/comunidad/publicaciones/" + idPublicacion + "/me-gusta").with(como(moderador)))
      .andExpect(status().isOk());

    entityManager.flush();
    entityManager.clear();
    assertEquals(antes, rutas.stream().map(this::leer).toList());
    assertEquals(resenas, resenaRepository.count());
    assertEquals(valoraciones, valoracionRepository.count());
  }

  private String leer(String ruta) {
    try {
      return mockMvc.perform(get(ruta)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    } catch (Exception e) {
      throw new IllegalStateException(ruta, e);
    }
  }
}
