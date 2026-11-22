package com.example.backend.repository;

import com.example.backend.entity.AuditoriaUsuarioEstado;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditoriaUsuarioEstadoRepository extends JpaRepository<AuditoriaUsuarioEstado, Long> {

  List<AuditoriaUsuarioEstado> findByUsuarioIdUsuarioOrderByFechaEventoDescIdAuditoriaDesc(Long idUsuario);
}
