package com.example.backend.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

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

    @Test
    @DisplayName("12. Crear producto sin caracteristicas: responde 201 y persiste null")
    void crearProductoSinCaracteristicasResponde201YPersisteNull() throws Exception {
        ProductoRequest request = new ProductoRequest(
                "Tablet Basica Sin Specs",
                "Tablet de entrada",
                defaultCategoria.getIdCategoria(),
                defaultMarca.getIdMarca(),
                "https://example.com/tablet.png",
                new BigDecimal("600000.00"),
                null
        );

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre", is("Tablet Basica Sin Specs")))
                .andExpect(jsonPath("$.caracteristicas", nullValue()));

        Producto persistido = productoRepository.findByEstadoTrue().stream()
                .filter(p -> "Tablet Basica Sin Specs".equals(p.getNombre()))
                .findFirst().orElseThrow();
        assertEquals(null, persistido.getCaracteristicas());
    }

    @Test
    @DisplayName("13. Crear producto con caracteristicas estructuradas: responde 201 y persiste JSON")
    void crearProductoConCaracteristicasResponde201YPersisteJson() throws Exception {
        Map<String, Object> specs = Map.of(
                "tipoDriver", "Dinámico 40mm",
                "anc", true,
                "bateriaHoras", 30,
                "bluetooth", "5.3"
        );

        ProductoRequest request = new ProductoRequest(
                "Auriculares Hi-Res ANC",
                "Auriculares de diadema con cancelación activa",
                defaultCategoria.getIdCategoria(),
                defaultMarca.getIdMarca(),
                "https://example.com/auriculares.png",
                new BigDecimal("450000.00"),
                specs
        );

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre", is("Auriculares Hi-Res ANC")))
                .andExpect(jsonPath("$.caracteristicas.tipoDriver", is("Dinámico 40mm")))
                .andExpect(jsonPath("$.caracteristicas.anc", is(true)))
                .andExpect(jsonPath("$.caracteristicas.bateriaHoras", is(30)))
                .andExpect(jsonPath("$.caracteristicas.bluetooth", is("5.3")));

        Producto persistido = productoRepository.findByEstadoTrue().stream()
                .filter(p -> "Auriculares Hi-Res ANC".equals(p.getNombre()))
                .findFirst().orElseThrow();
        assertEquals("Dinámico 40mm", persistido.getCaracteristicas().get("tipoDriver"));
        assertEquals(true, persistido.getCaracteristicas().get("anc"));
    }

    @Test
    @DisplayName("14. Recuperar caracteristicas mediante GET /api/productos/{id}: responde 200 con el JSON exacto")
    void consultarProductoRetornaCaracteristicasExactas() throws Exception {
        Producto producto = crearProducto("Smartphone Pro Con Specs", true);
        producto.setCaracteristicas(Map.of("pantalla", "6.7 AMOLED 120Hz", "ram", "12GB"));
        producto = productoRepository.save(producto);

        mockMvc.perform(get("/api/productos/{id}", producto.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto", is(producto.getIdProducto().intValue())))
                .andExpect(jsonPath("$.caracteristicas.pantalla", is("6.7 AMOLED 120Hz")))
                .andExpect(jsonPath("$.caracteristicas.ram", is("12GB")));
    }

    @Test
    @DisplayName("15. Actualizar caracteristicas de un producto existente: persiste los nuevos valores")
    void actualizarCaracteristicasProductoPersisteNuevosValores() throws Exception {
        Producto producto = crearProducto("Laptop Gaming Inicial", true);
        producto.setCaracteristicas(Map.of("ram", "8GB", "ssd", "256GB"));
        producto = productoRepository.save(producto);

        Map<String, Object> nuevasSpecs = Map.of("ram", "16GB", "ssd", "1TB", "gpu", "RTX 4060");
        ProductoRequest requestActualizado = new ProductoRequest(
                "Laptop Gaming Upgrade",
                "Laptop actualizada con mejores specs",
                defaultCategoria.getIdCategoria(),
                defaultMarca.getIdMarca(),
                producto.getImagen(),
                producto.getPrecioReferencia(),
                nuevasSpecs
        );

        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(requestActualizado)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caracteristicas.ram", is("16GB")))
                .andExpect(jsonPath("$.caracteristicas.ssd", is("1TB")))
                .andExpect(jsonPath("$.caracteristicas.gpu", is("RTX 4060")));

        Producto persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals("16GB", persistido.getCaracteristicas().get("ram"));
        assertEquals("1TB", persistido.getCaracteristicas().get("ssd"));
        assertEquals("RTX 4060", persistido.getCaracteristicas().get("gpu"));
    }

    @Test
    @DisplayName("16. Actualizar producto eliminando caracteristicas al enviar null")
    void actualizarProductoConCaracteristicasNullLimpiaElCampo() throws Exception {
        Producto producto = crearProducto("Producto Con Specs A Limpiar", true);
        producto.setCaracteristicas(Map.of("resolucion", "4K"));
        producto = productoRepository.save(producto);

        ProductoRequest request = new ProductoRequest(
                "Producto Limpio",
                "Sin specs",
                defaultCategoria.getIdCategoria(),
                defaultMarca.getIdMarca(),
                producto.getImagen(),
                producto.getPrecioReferencia(),
                null
        );

        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caracteristicas", nullValue()));

        Producto persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals(null, persistido.getCaracteristicas());
    }

    @Test
    @DisplayName("17. Crear producto con clave vacía en caracteristicas: responde 400 Bad Request")
    void crearProductoConClaveVaciaEnCaracteristicasResponde400() throws Exception {
        ObjectNode node = mapper.createObjectNode();
        node.put("nombre", "Producto Con Clave Invalida");
        node.put("descripcion", "Prueba");
        node.put("idCategoria", defaultCategoria.getIdCategoria());
        node.put("idMarca", defaultMarca.getIdMarca());
        node.put("precioReferencia", 100000);

        ObjectNode specsNode = mapper.createObjectNode();
        specsNode.put("", "valor sin clave");
        node.set("caracteristicas", specsNode);

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Las claves de las características no pueden estar vacías")));
    }

    @Test
    @DisplayName("18. Crear producto con estructura inválida (no objeto) en caracteristicas: responde 400 Bad Request")
    void crearProductoConEstructuraInvalidaNoObjetoResponde400() throws Exception {
        ObjectNode node = mapper.createObjectNode();
        node.put("nombre", "Producto Con Tipo Invalido");
        node.put("descripcion", "Prueba");
        node.put("idCategoria", defaultCategoria.getIdCategoria());
        node.put("idMarca", defaultMarca.getIdMarca());
        node.put("precioReferencia", 100000);
        node.put("caracteristicas", "esto no es un objeto json");

        mockMvc.perform(post("/api/productos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(node)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Cuerpo de la solicitud malformado o con estructura de datos inválida")));
    }

    private ObjectNode fichaV3Valida() throws Exception {
        return (ObjectNode) mapper.readTree("""
            {"version_esquema":3,"categoria":"celulares",
             "variantes":[{"id":"var-1","modelo":"Ilustrativo","sku":null,"mercado":null,"identificadores":{}}],
             "especificaciones":[{"id":"display.diagonal.var-1","clave":"display.diagonal","nombre":"Diagonal","grupo":"pantalla","variante_id":"var-1","estado_dato":"conocido","justificacion_estado":null,"valor_original":{"texto":"0 in","unidad":"in"},"normalizacion":{"estado":"normalizada","valor":{"tipo":"magnitud","valor":0,"unidad":"in"},"regla_conversion_id":null,"precision":{"decimales":1}},"evidencia_ids":["ev-1"],"revision_conflicto":{"estado":"sin_conflicto","resuelto_en":null,"resuelto_por":null,"resolucion":null},"verificacion":{"estado":"con_fuente","verificado_en":null,"verificado_por":null,"evento_auditoria_id":null,"motivo_revision":null},"comparacion":{"habilitada":true,"id":"rule-1","modo":"orden_numerico","unidad":"in","direccion":"mayor_es_mejor","objetivo":null,"tolerancia":{"valor":0.1,"unidad":"in"}}}],
             "fuentes":[{"id":"src-1","tipo":"fabricante","nombre":"Fuente ilustrativa","url":"https://example.test/specs","localizador":"sección","consultada_en":"2026-11-19","variante_id":"var-1","mercado":"ilustrativo"}],
             "evidencias":[{"id":"ev-1","fuente_id":"src-1","alcance":{"tipo":"variante","variante_id":"var-1"},"localizador":"sección","extracto":"evidencia ilustrativa","postura":"respalda","registrada_en":"2026-11-19","registrada_por":"tester"}],"benchmarks":[]}
            """);
    }

    private ObjectNode solicitudConCaracteristicas(String nombre, ObjectNode ficha) {
        ObjectNode request = mapper.createObjectNode();
        request.put("nombre", nombre);
        request.put("descripcion", "Prueba de integración V3");
        request.put("idCategoria", defaultCategoria.getIdCategoria());
        request.put("idMarca", defaultMarca.getIdMarca());
        request.put("precioReferencia", 0);
        request.set("caracteristicas", ficha);
        return request;
    }

    @Test
    @DisplayName("19. Crear producto con ficha V3 válida: persiste y devuelve JSON sin alteraciones")
    void crearProductoConFichaV3ValidaPersisteJson() throws Exception {
        ObjectNode request = solicitudConCaracteristicas("V3 válido", fichaV3Valida());
        String response = mockMvc.perform(post("/api/productos").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caracteristicas.version_esquema", is(3)))
                .andExpect(jsonPath("$.caracteristicas.especificaciones[0].normalizacion.valor.valor", is(0)))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(response).get("idProducto").asLong();
        assertEquals(3, productoRepository.findById(id).orElseThrow().getCaracteristicas().get("version_esquema"));
    }

    @Test
    @DisplayName("20. Actualizar producto con V3 válida y rechazar V3 inválida sin persistirla")
    void actualizarProductoConV3ValidaEInvalida() throws Exception {
        Producto producto = crearProducto("Actualización V3", true);
        ObjectNode valid = solicitudConCaracteristicas(producto.getNombre(), fichaV3Valida());
        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto()).contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(valid)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.caracteristicas.version_esquema", is(3)));
        ObjectNode invalidFicha = fichaV3Valida();
        invalidFicha.put("categoria", "Smartwatch");
        ObjectNode invalid = solicitudConCaracteristicas(producto.getNombre(), invalidFicha);
        mockMvc.perform(put("/api/productos/{id}", producto.getIdProducto()).contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("categoria")));
        assertEquals("celulares", productoRepository.findById(producto.getIdProducto()).orElseThrow()
                .getCaracteristicas().get("categoria"));
    }

    @Test
    @DisplayName("21. Rechazar versión desconocida y conservar mapas V1, V2 y legacy")
    void despachoPorVersionRechazaDesconocidasYConservaFormatosPrevios() throws Exception {
        ObjectNode unknown = mapper.createObjectNode(); unknown.put("version_esquema", 4);
        ObjectNode requestUnknown = solicitudConCaracteristicas("versión desconocida", unknown);
        mockMvc.perform(post("/api/productos").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(requestUnknown)))
                .andExpect(status().isBadRequest());

        ObjectNode unversionedV3 = fichaV3Valida();
        unversionedV3.remove("version_esquema");
        mockMvc.perform(post("/api/productos").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(solicitudConCaracteristicas("V3 sin versión", unversionedV3))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("version_esquema")));

        for (int version : new int[]{1, 2}) {
            ObjectNode mislabeled = fichaV3Valida(); mislabeled.put("version_esquema", version);
            mockMvc.perform(post("/api/productos").contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(solicitudConCaracteristicas("V3 mal etiquetada", mislabeled))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", containsString("marcadores V3")));

            ObjectNode old = mapper.createObjectNode(); old.put("version_esquema", version); old.put("campoLegacy", "preservado");
            mockMvc.perform(post("/api/productos").contentType(MediaType.APPLICATION_JSON)
                            .content(mapper.writeValueAsString(solicitudConCaracteristicas("V" + version, old))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.caracteristicas.version_esquema", is(version)))
                    .andExpect(jsonPath("$.caracteristicas.campoLegacy", is("preservado")));
        }
        ObjectNode legacy = mapper.createObjectNode(); legacy.put("pantalla", "dato legacy");
        mockMvc.perform(post("/api/productos").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(solicitudConCaracteristicas("Legacy", legacy))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.caracteristicas.pantalla", is("dato legacy")));
    }

    @Test
    @DisplayName("22. Consultar ficha técnica independientemente mediante GET /api/productos/{id}/ficha-tecnica")
    void consultarFichaTecnicaIndependiente() throws Exception {
        Producto conFicha = crearProducto("Con Ficha V3", true);
        conFicha.setCaracteristicas(mapper.convertValue(fichaV3Valida(), Map.class));
        productoRepository.save(conFicha);

        mockMvc.perform(get("/api/productos/{id}/ficha-tecnica", conFicha.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version_esquema", is(3)))
                .andExpect(jsonPath("$.categoria", is("celulares")));

        Producto sinFicha = crearProducto("Sin Ficha", true);
        sinFicha.setCaracteristicas(null);
        productoRepository.save(sinFicha);

        mockMvc.perform(get("/api/productos/{id}/ficha-tecnica", sinFicha.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(content().string("{}"));

        mockMvc.perform(get("/api/productos/{id}/ficha-tecnica", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("23. Actualizar ficha técnica de forma independiente sin alterar atributos generales")
    void actualizarFichaTecnicaIndependiente() throws Exception {
        Producto producto = crearProducto("Producto Para Ficha", true);
        producto.setDescripcion("Descripción intacta");
        producto.setPrecioReferencia(new BigDecimal("1500000.00"));
        producto.setImagen("https://example.com/foto.jpg");
        producto = productoRepository.save(producto);

        // Actualización válida con V3
        ObjectNode fichaV3 = fichaV3Valida();
        mockMvc.perform(put("/api/productos/{id}/ficha-tecnica", producto.getIdProducto())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(fichaV3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProducto", is(producto.getIdProducto().intValue())))
                .andExpect(jsonPath("$.nombre", is("Producto Para Ficha")))
                .andExpect(jsonPath("$.descripcion", is("Descripción intacta")))
                .andExpect(jsonPath("$.precioReferencia", is(1500000.0)))
                .andExpect(jsonPath("$.imagen", is("https://example.com/foto.jpg")))
                .andExpect(jsonPath("$.caracteristicas.version_esquema", is(3)));

        Producto persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals("Producto Para Ficha", persistido.getNombre());
        assertEquals("Descripción intacta", persistido.getDescripcion());
        assertEquals(new BigDecimal("1500000.00"), persistido.getPrecioReferencia());
        assertEquals(3, persistido.getCaracteristicas().get("version_esquema"));

        // Rechazo de V3 inválida
        ObjectNode invalidV3 = fichaV3Valida();
        invalidV3.put("categoria", "smartwatch_invalido");
        mockMvc.perform(put("/api/productos/{id}/ficha-tecnica", producto.getIdProducto())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(invalidV3)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("categoría V3 no soportada")));

        // La ficha previa no se corrompe
        persistido = productoRepository.findById(producto.getIdProducto()).orElseThrow();
        assertEquals("celulares", persistido.getCaracteristicas().get("categoria"));

        // Actualización mediante PATCH
        ObjectNode legacyMap = mapper.createObjectNode();
        legacyMap.put("pantalla", "6.1 OLED");
        mockMvc.perform(patch("/api/productos/{id}/ficha-tecnica", producto.getIdProducto())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(legacyMap)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caracteristicas.pantalla", is("6.1 OLED")))
                .andExpect(jsonPath("$.nombre", is("Producto Para Ficha")));
    }
}
