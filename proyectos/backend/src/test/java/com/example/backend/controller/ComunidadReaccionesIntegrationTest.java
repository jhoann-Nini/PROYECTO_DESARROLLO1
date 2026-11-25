package com.example.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** Comunidad, fase 1: «Me gusta» idempotente (CA-05, RN-08, RN-15). */
@DisplayName("Comunidad: Me gusta")
class ComunidadReaccionesIntegrationTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;

  private PublicacionComunidad publicacion;
  private String rutaPublicacion;

  @BeforeEach
  void crearPublicacion() {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Publicación de prueba");
    p.setContenido("Contenido");
    publicacion = publicacionRepository.saveAndFlush(p);
    rutaPublicacion = "/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/me-gusta";
  }

  @Test
  void darMeGusta200ConConteo1() throws Exception {
    mockMvc.perform(put(rutaPublicacion).with(como(otro)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.meGusta").value(1))
      .andExpect(jsonPath("$.meGustaPropio").value(true));
    mockMvc.perform(get("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion()).with(como(otro)))
      .andExpect(jsonPath("$.meGusta").value(1))
      .andExpect(jsonPath("$.meGustaPropio").value(true));
  }

  @Test
  void darDosVeces200ConConteo1() throws Exception {
    mockMvc.perform(put(rutaPublicacion).with(como(otro))).andExpect(status().isOk());
    mockMvc.perform(put(rutaPublicacion).with(como(otro)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.meGusta").value(1));
  }

  @Test
  void retirarSinHaberDado200() throws Exception {
    mockMvc.perform(delete(rutaPublicacion).with(como(otro)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.meGusta").value(0))
      .andExpect(jsonPath("$.meGustaPropio").value(false));
  }

  @Test
  void retirarDespuesDeDar() throws Exception {
    mockMvc.perform(put(rutaPublicacion).with(como(otro))).andExpect(status().isOk());
    mockMvc.perform(put(rutaPublicacion).with(como(moderador))).andExpect(status().isOk());

    mockMvc.perform(delete(rutaPublicacion).with(como(otro)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.meGusta").value(1))
      .andExpect(jsonPath("$.meGustaPropio").value(false));
  }

  @Test
  void sinSesion401() throws Exception {
    mockMvc.perform(put(rutaPublicacion)).andExpect(status().isUnauthorized());
  }

  @Test
  void cuentaSuspendidaNoReacciona403() throws Exception {
    otro.setEstado(false);
    usuarioRepository.save(otro);

    mockMvc.perform(put(rutaPublicacion).with(como(otro))).andExpect(status().isForbidden());
  }

  @Test
  void bloqueoPorReincidenciaSiReacciona200() throws Exception {
    faltas(otro, 3);

    mockMvc.perform(put(rutaPublicacion).with(como(otro))).andExpect(status().isOk());
  }

  @Test
  void meGustaEnPublicacionNoVisible404() throws Exception {
    publicacion.setEstadoModeracion(EstadoModeracion.PENDIENTE);
    publicacionRepository.saveAndFlush(publicacion);

    mockMvc.perform(put(rutaPublicacion).with(como(otro))).andExpect(status().isNotFound());
  }

  @Test
  void meGustaEnPublicacionEliminada404() throws Exception {
    publicacion.setEliminada(true);
    publicacion.setFechaEliminacion(LocalDateTime.now());
    publicacion.setEliminadaPor(autor);
    publicacionRepository.saveAndFlush(publicacion);

    mockMvc.perform(put(rutaPublicacion).with(como(otro))).andExpect(status().isNotFound());
  }

  @Test
  void meGustaEnRespuestaYSuConteoEnElArbol() throws Exception {
    long id = respuesta("Buena respuesta");
    String ruta = "/api/comunidad/respuestas/" + id + "/me-gusta";

    mockMvc.perform(put(ruta).with(como(autor))).andExpect(status().isOk()).andExpect(jsonPath("$.meGusta").value(1));
    mockMvc.perform(put(ruta).with(como(autor))).andExpect(jsonPath("$.meGusta").value(1));
    mockMvc.perform(get("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/respuestas").with(como(autor)))
      .andExpect(jsonPath("$.items[0].meGusta").value(1))
      .andExpect(jsonPath("$.items[0].meGustaPropio").value(true));
    mockMvc.perform(delete(ruta).with(como(autor))).andExpect(jsonPath("$.meGusta").value(0));
  }

  @Test
  void meGustaEnRespuestaEliminada404() throws Exception {
    long id = respuesta("La voy a eliminar");
    mockMvc.perform(delete("/api/comunidad/respuestas/" + id).with(como(otro))).andExpect(status().isNoContent());

    mockMvc.perform(put("/api/comunidad/respuestas/" + id + "/me-gusta").with(como(autor)))
      .andExpect(status().isNotFound());
  }

  @Test
  void meGustaEnRespuestaPendienteAjena404() throws Exception {
    long id = respuesta("el vendedor es un idiota");

    mockMvc.perform(put("/api/comunidad/respuestas/" + id + "/me-gusta").with(como(autor)))
      .andExpect(status().isNotFound());
  }

  private long respuesta(String contenido) throws Exception {
    String cuerpo = mockMvc.perform(post("/api/comunidad/publicaciones/" + publicacion.getIdPublicacion() + "/respuestas")
        .with(como(otro)).contentType(MediaType.APPLICATION_JSON).content("{\"contenido\":" + json(contenido) + "}"))
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(cuerpo, "$.idRespuesta")).longValue();
  }
}
