package com.example.backend.service;

import com.example.backend.dto.*;
import com.example.backend.entity.Producto;
import com.example.backend.entity.ProductoEstablecimiento;
import com.example.backend.repository.ProductoEstablecimientoRepository;
import com.example.backend.repository.ProductoRepository;
import com.example.backend.repository.ResenaRepository;
import com.example.backend.repository.ValoracionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio encargado de calcular rankings con información real disponible en la base de datos.
 *
 * Ranking 1: Productos mejor valorados según las valoraciones numéricas reales almacenadas.
 * Ranking 2: Productos más deseados (documentando que actualmente no existe tabla de favoritos).
 * Ranking 2 alternativo: Productos con mayor interacción de la comunidad (más comentados).
 * Ranking 3: Ofertas destacadas comparando precios de establecimientos con el precio de referencia.
 */
@Service
public class RankingService {

    private final ProductoRepository productoRepository;
    private final ValoracionRepository valoracionRepository;
    private final ProductoEstablecimientoRepository productoEstablecimientoRepository;
    private final ResenaRepository resenaRepository;

    public RankingService(
            ProductoRepository productoRepository,
            ValoracionRepository valoracionRepository,
            ProductoEstablecimientoRepository productoEstablecimientoRepository,
            ResenaRepository resenaRepository) {
        this.productoRepository = productoRepository;
        this.valoracionRepository = valoracionRepository;
        this.productoEstablecimientoRepository = productoEstablecimientoRepository;
        this.resenaRepository = resenaRepository;
    }

    /**
     * Obtiene los productos mejor valorados basados en las valoraciones reales.
     * Criterio de ordenación:
     * 1. Promedio de puntuación descendente (escala 1 a 5).
     * 2. Cantidad de valoraciones descendente (desempate por volumen de opiniones).
     * 3. ID de producto ascendente (desempate determinístico y estable).
     */
    @Transactional(readOnly = true)
    public List<ProductoMejorValoradoResponse> obtenerMejorValorados(Integer limit) {
        int cap = validarLimit(limit);
        Pageable pageable = PageRequest.of(0, cap);

        List<ValoracionStats> statsList = valoracionRepository.findMejorValoradosStats(pageable);
        if (statsList.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> ids = statsList.stream().map(ValoracionStats::idProducto).toList();
        Map<Long, Producto> productosMap = productoRepository.findByIdProductoIn(ids).stream()
                .collect(Collectors.toMap(Producto::getIdProducto, p -> p));

        List<ProductoMejorValoradoResponse> resultado = new ArrayList<>();
        int ranking = 1;
        for (ValoracionStats stats : statsList) {
            Producto p = productosMap.get(stats.idProducto());
            if (p != null) {
                double promedioRedondeado = BigDecimal.valueOf(stats.promedio())
                        .setScale(2, RoundingMode.HALF_UP)
                        .doubleValue();

                resultado.add(new ProductoMejorValoradoResponse(
                        p.getIdProducto(),
                        p.getNombre(),
                        p.getDescripcion(),
                        p.getCategoria().getIdCategoria(),
                        p.getMarca().getIdMarca(),
                        p.getImagen(),
                        p.getPrecioReferencia(),
                        p.getCaracteristicas(),
                        promedioRedondeado,
                        stats.total(),
                        ranking++
                ));
            }
        }
        return resultado;
    }

    /**
     * Ranking de productos más deseados.
     * El modelo de datos actual de TecnoReview no registra favoritos, listas de deseos
     * ni interacciones equivalentes en la base de datos.
     * Por estricta fidelidad de datos, este endpoint no inventa valores ni genera registros
     * ficticios, devolviendo una lista vacía hasta la implementación de favoritos en una fase futura.
     */
    @Transactional(readOnly = true)
    public List<ProductoDeseadoResponse> obtenerMasDeseados(Integer limit) {
        validarLimit(limit);
        return Collections.emptyList();
    }

    /**
     * Ranking alternativo basado en interacciones reales de la comunidad:
     * Productos con mayor número de reseñas y comentarios publicados.
     * Criterio de ordenación:
     * 1. Cantidad de reseñas activas descendente.
     * 2. ID de producto ascendente (desempate determinístico).
     */
    @Transactional(readOnly = true)
    public List<ProductoMasComentadoResponse> obtenerMasComentados(Integer limit) {
        int cap = validarLimit(limit);
        Pageable pageable = PageRequest.of(0, cap);

        List<ResenaStats> statsList = resenaRepository.findMasComentadosStats(pageable);
        if (statsList.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> ids = statsList.stream().map(ResenaStats::idProducto).toList();
        Map<Long, Producto> productosMap = productoRepository.findByIdProductoIn(ids).stream()
                .collect(Collectors.toMap(Producto::getIdProducto, p -> p));

        List<ProductoMasComentadoResponse> resultado = new ArrayList<>();
        int ranking = 1;
        for (ResenaStats stats : statsList) {
            Producto p = productosMap.get(stats.idProducto());
            if (p != null) {
                resultado.add(new ProductoMasComentadoResponse(
                        p.getIdProducto(),
                        p.getNombre(),
                        p.getDescripcion(),
                        p.getCategoria().getIdCategoria(),
                        p.getMarca().getIdMarca(),
                        p.getImagen(),
                        p.getPrecioReferencia(),
                        p.getCaracteristicas(),
                        stats.total(),
                        ranking++
                ));
            }
        }
        return resultado;
    }

    /**
     * Obtiene las ofertas destacadas calculadas comparando el precio de establecimientos
     * con el precio de referencia del producto.
     *
     * Reglas y validaciones:
     * - El producto debe estar activo y tener precioReferencia > 0.
     * - El establecimiento debe estar activo y el producto disponible en stock (disponibilidad = true).
     * - El precio del establecimiento debe ser estrictamente positivo y menor que el precio de referencia.
     * - Si múltiples establecimientos ofrecen el mismo producto con descuento, se selecciona
     *   aquel que ofrece el menor precio (mayor beneficio para el usuario).
     * - Criterio de ordenación:
     *   1. Mayor porcentaje de descuento descendente.
     *   2. Mayor ahorro monetario descendente (desempate).
     *   3. ID de producto ascendente (desempate determinístico).
     */
    @Transactional(readOnly = true)
    public List<ProductoOfertaResponse> obtenerOfertasDestacadas(Integer limit) {
        int cap = validarLimit(limit);

        List<ProductoEstablecimiento> ofertasValidas = productoEstablecimientoRepository.findOfertasValidas();
        if (ofertasValidas.isEmpty()) {
            return Collections.emptyList();
        }

        // Agrupar por producto para quedarnos con el establecimiento que ofrezca el menor precio
        Map<Long, List<ProductoEstablecimiento>> porProducto = ofertasValidas.stream()
                .collect(Collectors.groupingBy(pe -> pe.getProducto().getIdProducto()));

        List<ProductoOfertaResponse> candidatos = new ArrayList<>();
        for (List<ProductoEstablecimiento> opciones : porProducto.values()) {
            ProductoEstablecimiento mejorOpcion = opciones.stream()
                    .min(Comparator.comparing(ProductoEstablecimiento::getPrecio)
                            .thenComparing(pe -> pe.getEstablecimiento().getIdEstablecimiento()))
                    .orElse(null);

            if (mejorOpcion == null) {
                continue;
            }

            Producto p = mejorOpcion.getProducto();
            BigDecimal ref = p.getPrecioReferencia();
            BigDecimal actual = mejorOpcion.getPrecio();

            // Salvaguardas matemáticas adicionales contra datos anómalos
            if (ref == null || ref.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (actual == null || actual.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (actual.compareTo(ref) >= 0) {
                continue;
            }

            BigDecimal ahorroMonetario = ref.subtract(actual);
            BigDecimal porcentajeDescuento = ahorroMonetario
                    .multiply(BigDecimal.valueOf(100))
                    .divide(ref, 2, RoundingMode.HALF_UP);

            candidatos.add(new ProductoOfertaResponse(
                    p.getIdProducto(),
                    p.getNombre(),
                    p.getDescripcion(),
                    p.getCategoria().getIdCategoria(),
                    p.getMarca().getIdMarca(),
                    p.getImagen(),
                    p.getCaracteristicas(),
                    ref,
                    actual,
                    ahorroMonetario,
                    porcentajeDescuento,
                    mejorOpcion.getEstablecimiento().getIdEstablecimiento(),
                    mejorOpcion.getEstablecimiento().getNombre(),
                    null
            ));
        }

        // Ordenar candidatos
        candidatos.sort(Comparator.comparing(ProductoOfertaResponse::porcentajeDescuento).reversed()
                .thenComparing(Comparator.comparing(ProductoOfertaResponse::ahorroMonetario).reversed())
                .thenComparing(ProductoOfertaResponse::idProducto));

        List<ProductoOfertaResponse> resultado = new ArrayList<>();
        int ranking = 1;
        for (int i = 0; i < Math.min(candidatos.size(), cap); i++) {
            ProductoOfertaResponse c = candidatos.get(i);
            resultado.add(new ProductoOfertaResponse(
                    c.idProducto(),
                    c.nombre(),
                    c.descripcion(),
                    c.idCategoria(),
                    c.idMarca(),
                    c.imagen(),
                    c.caracteristicas(),
                    c.precioReferencia(),
                    c.precioActual(),
                    c.ahorroMonetario(),
                    c.porcentajeDescuento(),
                    c.idEstablecimiento(),
                    c.nombreEstablecimiento(),
                    ranking++
            ));
        }

        return resultado;
    }

    private int validarLimit(Integer limit) {
        if (limit == null) {
            return 10;
        }
        if (limit <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El parámetro 'limit' debe ser un número entero positivo mayor que cero"
            );
        }
        if (limit > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El parámetro 'limit' no puede ser superior a 100"
            );
        }
        return limit;
    }
}
