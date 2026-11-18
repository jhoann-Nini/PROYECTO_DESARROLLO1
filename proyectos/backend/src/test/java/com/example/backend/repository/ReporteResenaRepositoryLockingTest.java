package com.example.backend.repository;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.backend.entity.Resena;
import jakarta.persistence.LockModeType;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/**
 * Contratos de concurrencia para las consultas que serializan las decisiones de moderación.
 *
 * Estas pruebas protegen la declaración del bloqueo en los repositorios; la ejecución real
 * de la consulta y la concurrencia deben seguir validándose contra PostgreSQL.
 */
class ReporteResenaRepositoryLockingTest {

    @Test
    void bloqueoEnLoteUsaBloqueoPesimistaYOrdenDeterminista() throws NoSuchMethodException {
        Method method = ReporteResenaRepository.class.getMethod("findByResenaIdForUpdate", Long.class);

        assertEquals(LockModeType.PESSIMISTIC_WRITE, method.getAnnotation(Lock.class).value());
        assertTrue(method.getAnnotation(Query.class).value()
                .contains("ORDER BY r.fechaCreacion ASC, r.idReporte ASC"));
        assertArrayEquals(new String[] {"usuario"}, method.getAnnotation(EntityGraph.class).attributePaths());
    }

    @Test
    void bloqueoDeResenaParaModeracionUsaBloqueoPesimista() throws NoSuchMethodException {
        Method method = ResenaRepository.class.getMethod("findByIdForModeration", Long.class);

        assertEquals(LockModeType.PESSIMISTIC_WRITE, method.getAnnotation(Lock.class).value());
        assertTrue(method.getAnnotation(Query.class).value().contains("WHERE r.idResena = :idResena"));
    }
}
