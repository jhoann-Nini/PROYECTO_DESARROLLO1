package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio de control de tasa de peticiones general (General Rate Limiting).
 * Implementa un algoritmo de ventana fija con contador atómico y expiración
 * para proteger la API REST contra DoS, abusos y saturación (HU-S2-14 / TEC-121).
 */
@Service
public class GeneralRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(GeneralRateLimiterService.class);

    public record RateLimitResult(
            boolean allowed,
            int limit,
            int remaining,
            long retryAfterSeconds,
            long resetEpochSeconds
    ) {}

    public static class RateLimitBucket {
        private long windowStartSeconds;
        private int count;

        public RateLimitBucket(long windowStartSeconds) {
            this.windowStartSeconds = windowStartSeconds;
            this.count = 0;
        }

        public synchronized RateLimitResult tryConsume(long nowSeconds, int limit, long windowSeconds) {
            if (nowSeconds - windowStartSeconds >= windowSeconds) {
                windowStartSeconds = nowSeconds;
                count = 1;
                int remaining = Math.max(0, limit - 1);
                long resetEpoch = windowStartSeconds + windowSeconds;
                return new RateLimitResult(true, limit, remaining, 0, resetEpoch);
            }

            if (count < limit) {
                count++;
                int remaining = Math.max(0, limit - count);
                long resetEpoch = windowStartSeconds + windowSeconds;
                return new RateLimitResult(true, limit, remaining, 0, resetEpoch);
            }

            long resetEpoch = windowStartSeconds + windowSeconds;
            long retryAfter = Math.max(1, resetEpoch - nowSeconds);
            return new RateLimitResult(false, limit, 0, retryAfter, resetEpoch);
        }

        public synchronized boolean isExpired(long nowSeconds, long windowSeconds) {
            return (nowSeconds - windowStartSeconds) >= windowSeconds;
        }

        public synchronized int getCount() {
            return count;
        }

        public synchronized long getWindowStartSeconds() {
            return windowStartSeconds;
        }
    }

    private final ConcurrentHashMap<String, RateLimitBucket> buckets = new ConcurrentHashMap<>();

    private final boolean enabled;
    private final int defaultLimit;
    private final long defaultWindowSeconds;

    public GeneralRateLimiterService(
            @Value("${ratelimit.general.enabled:true}") boolean enabled,
            @Value("${ratelimit.general.limit:100}") int defaultLimit,
            @Value("${ratelimit.general.window-seconds:60}") long defaultWindowSeconds) {
        this.enabled = enabled;
        this.defaultLimit = defaultLimit;
        this.defaultWindowSeconds = defaultWindowSeconds;
        log.info("GeneralRateLimiterService inicializado: enabled={}, limit={}, windowSeconds={}",
                enabled, defaultLimit, defaultWindowSeconds);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getDefaultLimit() {
        return defaultLimit;
    }

    public long getDefaultWindowSeconds() {
        return defaultWindowSeconds;
    }

    /**
     * Intenta consumir una unidad de cuota para la clave dada usando la configuración por defecto.
     */
    public RateLimitResult tryAcquire(String clientKey) {
        return tryAcquire(clientKey, defaultLimit, defaultWindowSeconds);
    }

    /**
     * Intenta consumir una unidad de cuota para la clave dada usando límites específicos.
     */
    public RateLimitResult tryAcquire(String clientKey, int limit, long windowSeconds) {
        if (!enabled) {
            long now = Instant.now().getEpochSecond();
            return new RateLimitResult(true, limit, limit, 0, now + windowSeconds);
        }

        long nowSeconds = Instant.now().getEpochSecond();
        RateLimitBucket bucket = buckets.computeIfAbsent(clientKey, k -> new RateLimitBucket(nowSeconds));
        return bucket.tryConsume(nowSeconds, limit, windowSeconds);
    }

    /**
     * Limpieza periódica de buckets expirados para evitar consumo indebido de memoria.
     */
    @Scheduled(fixedRate = 300000) // cada 5 minutos
    public void cleanupExpiredBuckets() {
        long now = Instant.now().getEpochSecond();
        int antes = buckets.size();
        buckets.entrySet().removeIf(entry -> entry.getValue().isExpired(now, defaultWindowSeconds));
        int despues = buckets.size();
        if (antes != despues) {
            log.debug("Limpieza de buckets de rate limit: se eliminaron {} buckets expirados", antes - despues);
        }
    }

    /**
     * Reinicia todos los buckets almacenados en memoria (útil para pruebas).
     */
    public void reset() {
        buckets.clear();
    }

    /**
     * Retorna la cantidad de clientes activos registrados actualmente.
     */
    public int getActiveClientCount() {
        return buckets.size();
    }
}
