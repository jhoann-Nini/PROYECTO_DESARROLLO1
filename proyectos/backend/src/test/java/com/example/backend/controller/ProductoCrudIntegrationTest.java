package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * CP-S1-07: Consulta, actualización y eliminación lógica de productos.
 * Verifica los endpoints GET /api/productos/{id}, PUT /api/productos/{id} y
 * DELETE /api/productos/{id}, garantizando la persistencia, el borrado lógico y
 * la estructura de errores en base de datos H2 en memoria.
 */
@SpringBootTest
class ProductoCrudIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    private static final ObjectMapper mapper = new ObjectMapper();

    private Categoria defaultCategoria;
    private Marca defaultMarca;

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        marcaRepository.deleteAll();
    }

    @BeforeEach
    void setUp() {
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        marcaRepository.deleteAll();

        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();

        defaultCategoria = new Categoria();
        defaultCategoria.setNombre("Categoria CRUD Test");
        defaultCategoria.setDescripcion("Descripcion categoria prueba");
        defaultCategoria.setEstado(true);
        defaultCategoria = categoriaRepository.save(defaultCategoria);

        defaultMarca = new Marca();
        defaultMarca.setNombre("Marca CRUD Test");
        defaultMarca.setDescripcion("Descripcion marca prueba");
        defaultMarca.setEstado(true);
        defaultMarca = marcaRepository.save(defaultMarca);
    }

    private Producto crearProducto(String nombre, boolean activo) {
        Producto producto = new Producto();
        producto.setNombre(nombre);
        producto.setDescripcion("Descripcion de " + nombre);
        producto.setCategoria(defaultCategoria);
        producto.setMarca(defaultMarca);
        producto.setImagen("https://example.com/" + nombre + ".png");
        producto.setPrecioReferencia(new BigDecimal("1500000.00"));
        producto.setEstado(activo);
        return productoRepository.save(producto);
    }

    @Test
    @DisplayName("1. Consultar un producto activo existente: HTTP 200")
    void consultarProductoExistenteResponde200() throws Exception {
        Producto producto = crearProducto("Laptop Pro 15", true);

        mockMvc.perform(get("/api/productos/{id}", producto.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto", is(producto.getIdProducto().intValue())))
                .andExpect(jsonPath("$.nombre", is(producto.getNombre())))
                .andExpect(jsonPath("$.descripcion", is(producto.getDescripcion())))
                .andExpect(jsonPath("$.idCategoria", is(defaultCategoria.getIdCategoria().intValue())))
                .andExpect(jsonPath("$.idMarca", is(defaultMarca.getIdMarca().intValue())))
                .andExpect(jsonPath("$.imagen", is(producto.getImagen())))
                .andExpect(jsonPath("$.precioReferencia", is(1500000.00)))
                .andExpect(jsonPath("$.estado", is(true)));
    }

    @Test
    @DisplayName("2. Consultar un producto inexistente: HTTP 404")
    void consultarProductoInexistenteResponde404() throws Exception {
        long idInexistente = 999999L;

        mockMvc.perform(get("/api/productos/{id}", idInexistente))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Producto no encontrado con id " + idInexistente)))
                .andExpect(jsonPath("$.path", is("/api/productos/" + idInexistente)))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    @DisplayName("3. Actualizar un producto existente y comprobar que los cambios persisten: HTTP 200")
    void actualizarProductoExistentePersisteCambiosResponde200() throws Exception {
        Producto producto = crearProducto("Laptop Original", true);

        Categoria nuevaCategoria = new Categoria();
        nuevaCategoria.setNombre("Nueva Cat Actualizada");
        nuevaCategoria.setDescripcion("Desc");
        nuevaCategoria.setEstado(true);
        nuevaCategoria = categoriaRepository.save(nuevaCategoria);

        Marca nuevaMarca = new Marca();
        nuevaMarca.setNombre("Nueva Marca Actualizada");
        nuevaMarca.setDescripcion("Desc");
        nuevaMarca.setEstado(true);
        nuevaMarca = marcaRepository.save(nuevaMarca);

        ProductoRequest requestActualizado = new ProductoRequest(
                "Laptop Max Actualizada",
                "Laptop renovada con más potencia",
                nuevaCategoria.getIdCategoria(),
                nuevaMarca.getIdMarca(),
                "https://example.com/nueva_laptop.png",
                new BigDecimal("2850000.50")
        );

        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(requestActualizado)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto", is(producto.getIdProducto().intValue())))
                .andExpect(jsonPath("$.nombre", is("Laptop Max Actualizada")))
                .andExpect(jsonPath("$.descripcion", is("Laptop renovada con más potencia")))
                .andExpect(jsonPath("$.idCategoria", is(nuevaCategoria.getIdCategoria().intValue())))
                .andExpect(jsonPath("$.idMarca", is(nuevaMarca.getIdMarca().intValue())))
                .andExpect(jsonPath("$.imagen", is("https://example.com/nueva_laptop.png")))
                .andExpect(jsonPath("$.precioReferencia", is(2850000.50)))
                .andExpect(jsonPath("$.estado", is(true)));

        Producto persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals("Laptop Max Actualizada", persistido.getNombre());
        assertEquals("Laptop renovada con más potencia", persistido.getDescripcion());
        assertEquals(nuevaCategoria.getIdCategoria(), persistido.getCategoria().getIdCategoria());
        assertEquals(nuevaMarca.getIdMarca(), persistido.getMarca().getIdMarca());
        assertEquals("https://example.com/nueva_laptop.png", persistido.getImagen());
        assertEquals(0, new BigDecimal("2850000.50").compareTo(persistido.getPrecioReferencia()));
        assertTrue(persistido.getEstado());
    }

    @Test
    @DisplayName("4. Actualizar un producto inexistente: HTTP 404")
    void actualizarProductoInexistenteResponde404() throws Exception {
        long idInexistente = 999999L;

        ProductoRequest request = new ProductoRequest(
                "Laptop Fantasma",
                "No existe",
                defaultCategoria.getIdCategoria(),
                defaultMarca.getIdMarca(),
                null,
                new BigDecimal("1200000.00")
        );

        mockMvc.perform(put("/api/productos/{id}", idInexistente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Producto no encontrado con id " + idInexistente)))
                .andExpect(jsonPath("$.path", is("/api/productos/" + idInexistente)));
    }

    @Test
    @DisplayName("5. Eliminar lógicamente un producto activo: HTTP 204 y registro conservado con estado=false")
    void eliminarLogicamenteProductoActivoResponde204YConservaRegistroInactivo() throws Exception {
        Producto producto = crearProducto("Laptop Para Eliminar", true);

        mockMvc.perform(delete("/api/productos/{id}", producto.getIdProducto()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        Optional<Producto> opt = productoRepository.findById(producto.getIdProducto());
        assertTrue(opt.isPresent(), "El registro debe seguir existiendo físicamente en BD");
        assertFalse(opt.get().getEstado(), "El estado del producto debe ser false tras el borrado lógico");
    }

    @Test
    @DisplayName("6. Comprobar que el producto inactivo no aparece en el listado activo")
    void productoInactivoNoApareceEnListadoActivos() throws Exception {
        Producto activo = crearProducto("Laptop Activa Visible", true);
        Producto inactivo = crearProducto("Laptop Inactiva Oculta", false);

        mockMvc.perform(get("/api/productos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProducto == " + activo.getIdProducto() + ")]").exists())
                .andExpect(jsonPath("$[?(@.idProducto == " + inactivo.getIdProducto() + ")]").doesNotExist());
    }

    @Test
    @DisplayName("7. Consultar un producto inactivo: HTTP 404")
    void consultarProductoInactivoResponde404() throws Exception {
        Producto inactivo = crearProducto("Laptop Ya Inactiva", false);

        mockMvc.perform(get("/api/productos/{id}", inactivo.getIdProducto()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Producto no encontrado con id " + inactivo.getIdProducto())));
    }

    @Test
    @DisplayName("8. Intentar eliminar un producto ya inactivo: HTTP 404")
    void eliminarProductoYaInactivoResponde404() throws Exception {
        Producto inactivo = crearProducto("Laptop Inactiva Previa", false);

        mockMvc.perform(delete("/api/productos/{id}", inactivo.getIdProducto()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Producto no encontrado con id " + inactivo.getIdProducto())));
    }

    @Test
    @DisplayName("9. Intentar actualizar un producto inactivo: HTTP 404")
    void actualizarProductoInactivoResponde404() throws Exception {
        Producto inactivo = crearProducto("Laptop Inactiva No Modificable", false);

        ProductoRequest request = new ProductoRequest(
                "Intento de Modificacion",
                "Desc",
                defaultCategoria.getIdCategoria(),
                defaultMarca.getIdMarca(),
                null,
                new BigDecimal("1500000.00")
        );

        mockMvc.perform(put("/api/productos/{id}", inactivo.getIdProducto())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Producto no encontrado con id " + inactivo.getIdProducto())));
    }

    @Test
    @DisplayName("10. Actualizar un producto con una categoría inexistente: HTTP 404 y sin cambios persistidos")
    void actualizarProductoConCategoriaInexistenteResponde404YSinCambios() throws Exception {
        Producto producto = crearProducto("Laptop Estable", true);
        long idCategoriaInexistente = 999999L;

        ProductoRequest requestInvalido = new ProductoRequest(
                "Nombre Que No Deberia Cambiar",
                "Descripcion que no deberia cambiar",
                idCategoriaInexistente,
                defaultMarca.getIdMarca(),
                "https://example.com/no_persistir.png",
                new BigDecimal("9999999.00")
        );

        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(requestInvalido)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("Categoría no encontrada con id " + idCategoriaInexistente)));

        Producto persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals("Laptop Estable", persistido.getNombre());
        assertEquals(defaultCategoria.getIdCategoria(), persistido.getCategoria().getIdCategoria());
        assertEquals(0, new BigDecimal("1500000.00").compareTo(persistido.getPrecioReferencia()));
    }

    @Test
    @DisplayName("11. Actualizar un producto con un payload inválido: HTTP 400")
    void actualizarProductoConPayloadInvalidoResponde400YSinCambios() throws Exception {
        Producto producto = crearProducto("Laptop Original Antes De Validacion", true);

        ObjectNode payloadInvalido = mapper.createObjectNode();
        payloadInvalido.put("nombre", ""); // nombre en blanco (viola @NotBlank)
        payloadInvalido.put("descripcion", "Desc");
        payloadInvalido.put("idCategoria", defaultCategoria.getIdCategoria());
        payloadInvalido.put("idMarca", defaultMarca.getIdMarca());
        payloadInvalido.put("precioReferencia", -500); // precio negativo (viola @DecimalMin >= 0.0)

        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payloadInvalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("nombre: El nombre es obligatorio")))
                .andExpect(jsonPath("$.message", containsString("precioReferencia: El precio no puede ser negativo")));

        Producto persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals("Laptop Original Antes De Validacion", persistido.getNombre());
        assertEquals(0, new BigDecimal("1500000.00").compareTo(persistido.getPrecioReferencia()));
    }
}
