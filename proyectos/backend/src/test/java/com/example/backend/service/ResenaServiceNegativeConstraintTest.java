package com.example.backend.service;

import com.example.backend.dto.ResenaRequest;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
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

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class ResenaServiceNegativeConstraintTest {

    @Container
    static GenericContainer<?> postgres = new GenericContainer<>("postgres:latest")
            .withExposedPorts(5432)
            .withEnv("POSTGRES_DB", "testdb_neg")
            .withEnv("POSTGRES_USER", "test")
            .withEnv("POSTGRES_PASSWORD", "test")
            .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", ResenaServiceNegativeConstraintTest::getJdbcUrl);
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
        return String.format("jdbc:postgresql://%s:%d/testdb_neg", host, port);
    }

    @Autowired
    private ResenaService resenaService;

    @Autowired
    private ResenaRepository resenaRepository;

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

        // Añadir una restricción CHECK en PostgreSQL para probar violaciones distintas al índice único
        jdbcTemplate.execute("ALTER TABLE resena DROP CONSTRAINT IF EXISTS chk_resena_puntuacion;");
        jdbcTemplate.execute("ALTER TABLE resena ADD CONSTRAINT chk_resena_puntuacion CHECK (puntuacion BETWEEN 1 AND 5);");

        resenaRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        marcaRepository.deleteAll();
        usuarioRepository.deleteAll();
        rolRepository.deleteAll();

        Rol rol = new Rol();
        rol.setNombre("Usuario registrado");
        rol = rolRepository.saveAndFlush(rol);

        Categoria categoria = new Categoria();
        categoria.setNombre("Hardware");
        categoria = categoriaRepository.saveAndFlush(categoria);

        Marca marca = new Marca();
        marca.setNombre("MarcaNegativa");
        marca = marcaRepository.saveAndFlush(marca);

        testUser = new Usuario();
        testUser.setNombre("Carlos Gómez");
        testUser.setCorreo("carlos@example.com");
        testUser.setSupabaseUid("test-sub-negative");
        testUser.setRol(rol);
        testUser = usuarioRepository.saveAndFlush(testUser);

        testProducto = new Producto();
        testProducto.setNombre("Monitor 4K");
        testProducto.setCategoria(categoria);
        testProducto.setMarca(marca);
        testProducto = productoRepository.saveAndFlush(testProducto);

        this.mockJwt = Jwt.withTokenValue("mock-token-negative")
                .header("alg", "none")
                .claim("sub", testUser.getSupabaseUid())
                .build();
    }

    @Test
    @DisplayName("Violación de restricción de base de datos distinta (CHECK) propaga DataIntegrityViolationException y NO invoca helper")
    void violacionRestriccionDistintaPropagaYNoInvocaHelper() {
        // puntuacion = 10 viola la restricción CHECK de PostgreSQL (chk_resena_puntuacion)
        ResenaRequest requestConPuntuacionInvalida = new ResenaRequest(testProducto.getIdProducto(), "Comentario válido", 10);

        DataIntegrityViolationException ex = Assertions.assertThrows(DataIntegrityViolationException.class, () -> {
            resenaService.crearOActualizar(requestConPuntuacionInvalida, mockJwt);
        }, "Debe propagarse DataIntegrityViolationException al violar la restricción CHECK de PostgreSQL");

        // Verificar que la excepción no corresponde al índice parcial uk_resena_usuario_producto_activa
        Throwable cause = ex.getCause();
        Assertions.assertInstanceOf(ConstraintViolationException.class, cause);
        ConstraintViolationException cve = (ConstraintViolationException) cause;
        Assertions.assertNotEquals("uk_resena_usuario_producto_activa", cve.getConstraintName(),
                "La restricción violada no debe ser el índice parcial de reseñas");
        Assertions.assertEquals("chk_resena_puntuacion", cve.getConstraintName(),
                "La restricción violada debe ser chk_resena_puntuacion");

        // Verificar que ResenaUpdateHelper NO fue invocado
        Mockito.verifyNoInteractions(resenaUpdateHelper);
    }

    @Test
    @DisplayName("Comentario nulo falla antes de llegar a la base de datos debido a sanitización y validación")
    void comentarioNuloFallaAntesDeBaseDeDatos() {
        // ResenaRequest con comentario nulo:
        // A nivel de servicio directo, request.comentario().trim() lanza NullPointerException en memoria
        // A nivel HTTP, @NotBlank en ResenaRequest detiene la petición en el controlador con 400 Bad Request
        // En ningún caso alcanza saveAndFlush en PostgreSQL
        ResenaRequest requestNulo = new ResenaRequest(testProducto.getIdProducto(), null, 5);

        Assertions.assertThrows(NullPointerException.class, () -> {
            resenaService.crearOActualizar(requestNulo, mockJwt);
        }, "Llamar al servicio con comentario nulo lanza NullPointerException antes de ejecutar saveAndFlush");

        // Verificar que tampoco se invocó el helper de actualización
        Mockito.verifyNoInteractions(resenaUpdateHelper);
    }
}
