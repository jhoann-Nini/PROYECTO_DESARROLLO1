package com.example.backend.service;

import com.example.backend.entity.Usuario;
import com.example.backend.exception.TooManyRequestsException;
import com.example.backend.repository.ReporteOfertaRepository;
import com.example.backend.repository.ReporteResenaRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Límite de reportes por usuario (Fase 2, hallazgo H-07).
 * <p>
 * Cuenta juntos los reportes de reseñas y de ofertas creados en la última
 * hora. Bloquea la fila del usuario para que dos peticiones simultáneas no
 * superen el límite, igual que el límite de reseñas.
 */
@Service
public class LimiteReportesService {

  public static final int MAX_REPORTES_POR_HORA = 10;
  public static final String MENSAJE_LIMITE_REPORTES =
    "Alcanzaste el límite de " + MAX_REPORTES_POR_HORA
      + " reportes por hora. Intenta de nuevo más tarde.";

  private final UsuarioRepository usuarioRepository;
  private final ReporteOfertaRepository reporteOfertaRepository;
  private final ReporteResenaRepository reporteResenaRepository;

  public LimiteReportesService(
    UsuarioRepository usuarioRepository,
    ReporteOfertaRepository reporteOfertaRepository,
    ReporteResenaRepository reporteResenaRepository) {
    this.usuarioRepository = usuarioRepository;
    this.reporteOfertaRepository = reporteOfertaRepository;
    this.reporteResenaRepository = reporteResenaRepository;
  }

  /**
   * Lanza 429 si el usuario ya creó el máximo de reportes en la última hora.
   * Debe llamarse dentro de la transacción que guarda el reporte.
   */
  @Transactional
  public void verificarLimite(Usuario usuario) {
    Long idUsuario = usuario.getIdUsuario();
    usuarioRepository.findByIdForUpdate(idUsuario);

    LocalDateTime desde = LocalDateTime.now().minusHours(1);
    long total = reporteOfertaRepository.countByUsuarioIdUsuarioAndFechaCreacionAfter(idUsuario, desde)
      + reporteResenaRepository.countByUsuarioIdUsuarioAndFechaCreacionAfter(idUsuario, desde);

    if (total >= MAX_REPORTES_POR_HORA) {
      throw new TooManyRequestsException(MENSAJE_LIMITE_REPORTES);
    }
  }
}
