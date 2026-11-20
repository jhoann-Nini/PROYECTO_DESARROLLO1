package com.example.backend.config;

import com.example.backend.service.GeneralRateLimiterService;
import com.example.backend.service.GeneralRateLimiterService.RateLimitResult;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Filtro HTTP para aplicar control de tasa de peticiones general (General Rate Limiting).
 * Intercepta las solicitudes dirigidas a /api/** y retorna HTTP 429 Too Many Requests
 * cuando un cliente supera el límite establecido en la ventana de tiempo (HU-S2-14 / TEC-121).
 */
@Component
public class GeneralRateLimitingFilter extends OncePerRequestFilter {

  public static final String MENSAJE_LIMITE_GENERAL =
    "Has superado el límite de peticiones permitido. Por favor, intenta de nuevo más tarde.";

  private final GeneralRateLimiterService rateLimiterService;

  public GeneralRateLimitingFilter(
    @org.springframework.beans.factory.annotation.Autowired(required = false) GeneralRateLimiterService rateLimiterService) {
    this.rateLimiterService = (rateLimiterService != null)
      ? rateLimiterService
      : new GeneralRateLimiterService(true, 100, 60);
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    // Excluir solicitudes pre-flight CORS (OPTIONS)
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
      return true;
    }

    String path = request.getRequestURI();
    if (path == null) {
      return true;
    }

    // Excluir endpoints de salud y diagnóstico
    if (path.equals("/api/health") || path.startsWith("/api/health/")) {
      return true;
    }

    // Aplicar rate limiting exclusivamente sobre la API REST (/api/**)
    return !path.startsWith("/api/");
  }

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain filterChain) throws ServletException, IOException {

    if (!rateLimiterService.isEnabled()) {
      filterChain.doFilter(request, response);
      return;
    }

    String clientKey = resolveClientKey(request);
    RateLimitResult result = rateLimiterService.tryAcquire(clientKey);

    // Cabeceras informativas estándar de Rate Limiting
    response.setHeader("X-RateLimit-Limit", String.valueOf(result.limit()));
    response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));
    response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetEpochSeconds()));

    if (!result.allowed()) {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());

      String json = String.format(
        "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
        LocalDateTime.now(),
        HttpStatus.TOO_MANY_REQUESTS.value(),
        HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
        MENSAJE_LIMITE_GENERAL,
        request.getRequestURI()
      );
      response.getWriter().write(json);
      return;
    }

    filterChain.doFilter(request, response);
  }

  /**
   * Identifica al cliente para aplicar el límite de peticiones.
   * <p>
   * - Usuario autenticado: se utiliza su identidad validada.
   * - Usuario anónimo: se utiliza la IP de la conexión.
   * <p>
   * Nunca utilizamos tokens sin validar como identificadores.
   */
  public String resolveClientKey(HttpServletRequest request) {
    Authentication auth =
      SecurityContextHolder.getContext().getAuthentication();

    if (auth != null
      && auth.isAuthenticated()
      && !(auth instanceof AnonymousAuthenticationToken)) {

      String name = auth.getName();

      if (name != null && !name.isBlank()) {
        return "user:" + name;
      }
    }

    return "ip:" + extractClientIp(request);
  }


  /**
   * Obtiene la IP del cliente conectado directamente.
   * <p>
   * No confía en X-Forwarded-For ni X-Real-IP porque
   * esas cabeceras pueden ser manipuladas por el cliente.
   * <p>
   * Si se utiliza un proxy inverso, su configuración
   * debe establecerse explícitamente antes del despliegue.
   */
  public String extractClientIp(HttpServletRequest request) {
    String remoteAddr = request.getRemoteAddr();

    if (remoteAddr == null || remoteAddr.isBlank()) {
      return "unknown";
    }

    return remoteAddr;
  }

}
