package com.example.backend.controller;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.entity.*;
import com.example.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@SpringBootTest
@Transactional
class RankingIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    @Autowired
    private MarcaRepository marcaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private ValoracionRepository valoracionRepository;

    @Autowired
    private EstablecimientoRepository establecimientoRepository;

    @Autowired
    private ProductoEstablecimientoRepository productoEstablecimientoRepository;

    @Autowired
    private ResenaRepository resenaRepository;

    private MockMvc mockMvc;

    private Categoria categoria;
    private Marca marca;
    private Rol rolUsuario;
    private Usuario usuario1;
    private Usuario usuario2;
    private Establecimiento establecimiento1;
    private Establecimiento establecimiento2;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        categoria = new Categoria();
        categoria.setNombre("Smartphones");
        categoria.setDescripcion("Teléfonos móviles");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);

        marca = new Marca();
        marca.setNombre("TechBrand");
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        rolUsuario = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Usuario estándar");
                    return rolRepository.save(r);
                });

        usuario1 = new Usuario();
        usuario1.setNombre("Carlos Evaluador");
        usuario1.setCorreo("carlos.eval@tecreview.com");
        usuario1.setRol(rolUsuario);
        usuario1.setEstado(true);
        usuario1 = usuarioRepository.save(usuario1);

        usuario2 = new Usuario();
        usuario2.setNombre("Ana Evaluadora");
        usuario2.setCorreo("ana.eval@tecreview.com");
        usuario2.setRol(rolUsuario);
        usuario2.setEstado(true);
        usuario2 = usuarioRepository.save(usuario2);

        establecimiento1 = new Establecimiento();
        establecimiento1.setNombre("Tienda Central");
        establecimiento1.setDireccion("Calle 100");
        establecimiento1.setEstado(true);
        establecimiento1 = establecimientoRepository.save(establecimiento1);

        establecimiento2 = new Establecimiento();
        establecimiento2.setNombre("Distribuidora Norte");
        establecimiento2.setDireccion("Carrera 15");
        establecimiento2.setEstado(true);
        establecimiento2 = establecimientoRepository.save(establecimiento2);
    }

    private Producto crearProducto(String nombre, BigDecimal precioRef, Boolean estado) {
        Producto p = new Producto();
        p.setNombre(nombre);
        p.setDescripcion("Descripción de " + nombre);
        p.setCategoria(categoria);
        p.setMarca(marca);
        p.setPrecioReferencia(precioRef);
        p.setEstado(estado);
        return productoRepository.save(p);
    }

    private Valoracion crearValoracion(Producto p, Usuario u, Integer puntuacion) {
        Valoracion v = new Valoracion();
        v.setProducto(p);
        v.setUsuario(u);
        v.setPuntuacion(puntuacion);
        v.setFechaCreacion(LocalDateTime.now());
        return valoracionRepository.save(v);
    }

    private ProductoEstablecimiento crearOferta(Producto p, Establecimiento e, BigDecimal precio, Boolean disponible) {
        ProductoEstablecimiento pe = new ProductoEstablecimiento();
        pe.setProducto(p);
        pe.setEstablecimiento(e);
        pe.setPrecio(precio);
        pe.setDisponibilidad(disponible);
        return productoEstablecimientoRepository.save(pe);
    }

    private Resena crearResena(Producto p, Usuario u, String comentario, Boolean estado) {
        Resena r = new Resena();
        r.setProducto(p);
        r.setUsuario(u);
        r.setComentario(comentario);
        r.setFechaCreacion(LocalDateTime.now());
        r.setEstado(estado);
        return resenaRepository.save(r);
    }

    // =========================================================================
    // RANKING 1: MEJOR VALORADOS
    // =========================================================================

    @Test
    @DisplayName("Debe ordenar productos mejor valorados por promedio descendente y asignar posición")
    void debeOrdenarProductosMejorValoradosPorPromedioDescendente() throws Exception {
        Producto p1 = crearProducto("Phone Alto", new BigDecimal("800.00"), true);
        Producto p2 = crearProducto("Phone Medio", new BigDecimal("600.00"), true);
        Producto p3 = crearProducto("Phone Bajo", new BigDecimal("400.00"), true);

        // p1: 5 + 5 = 10 / 2 = 5.0
        crearValoracion(p1, usuario1, 5);
        crearValoracion(p1, usuario2, 5);

        // p2: 4 + 4 = 8 / 2 = 4.0
        crearValoracion(p2, usuario1, 4);
        crearValoracion(p2, usuario2, 4);

        // p3: 2 + 3 = 5 / 2 = 2.5
        crearValoracion(p3, usuario1, 2);
        crearValoracion(p3, usuario2, 3);

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].idProducto").value(p1.getIdProducto()))
                .andExpect(jsonPath("$[0].promedioPuntuacion").value(5.0))
                .andExpect(jsonPath("$[0].cantidadValoraciones").value(2))
                .andExpect(jsonPath("$[0].posicionRanking").value(1))
                .andExpect(jsonPath("$[1].idProducto").value(p2.getIdProducto()))
                .andExpect(jsonPath("$[1].promedioPuntuacion").value(4.0))
                .andExpect(jsonPath("$[1].posicionRanking").value(2))
                .andExpect(jsonPath("$[2].idProducto").value(p3.getIdProducto()))
                .andExpect(jsonPath("$[2].promedioPuntuacion").value(2.5))
                .andExpect(jsonPath("$[2].posicionRanking").value(3));
    }

    @Test
    @DisplayName("Productos sin valoraciones no deben aparecer en el ranking ni recibir puntuaciones ficticias")
    void productosSinValoracionesNoDebenTenerPuntuacionesFicticias() throws Exception {
        Producto pConVal = crearProducto("Phone Valorado", new BigDecimal("700.00"), true);
        Producto pSinVal = crearProducto("Phone Sin Valoraciones", new BigDecimal("500.00"), true);

        crearValoracion(pConVal, usuario1, 4);

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idProducto").value(pConVal.getIdProducto()))
                .andExpect(jsonPath("$[?(@.idProducto == %d)]".formatted(pSinVal.getIdProducto())).doesNotExist());
    }

    @Test
    @DisplayName("Desempate en mejor valorados: a igual promedio, prevalece mayor cantidad de valoraciones")
    void desempateMejorValoradosPorCantidadValoraciones() throws Exception {
        Producto pMasVotos = crearProducto("Phone Muchas Valoraciones", new BigDecimal("700.00"), true);
        Producto pPocosVotos = crearProducto("Phone Pocas Valoraciones", new BigDecimal("750.00"), true);

        // pMasVotos: 2 valoraciones con promedio 5.0
        crearValoracion(pMasVotos, usuario1, 5);
        crearValoracion(pMasVotos, usuario2, 5);

        // pPocosVotos: 1 valoración con promedio 5.0
        crearValoracion(pPocosVotos, usuario1, 5);

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].idProducto").value(pMasVotos.getIdProducto()))
                .andExpect(jsonPath("$[0].cantidadValoraciones").value(2))
                .andExpect(jsonPath("$[1].idProducto").value(pPocosVotos.getIdProducto()))
                .andExpect(jsonPath("$[1].cantidadValoraciones").value(1));
    }

    @Test
    @DisplayName("Desempate idProducto: a igual promedio e igual cantidad, orden determinístico por ID")
    void desempateDeterminísticoPorId() throws Exception {
        Producto pA = crearProducto("Phone Alpha", new BigDecimal("500.00"), true);
        Producto pB = crearProducto("Phone Beta", new BigDecimal("500.00"), true);

        // Ambos con 1 voto de 5
        crearValoracion(pA, usuario1, 5);
        crearValoracion(pB, usuario1, 5);

        Long menorId = Math.min(pA.getIdProducto(), pB.getIdProducto());
        Long mayorId = Math.max(pA.getIdProducto(), pB.getIdProducto());

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idProducto").value(menorId))
                .andExpect(jsonPath("$[1].idProducto").value(mayorId));
    }

    @Test
    @DisplayName("Excluye productos inactivos (borrado lógico) del ranking de mejor valorados")
    void excluyeProductosInactivosDelRanking() throws Exception {
        Producto pInactivo = crearProducto("Phone Inactivo", new BigDecimal("900.00"), false);
        crearValoracion(pInactivo, usuario1, 5);

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // =========================================================================
    // RANKING 2: MÁS DESEADOS & ALTERNATIVO (MÁS COMENTADOS)
    // =========================================================================

    @Test
    @DisplayName("Más deseados retorna lista vacía sin inventar favoritos ficticios")
    void masDeseadosRetornaListaVacia() throws Exception {
        crearProducto("Phone de Muestra", new BigDecimal("500.00"), true);

        mockMvc.perform(get("/api/productos/rankings/mas-deseados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(get("/api/rankings/mas-deseados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Ranking alternativo: más comentados ordena por cantidad de reseñas reales activas")
    void rankingAlternativoMasComentadosPorCantidadResenas() throws Exception {
        Producto pMuchoDebate = crearProducto("Phone Muy Debatido", new BigDecimal("999.00"), true);
        Producto pPocoDebate = crearProducto("Phone Poco Debatido", new BigDecimal("499.00"), true);

        // 2 reseñas para pMuchoDebate
        crearResena(pMuchoDebate, usuario1, "Excelente teléfono, cámara de 10.", true);
        crearResena(pMuchoDebate, usuario2, "Buen diseño transparente.", true);

        // 1 reseña activa y 1 inactiva para pPocoDebate
        crearResena(pPocoDebate, usuario1, "Batería dura 1 día.", true);
        crearResena(pPocoDebate, usuario2, "Comentario eliminado", false); // inactiva

        mockMvc.perform(get("/api/productos/rankings/mas-comentados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].idProducto").value(pMuchoDebate.getIdProducto()))
                .andExpect(jsonPath("$[0].cantidadResenas").value(2))
                .andExpect(jsonPath("$[0].posicionRanking").value(1))
                .andExpect(jsonPath("$[1].idProducto").value(pPocoDebate.getIdProducto()))
                .andExpect(jsonPath("$[1].cantidadResenas").value(1))
                .andExpect(jsonPath("$[1].posicionRanking").value(2));
    }

    // =========================================================================
    // RANKING 3: OFERTAS DESTACADAS
    // =========================================================================

    @Test
    @DisplayName("Cálculo correcto de ahorro y porcentaje de descuento en ofertas")
    void calculoCorrectoDeAhorroYDescuento() throws Exception {
        // Ref: $1000.00
        Producto p1 = crearProducto("Laptop Pro", new BigDecimal("1000.00"), true);
        // Establecimiento 1 ofrece $800.00 -> ahorro $200.00 (20.00%)
        crearOferta(p1, establecimiento1, new BigDecimal("800.00"), true);
        // Establecimiento 2 ofrece $700.00 -> ahorro $300.00 (30.00%)
        crearOferta(p1, establecimiento2, new BigDecimal("700.00"), true);

        // Ref: $500.00
        Producto p2 = crearProducto("Tablet Air", new BigDecimal("500.00"), true);
        // Establecimiento 1 ofrece $450.00 -> ahorro $50.00 (10.00%)
        crearOferta(p2, establecimiento1, new BigDecimal("450.00"), true);

        mockMvc.perform(get("/api/productos/rankings/ofertas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                // Top 1: Laptop Pro con 30.00% de descuento (precio $700.00 del establecimiento 2)
                .andExpect(jsonPath("$[0].idProducto").value(p1.getIdProducto()))
                .andExpect(jsonPath("$[0].precioReferencia").value(1000.0))
                .andExpect(jsonPath("$[0].precioActual").value(700.0))
                .andExpect(jsonPath("$[0].ahorroMonetario").value(300.0))
                .andExpect(jsonPath("$[0].porcentajeDescuento").value(30.0))
                .andExpect(jsonPath("$[0].idEstablecimiento").value(establecimiento2.getIdEstablecimiento()))
                .andExpect(jsonPath("$[0].nombreEstablecimiento").value("Distribuidora Norte"))
                .andExpect(jsonPath("$[0].posicionRanking").value(1))
                // Top 2: Tablet Air con 10.00%
                .andExpect(jsonPath("$[1].idProducto").value(p2.getIdProducto()))
                .andExpect(jsonPath("$[1].precioReferencia").value(500.0))
                .andExpect(jsonPath("$[1].precioActual").value(450.0))
                .andExpect(jsonPath("$[1].ahorroMonetario").value(50.0))
                .andExpect(jsonPath("$[1].porcentajeDescuento").value(10.0))
                .andExpect(jsonPath("$[1].posicionRanking").value(2));
    }

    @Test
    @DisplayName("Productos sin ofertas válidas (precio establecimiento >= precio referencia o nulo) son excluidos")
    void excluyeProductosSinOfertaReal() throws Exception {
        // Caso 1: precio establecimiento igual al de referencia (sin ahorro)
        Producto pSinAhorro = crearProducto("Phone Precio Igual", new BigDecimal("600.00"), true);
        crearOferta(pSinAhorro, establecimiento1, new BigDecimal("600.00"), true);

        // Caso 2: precio establecimiento mayor al de referencia (más caro)
        Producto pMasCaro = crearProducto("Phone Más Caro", new BigDecimal("600.00"), true);
        crearOferta(pMasCaro, establecimiento1, new BigDecimal("650.00"), true);

        // Caso 3: precio referencia nulo
        Producto pRefNulo = crearProducto("Phone Ref Nulo", null, true);
        crearOferta(pRefNulo, establecimiento1, new BigDecimal("400.00"), true);

        // Caso 4: precio referencia cero
        Producto pRefCero = crearProducto("Phone Ref Cero", BigDecimal.ZERO, true);
        crearOferta(pRefCero, establecimiento1, new BigDecimal("100.00"), true);

        // Caso 5: sin disponibilidad en establecimiento
        Producto pAgotado = crearProducto("Phone Agotado", new BigDecimal("800.00"), true);
        crearOferta(pAgotado, establecimiento1, new BigDecimal("500.00"), false); // disponible = false

        // Caso 6: producto sin precios de establecimientos
        crearProducto("Phone Huérfano", new BigDecimal("1000.00"), true);

        mockMvc.perform(get("/api/productos/rankings/ofertas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Desempate en ofertas: a igual porcentaje de descuento, prevalece mayor ahorro monetario")
    void desempateOfertasPorMayorAhorroMonetario() throws Exception {
        // Producto Caro: $1000 ref -> $800 actual (20% descuento, $200 ahorro)
        Producto pCaro = crearProducto("Laptop Cara", new BigDecimal("1000.00"), true);
        crearOferta(pCaro, establecimiento1, new BigDecimal("800.00"), true);

        // Producto Barato: $100 ref -> $80 actual (20% descuento, $20 ahorro)
        Producto pBarato = crearProducto("Accesorio Barato", new BigDecimal("100.00"), true);
        crearOferta(pBarato, establecimiento1, new BigDecimal("80.00"), true);

        mockMvc.perform(get("/api/productos/rankings/ofertas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].idProducto").value(pCaro.getIdProducto()))
                .andExpect(jsonPath("$[0].ahorroMonetario").value(200.0))
                .andExpect(jsonPath("$[1].idProducto").value(pBarato.getIdProducto()))
                .andExpect(jsonPath("$[1].ahorroMonetario").value(20.0));
    }

    // =========================================================================
    // PARÁMETROS, LÍMITES Y MANEJO DE ERRORES (400)
    // =========================================================================

    @Test
    @DisplayName("El parámetro limit restringe la cantidad de resultados devueltos")
    void parametroLimitRestringeResultados() throws Exception {
        Producto p1 = crearProducto("P1", new BigDecimal("100.00"), true);
        Producto p2 = crearProducto("P2", new BigDecimal("100.00"), true);
        Producto p3 = crearProducto("P3", new BigDecimal("100.00"), true);

        crearValoracion(p1, usuario1, 5);
        crearValoracion(p2, usuario1, 4);
        crearValoracion(p3, usuario1, 3);

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados?limit=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].posicionRanking").value(1))
                .andExpect(jsonPath("$[1].posicionRanking").value(2));
    }

    @Test
    @DisplayName("Validación de limit: valores <= 0 o > 100 devuelven 400 Bad Request")
    void validacionParametroLimitInvalidoDevuelve400() throws Exception {
        mockMvc.perform(get("/api/productos/rankings/mejor-valorados?limit=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("El parámetro 'limit' debe ser un número entero positivo")));

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados?limit=-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("El parámetro 'limit' debe ser un número entero positivo")));

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados?limit=101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("El parámetro 'limit' no puede ser superior a 100")));

        mockMvc.perform(get("/api/productos/rankings/mejor-valorados?limit=abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("El parámetro 'limit' tiene un formato inválido")));
    }

    // =========================================================================
    // REGLAS DE ACCESO (RUTAS PÚBLICAS SIN AUTENTICACIÓN)
    // =========================================================================

    @Test
    @DisplayName("Todos los endpoints de rankings son públicos y accesibles sin autenticación")
    void endpointsDeRankingsSonPublicos() throws Exception {
        mockMvc.perform(get("/api/productos/rankings/mejor-valorados"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rankings/mejor-valorados"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/productos/rankings/mas-deseados"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rankings/mas-deseados"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/productos/rankings/mas-comentados"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rankings/mas-comentados"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/productos/rankings/ofertas"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rankings/ofertas"))
                .andExpect(status().isOk());
    }
}
