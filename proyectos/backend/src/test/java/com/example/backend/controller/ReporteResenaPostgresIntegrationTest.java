package com.example.backend.controller;

import static org.junit.jupiter.api.Assertions.*;

import com.example.backend.dto.ReporteResenaRequest;
import com.example.backend.dto.ReporteResenaResponse;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.EstadoReporte;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ReporteResena;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.service.ReporteResenaService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Prueba de integración con PostgreSQL real mediante Testcontainers.
 * Valida el comportamiento de las restricciones únicas reales (uq_reporte_usuario_resena),
 * triggers de autoreporte y el trigger de recálculo automático de ocultamiento
 * tras alcanzar el umbral de 3 reportes no rechazados.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class ReporteResenaPostgresIntegrationTest {

    @Container
    static GenericContainer<?> postgres = new GenericContainer<>("postgres:latest")
            .withExposedPorts(5432)
            .withEnv("POSTGRES_DB", "testdb_reportes")
            .withEnv("POSTGRES_USER", "test")
            .withEnv("POSTGRES_PASSWORD", "test")
            .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", ReporteResenaPostgresIntegrationTest::getJdbcUrl);
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
        return String.format("jdbc:postgresql://%s:%d/testdb_reportes", host, port);
    }

    @Autowired
    private ReporteResenaService reporteResenaService;

    @Autowired
    private ReporteResenaRepository reporteResenaRepository;

    @Autowired
    private ResenaRepository resenaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Usuario autor;
    private Usuario user1;
    private Usuario user2;
    private Usuario user3;
    private Producto producto;
    private Resena resena;

    @BeforeEach
    void setUp() {
        // Asegurar que la restricción única uq_reporte_usuario_resena existe en PostgreSQL
        jdbcTemplate.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_reporte_usuario_resena'
                ) THEN
                    ALTER TABLE reporte_resena
                    ADD CONSTRAINT uq_reporte_usuario_resena UNIQUE (id_usuario, id_resena);
                END IF;
            END $$;
        """);

        // Instalar triggers de 006_reportes_resenas en PostgreSQL
        jdbcTemplate.execute("""
            CREATE OR REPLACE FUNCTION fn_recalcular_ocultamiento_resena()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            DECLARE
                v_id_resena BIGINT;
                v_reportes_activos BIGINT;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    v_id_resena := OLD.id_resena;
                ELSE
                    v_id_resena := NEW.id_resena;
                END IF;

                PERFORM 1 FROM resena WHERE id_resena = v_id_resena FOR NO KEY UPDATE;

                SELECT COUNT(*) INTO v_reportes_activos
                FROM reporte_resena
                WHERE id_resena = v_id_resena AND estado <> 'RECHAZADO';

                IF v_reportes_activos >= 3 THEN
                    UPDATE resena SET oculta_por_reportes = TRUE
                    WHERE id_resena = v_id_resena AND oculta_por_reportes = FALSE;
                ELSE
                    UPDATE resena SET oculta_por_reportes = FALSE
                    WHERE id_resena = v_id_resena AND oculta_por_reportes = TRUE;
                END IF;
                RETURN NULL;
            END;
            $$;
        """);

        jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_recalcular_ocultamiento_reporte ON reporte_resena;");
        jdbcTemplate.execute("""
            CREATE TRIGGER trg_recalcular_ocultamiento_reporte
            AFTER INSERT OR UPDATE OF estado OR DELETE
            ON reporte_resena
            FOR EACH ROW
            EXECUTE FUNCTION fn_recalcular_ocultamiento_resena();
        """);

        reporteResenaRepository.deleteAll();
        resenaRepository.deleteAll();
        usuarioRepository.deleteAll();

        Rol rol = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol normal");
                    return rolRepository.save(r);
                });

        autor = crearUsuario("Autor", "autor_pg@test.com", rol);
        user1 = crearUsuario("User 1", "u1_pg@test.com", rol);
        user2 = crearUsuario("User 2", "u2_pg@test.com", rol);
        user3 = crearUsuario("User 3", "u3_pg@test.com", rol);

        Categoria cat = new Categoria();
        cat.setNombre("Cat " + UUID.randomUUID());
        cat.setEstado(true);
        cat = categoriaRepository.save(cat);

        Marca marca = new Marca();
        marca.setNombre("Marca " + UUID.randomUUID());
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        producto = new Producto();
        producto.setNombre("Prod " + UUID.randomUUID());
        producto.setCategoria(cat);
        producto.setMarca(marca);
        producto.setPrecioReferencia(BigDecimal.valueOf(100));
        producto.setEstado(true);
        producto = productoRepository.save(producto);

        resena = new Resena();
        resena.setProducto(producto);
        resena.setUsuario(autor);
        resena.setComentario("Reseña sujeta a moderación en PostgreSQL");
        resena.setPuntuacion(5);
        resena.setEstado(true);
        resena.setOcultaPorReportes(false);
        resena.setFechaCreacion(LocalDateTime.now());
        resena = resenaRepository.saveAndFlush(resena);
    }

    private Usuario crearUsuario(String nombre, String email, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setCorreo(UUID.randomUUID() + "_" + email);
        u.setSupabaseUid(UUID.randomUUID().toString());
        u.setRol(rol);
        u.setEstado(true);
        u.setFechaRegistro(LocalDateTime.now());
        return usuarioRepository.save(u);
    }

    private Jwt mockJwt(Usuario u) {
        return new Jwt(
                "mock-token-" + u.getIdUsuario(),
                LocalDateTime.now().minusMinutes(5).toInstant(java.time.ZoneOffset.UTC),
                LocalDateTime.now().plusHours(1).toInstant(java.time.ZoneOffset.UTC),
                Map.of("alg", "none"),
                Map.of(
                        "sub", u.getSupabaseUid(),
                        "email", u.getCorreo(),
                        "aud", "authenticated"
                )
        );
    }

    @Test
    @DisplayName("PostgreSQL: Tres reportes de usuarios distintos activan trigger y ocultan reseña automáticamente")
    void tresReportesActivanTriggerOcultamientoEnPostgres() {
        assertFalse(resenaRepository.findById(resena.getIdResena()).orElseThrow().getOcultaPorReportes());

        // Reporte 1
        reporteResenaService.crearReporte(resena.getIdResena(), new ReporteResenaRequest("spam", null), mockJwt(user1));
        assertFalse(resenaRepository.findById(resena.getIdResena()).orElseThrow().getOcultaPorReportes());

        // Reporte 2
        reporteResenaService.crearReporte(resena.getIdResena(), new ReporteResenaRequest("falso", null), mockJwt(user2));
        assertFalse(resenaRepository.findById(resena.getIdResena()).orElseThrow().getOcultaPorReportes());

        // Reporte 3 -> Alcanza el umbral de 3 reportes
        reporteResenaService.crearReporte(resena.getIdResena(), new ReporteResenaRequest("lenguaje-ofensivo", null), mockJwt(user3));

        // Verificar que el trigger en PostgreSQL actualizó oculta_por_reportes = TRUE
        Resena resenaOculta = resenaRepository.findById(resena.getIdResena()).orElseThrow();
        assertTrue(resenaOculta.getOcultaPorReportes(), "La reseña debe quedar oculta automáticamente por el trigger de PostgreSQL");
    }

    @Test
    @DisplayName("PostgreSQL: Violación de restricción única uq_reporte_usuario_resena se traduce a ConflictException")
    void violacionRestriccionUnicaSeTraduceAConflictException() {
        // Primer reporte exitoso
        reporteResenaService.crearReporte(resena.getIdResena(), new ReporteResenaRequest("spam", null), mockJwt(user1));

        // Intento directo con ReporteResena entity simulando colisión concurrente que salta el existsBy
        ReporteResena duplicado = new ReporteResena();
        duplicado.setResena(resena);
        duplicado.setUsuario(user1);
        duplicado.setMotivo("falso");
        duplicado.setEstado(EstadoReporte.PENDIENTE);
        duplicado.setFechaCreacion(LocalDateTime.now());
        duplicado.setFechaActualizacion(LocalDateTime.now());

        assertThrows(ConflictException.class, () -> {
            // Llamada al service para el mismo usuario y reseña
            reporteResenaService.crearReporte(resena.getIdResena(), new ReporteResenaRequest("falso", null), mockJwt(user1));
        });
    }
}
