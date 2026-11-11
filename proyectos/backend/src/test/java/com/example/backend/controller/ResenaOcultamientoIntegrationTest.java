package com.example.backend.controller;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.entity.Resena;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
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

@SpringBootTest
@Transactional
class ResenaOcultamientoIntegrationTest {

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
    private ResenaRepository resenaRepository;

    private MockMvc mockMvc;

    private Producto productoA;
    private Producto productoB;
    private Usuario usuario1;
    private Usuario usuario2;
    private Usuario usuario3;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        Categoria categoria = new Categoria();
        categoria.setNombre("Dispositivos");
        categoria.setDescripcion("Categoría de prueba");
        categoria.setEstado(true);
        categoria = categoriaRepository.save(categoria);

        Marca marca = new Marca();
        marca.setNombre("TechBrand");
        marca.setDescripcion("Marca de prueba");
        marca.setEstado(true);
        marca = marcaRepository.save(marca);

        Rol rol = rolRepository.findByNombre("Usuario registrado")
                .orElseGet(() -> {
                    Rol r = new Rol();
                    r.setNombre("Usuario registrado");
                    r.setDescripcion("Rol normal");
                    return rolRepository.save(r);
                });

        usuario1 = new Usuario();
        usuario1.setNombre("Usuario Uno");
        usuario1.setCorreo("user1_ocultamiento@test.com");
        usuario1.setSupabaseUid(UUID.randomUUID().toString());
        usuario1.setRol(rol);
        usuario1.setEstado(true);
        usuario1.setFechaRegistro(LocalDateTime.now());
        usuario1 = usuarioRepository.save(usuario1);

        usuario2 = new Usuario();
        usuario2.setNombre("Usuario Dos");
        usuario2.setCorreo("user2_ocultamiento@test.com");
        usuario2.setSupabaseUid(UUID.randomUUID().toString());
        usuario2.setRol(rol);
        usuario2.setEstado(true);
        usuario2.setFechaRegistro(LocalDateTime.now());
        usuario2 = usuarioRepository.save(usuario2);

        usuario3 = new Usuario();
        usuario3.setNombre("Usuario Tres");
        usuario3.setCorreo("user3_ocultamiento@test.com");
        usuario3.setSupabaseUid(UUID.randomUUID().toString());
        usuario3.setRol(rol);
        usuario3.setEstado(true);
        usuario3.setFechaRegistro(LocalDateTime.now());
        usuario3 = usuarioRepository.save(usuario3);

        productoA = new Producto();
        productoA.setNombre("Smartphone Alpha");
        productoA.setDescripcion("Producto Alpha");
        productoA.setCategoria(categoria);
        productoA.setMarca(marca);
        productoA.setPrecioReferencia(new BigDecimal("799.00"));
        productoA.setEstado(true);
        productoA = productoRepository.save(productoA);

        productoB = new Producto();
        productoB.setNombre("Smartphone Beta");
        productoB.setDescripcion("Producto Beta");
        productoB.setCategoria(categoria);
        productoB.setMarca(marca);
        productoB.setPrecioReferencia(new BigDecimal("599.00"));
        productoB.setEstado(true);
        productoB = productoRepository.save(productoB);
    }

    private Resena crearResena(Producto prod, Usuario user, String comentario, int puntuacion, boolean estado, boolean ocultaPorReportes) {
        Resena r = new Resena();
        r.setProducto(prod);
        r.setUsuario(user);
        r.setComentario(comentario);
        r.setPuntuacion(puntuacion);
        r.setEstado(estado);
        r.setOcultaPorReportes(ocultaPorReportes);
        r.setFechaCreacion(LocalDateTime.now());
        return resenaRepository.save(r);
    }

    @Test
    @DisplayName("Listado público excluye reseñas con oculta_por_reportes = true y con estado = false")
    void listadoPublicoExcluyeResenasOcultasYEliminadas() throws Exception {
        // 1. Reseña visible
        Resena visible = crearResena(productoA, usuario1, "Reseña visible pública", 5, true, false);

        // 2. Reseña oculta por moderación
        Resena oculta = crearResena(productoA, usuario2, "Reseña oculta por spam", 1, true, true);

        // 3. Reseña eliminada por el autor
        Resena eliminada = crearResena(productoB, usuario3, "Reseña eliminada", 3, false, false);

        // Consultar /api/resenas general
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(visible.getIdResena()))
                .andExpect(jsonPath("$[0].comentario").value("Reseña visible pública"))
                .andExpect(jsonPath("$[?(@.idResena == %d)]".formatted(oculta.getIdResena())).doesNotExist())
                .andExpect(jsonPath("$[?(@.idResena == %d)]".formatted(eliminada.getIdResena())).doesNotExist());

        // Consultar /api/productos/{id}/resenas específico
        mockMvc.perform(get("/api/productos/{id}/resenas", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(visible.getIdResena()))
                .andExpect(jsonPath("$[?(@.idResena == %d)]".formatted(oculta.getIdResena())).doesNotExist());
    }

    @Test
    @DisplayName("Promedio de puntuación y conteo excluyen reseñas ocultas por reportes")
    void promedioYConteoExcluyenResenasOcultas() throws Exception {
        // Inicialmente dos reseñas activas: 5 y 1 (promedio = 3.0)
        crearResena(productoA, usuario1, "Excelente producto", 5, true, false);
        Resena resenaSpam = crearResena(productoA, usuario2, "Spam fraudulento", 1, true, false);

        mockMvc.perform(get("/api/productos/{id}/valoracion-stats", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadValoraciones").value(2))
                .andExpect(jsonPath("$.promedioPuntuacion").value(3.0));

        // Se oculta la reseña por moderación (ocultaPorReportes = true)
        resenaSpam.setOcultaPorReportes(true);
        resenaRepository.saveAndFlush(resenaSpam);

        // El promedio ahora debe calcularse solo con la reseña visible (promedio = 5.0, cantidad = 1)
        mockMvc.perform(get("/api/productos/{id}/valoracion-stats", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadValoraciones").value(1))
                .andExpect(jsonPath("$.promedioPuntuacion").value(5.0));
    }

    @Test
    @DisplayName("Rankings de mejor valorados y más comentados ignoran reseñas ocultas por reportes")
    void rankingsIgnoranResenasOcultas() throws Exception {
        // Producto B recibe reseña 5 estrellas pero oculta por moderación
        crearResena(productoB, usuario1, "Excelente falso", 5, true, true);

        // Producto A recibe reseña 4 estrellas visible
        crearResena(productoA, usuario2, "Muy buen teléfono", 4, true, false);

        // Ranking mejor valorados: solo debe aparecer Producto A (Producto B tiene 0 reseñas válidas)
        mockMvc.perform(get("/api/productos/rankings/mejor-valorados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idProducto").value(productoA.getIdProducto()))
                .andExpect(jsonPath("$[0].promedioPuntuacion").value(4.0))
                .andExpect(jsonPath("$[?(@.idProducto == %d)]".formatted(productoB.getIdProducto())).doesNotExist());

        // Ranking más comentados: solo debe figurar Producto A con 1 comentario
        mockMvc.perform(get("/api/productos/rankings/mas-comentados"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idProducto").value(productoA.getIdProducto()))
                .andExpect(jsonPath("$[0].cantidadResenas").value(1))
                .andExpect(jsonPath("$[?(@.idProducto == %d)]".formatted(productoB.getIdProducto())).doesNotExist());
    }

    @Test
    @DisplayName("Recuperación de visibilidad: cuando oculta_por_reportes vuelve a false, la reseña reaparece")
    void recuperacionDeVisibilidadAlDesocultar() throws Exception {
        Resena resena = crearResena(productoA, usuario1, "Reseña reportada injustamente", 5, true, true);

        // Oculta: no figura en listado ni estadísticas
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(get("/api/productos/{id}/valoracion-stats", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadValoraciones").value(0));

        // Administrador rechaza reportes: ocultaPorReportes pasa a false
        resena.setOcultaPorReportes(false);
        resenaRepository.saveAndFlush(resena);

        // Ahora reaparece públicamente
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].idResena").value(resena.getIdResena()))
                .andExpect(jsonPath("$[0].puntuacion").value(5));

        mockMvc.perform(get("/api/productos/{id}/valoracion-stats", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadValoraciones").value(1))
                .andExpect(jsonPath("$.promedioPuntuacion").value(5.0));
    }

    @Test
    @DisplayName("Preservación del borrado lógico: una reseña con estado = false nunca reaparece aunque oculta_por_reportes sea false")
    void preservacionDeBorradoLogico() throws Exception {
        // Reseña eliminada por el autor pero no oculta por reportes
        Resena resena = crearResena(productoA, usuario1, "Reseña que el autor borró", 5, false, false);

        // No aparece en listados públicos
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(get("/api/productos/{id}/valoracion-stats", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadValoraciones").value(0));

        // Aunque se confirme ocultaPorReportes = false explícitamente
        resena.setOcultaPorReportes(false);
        resenaRepository.saveAndFlush(resena);

        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Upsert con POST: un usuario con reseña oculta por reportes puede actualizarla conservando idResena, sin duplicar y manteniendo el ocultamiento")
    void upsertConPostSobreResenaOcultaConservaIdYPermaneceOculta() throws Exception {
        // Reseña previa que fue ocultada por acumulación de reportes
        Resena resenaOculta = crearResena(productoA, usuario1, "Opinión inicial que fue reportada", 2, true, true);
        Long idResenaOriginal = resenaOculta.getIdResena();
        long totalInicialEnBd = resenaRepository.count();

        // El autor ejecuta POST (upsert) para corregir/actualizar su reseña
        mockMvc.perform(post("/api/resenas")
                        .with(jwt().jwt(builder -> builder
                                .subject(usuario1.getSupabaseUid())
                                .claim("email", usuario1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "idProducto": %d,
                                    "comentario": "Comentario rectificado por el autor",
                                    "puntuacion": 5
                                }
                                """.formatted(productoA.getIdProducto())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idResena").value(idResenaOriginal))
                .andExpect(jsonPath("$.comentario").value("Comentario rectificado por el autor"))
                .andExpect(jsonPath("$.puntuacion").value(5));

        // 1. Conserva el mismo idResena y no se inserta una segunda reseña
        assertEquals(totalInicialEnBd, resenaRepository.count(), "No debe insertarse una segunda reseña en la base de datos");

        // 2. Comprobar que en la base de datos se actualizaron los campos pero sigue oculta
        Resena resenaEnBd = resenaRepository.findById(idResenaOriginal).orElseThrow();
        assertEquals("Comentario rectificado por el autor", resenaEnBd.getComentario());
        assertEquals(5, resenaEnBd.getPuntuacion());
        assertTrue(resenaEnBd.getEstado(), "El estado debe permanecer activo (true)");
        assertTrue(resenaEnBd.getOcultaPorReportes(), "La reseña debe continuar oculta por reportes tras la actualización");

        // 3. Confirmar que sigue sin aparecer en consultas públicas
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(get("/api/productos/{id}/valoracion-stats", productoA.getIdProducto()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidadValoraciones").value(0));
    }

    @Test
    @DisplayName("PUT por el autor: puede actualizar su reseña oculta por reportes y esta continúa oculta")
    void putPorAutorSobreResenaOcultaActualizaYConservaOcultamiento() throws Exception {
        Resena resenaOculta = crearResena(productoA, usuario1, "Reseña original oculta para PUT", 1, true, true);
        Long idResenaOriginal = resenaOculta.getIdResena();

        mockMvc.perform(put("/api/resenas/" + idResenaOriginal)
                        .with(jwt().jwt(builder -> builder
                                .subject(usuario1.getSupabaseUid())
                                .claim("email", usuario1.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "comentario": "Comentario mejorado mediante PUT del autor",
                                    "puntuacion": 4
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idResena").value(idResenaOriginal))
                .andExpect(jsonPath("$.comentario").value("Comentario mejorado mediante PUT del autor"))
                .andExpect(jsonPath("$.puntuacion").value(4));

        Resena resenaEnBd = resenaRepository.findById(idResenaOriginal).orElseThrow();
        assertEquals("Comentario mejorado mediante PUT del autor", resenaEnBd.getComentario());
        assertEquals(4, resenaEnBd.getPuntuacion());
        assertTrue(resenaEnBd.getOcultaPorReportes(), "La reseña debe permanecer oculta por reportes tras el PUT");

        // Permanece excluida del listado público
        mockMvc.perform(get("/api/resenas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Autorización en reseña oculta: un tercero o usuario anónimo no puede modificar la reseña ajena")
    void autorizacionEnResenaOcultaImpideModificacionPorTercerosOAnonimos() throws Exception {
        Resena resenaOculta = crearResena(productoA, usuario1, "Reseña del autor protegida", 3, true, true);
        Long idResenaOriginal = resenaOculta.getIdResena();

        // 1. Un tercero autenticado (usuario2) intenta modificar la reseña -> 403 Forbidden
        mockMvc.perform(put("/api/resenas/" + idResenaOriginal)
                        .with(jwt().jwt(builder -> builder
                                .subject(usuario2.getSupabaseUid())
                                .claim("email", usuario2.getCorreo())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "comentario": "Intento de modificación maliciosa por tercero",
                                    "puntuacion": 1
                                }
                                """))
                .andExpect(status().isForbidden());

        // 2. Un usuario anónimo (sin JWT) intenta modificar la reseña -> 401 Unauthorized
        mockMvc.perform(put("/api/resenas/" + idResenaOriginal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "comentario": "Intento anónimo no autenticado",
                                    "puntuacion": 1
                                }
                                """))
                .andExpect(status().isUnauthorized());

        // 3. Verificar que la reseña en la base de datos no fue alterada
        Resena resenaEnBd = resenaRepository.findById(idResenaOriginal).orElseThrow();
        assertEquals("Reseña del autor protegida", resenaEnBd.getComentario());
        assertEquals(3, resenaEnBd.getPuntuacion());
        assertTrue(resenaEnBd.getOcultaPorReportes());
    }
}

