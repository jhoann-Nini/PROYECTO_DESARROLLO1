package com.example.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Producto;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.RespuestaComunidad;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.RespuestaComunidadRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** Comunidad, fase 1: respuestas en tres niveles (CA-04, CA-06, CA-07, CA-08). */
@DisplayName("Comunidad: respuestas")
class ComunidadRespuestasIntegrationTest extends ComunidadIntegrationTestBase {

  @Autowired private PublicacionComunidadRepository publicacionRepository;
  @Autowired private RespuestaComunidadRepository respuestaRepository;

  private PublicacionComunidad publicacion;

  @BeforeEach
  void crearPublicacion() {
    publicacion = publicacion(TipoPublicacion.GENERAL, null);
  }

  // ---------- Crear ----------

  @Test
  void respuestaDirecta201() throws Exception {
    responder(otro, publicacion, null, "Te recomiendo el modelo X")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.profundidad").value(0))
      .andExpect(jsonPath("$.idRespuestaPadre").value(nullValue()))
      .andExpect(jsonPath("$.estadoVisible").value("VISIBLE"))
      .andExpect(jsonPath("$.autor").value("Otro comunidad"))
      .andExpect(jsonPath("$.enRespuestaA").value(nullValue()));
  }

  @Test
  void respuestasAnidadasHastaNivel2() throws Exception {
    long r0 = idRespuesta(otro, publicacion, null, "nivel 0");
    long r1 = idRespuesta(autor, publicacion, r0, "nivel 1");
    responder(otro, publicacion, r1, "nivel 2")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.profundidad").value(2))
      .andExpect(jsonPath("$.idRespuestaPadre").value(r1));
  }

  @Test
  void responderEnNivel2CreaHermanaConEnRespuestaA() throws Exception {
    long r0 = idRespuesta(otro, publicacion, null, "nivel 0");
    long r1 = idRespuesta(autor, publicacion, r0, "nivel 1");
    long r2 = idRespuesta(otro, publicacion, r1, "nivel 2");

    responder(autor, publicacion, r2, "respondo al nivel 2")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.profundidad").value(2))
      .andExpect(jsonPath("$.idRespuestaPadre").value(r1))
      .andExpect(jsonPath("$.enRespuestaA").value("Otro comunidad"));
  }

  @Test
  void sinSesion401() throws Exception {
    mockMvc.perform(post(ruta(publicacion)).contentType(MediaType.APPLICATION_JSON).content("{\"contenido\":\"hola\"}"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void cuentaSuspendida403() throws Exception {
    otro.setEstado(false);
    usuarioRepository.save(otro);

    responder(otro, publicacion, null, "hola").andExpect(status().isForbidden());
  }

  @Test
  void conBloqueoReincidencia403() throws Exception {
    faltas(otro, 3);

    responder(otro, publicacion, null, "hola").andExpect(status().isForbidden());
  }

  @Test
  void responderEnPublicacionCerrada409() throws Exception {
    publicacion.setCerrada(true);
    publicacionRepository.saveAndFlush(publicacion);

    responder(otro, publicacion, null, "hola").andExpect(status().isConflict());
  }

  @Test
  void responderEnPublicacionDeProductoInactivo409() throws Exception {
    Producto p = producto(true);
    PublicacionComunidad dePoducto = publicacion(TipoPublicacion.PRODUCTO, p);
    p.setEstado(false);
    productoRepository.saveAndFlush(p);

    responder(otro, dePoducto, null, "hola").andExpect(status().isConflict());
  }

  @Test
  void responderEnPublicacionEliminada404() throws Exception {
    publicacion.setEliminada(true);
    publicacion.setFechaEliminacion(LocalDateTime.now());
    publicacion.setEliminadaPor(autor);
    publicacionRepository.saveAndFlush(publicacion);

    responder(otro, publicacion, null, "hola").andExpect(status().isNotFound());
  }

  @Test
  void responderEnPublicacionPendienteAjena404() throws Exception {
    publicacion.setEstadoModeracion(EstadoModeracion.PENDIENTE);
    publicacionRepository.saveAndFlush(publicacion);

    responder(otro, publicacion, null, "hola").andExpect(status().isNotFound());
  }

  @Test
  void madreDeOtraPublicacion400() throws Exception {
    PublicacionComunidad otra = publicacion(TipoPublicacion.GENERAL, null);
    long ajena = idRespuesta(otro, otra, null, "en otra publicación");

    responder(otro, publicacion, ajena, "madre ajena").andExpect(status().isBadRequest());
  }

  @Test
  void madreInexistente400() throws Exception {
    responder(otro, publicacion, 999_999L, "madre inexistente").andExpect(status().isBadRequest());
  }

  @Test
  void contenidoDe3001Caracteres400() throws Exception {
    responder(otro, publicacion, null, "a".repeat(3001)).andExpect(status().isBadRequest());
  }

  @Test
  void contenidoEnBlanco400() throws Exception {
    responder(otro, publicacion, null, " \n\t ").andExpect(status().isBadRequest());
  }

  @Test
  void respuesta21EnUnaHora429() throws Exception {
    for (int i = 0; i < 20; i++) {
      responder(otro, publicacion, null, "respuesta " + i).andExpect(status().isCreated());
    }
    responder(otro, publicacion, null, "respuesta 21").andExpect(status().isTooManyRequests());
  }

  // ---------- Actividad ----------

  @Test
  void respuestaVisibleActualizaFechaUltimaActividad() throws Exception {
    LocalDateTime antes = LocalDateTime.now().minusDays(1);
    publicacion.setFechaUltimaActividad(antes);
    publicacionRepository.saveAndFlush(publicacion);

    responder(otro, publicacion, null, "respuesta normal").andExpect(status().isCreated());

    LocalDateTime despues = publicacionRepository.findById(publicacion.getIdPublicacion()).orElseThrow()
      .getFechaUltimaActividad();
    if (!despues.isAfter(antes)) {
      throw new AssertionError("No se actualizó la fecha de última actividad: " + despues);
    }
  }

  @Test
  void respuestaPendienteNoLaActualiza() throws Exception {
    LocalDateTime antes = LocalDateTime.now().minusDays(1).truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    publicacion.setFechaUltimaActividad(antes);
    publicacionRepository.saveAndFlush(publicacion);

    responder(otro, publicacion, null, "el vendedor es un idiota")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));

    LocalDateTime despues = publicacionRepository.findById(publicacion.getIdPublicacion()).orElseThrow()
      .getFechaUltimaActividad();
    if (!despues.equals(antes)) {
      throw new AssertionError("Una respuesta pendiente movió la actividad: " + despues);
    }
  }

  // ---------- Visibilidad en el árbol (CA-08) ----------

  @Test
  void eliminadaConservaSuLugarYSusHijas() throws Exception {
    long r0 = idRespuesta(otro, publicacion, null, "voy a eliminarla");
    idRespuesta(autor, publicacion, r0, "hija que queda");
    mockMvc.perform(delete("/api/comunidad/respuestas/" + r0).with(como(otro))).andExpect(status().isNoContent());

    mockMvc.perform(get(ruta(publicacion)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].idRespuesta").value(r0))
      .andExpect(jsonPath("$.items[0].estadoVisible").value("ELIMINADA"))
      .andExpect(jsonPath("$.items[0].contenido").value(nullValue()))
      .andExpect(jsonPath("$.items[0].autor").value(nullValue()))
      .andExpect(jsonPath("$.items[0].respuestasHijas").value(1));
    mockMvc.perform(get(ruta(publicacion)).param("padre", String.valueOf(r0)))
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].contenido").value("hija que queda"));
  }

  @Test
  void pendienteAjenaSaleComoEnRevisionYElAutorLaVe() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "el vendedor es un idiota");

    mockMvc.perform(get(ruta(publicacion)).with(como(autor)))
      .andExpect(jsonPath("$.items[0].idRespuesta").value(id))
      .andExpect(jsonPath("$.items[0].estadoVisible").value("EN_REVISION"))
      .andExpect(jsonPath("$.items[0].contenido").value(nullValue()))
      .andExpect(jsonPath("$.items[0].estadoModeracion").value(nullValue()));
    mockMvc.perform(get(ruta(publicacion)).with(como(otro)))
      .andExpect(jsonPath("$.items[0].estadoVisible").value("VISIBLE"))
      .andExpect(jsonPath("$.items[0].contenido").value("el vendedor es un idiota"))
      .andExpect(jsonPath("$.items[0].estadoModeracion").value("PENDIENTE"));
    mockMvc.perform(get(ruta(publicacion)).with(como(moderador)))
      .andExpect(jsonPath("$.items[0].estadoVisible").value("VISIBLE"));
  }

  @Test
  void listarNivelSoloDevuelveUnNivel() throws Exception {
    long r0 = idRespuesta(otro, publicacion, null, "nivel 0");
    idRespuesta(autor, publicacion, r0, "nivel 1");
    idRespuesta(otro, publicacion, null, "otra directa");

    mockMvc.perform(get(ruta(publicacion)))
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andExpect(jsonPath("$.items[0].contenido").value("nivel 0"))
      .andExpect(jsonPath("$.items[0].respuestasHijas").value(1))
      .andExpect(jsonPath("$.items[1].contenido").value("otra directa"));
  }

  @Test
  void paginaDeRespuestasPorCursor() throws Exception {
    for (int i = 0; i < 3; i++) {
      idRespuesta(otro, publicacion, null, "respuesta " + i);
    }
    String primera = mockMvc.perform(get(ruta(publicacion)).param("limite", "2"))
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andReturn().getResponse().getContentAsString();
    String cursor = JsonPath.read(primera, "$.nextCursor");

    mockMvc.perform(get(ruta(publicacion)).param("limite", "2").param("cursor", cursor))
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].contenido").value("respuesta 2"))
      .andExpect(jsonPath("$.nextCursor").value(nullValue()));
  }

  @Test
  void respuestasDePublicacionNoVisible404() throws Exception {
    publicacion.setEstadoModeracion(EstadoModeracion.PENDIENTE);
    publicacionRepository.saveAndFlush(publicacion);

    mockMvc.perform(get(ruta(publicacion))).andExpect(status().isNotFound());
  }

  // ---------- Editar y eliminar (CA-06) ----------

  @Test
  void editarPropia200() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "texto original");

    editar(otro, id, "texto corregido")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.contenido").value("texto corregido"))
      .andExpect(jsonPath("$.fechaEdicion").isNotEmpty());
  }

  @Test
  void editarAjena403() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "texto original");

    editar(autor, id, "no es mía").andExpect(status().isForbidden());
  }

  @Test
  void editarVuelveAPasarPorElFiltro() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "texto original");

    editar(otro, id, "el vendedor es un idiota")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
  }

  @Test
  void editarOcultaPorModeracion409() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "texto original");
    RespuestaComunidad r = respuestaRepository.findById(id).orElseThrow();
    r.setOcultaPorModeracion(true);
    respuestaRepository.saveAndFlush(r);

    editar(otro, id, "otro texto").andExpect(status().isConflict());
  }

  @Test
  void eliminarAjena403() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "texto");

    mockMvc.perform(delete("/api/comunidad/respuestas/" + id).with(como(autor))).andExpect(status().isForbidden());
  }

  @Test
  void eliminarDosVeces404() throws Exception {
    long id = idRespuesta(otro, publicacion, null, "texto");
    mockMvc.perform(delete("/api/comunidad/respuestas/" + id).with(como(otro))).andExpect(status().isNoContent());

    mockMvc.perform(delete("/api/comunidad/respuestas/" + id).with(como(otro))).andExpect(status().isNotFound());
  }

  // ---------- Ayudas ----------

  private PublicacionComunidad publicacion(TipoPublicacion tipo, Producto p) {
    PublicacionComunidad nueva = new PublicacionComunidad();
    nueva.setTipo(tipo);
    nueva.setProducto(p);
    nueva.setAutor(autor);
    nueva.setTitulo("Publicación de prueba");
    nueva.setContenido("Contenido");
    return publicacionRepository.saveAndFlush(nueva);
  }

  private static String ruta(PublicacionComunidad p) {
    return "/api/comunidad/publicaciones/" + p.getIdPublicacion() + "/respuestas";
  }

  private ResultActions responder(Usuario u, PublicacionComunidad p, Long padre, String contenido) throws Exception {
    return mockMvc.perform(post(ruta(p)).with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content("{\"contenido\":" + json(contenido) + ",\"idRespuestaPadre\":" + padre + "}"));
  }

  private long idRespuesta(Usuario u, PublicacionComunidad p, Long padre, String contenido) throws Exception {
    String cuerpo = responder(u, p, padre, contenido).andExpect(status().isCreated())
      .andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(cuerpo, "$.idRespuesta")).longValue();
  }

  private ResultActions editar(Usuario u, long id, String contenido) throws Exception {
    return mockMvc.perform(put("/api/comunidad/respuestas/" + id).with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content("{\"contenido\":" + json(contenido) + "}"));
  }
}
