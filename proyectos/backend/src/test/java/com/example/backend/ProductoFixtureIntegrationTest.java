package com.example.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.controller.ProductoController;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.service.ProductoService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProductoFixtureIntegrationTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoService productoService;

    @Test
    void fixtureProductsArePersistedInTheTestDatabase() throws Exception {
        JsonNode fixture = objectMapper.readTree(
                new ClassPathResource("fixtures/productos-prueba.json").getInputStream());
        Map<String, Long> categoryIds = new HashMap<>();
        Map<String, Long> brandIds = new HashMap<>();
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(
                new ProductoController(productoService)).build();
        int createdCount = 0;

        for (JsonNode row : fixture) {
            JsonNode product = row.path("producto");
            Map<String, Object> request = new LinkedHashMap<>();
            request.put("nombre", product.path("nombre").asText());
            request.put("descripcion", nullableText(product.get("descripcion")));
            request.put("idCategoria", categoryIds.computeIfAbsent(
                    row.path("categoria").asText(), this::createCategory));
            request.put("idMarca", brandIds.computeIfAbsent(
                    row.path("marca").asText(), this::createBrand));
            request.put("imagen", nullableText(product.get("imagen")));
            request.put("precioReferencia", nullableNumber(product.get("precioReferencia")));

            mockMvc.perform(post("/api/productos")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.nombre").value(product.path("nombre").asText()))
                    .andExpect(jsonPath("$.estado").value(true));
            createdCount++;
        }

        assertEquals(6, createdCount);
        assertEquals(6, productoRepository.count());
        assertEquals(6, productoService.listarActivos().size());
    }

    private Long createCategory(String name) {
        Categoria category = new Categoria();
        category.setNombre(name);
        return categoriaRepository.save(category).getIdCategoria();
    }

    private Long createBrand(String name) {
        Marca brand = new Marca();
        brand.setNombre(name);
        return marcaRepository.save(brand).getIdMarca();
    }

    private String nullableText(JsonNode value) {
        return value == null || value.isNull() ? null : value.asText();
    }

    private Object nullableNumber(JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }
        return value.decimalValue();
    }
}
