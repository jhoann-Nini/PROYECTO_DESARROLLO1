package com.example.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

/** Runs the exact same JSON documents as the frontend Vitest suite. */
class FichaTecnicaV3ConformanceTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<Map<String, Object>>> CASES = new TypeReference<>() {};

    @Test void sharedJsonVectorsMatchExpectedRoutingInJava() throws Exception {
        Path fixture = Path.of("../fixtures/ficha-tecnica-v3/conformance-cases.json");
        if (!Files.exists(fixture)) fixture = Path.of("proyectos/fixtures/ficha-tecnica-v3/conformance-cases.json");
        List<Map<String, Object>> cases = MAPPER.readValue(Files.readString(fixture), CASES);
        assertEquals(41, cases.size(), "update the explicit shared vector count when cases change");
        for (Map<String, Object> testCase : cases) {
            String id = (String) testCase.get("id");
            String expected = (String) testCase.get("expected");
            @SuppressWarnings("unchecked") Map<String, Object> input = (Map<String, Object>) testCase.get("input");
            boolean valid;
            try { FichaTecnicaV3Dispatcher.validateAndRoute(input); valid = true; }
            catch (ResponseStatusException rejected) { valid = false; assertEquals(400, rejected.getStatusCode().value(), id); }
            assertEquals("valid".equals(expected), valid, id + " — " + testCase.get("rule"));
            assertTrue(List.of("valid", "invalid").contains(expected), id + " expected value is malformed");
        }
    }
}
