package com.example.backend.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("HU-S2-14 / TEC-121: resolución de IP detrás del proxy")
class GeneralRateLimitingFilterTest {

    private GeneralRateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        filter = new GeneralRateLimitingFilter(null);
    }

    @Test
    @DisplayName("Usa la primera IP de X-Forwarded-For como IP del cliente")
    void usaPrimeraIpDeForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("X-Forwarded-For", "203.0.113.25, 172.16.0.10, 10.0.0.15");

        assertEquals("203.0.113.25", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Usa X-Forwarded-For cuando contiene una sola IP")
    void usaForwardedForConUnaIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("X-Forwarded-For", "198.51.100.42");

        assertEquals("198.51.100.42", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Usa remoteAddr cuando no existe X-Forwarded-For")
    void usaRemoteAddrComoRespaldo() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");

        assertEquals("10.0.0.15", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Usa remoteAddr cuando X-Forwarded-For está vacío")
    void usaRemoteAddrSiForwardedForEstaVacio() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("X-Forwarded-For", "  ");

        assertEquals("10.0.0.15", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Devuelve unknown si no hay IP disponible")
    void devuelveUnknownSiNoHayIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertEquals("unknown", filter.extractClientIp(request));
    }
}
