package com.example.backend.service;

import com.example.backend.entity.AuditoriaUsuarioEstablecimiento;
import com.example.backend.entity.AuditoriaUsuarioRol;
import com.example.backend.entity.Establecimiento;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.entity.UsuarioEstablecimiento;
import com.example.backend.entity.UsuarioRol;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.AuditoriaUsuarioEstablecimientoRepository;
import com.example.backend.repository.AuditoriaUsuarioRolRepository;
import com.example.backend.repository.EstablecimientoRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioEstablecimientoRepository;
import com.example.backend.repository.UsuarioRepository;
import com.example.backend.repository.UsuarioRolRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de concurrencia para asignaciones y revocaciones usando PostgreSQL real (Testcontainers).
 *
 * Valida:
 * 1. Protección del último administrador bajo revocaciones concurrentes (bloqueo pesimista).
 * 2. Serialización de revocación de representante ante intentos simultáneos.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class AdministracionAsignacionesConcurrencyTest {

    @Container
    static GenericContainer<?> postgres = new GenericContainer<>("postgres:latest")
            .withExposedPorts(5432)
            .withEnv("POSTGRES_DB", "testdb_assign_conc")
            .withEnv("POSTGRES_USER", "test")
            .withEnv("POSTGRES_PASSWORD", "test")
            .waitingFor(Wait.forListeningPort());

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", AdministracionAsignacionesConcurrencyTest::getJdbcUrl);
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
        return String.format("jdbc:postgresql://%s:%d/testdb_assign_conc", host, port);
    }

    @Autowired
    private AdministracionAsignacionesService asignacionesService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private EstablecimientoRepository establecimientoRepository;

    @Autowired
    private UsuarioRolRepository usuarioRolRepository;

    @Autowired
    private UsuarioEstablecimientoRepository usuarioEstablecimientoRepository;

    @Autowired
    private AuditoriaUsuarioRolRepository auditoriaUsuarioRolRepository;

    @Autowired
    private AuditoriaUsuarioEstablecimientoRepository auditoriaUsuarioEstablecimientoRepository;

    private Rol rolAdmin;
    private Rol rolRepresentante;

    @BeforeEach
    void setUp() {
        limpiarBaseDeDatos();

        this.rolAdmin = rolRepository.findByNombre("Administrador").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Administrador");
            r.setDescripcion("Rol Administrador");
            return rolRepository.save(r);
        });

        this.rolRepresentante = rolRepository.findByNombre("Representante de establecimiento").orElseGet(() -> {
            Rol r = new Rol();
            r.setNombre("Representante de establecimiento");
            r.setDescripcion("Rol Representante");
            return rolRepository.save(r);
        });
    }

    @AfterEach
    void tearDown() {
        limpiarBaseDeDatos();
    }

    private void limpiarBaseDeDatos() {
        auditoriaUsuarioEstablecimientoRepository.deleteAll();
        auditoriaUsuarioRolRepository.deleteAll();
        usuarioEstablecimientoRepository.deleteAll();
        usuarioRolRepository.deleteAll();
        establecimientoRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    private Usuario crearUsuarioConRol(String sub, String email, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre("Usuario " + rol.getNombre() + " " + UUID.randomUUID().toString().substring(0, 5));
        u.setCorreo(email);
        u.setSupabaseUid(sub);
        u.setRol(rol);
        u.setEstado(true);
        u.setFechaRegistro(LocalDateTime.now());

        UsuarioRol ur = new UsuarioRol();
        ur.setRol(rol);
        ur.setEstado(true);
        ur.setFechaAsignacion(LocalDateTime.now());
        u.agregarRol(ur);

        return usuarioRepository.save(u);
    }

    @Test
    @DisplayName("C-01: Revocación concurrente sobre los dos únicos administradores protege al último administrador")
    void revocacionConcurrente_protegeUltimoAdministrador() throws Exception {
        String subAdmin1 = UUID.randomUUID().toString();
        String subAdmin2 = UUID.randomUUID().toString();

        Usuario admin1 = crearUsuarioConRol(subAdmin1, "admin1.conc@tecreview.com", rolAdmin);
        Usuario admin2 = crearUsuarioConRol(subAdmin2, "admin2.conc@tecreview.com", rolAdmin);

        Long admin1Id = admin1.getIdUsuario();
        Long admin2Id = admin2.getIdUsuario();
        Long rolAdminId = rolAdmin.getIdRol();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        AtomicInteger exitos = new AtomicInteger(0);
        AtomicInteger conflictosUltimoAdmin = new AtomicInteger(0);
        AtomicInteger otrosErrores = new AtomicInteger(0);

        // Hilo 1: intenta revocar al Admin 1
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                asignacionesService.revocarRol(admin1Id, rolAdminId, subAdmin2, "Revocación concurrente hilo 1");
                exitos.incrementAndGet();
            } catch (ConflictException ce) {
                if (ce.getMessage().contains("último rol de Administrador")) {
                    conflictosUltimoAdmin.incrementAndGet();
                } else {
                    otrosErrores.incrementAndGet();
                }
            } catch (Exception e) {
                otrosErrores.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });

        // Hilo 2: intenta revocar al Admin 2
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                asignacionesService.revocarRol(admin2Id, rolAdminId, subAdmin1, "Revocación concurrente hilo 2");
                exitos.incrementAndGet();
            } catch (ConflictException ce) {
                if (ce.getMessage().contains("último rol de Administrador")) {
                    conflictosUltimoAdmin.incrementAndGet();
                } else {
                    otrosErrores.incrementAndGet();
                }
            } catch (Exception e) {
                otrosErrores.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        });

        // Esperar a que ambos hilos estén listos y disparar
        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Verificaciones
        assertThat(exitos.get()).as("Exactamente un hilo debe tener éxito").isEqualTo(1);
        assertThat(conflictosUltimoAdmin.get()).as("Exactamente un hilo debe ser bloqueado por protección del último administrador").isEqualTo(1);
        assertThat(otrosErrores.get()).as("No debe haber otros errores inesperados").isZero();

        // En base de datos debe quedar exactamente 1 administrador activo
        List<UsuarioRol> adminsActivos = usuarioRolRepository.findAll().stream()
                .filter(ur -> Boolean.TRUE.equals(ur.getEstado())
                        && "Administrador".equalsIgnoreCase(ur.getRol().getNombre())
                        && Boolean.TRUE.equals(ur.getUsuario().getEstado()))
                .toList();

        assertThat(adminsActivos).as("Debe quedar exactamente 1 Administrador activo").hasSize(1);

        // En la auditoría debe registrarse únicamente 1 evento de revocación
        List<AuditoriaUsuarioRol> revocaciones = auditoriaUsuarioRolRepository.findAll().stream()
                .filter(a -> "REVOCADO".equals(a.getAccion()))
                .toList();
        assertThat(revocaciones).as("Solo se debe haber auditado 1 revocación").hasSize(1);
    }

    @Test
    @DisplayName("C-02: Revocaciones concurrentes sobre la misma representación de establecimiento se serializan")
    void revocacionConcurrenteRepresentante_seSerializaCorrectamente() throws Exception {
        String adminSub = UUID.randomUUID().toString();
        Usuario admin = crearUsuarioConRol(adminSub, "admin.rep.conc@tecreview.com", rolAdmin);

        String repSub = UUID.randomUUID().toString();
        Usuario rep = crearUsuarioConRol(repSub, "rep.conc@tecreview.com", rolRepresentante);

        Establecimiento est = new Establecimiento();
        est.setNombre("Establecimiento Concurrencia");
        est.setEstado(true);
        est = establecimientoRepository.save(est);

        UsuarioEstablecimiento ue = new UsuarioEstablecimiento();
        ue.setUsuario(rep);
        ue.setEstablecimiento(est);
        ue.setEstado(true);
        ue.setFechaAsignacion(LocalDateTime.now());
        ue.setAsignadoPor(admin);
        usuarioEstablecimientoRepository.save(ue);

        Long repId = rep.getIdUsuario();
        Long estId = est.getIdEstablecimiento();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch readyLatch = new CountDownLatch(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);

        AtomicInteger exitos = new AtomicInteger(0);
        AtomicInteger conflictos = new AtomicInteger(0);
        AtomicInteger otrosErrores = new AtomicInteger(0);

        for (int i = 0; i < 2; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    asignacionesService.revocarRepresentante(repId, estId, adminSub, "Revocación concurrente " + index);
                    exitos.incrementAndGet();
                } catch (ConflictException ce) {
                    if (ce.getMessage().contains("ya está revocada")) {
                        conflictos.incrementAndGet();
                    } else {
                        otrosErrores.incrementAndGet();
                    }
                } catch (Exception e) {
                    otrosErrores.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(exitos.get()).as("Exactamente una revocación debe tener éxito").isEqualTo(1);
        assertThat(conflictos.get()).as("La segunda revocación debe fallar por ya estar revocada").isEqualTo(1);
        assertThat(otrosErrores.get()).as("No debe haber otros errores").isZero();

        UsuarioEstablecimiento finalUe = usuarioEstablecimientoRepository
                .findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(repId, estId)
                .orElseThrow();
        assertThat(finalUe.getEstado()).isFalse();

        List<AuditoriaUsuarioEstablecimiento> auditoria = auditoriaUsuarioEstablecimientoRepository.findAll();
        assertThat(auditoria).hasSize(1);
        assertThat(auditoria.get(0).getAccion()).isEqualTo("REVOCADO");
    }
}

