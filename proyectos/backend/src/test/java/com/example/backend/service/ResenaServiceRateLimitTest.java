package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.dto.ResenaResponse;
import com.example.backend.dto.ResenaUpdateRequest;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.TooManyRequestsException;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class ResenaServiceRateLimitTest {

    @Container
    static GenericContainer<?> postgres = new GenericContainer<>("postgres:latest")
            .withExposedPorts(5432)
            .withEnv("POSTGRES_DB", "testdb")
            .withEnv("POSTGRES_USER", "test")
            .withEnv("POSTGRES_PASSWORD", "test")
            .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", ResenaServiceRateLimitTest::getJdbcUrl);
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

    @Autowired
    private ResenaRepository resenaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Rol testRol;
    private Categoria testCategoria;
    private Marca testMarca;
    private Usuario testUser1;
    private Usuario testUser2;
    private Jwt testJwtUser1;
    private Jwt testJwtUser2;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_resena_usuario_producto_activa ON resena (id_usuario, id_producto) WHERE estado = true;");

        resenaRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        marcaRepository.deleteAll();
        usuarioRepository.deleteAll();
        rolRepository.deleteAll();

        testRol = new Rol();
        testRol.setNombre("Usuario registrado");
        testRol = rolRepository.saveAndFlush(testRol);

        testCategoria = new Categoria();
        testCategoria.setNombre("Dispositivos");
        testCategoria = categoriaRepository.saveAndFlush(testCategoria);

        testMarca = new Marca();
        testMarca.setNombre("MarcaTest");
        testMarca = marcaRepository.saveAndFlush(testMarca);

        testUser1 = new Usuario();
        testUser1.setNombre("Usuario Uno");
        testUser1.setCorreo("user1@example.com");
        testUser1.setSupabaseUid("uid-user-1");
        testUser1.setRol(testRol);
        testUser1 = usuarioRepository.saveAndFlush(testUser1);

        testUser2 = new Usuario();
        testUser2.setNombre("Usuario Dos");
        testUser2.setCorreo("user2@example.com");
        testUser2.setSupabaseUid("uid-user-2");
        testUser2.setRol(testRol);
        testUser2 = usuarioRepository.saveAndFlush(testUser2);

        testJwtUser1 = Jwt.withTokenValue("mock-jwt-1")
                .header("alg", "none")
                .claim("sub", "uid-user-1")
                .claim("email", "user1@example.com")
                .build();

        testJwtUser2 = Jwt.withTokenValue("mock-jwt-2")
                .header("alg", "none")
                .claim("sub", "uid-user-2")
                .claim("email", "user2@example.com")
                .build();
    }

    private Producto crearProducto(String nombre) {
        Producto p = new Producto();
        p.setNombre(nombre);
        p.setDescripcion("Descripcion de " + nombre);
        p.setPrecioReferencia(java.math.BigDecimal.valueOf(100000.0));
        p.setCategoria(testCategoria);
        p.setMarca(testMarca);
        p.setEstado(true);
        return productoRepository.saveAndFlush(p);
    }

    @Test
    @DisplayName("Reglas 1, 2 y 5: Permite exactamente 5 nuevas reseñas en la ventana y la sexta devuelve HTTP 429 con mensaje oficial")
    void primeraAQuintaPermitidasYSextaLanza429() {
        List<Producto> productos = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            productos.add(crearProducto("Producto " + i));
        }

        // Reseñas 1 a 5: Permitidas
        for (int i = 0; i < 5; i++) {
            ResenaRequest req = new ResenaRequest(productos.get(i).getIdProducto(), "Comentario " + (i + 1), 5);
            ResenaResponse resp = resenaService.crearOActualizar(req, testJwtUser1);
            Assertions.assertNotNull(resp);
            Assertions.assertEquals(productos.get(i).getIdProducto(), resp.idProducto());
        }

        // Reseña 6 dentro de los 60 minutos: Rechazada con HTTP 429
        ResenaRequest req6 = new ResenaRequest(productos.get(5).getIdProducto(), "Sexto comentario", 4);
        TooManyRequestsException ex = Assertions.assertThrows(
                TooManyRequestsException.class,
                () -> resenaService.crearOActualizar(req6, testJwtUser1)
        );

        Assertions.assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        Assertions.assertEquals("Has alcanzado el límite de 5 reseñas por hora. Intenta de nuevo más tarde.", ex.getReason());

        // Verificar que en base de datos quedaron exactamente 5 reseñas
        long totalEnBd = resenaRepository.count();
        Assertions.assertEquals(5, totalEnBd);
    }

    @Test
    @DisplayName("Regla 4: Una reseña anterior a la ventana de 60 minutos no consume cupo actual")
    void resenaAnteriorA60MinutosNoConsumeCupoActual() {
        Producto productoViejo = crearProducto("Producto Antiguo");
        Resena resenaAntigua = new Resena();
        resenaAntigua.setUsuario(testUser1);
        resenaAntigua.setProducto(productoViejo);
        resenaAntigua.setComentario("Reseña escrita hace 70 minutos");
        resenaAntigua.setPuntuacion(5);
        resenaAntigua.setEstado(true);
        // Simulamos fecha de creación hace 70 minutos (fuera de la ventana de 60 minutos)
        resenaAntigua.setFechaCreacion(LocalDateTime.now().minusMinutes(70));
        resenaRepository.saveAndFlush(resenaAntigua);

        // Ahora el usuario debe poder publicar 5 reseñas nuevas en la ventana actual
        for (int i = 1; i <= 5; i++) {
            Producto p = crearProducto("Producto Nuevo " + i);
            ResenaRequest req = new ResenaRequest(p.getIdProducto(), "Comentario nuevo " + i, 5);
            ResenaResponse resp = resenaService.crearOActualizar(req, testJwtUser1);
            Assertions.assertNotNull(resp);
        }

        // La sexta reseña nueva dentro de la ventana debe ser rechazada con 429
        Producto pExtra = crearProducto("Producto Extra");
        ResenaRequest reqExtra = new ResenaRequest(pExtra.getIdProducto(), "Comentario extra", 5);
        TooManyRequestsException ex = Assertions.assertThrows(
                TooManyRequestsException.class,
                () -> resenaService.crearOActualizar(reqExtra, testJwtUser1)
        );
        Assertions.assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());

        // En BD hay 1 antigua + 5 nuevas = 6 reseñas
        Assertions.assertEquals(6, resenaRepository.count());
    }

    @Test
    @DisplayName("Regla 4 (upsert): Actualizar una reseña existente mediante POST/upsert no consume cupo")
    void actualizarExistenteMediantePostUpsertNoConsumeCupo() {
        List<Producto> productos = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            Producto p = crearProducto("Producto " + i);
            productos.add(p);
            resenaService.crearOActualizar(new ResenaRequest(p.getIdProducto(), "Original " + i, 5), testJwtUser1);
        }

        // Cupo de 5 reseñas nuevas consumido.
        // Actualizar la reseña del producto 1 mediante POST (upsert) DEBE permitirse y no lanzar 429
        ResenaRequest reqActualizar = new ResenaRequest(productos.get(0).getIdProducto(), "Comentario editado por upsert", 4);
        ResenaResponse respuestaUpsert = resenaService.crearOActualizar(reqActualizar, testJwtUser1);

        Assertions.assertNotNull(respuestaUpsert);
        Assertions.assertEquals("Comentario editado por upsert", respuestaUpsert.comentario());
        Assertions.assertEquals(4, respuestaUpsert.puntuacion());

        // Sigue habiendo exactamente 5 reseñas en la base de datos
        Assertions.assertEquals(5, resenaRepository.count());
    }

    @Test
    @DisplayName("Regla 3: Actualizar mediante PUT no consume cupo")
    void actualizarMediantePutNoConsumeCupo() {
        List<Producto> productos = new ArrayList<>();
        List<ResenaResponse> responses = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            Producto p = crearProducto("Producto " + i);
            productos.add(p);
            responses.add(resenaService.crearOActualizar(new ResenaRequest(p.getIdProducto(), "Original " + i, 5), testJwtUser1));
        }

        // El cupo está al máximo (5/5). Actualizar la reseña 1 mediante PUT no debe verse afectado por el rate limit
        Long idResena1 = responses.get(0).idResena();
        ResenaUpdateRequest putRequest = new ResenaUpdateRequest("Comentario modificado via PUT", 3);
        ResenaResponse respPut = resenaService.actualizar(idResena1, putRequest, testJwtUser1);

        Assertions.assertNotNull(respPut);
        Assertions.assertEquals("Comentario modificado via PUT", respPut.comentario());
        Assertions.assertEquals(3, respPut.puntuacion());
        Assertions.assertEquals(5, resenaRepository.count());
    }

    @Test
    @DisplayName("Regla 7: Usuarios diferentes tienen límites independientes")
    void usuariosDiferentesLimitesIndependientes() {
        List<Producto> productos = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            productos.add(crearProducto("Producto " + i));
        }

        // Usuario 1 consume su límite de 5 reseñas
        for (int i = 0; i < 5; i++) {
            resenaService.crearOActualizar(new ResenaRequest(productos.get(i).getIdProducto(), "User 1 comentario " + i, 5), testJwtUser1);
        }

        // Usuario 1 intenta la sexta y es bloqueado
        Assertions.assertThrows(
                TooManyRequestsException.class,
                () -> resenaService.crearOActualizar(new ResenaRequest(productos.get(5).getIdProducto(), "User 1 sexto", 5), testJwtUser1)
        );

        // Usuario 2 puede publicar su primera reseña sin problemas
        ResenaResponse respUser2 = resenaService.crearOActualizar(
                new ResenaRequest(productos.get(0).getIdProducto(), "User 2 comentario", 5),
                testJwtUser2
        );
        Assertions.assertNotNull(respUser2);
        Assertions.assertEquals(testUser2.getIdUsuario(), respUser2.idUsuario());
    }

    @Test
    @DisplayName("Regla 9 (Concurrencia): Solicitudes concurrentes no permiten superar el límite de 5 reseñas")
    void solicitudesConcurrentesNoPermitenSuperarMaximo() throws InterruptedException {
        // Usuario 1 ya tiene 4 reseñas registradas
        for (int i = 1; i <= 4; i++) {
            Producto p = crearProducto("Producto Base " + i);
            resenaService.crearOActualizar(new ResenaRequest(p.getIdProducto(), "Comentario base " + i, 5), testJwtUser1);
        }

        // Preparamos 5 productos adicionales para 5 solicitudes concurrentes
        List<Producto> productosConcurrentes = new ArrayList<>();
        for (int i = 5; i <= 9; i++) {
            productosConcurrentes.add(crearProducto("Producto Concurrente " + i));
        }

        int hilos = 5;
        ExecutorService executor = Executors.newFixedThreadPool(hilos);
        CyclicBarrier barrera = new CyclicBarrier(hilos);
        AtomicInteger exitos = new AtomicInteger(0);
        AtomicInteger bloqueados429 = new AtomicInteger(0);
        AtomicInteger otrosErrores = new AtomicInteger(0);

        for (int i = 0; i < hilos; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    barrera.await(10, TimeUnit.SECONDS);
                    ResenaRequest request = new ResenaRequest(
                            productosConcurrentes.get(index).getIdProducto(),
                            "Comentario concurrente " + index,
                            5
                    );
                    resenaService.crearOActualizar(request, testJwtUser1);
                    exitos.incrementAndGet();
                } catch (TooManyRequestsException ex) {
                    bloqueados429.incrementAndGet();
                } catch (Exception ex) {
                    otrosErrores.incrementAndGet();
                }
            });
        }

        executor.shutdown();
        boolean terminado = executor.awaitTermination(30, TimeUnit.SECONDS);
        Assertions.assertTrue(terminado, "La ejecución concurrente debe finalizar dentro del tiempo esperado");

        // Dado que ya existían 4 reseñas y el límite es 5:
        // Exactamente 1 solicitud debe tener éxito y 4 deben ser bloqueadas con 429
        Assertions.assertEquals(1, exitos.get(), "Exactamente 1 solicitud concurrente debió ingresar al cupo restante");
        Assertions.assertEquals(4, bloqueados429.get(), "Las otras 4 solicitudes debieron ser rechazadas con 429");
        Assertions.assertEquals(0, otrosErrores.get(), "No debieron ocurrir otros errores");

        // Total en base de datos: exactamente 5 reseñas para el usuario
        long totalEnBd = resenaRepository.findByUsuarioIdUsuario(testUser1.getIdUsuario()).size();
        Assertions.assertEquals(5, totalEnBd, "En la base de datos no puede haber más de 5 reseñas");
    }

    @Test
    @DisplayName("Regla 10: Errores ajenos al límite (404 producto inexistente) conservan su tratamiento actual")
    void erroresAjenosConservaTratamientoActual() {
        ResenaRequest requestInvalido = new ResenaRequest(999999L, "Comentario sobre producto inexistente", 5);
        Assertions.assertThrows(
                ResourceNotFoundException.class,
                () -> resenaService.crearOActualizar(requestInvalido, testJwtUser1)
        );
    }
}
