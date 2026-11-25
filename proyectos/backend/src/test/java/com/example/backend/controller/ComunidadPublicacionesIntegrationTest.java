package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoModeracion;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.Resena;
import com.example.backend.entity.ResenaModeracionAuditoria;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/** Comunidad, fase 1: publicaciones (CA-06, CA-07, CA-08, CA-09). */
@DisplayName("Comunidad: publicaciones")
class ComunidadPublicacionesIntegrationTest extends ComunidadIntegrationTestBase {

  private static final String RUTA = "/api/comunidad/publicaciones";

  @Autowired private PublicacionComunidadRepository publicacionRepository;

  // ---------- Crear ----------

  @Test
  void crearGeneralPublica201() throws Exception {
    crear(autor, "GENERAL", null, "Qué celular me recomiendan", "Busco algo con buena batería")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.idPublicacion").isNumber())
      .andExpect(jsonPath("$.tipo").value("GENERAL"))
      .andExpect(jsonPath("$.estadoModeracion").value("PUBLICADA"))
      .andExpect(jsonPath("$.esAutor").value(true))
      .andExpect(jsonPath("$.autor").value("Autor comunidad"));
  }

  @Test
  void crearSinSesion401() throws Exception {
    mockMvc.perform(post(RUTA).contentType(MediaType.APPLICATION_JSON)
        .content(cuerpo("GENERAL", null, "Título válido", "Contenido")))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void crearCuentaSuspendida403() throws Exception {
    autor.setEstado(false);
    usuarioRepository.save(autor);

    crear(autor, "GENERAL", null, "Título válido", "Contenido").andExpect(status().isForbidden());
  }

  @Test
  void crearConBloqueoReincidencia403() throws Exception {
    faltas(autor, 3);

    crear(autor, "GENERAL", null, "Título válido", "Contenido")
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.message", containsString("reincidencia")));
  }

  @Test
  void conRevisionPreviaQuedaPendiente() throws Exception {
    faltas(autor, 2);

    crear(autor, "GENERAL", null, "Título válido", "Contenido normal")
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
  }

  @Test
  void crearGeneralConProducto400() throws Exception {
    crear(autor, "GENERAL", producto.getIdProducto(), "Título válido", "Contenido")
      .andExpect(status().isBadRequest());
  }

  @Test
  void crearProductoSinProducto400() throws Exception {
    crear(autor, "PRODUCTO", null, "Título válido", "Contenido").andExpect(status().isBadRequest());
  }

  @Test
  void crearProductoInactivo409() throws Exception {
    Producto inactivo = producto(false);

    crear(autor, "PRODUCTO", inactivo.getIdProducto(), "Título válido", "Contenido")
      .andExpect(status().isConflict());
  }

  @Test
  void crearProductoInexistente404() throws Exception {
    crear(autor, "PRODUCTO", 999_999L, "Título válido", "Contenido").andExpect(status().isNotFound());
  }

  @Test
  void tituloDe4Caracteres400() throws Exception {
    crear(autor, "GENERAL", null, "abcd", "Contenido").andExpect(status().isBadRequest());
  }

  @Test
  void tituloDe5CaracteresConEspaciosAlrededor400() throws Exception {
    crear(autor, "GENERAL", null, "  abcd  ", "Contenido").andExpect(status().isBadRequest());
  }

  @Test
  void contenidoDe5001Caracteres400() throws Exception {
    crear(autor, "GENERAL", null, "Título válido", "a".repeat(5001)).andExpect(status().isBadRequest());
  }

  @Test
  void tipoDesconocido400() throws Exception {
    crear(autor, "OTRO", null, "Título válido", "Contenido").andExpect(status().isBadRequest());
  }

  // ---------- Visibilidad (CA-08) ----------

  @Test
  void textoConInsultoQuedaPendienteYSoloLoVenAutorYModerador() throws Exception {
    long id = idCreada(autor, "Mala atención", "el vendedor es un idiota");

    mockMvc.perform(get(RUTA + "/" + id).with(como(autor)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
    mockMvc.perform(get(RUTA + "/" + id).with(como(moderador)))
      .andExpect(status().isOk());
    mockMvc.perform(get(RUTA + "/" + id).with(como(otro))).andExpect(status().isNotFound());
    mockMvc.perform(get(RUTA + "/" + id)).andExpect(status().isNotFound());
    mockMvc.perform(get(RUTA))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items[?(@.idPublicacion == " + id + ")]").isEmpty());
  }

  @Test
  void terceroNoVeElEstadoDeModeracion() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    mockMvc.perform(get(RUTA + "/" + id).with(como(otro)))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value(nullValue()))
      .andExpect(jsonPath("$.esAutor").value(false));
  }

  @Test
  void eliminadaNoApareceEnListasYSuDetalleEs404ParaTerceros() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    mockMvc.perform(delete(RUTA + "/" + id).with(como(autor))).andExpect(status().isNoContent());

    mockMvc.perform(get(RUTA + "/" + id)).andExpect(status().isNotFound());
    mockMvc.perform(get(RUTA)).andExpect(jsonPath("$.items[?(@.idPublicacion == " + id + ")]").isEmpty());
    mockMvc.perform(delete(RUTA + "/" + id).with(como(autor))).andExpect(status().isNotFound());
  }

  // ---------- Editar y eliminar (CA-06) ----------

  @Test
  void editarPropia200() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    editar(autor, id, "Título editado", "Contenido editado")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.titulo").value("Título editado"))
      .andExpect(jsonPath("$.fechaEdicion").isNotEmpty());
  }

  @Test
  void editarAjeno403() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    editar(otro, id, "Título editado", "Contenido").andExpect(status().isForbidden());
  }

  @Test
  void editarSinSesion401() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    mockMvc.perform(put(RUTA + "/" + id).contentType(MediaType.APPLICATION_JSON)
        .content("{\"titulo\":\"Título editado\",\"contenido\":\"x\"}"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void editarVuelveAPasarPorElFiltro() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    editar(autor, id, "Título válido", "el vendedor es un idiota")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
  }

  @Test
  void editarRechazadaVuelveAPendiente() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");
    PublicacionComunidad p = publicacionRepository.findById(id).orElseThrow();
    p.setEstadoModeracion(EstadoModeracion.RECHAZADA);
    publicacionRepository.saveAndFlush(p);

    editar(autor, id, "Título válido", "Ahora sin problemas")
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.estadoModeracion").value("PENDIENTE"));
  }

  @Test
  void editarOcultaPorModeracion409() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");
    PublicacionComunidad p = publicacionRepository.findById(id).orElseThrow();
    p.setOcultaPorModeracion(true);
    publicacionRepository.saveAndFlush(p);

    editar(autor, id, "Título válido", "Otro texto").andExpect(status().isConflict());
  }

  @Test
  void editarConBloqueoReincidencia403() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");
    faltas(autor, 3);

    editar(autor, id, "Título válido", "Otro texto").andExpect(status().isForbidden());
  }

  @Test
  void eliminarAjeno403() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    mockMvc.perform(delete(RUTA + "/" + id).with(como(otro))).andExpect(status().isForbidden());
  }

  @Test
  void moderadorNoEliminaAjenoEnLaFase1() throws Exception {
    long id = idCreada(autor, "Título válido", "Contenido normal");

    mockMvc.perform(delete(RUTA + "/" + id).with(como(moderador))).andExpect(status().isForbidden());
  }

  // ---------- Cuotas (CA-07) ----------

  @Test
  void sextaPublicacionEnUnaHora429() throws Exception {
    for (int i = 0; i < 5; i++) {
      crear(autor, "GENERAL", null, "Publicación " + i, "Contenido " + i).andExpect(status().isCreated());
    }
    crear(autor, "GENERAL", null, "Publicación 6", "Contenido").andExpect(status().isTooManyRequests());
  }

  @Test
  void laEliminadaCuentaParaLaCuota() throws Exception {
    for (int i = 0; i < 5; i++) {
      long id = idCreada(autor, "Publicación " + i, "Contenido " + i);
      mockMvc.perform(delete(RUTA + "/" + id).with(como(autor))).andExpect(status().isNoContent());
    }
    crear(autor, "GENERAL", null, "Publicación 6", "Contenido").andExpect(status().isTooManyRequests());
  }

  @Test
  void lasDeHaceMasDeUnaHoraNoCuentan() throws Exception {
    for (int i = 0; i < 5; i++) {
      long id = idCreada(autor, "Publicación " + i, "Contenido " + i);
      PublicacionComunidad p = publicacionRepository.findById(id).orElseThrow();
      p.setFechaCreacion(LocalDateTime.now().minusMinutes(61));
      publicacionRepository.saveAndFlush(p);
    }
    crear(autor, "GENERAL", null, "Publicación 6", "Contenido").andExpect(status().isCreated());
  }

  // ---------- Listas y paginación (CA-09) ----------

  @Test
  void listaGeneralNoIncluyeLasDeProducto() throws Exception {
    long general = idCreada(autor, "Pregunta general", "Contenido");
    crear(autor, "PRODUCTO", producto.getIdProducto(), "Sobre el producto", "Contenido")
      .andExpect(status().isCreated());

    mockMvc.perform(get(RUTA))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].idPublicacion").value(general))
      .andExpect(jsonPath("$.total").value(1));
    mockMvc.perform(get("/api/productos/" + producto.getIdProducto() + "/comunidad/publicaciones"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(1)))
      .andExpect(jsonPath("$.items[0].nombreProducto").value(producto.getNombre()))
      .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  void paginaConCursorNoRepiteNiSaltaConPublicacionesNuevas() throws Exception {
    List<Long> creadas = new ArrayList<>();
    LocalDateTime base = LocalDateTime.now().minusMinutes(30);
    for (int i = 0; i < 5; i++) {
      creadas.add(publicacionDirecta("Publicación " + i, base.plusMinutes(i)));
    }

    String primera = mockMvc.perform(get(RUTA).param("limite", "2"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.items", hasSize(2)))
      .andExpect(jsonPath("$.nextCursor").isNotEmpty())
      .andReturn().getResponse().getContentAsString();
    Set<Long> vistas = new HashSet<>(ids(primera));

    publicacionDirecta("Nueva entre páginas", LocalDateTime.now());

    String cursor = JsonPath.read(primera, "$.nextCursor");
    while (cursor != null) {
      String pagina = mockMvc.perform(get(RUTA).param("limite", "2").param("cursor", cursor))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
      for (Long id : ids(pagina)) {
        if (!vistas.add(id)) {
          throw new AssertionError("Publicación repetida entre páginas: " + id);
        }
      }
      cursor = JsonPath.read(pagina, "$.nextCursor");
    }
    if (!vistas.containsAll(creadas) || vistas.size() != 5) {
      throw new AssertionError("Se saltaron publicaciones: " + vistas + " frente a " + creadas);
    }
  }

  @Test
  void ordenRecientesUsaLaFechaDeCreacion() throws Exception {
    LocalDateTime base = LocalDateTime.now().minusHours(2);
    long vieja = publicacionDirecta("Vieja con actividad", base);
    long nueva = publicacionDirecta("Nueva sin actividad", base.plusMinutes(10));
    PublicacionComunidad p = publicacionRepository.findById(vieja).orElseThrow();
    p.setFechaUltimaActividad(LocalDateTime.now());
    publicacionRepository.saveAndFlush(p);

    mockMvc.perform(get(RUTA).param("orden", "actividad"))
      .andExpect(jsonPath("$.items[0].idPublicacion").value(vieja));
    mockMvc.perform(get(RUTA).param("orden", "recientes"))
      .andExpect(jsonPath("$.items[0].idPublicacion").value(nueva));
  }

  @Test
  void limite0y51Dan400() throws Exception {
    mockMvc.perform(get(RUTA).param("limite", "0")).andExpect(status().isBadRequest());
    mockMvc.perform(get(RUTA).param("limite", "51")).andExpect(status().isBadRequest());
  }

  @Test
  void ordenDesconocido400() throws Exception {
    mockMvc.perform(get(RUTA).param("orden", "popular")).andExpect(status().isBadRequest());
  }

  @Test
  void cursorDeOtroOrden400() throws Exception {
    publicacionDirecta("Uno", LocalDateTime.now().minusMinutes(2));
    publicacionDirecta("Dos", LocalDateTime.now().minusMinutes(1));
    String pagina = mockMvc.perform(get(RUTA).param("limite", "1").param("orden", "recientes"))
      .andReturn().getResponse().getContentAsString();
    String cursor = JsonPath.read(pagina, "$.nextCursor");

    mockMvc.perform(get(RUTA).param("orden", "actividad").param("cursor", cursor))
      .andExpect(status().isBadRequest());
  }

  @Test
  void listaPublicaNoMuestraExtractoMasLargoQue200() throws Exception {
    idCreada(autor, "Título válido", "a".repeat(400));

    mockMvc.perform(get(RUTA))
      .andExpect(jsonPath("$.items[0].extracto", not(containsString("a".repeat(201)))));
  }

  // ---------- Ayudas ----------

  private ResultActions crear(Usuario u, String tipo, Long idProducto, String titulo, String contenido) throws Exception {
    return mockMvc.perform(post(RUTA).with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content(cuerpo(tipo, idProducto, titulo, contenido)));
  }

  private long idCreada(Usuario u, String titulo, String contenido) throws Exception {
    String json = crear(u, "GENERAL", null, titulo, contenido)
      .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    return ((Number) JsonPath.read(json, "$.idPublicacion")).longValue();
  }

  private ResultActions editar(Usuario u, long id, String titulo, String contenido) throws Exception {
    return mockMvc.perform(put(RUTA + "/" + id).with(como(u)).contentType(MediaType.APPLICATION_JSON)
      .content("{\"titulo\":" + json(titulo) + ",\"contenido\":" + json(contenido) + "}"));
  }

  private long publicacionDirecta(String titulo, LocalDateTime fecha) {
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(com.example.backend.entity.TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo(titulo);
    p.setContenido("Contenido");
    p.setFechaCreacion(fecha);
    p.setFechaUltimaActividad(fecha);
    return publicacionRepository.saveAndFlush(p).getIdPublicacion();
  }

  private static List<Long> ids(String json) {
    List<Number> numeros = JsonPath.read(json, "$.items[*].idPublicacion");
    return numeros.stream().map(Number::longValue).toList();
  }

  private static String cuerpo(String tipo, Long idProducto, String titulo, String contenido) {
    return "{\"tipo\":" + json(tipo) + ",\"idProducto\":" + idProducto
      + ",\"titulo\":" + json(titulo) + ",\"contenido\":" + json(contenido) + "}";
  }
}
