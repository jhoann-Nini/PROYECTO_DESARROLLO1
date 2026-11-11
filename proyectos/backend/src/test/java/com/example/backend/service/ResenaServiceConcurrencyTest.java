package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class ResenaServiceConcurrencyTest {

    @Container
    static GenericContainer<?> postgres = new GenericContainer<>("postgres:latest")
            .withExposedPorts(5432)
            .withEnv("POSTGRES_DB", "testdb")
            .withEnv("POSTGRES_USER", "test")
            .withEnv("POSTGRES_PASSWORD", "test")
            .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", ResenaServiceConcurrencyTest::getJdbcUrl);
        registry.add("spring.datasource.username", () -> "test");
        registry.add("spring.datasource.password", () -> "test");
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.properties.hibernate.enable_lazy_load_no_trans", () -> "true");
    }

    private static String getJdbcUrl() {
        String host = "localhost";
        var bindings = postgres.getContainerInfo().getNetworkSettings().getPorts().getBindings();
        int port = 5432;
        for (var entry : bindings.entrySet()) {
            if (entry.getKey().getPort() == 5432) {
                port = Integer.parseInt(entry.getValue()[0].getHostPortSpec());
                break;
            }
        }
        return String.format("jdbc:postgresql://%s:%d/testdb", host, port);
    }

    @Autowired
    private ResenaService resenaService;

    @MockitoSpyBean
    private ResenaRepository resenaRepository;

    @MockitoSpyBean
    private ResenaCreateTransaction resenaCreateTransaction;

    @MockitoSpyBean
    private ResenaUpdateHelper resenaUpdateHelper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Jwt mockJwt;
    private Usuario testUser;
    private Producto testProducto;

    @BeforeEach
    void setUp() {
        // Asegurar que el índice parcial existe en la base de datos PostgreSQL real
        jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_resena_usuario_producto_activa ON resena (id_usuario, id_producto) WHERE estado = true;");

        // Limpiar datos previos en orden de dependencias
        resenaRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        marcaRepository.deleteAll();
        usuarioRepository.deleteAll();
        rolRepository.deleteAll();

        // Crear Rol obligatorio
        Rol rol = new Rol();
        rol.setNombre("Usuario registrado");
        rol = rolRepository.saveAndFlush(rol);

        // Crear Categoria y Marca obligatorias
        Categoria categoria = new Categoria();
        categoria.setNombre("Tecnología");
        categoria = categoriaRepository.saveAndFlush(categoria);

        Marca marca = new Marca();
        marca.setNombre("MarcaTest");
        marca = marcaRepository.saveAndFlush(marca);

        // Crear usuario determinista
        testUser = new Usuario();
        testUser.setNombre("Juan Pérez");
        testUser.setCorreo("juan@example.com");
        testUser.setSupabaseUid("test-sub-concurrency");
        testUser.setRol(rol);
        testUser = usuarioRepository.saveAndFlush(testUser);

        // Crear producto determinista
        testProducto = new Producto();
        testProducto.setNombre("Café Especial");
        testProducto.setCategoria(categoria);
        testProducto.setMarca(marca);
        testProducto = productoRepository.saveAndFlush(testProducto);

        // Token JWT con subject coincidente
        this.mockJwt = Jwt.withTokenValue("mock-token-concurrency")
                .header("alg", "none")
                .claim("sub", testUser.getSupabaseUid())
                .build();
    }

    @Test
    @DisplayName("Colisión determinista de índice parcial uk_resena_usuario_producto_activa con recuperación en ResenaUpdateHelper")
    void concurrentCreateOrUpdateFuerzaColisionYRecuperaEnHelper() throws Exception {
        ResenaRequest requestA = new ResenaRequest(testProducto.getIdProducto(), "Comentario desde Hilo A", 5);
        ResenaRequest requestB = new ResenaRequest(testProducto.getIdProducto(), "Comentario desde Hilo B", 4);

        // Sincronización determinista:
        // 1. Ambos hilos ejecutan la consulta real al repositorio.
        // 2. Ambos comprueban que no existe reseña activa previa (Optional.empty()).
        // 3. Ambos esperan en la barrera antes de saveAndFlush.
        CountDownLatch queriesExecutedLatch = new CountDownLatch(2);
        CountDownLatch barrierLatch = new CountDownLatch(1);
        AtomicInteger queryCount = new AtomicInteger(0);

        org.mockito.stubbing.Answer<?> defaultRepoAnswer = Mockito.mockingDetails(resenaRepository)
                .getMockCreationSettings().getDefaultAnswer();

        Mockito.doAnswer(invocation -> {
            int current = queryCount.incrementAndGet();
            if (current <= 2) {
                // 1. Ejecutar consulta real en el repositorio subyacente para la comprobación inicial
                Object result = defaultRepoAnswer.answer(invocation);
                // 2. Comprobar que en la consulta inicial no existe reseña activa previa
                if (result instanceof Optional<?> opt) {
                    Assertions.assertTrue(opt.isEmpty(), "Ambos hilos deben consultar y obtener que no existe reseña activa inicialmente");
                }
                // Notificar que la consulta inicial se ha completado
                queriesExecutedLatch.countDown();

                // 3. Esperar en la barrera
                boolean released = barrierLatch.await(5, TimeUnit.SECONDS);
                if (!released) {
                    throw new IllegalStateException("Timeout esperando liberación de la barrera concurrente");
                }
                return result;
            } else {
                // Consultas posteriores (como la de ResenaUpdateHelper para recuperar la reseña ganadora)
                return defaultRepoAnswer.answer(invocation);
            }
        }).when(resenaRepository).findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(Mockito.anyLong(), Mockito.anyLong());

        // Instrumentar ResenaCreateTransaction para capturar la colisión real de PostgreSQL
        AtomicReference<Throwable> capturedCollision = new AtomicReference<>();
        Mockito.doAnswer(invocation -> {
            try {
                return invocation.callRealMethod();
            } catch (Throwable t) {
                capturedCollision.set(t);
                throw t; // Relanzar para que ResenaService ejecute su bloque catch
            }
        }).when(resenaCreateTransaction).crearOActualizar(Mockito.any(), Mockito.any());

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<ResenaResponse> f1 = executor.submit(() -> resenaService.crearOActualizar(requestA, mockJwt));
            Future<ResenaResponse> f2 = executor.submit(() -> resenaService.crearOActualizar(requestB, mockJwt));

            // Esperar que ambos hilos hayan ejecutado la consulta real
            boolean bothQueried = queriesExecutedLatch.await(5, TimeUnit.SECONDS);
            Assertions.assertTrue(bothQueried, "Ambos hilos debieron completar la consulta al repositorio antes de insertar");
            Assertions.assertEquals(2, queryCount.get(), "Ambos hilos deben haber consultado exactamente una vez");

            // Liberar la barrera para que ambos continúen simultáneamente hacia saveAndFlush
            barrierLatch.countDown();

            // Obtener resultados de ambos hilos
            ResenaResponse r1 = f1.get(10, TimeUnit.SECONDS);
            ResenaResponse r2 = f2.get(10, TimeUnit.SECONDS);

            // Aserciones de evidencia explícita de colisión:
            // 1. PostgreSQL produjo una violación de unicidad capturada desde ResenaCreateTransaction
            Assertions.assertNotNull(capturedCollision.get(), "Debe haberse producido una colisión de unicidad");
            Assertions.assertInstanceOf(DataIntegrityViolationException.class, capturedCollision.get());

            // 2. La violación corresponde exactamente al índice parcial uk_resena_usuario_producto_activa
            Throwable rootCause = capturedCollision.get().getCause();
            Assertions.assertInstanceOf(ConstraintViolationException.class, rootCause, "La causa debe ser ConstraintViolationException");
            ConstraintViolationException cve = (ConstraintViolationException) rootCause;
            Assertions.assertEquals("uk_resena_usuario_producto_activa", cve.getConstraintName(),
                    "La restricción violada debe ser exactamente uk_resena_usuario_producto_activa");

            // 3. ResenaService reconoció la violación y ejecutó ResenaUpdateHelper.actualizarResenaExistente exactamente una vez
            Mockito.verify(resenaUpdateHelper, Mockito.times(1))
                    .actualizarResenaExistente(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyString());

            // 4. Ambas solicitudes devolvieron una respuesta válida con el mismo ID de reseña
            Assertions.assertNotNull(r1);
            Assertions.assertNotNull(r2);
            Assertions.assertEquals(r1.idResena(), r2.idResena(), "Ambas solicitudes deben compartir el mismo ID de reseña");

            // 5. En base de datos existe exactamente una reseña activa para la combinación específica idUsuario + idProducto
            Long countActivasUsuarioProducto = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM resena WHERE id_usuario = ? AND id_producto = ? AND estado = true",
                    Long.class, testUser.getIdUsuario(), testProducto.getIdProducto());
            Assertions.assertEquals(1L, countActivasUsuarioProducto,
                    "Debe existir exactamente una reseña activa para la combinación idUsuario + idProducto");

            // 6. El comentario y puntuación finales corresponden a una de las dos solicitudes concurrentes
            Resena reseñaFinal = resenaRepository.findByUsuarioIdUsuarioAndProductoIdProductoAndEstadoTrue(
                    testUser.getIdUsuario(), testProducto.getIdProducto()).orElseThrow();
            boolean coincideA = "Comentario desde Hilo A".equals(reseñaFinal.getComentario()) && Integer.valueOf(5).equals(reseñaFinal.getPuntuacion());
            boolean coincideB = "Comentario desde Hilo B".equals(reseñaFinal.getComentario()) && Integer.valueOf(4).equals(reseñaFinal.getPuntuacion());
            Assertions.assertTrue(coincideA || coincideB,
                    "El comentario y puntuación finales deben coincidir con una de las dos solicitudes enviadas");

        } finally {
            barrierLatch.countDown();
            executor.shutdownNow();
        }
    }
}
