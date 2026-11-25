package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.backend.dto.comunidad.CrearPublicacionRequest;
import com.example.backend.dto.comunidad.MeGustaResponse;
import com.example.backend.repository.ReaccionPublicacionRepository;
import com.example.backend.entity.PublicacionComunidad;
import com.example.backend.entity.Rol;
import com.example.backend.entity.TipoPublicacion;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.TooManyRequestsException;
import com.example.backend.repository.PublicacionComunidadRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Comunidad con PostgreSQL real (Testcontainers): lo que H2 no reproduce,
 * como los bloqueos de fila de las cuotas y los conflictos de PK simultáneos.
 * Los triggers de la 029 se prueban con su script SQL
 * (docs/sql/tests/029_verificacion_comunidad.sql), porque aquí el esquema lo
 * genera Hibernate.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@DisplayName("Comunidad en PostgreSQL")
class ComunidadPostgresIntegrationTest {

  @Container
  static GenericContainer<?> postgres = new GenericContainer<>("postgres:17")
    .withExposedPorts(5432)
    .withEnv("POSTGRES_DB", "testdb_comunidad")
    .withEnv("POSTGRES_USER", "test")
    .withEnv("POSTGRES_PASSWORD", "test")
    .waitingFor(Wait.forLogMessage(".*database system is ready to accept connections.*", 2));

  @DynamicPropertySource
  static void propiedades(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url",
      () -> "jdbc:postgresql://localhost:" + postgres.getMappedPort(5432) + "/testdb_comunidad");
    registry.add("spring.datasource.username", () -> "test");
    registry.add("spring.datasource.password", () -> "test");
    registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
  }

  @Autowired PublicacionComunidadService publicacionService;
  @Autowired PublicacionComunidadRepository publicacionRepository;
  @Autowired UsuarioRepository usuarioRepository;
  @Autowired RolRepository rolRepository;
  @Autowired ReaccionComunidadService reaccionService;
  @Autowired ReaccionPublicacionRepository reaccionPublicacionRepository;

  private final List<Long> publicacionesCreadas = new ArrayList<>();

  @AfterEach
  void limpiar() {
    reaccionPublicacionRepository.deleteAll();
    publicacionRepository.deleteAllById(publicacionesCreadas);
  }

  @Test
  @DisplayName("Con 4 publicaciones en la hora, de dos simultáneas solo pasa una")
  void cuotaConcurrenteSoloAdmiteUna() throws Exception {
    Usuario autor = usuario();
    for (int i = 0; i < 4; i++) {
      PublicacionComunidad p = new PublicacionComunidad();
      p.setTipo(TipoPublicacion.GENERAL);
      p.setAutor(autor);
      p.setTitulo("Previa " + i);
      p.setContenido("Contenido");
      publicacionesCreadas.add(publicacionRepository.save(p).getIdPublicacion());
    }

    List<Object> resultados = simultaneos(2, () -> publicacionService.crear(jwt(autor),
      new CrearPublicacionRequest("GENERAL", null, "Simultánea", "Contenido")));

    long creadas = resultados.stream().filter(r -> !(r instanceof Throwable)).count();
    long rechazadas = resultados.stream().filter(TooManyRequestsException.class::isInstance).count();
    assertEquals(1, creadas, "resultados: " + resultados);
    assertEquals(1, rechazadas, "resultados: " + resultados);
    publicacionRepository.findAll().stream()
      .filter(p -> p.getAutor().getIdUsuario().equals(autor.getIdUsuario()))
      .forEach(p -> publicacionesCreadas.add(p.getIdPublicacion()));
    assertEquals(5, publicacionRepository.contarDelAutorDesde(autor.getIdUsuario(), LocalDateTime.now().minusHours(1)));
  }

  @Test
  @DisplayName("Dos Me gusta simultáneos del mismo usuario dejan uno (CA-05)")
  void dosMeGustaSimultaneosDejanUno() throws Exception {
    Usuario autor = usuario();
    Usuario lector = usuario();
    PublicacionComunidad p = new PublicacionComunidad();
    p.setTipo(TipoPublicacion.GENERAL);
    p.setAutor(autor);
    p.setTitulo("Publicación con Me gusta");
    p.setContenido("Contenido");
    Long id = publicacionRepository.save(p).getIdPublicacion();
    publicacionesCreadas.add(id);

    List<Object> resultados = simultaneos(4, () -> reaccionService.darMeGustaPublicacion(jwt(lector), id));

    resultados.forEach(r -> {
      if (r instanceof Throwable t) {
        throw new AssertionError("Un Me gusta simultáneo falló", t);
      }
    });
    assertEquals(1, reaccionPublicacionRepository.countByIdPublicacion(id));
    resultados.forEach(r -> assertEquals(1, ((MeGustaResponse) r).meGusta()));
  }

  /** Ejecuta la tarea en {@code hilos} hilos a la vez; devuelve cada resultado o la excepción. */
  static List<Object> simultaneos(int hilos, Callable<?> tarea) throws Exception {
    ExecutorService ejecutor = Executors.newFixedThreadPool(hilos);
    CountDownLatch salida = new CountDownLatch(1);
    try {
      List<Future<Object>> futuros = new ArrayList<>();
      for (int i = 0; i < hilos; i++) {
        futuros.add(ejecutor.submit(() -> {
          salida.await();
          try {
            return tarea.call();
          } catch (Throwable t) {
            return t;
          }
        }));
      }
      salida.countDown();
      List<Object> resultados = new ArrayList<>();
      for (Future<Object> futuro : futuros) {
        resultados.add(futuro.get(30, TimeUnit.SECONDS));
      }
      return resultados;
    } finally {
      ejecutor.shutdownNow();
    }
  }

  Usuario usuario() {
    Rol rol = rolRepository.findByNombre("Usuario registrado").orElseGet(() -> {
      Rol r = new Rol();
      r.setNombre("Usuario registrado");
      r.setDescripcion("Usuario registrado");
      return rolRepository.save(r);
    });
    Usuario u = new Usuario();
    u.setNombre("Comunidad PG");
    u.setCorreo("pg_" + UUID.randomUUID() + "@tecreview.test");
    u.setSupabaseUid(UUID.randomUUID().toString());
    u.setRol(rol);
    u.setEstado(true);
    u.setFechaRegistro(LocalDateTime.now());
    return usuarioRepository.save(u);
  }

  static Jwt jwt(Usuario usuario) {
    return Jwt.withTokenValue("prueba").header("alg", "none")
      .subject(usuario.getSupabaseUid()).claim("email", usuario.getCorreo()).build();
  }
}
