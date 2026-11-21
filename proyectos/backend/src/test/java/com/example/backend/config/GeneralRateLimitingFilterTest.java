package com.example.backend.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("HU-S2-14 / TEC-121: resolución segura de IP detrás de Render")
class GeneralRateLimitingFilterTest {

    private GeneralRateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        filter = new GeneralRateLimitingFilter(null);
    }

    @Test
    @DisplayName("Usa CF-Connecting-IP como IP del cliente")
    void usaIpDeCloudflare() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("CF-Connecting-IP", "203.0.113.25");

        assertEquals("203.0.113.25", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("No confía en una X-Forwarded-For manipulable por el cliente")
    void ignoraForwardedForYUsaRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("X-Forwarded-For", "198.51.100.42");

        assertEquals("10.0.0.15", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Prioriza CF-Connecting-IP aunque X-Forwarded-For contenga otra IP")
    void priorizaIpConfiableSobreForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("X-Forwarded-For", "198.51.100.42, 172.16.0.10");
        request.addHeader("CF-Connecting-IP", "203.0.113.25");

        assertEquals("203.0.113.25", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Usa remoteAddr si Cloudflare no proporciona su cabecera")
    void usaRemoteAddrComoRespaldo() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");

        assertEquals("10.0.0.15", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Usa remoteAddr si CF-Connecting-IP está vacío")
    void usaRemoteAddrSiCabeceraCloudflareVacia() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.15");
        request.addHeader("CF-Connecting-IP", "  ");

        assertEquals("10.0.0.15", filter.extractClientIp(request));
    }

    @Test
    @DisplayName("Devuelve unknown si no hay IP disponible")
    void devuelveUnknownSiNoHayIp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(null);

        assertEquals("unknown", filter.extractClientIp(request));
    }
}
