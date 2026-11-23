package com.example.backend.service;

import com.example.backend.dto.EstadoReincidenciaResponse;
import com.example.backend.repository.ResenaModeracionAuditoriaRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reincidencia con restricciones graduales (Caso 6). El estado no se guarda:
 * se deduce del historial de moderación, que es de solo inserción. Diseño en
 * docs/superpowers/specs/2026-11-22-reincidencia-design.md.
 * <ul>
 *   <li>1 falta: aviso.</li>
 *   <li>2 faltas: revisión previa hasta 30 días después de la última.</li>
 *   <li>3 faltas: bloqueo para publicar y reportar hasta 7 días después de la última.</li>
 *   <li>4 faltas: la cuenta aparece en la lista del administrador.</li>
 * </ul>
 */
@Service
public class ReincidenciaService {

  public static final int VENTANA_DIAS = 90;
  public static final int REVISION_PREVIA_DIAS = 30;
  public static final int BLOQUEO_DIAS = 7;
  public static final int MIN_FALTAS_REVISION_PREVIA = 2;
  public static final int MIN_FALTAS_BLOQUEO = 3;
  public static final int MIN_FALTAS_ADMIN = 4;
  public static final String MOTIVO_REVISION_PREVIA = "Revisión previa por reincidencia";

  private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

  private final ResenaModeracionAuditoriaRepository auditoriaRepository;

  public ReincidenciaService(ResenaModeracionAuditoriaRepository auditoriaRepository) {
    this.auditoriaRepository = auditoriaRepository;
  }

  /** Cálculo puro: recibe las fechas de las faltas dentro de la ventana. */
  public static EstadoReincidenciaResponse calcular(List<LocalDateTime> fechasFaltas, LocalDateTime ahora) {
    int faltas = fechasFaltas == null ? 0 : fechasFaltas.size();
    if (faltas == 0) {
      return new EstadoReincidenciaResponse(0, NivelReincidencia.NINGUNO, null, null, null, null);
    }
    LocalDateTime ultima = fechasFaltas.stream().max(Comparator.naturalOrder()).orElseThrow();
    LocalDateTime masAntigua = fechasFaltas.stream().min(Comparator.naturalOrder()).orElseThrow();

    LocalDateTime revisionHasta = faltas >= MIN_FALTAS_REVISION_PREVIA ? ultima.plusDays(REVISION_PREVIA_DIAS) : null;
    LocalDateTime bloqueoHasta = faltas >= MIN_FALTAS_BLOQUEO ? ultima.plusDays(BLOQUEO_DIAS) : null;

    NivelReincidencia nivel;
    if (bloqueoHasta != null && ahora.isBefore(bloqueoHasta)) {
      nivel = NivelReincidencia.BLOQUEO;
    } else if (revisionHasta != null && ahora.isBefore(revisionHasta)) {
      nivel = NivelReincidencia.REVISION_PREVIA;
    } else {
      nivel = NivelReincidencia.AVISO;
    }
    return new EstadoReincidenciaResponse(
      faltas, nivel, ultima, revisionHasta, bloqueoHasta, masAntigua.plusDays(VENTANA_DIAS));
  }

  @Transactional(readOnly = true)
  public EstadoReincidenciaResponse evaluar(Long idUsuario) {
    LocalDateTime ahora = LocalDateTime.now();
    return calcular(faltasEnVentana(idUsuario, ahora), ahora);
  }

  /** Faltas del autor dentro de la ventana de 90 días. */
  @Transactional(readOnly = true)
  public int contarFaltas(Long idUsuario) {
    return faltasEnVentana(idUsuario, LocalDateTime.now()).size();
  }

  /** 403 con la fecha de fin si el usuario tiene un bloqueo vigente. */
  @Transactional(readOnly = true)
  public void verificarPuedePublicar(Long idUsuario) {
    EstadoReincidenciaResponse estado = evaluar(idUsuario);
    if (estado.bloqueoActivo()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
        "Tu cuenta no puede publicar ni reportar hasta el "
          + estado.bloqueoHasta().format(FORMATO_FECHA) + " por reincidencia.");
    }
  }

  @Transactional(readOnly = true)
  public boolean requiereRevisionPrevia(Long idUsuario) {
    return evaluar(idUsuario).revisionPreviaActiva();
  }

  private List<LocalDateTime> faltasEnVentana(Long idUsuario, LocalDateTime ahora) {
    if (idUsuario == null) {
      return List.of();
    }
    return auditoriaRepository.findFechasFaltasDelAutorDesde(idUsuario, ahora.minusDays(VENTANA_DIAS));
  }
}
