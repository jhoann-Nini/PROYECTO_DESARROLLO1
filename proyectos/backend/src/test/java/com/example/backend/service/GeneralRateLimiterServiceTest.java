package com.example.backend.service;

import com.example.backend.service.GeneralRateLimiterService.RateLimitResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("HU-S2-14 / TEC-121: Pruebas unitarias de GeneralRateLimiterService")
class GeneralRateLimiterServiceTest {

    private GeneralRateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        // Inicializamos con límite de 5 peticiones por ventana de 2 segundos para pruebas rápidas
        rateLimiterService = new GeneralRateLimiterService(true, 5, 2);
    }

    @Test
    @DisplayName("Permite peticiones consecutivas dentro del límite")
    void permitePeticionesHastaElLimite() {
        String clientKey = "ip:192.168.1.100";

        for (int i = 1; i <= 5; i++) {
            RateLimitResult result = rateLimiterService.tryAcquire(clientKey);
            assertTrue(result.allowed(), "La petición " + i + " debe ser permitida");
            assertEquals(5, result.limit());
            assertEquals(5 - i, result.remaining());
            assertEquals(0, result.retryAfterSeconds());
            assertTrue(result.resetEpochSeconds() > 0);
        }
    }

    @Test
    @DisplayName("Bloquea la petición que supera el límite con HTTP 429 info")
    void bloqueaPeticionQueSuperaElLimite() {
        String clientKey = "ip:10.0.0.1";

        // Consumir las 5 permitidas
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiterService.tryAcquire(clientKey).allowed());
        }

        // Petición 6: debe ser rechazada
        RateLimitResult result = rateLimiterService.tryAcquire(clientKey);
        assertFalse(result.allowed(), "La sexta petición debe ser bloqueada");
        assertEquals(5, result.limit());
        assertEquals(0, result.remaining());
        assertTrue(result.retryAfterSeconds() > 0, "Debe indicar segundos para reintentar");
        assertTrue(result.resetEpochSeconds() > 0);
    }

    @Test
    @DisplayName("Garantiza aislamiento estricto entre clientes diferentes")
    void aislamientoEntreClientesDiferentes() {
        String clienteA = "ip:192.168.1.10";
        String clienteB = "ip:192.168.1.20";

        // Agotar cuota del cliente A
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiterService.tryAcquire(clienteA).allowed());
        }
        assertFalse(rateLimiterService.tryAcquire(clienteA).allowed(), "Cliente A debe estar bloqueado");

        // Cliente B debe tener su cuota intacta
        RateLimitResult resultB = rateLimiterService.tryAcquire(clienteB);
        assertTrue(resultB.allowed(), "Cliente B no debe ser afectado por el bloqueo de A");
        assertEquals(4, resultB.remaining());
    }

    @Test
    @DisplayName("Restaura la cuota automáticamente tras expirar la ventana de tiempo")
    void restauraCuotaTrasExpirarVentana() throws InterruptedException {
        String clientKey = "ip:172.16.0.5";

        // Consumir el límite
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiterService.tryAcquire(clientKey).allowed());
        }
        assertFalse(rateLimiterService.tryAcquire(clientKey).allowed());

        // Esperar que expire la ventana (2.1 segundos)
        Thread.sleep(2100);

        // La siguiente petición debe ser permitida en la nueva ventana
        RateLimitResult resultadoNuevo = rateLimiterService.tryAcquire(clientKey);
        assertTrue(resultadoNuevo.allowed(), "Debe permitirse tras expirar la ventana");
        assertEquals(4, resultadoNuevo.remaining());
    }

    @Test
    @DisplayName("Permite todas las peticiones cuando el servicio está deshabilitado")
    void permiteTodoSiEstaDeshabilitado() {
        GeneralRateLimiterService disabledService = new GeneralRateLimiterService(false, 3, 60);

        String clientKey = "ip:127.0.0.1";
        for (int i = 0; i < 10; i++) {
            RateLimitResult result = disabledService.tryAcquire(clientKey);
            assertTrue(result.allowed());
        }
    }

    @Test
    @DisplayName("El método reset limpia todos los clientes registrados")
    void resetLimpiaClientes() {
        rateLimiterService.tryAcquire("ip:1.1.1.1");
        rateLimiterService.tryAcquire("ip:2.2.2.2");
        assertEquals(2, rateLimiterService.getActiveClientCount());

        rateLimiterService.reset();
        assertEquals(0, rateLimiterService.getActiveClientCount());
    }

    @Test
    @DisplayName("La limpieza de buckets elimina registros expirados")
    void limpiezaBucketsExpirados() throws InterruptedException {
        rateLimiterService.tryAcquire("ip:1.2.3.4");
        assertEquals(1, rateLimiterService.getActiveClientCount());

        // Esperar que expire la ventana (> 2 segundos)
        Thread.sleep(2200);

        rateLimiterService.cleanupExpiredBuckets();
        assertEquals(0, rateLimiterService.getActiveClientCount());
    }
}
