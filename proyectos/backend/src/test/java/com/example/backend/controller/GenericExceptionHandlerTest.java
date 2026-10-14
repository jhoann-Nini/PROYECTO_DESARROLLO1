package com.example.backend.controller;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test that verifies the GlobalExceptionHandler hides internal exception messages for HTTP 500.
 */
@WebMvcTest(controllers = GenericExceptionHandlerTest.TestExceptionController.class)
class GenericExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void whenUnexpectedException_thenGenericMessageReturned() throws Exception {
        mockMvc.perform(get("/api/trigger"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status", is(500)))
                .andExpect(jsonPath("$.message", is("An unexpected error occurred. Please try again later.")));
    }

    @RestController
    static class TestExceptionController {
        @GetMapping("/api/trigger")
        public String trigger() {
            throw new IllegalStateException("Sensitive DB error: password=1234");
        }
    }
}
