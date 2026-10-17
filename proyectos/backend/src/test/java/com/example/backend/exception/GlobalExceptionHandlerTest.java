package com.example.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies that the generic {@code Exception} handler returns a safe 500 response
 * without leaking internal exception details.
 */
@WebMvcTest(controllers = GlobalExceptionHandlerTest.DummyController.class)
@Import(GlobalExceptionHandler.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void whenUnexpectedException_thenReturnsGeneric500Response() throws Exception {
        mockMvc.perform(get("/trigger-error")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is(500)))
                .andExpect(jsonPath("$.error", is("Internal Server Error")))
                .andExpect(jsonPath("$.message", is("An unexpected error occurred. Please try again later.")));
    }

    // Simple controller that deliberately throws a RuntimeException to trigger the handler
    @org.springframework.web.bind.annotation.RestController
    static class DummyController {
        @org.springframework.web.bind.annotation.GetMapping("/trigger-error")
        public void triggerError() {
            throw new RuntimeException("Sensitive internal detail");
        }
    }
}
