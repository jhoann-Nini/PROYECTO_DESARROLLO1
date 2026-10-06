package com.example.backend.service;

import com.example.backend.dto.ProductoRequest;
import com.example.backend.dto.ProductoResponse;
import com.example.backend.entity.Categoria;
import com.example.backend.entity.Marca;
import com.example.backend.entity.Producto;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.CategoriaRepository;
import com.example.backend.repository.MarcaRepository;
import com.example.backend.repository.ProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final MarcaRepository marcaRepository;

    public ProductoService(
            ProductoRepository productoRepository,
            CategoriaRepository categoriaRepository,
            MarcaRepository marcaRepository) {

        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
        this.marcaRepository = marcaRepository;
    }


    @Transactional(readOnly = true)
    public List<ProductoResponse> listarActivos() {
        return productoRepository.findByEstadoTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public List<ProductoResponse> listarPorCategoria(Long idCategoria) {
        return productoRepository.findByCategoriaIdCategoriaAndEstadoTrue(idCategoria)
                .stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public List<ProductoResponse> listarPorMarca(Long idMarca) {
        return productoRepository.findByMarcaIdMarcaAndEstadoTrue(idMarca)
                .stream()
                .map(this::toResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public ProductoResponse obtenerPorId(Long id) {
        return toResponse(buscarActivoOFallar(id));
    }


    @Transactional
    public ProductoResponse crear(ProductoRequest request) {

        Categoria categoria = buscarCategoriaOFallar(request.idCategoria());
        Marca marca = buscarMarcaOFallar(request.idMarca());

        Producto producto = new Producto();

        producto.setNombre(request.nombre());
        producto.setDescripcion(request.descripcion());
        producto.setCategoria(categoria);
        producto.setMarca(marca);
        producto.setImagen(request.imagen());
        producto.setPrecioReferencia(request.precioReferencia());
        producto.setEstado(true);

        return toResponse(productoRepository.save(producto));
    }


    @Transactional
    public ProductoResponse actualizar(Long id, ProductoRequest request) {

        Producto producto = buscarActivoOFallar(id);

        producto.setNombre(request.nombre());
        producto.setDescripcion(request.descripcion());
        producto.setCategoria(buscarCategoriaOFallar(request.idCategoria()));
        producto.setMarca(buscarMarcaOFallar(request.idMarca()));
        producto.setImagen(request.imagen());
        producto.setPrecioReferencia(request.precioReferencia());

        return toResponse(productoRepository.save(producto));
    }


    @Transactional
    public void eliminar(Long id) {

        Producto producto = buscarActivoOFallar(id);

        producto.setEstado(false);

        productoRepository.save(producto);
    }


    private Producto buscarActivoOFallar(Long id) {

        return productoRepository.findById(id)
                .filter(Producto::getEstado)
                .orElseThrow(() ->
                    new ResourceNotFoundException(
                    "Producto no encontrado con id " + id));
    }


    private Categoria buscarCategoriaOFallar(Long idCategoria) {

        return categoriaRepository.findById(idCategoria)
                .orElseThrow(() ->
                    new ResourceNotFoundException(
                    "Categoría no encontrada con id " + idCategoria));
    }


    private Marca buscarMarcaOFallar(Long idMarca) {

        return marcaRepository.findById(idMarca)
                .orElseThrow(() ->
                    new ResourceNotFoundException(
                    "Marca no encontrada con id " + idMarca));
    }


    private ProductoResponse toResponse(Producto producto) {

        return new ProductoResponse(
                producto.getIdProducto(),
                producto.getNombre(),
                producto.getDescripcion(),
                producto.getCategoria().getIdCategoria(),
                producto.getMarca().getIdMarca(),
                producto.getImagen(),
                producto.getPrecioReferencia(),
                producto.getEstado()
        );
    }
}
