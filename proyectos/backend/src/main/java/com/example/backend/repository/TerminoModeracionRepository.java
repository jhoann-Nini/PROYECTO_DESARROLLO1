package com.example.backend.repository;

import com.example.backend.entity.TerminoModeracion;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TerminoModeracionRepository extends JpaRepository<TerminoModeracion, Long> {

    List<TerminoModeracion> findByActivoTrue();

    @EntityGraph(attributePaths = {"creadoPor", "desactivadoPor"})
    List<TerminoModeracion> findAllByOrderByFechaCreacionDesc();

    @EntityGraph(attributePaths = {"creadoPor", "desactivadoPor"})
    List<TerminoModeracion> findByActivoOrderByFechaCreacionDesc(Boolean activo);

    boolean existsByTerminoNormalizadoAndActivoTrue(String terminoNormalizado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TerminoModeracion t WHERE t.idTermino = :id")
    Optional<TerminoModeracion> findByIdForUpdate(@Param("id") Long id);
}
