package com.example.backend.service;

import com.example.backend.dto.MarcaRequest;
import com.example.backend.dto.MarcaResponse;
import com.example.backend.entity.Marca;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.MarcaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MarcaService {

    private final MarcaRepository marcaRepository;

    public MarcaService(MarcaRepository marcaRepository) {
        this.marcaRepository = marcaRepository;
    }

    @Transactional(readOnly = true)
    public List<MarcaResponse> listarActivas() {
        return marcaRepository.findAll().stream()
                .filter(Marca::getEstado)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MarcaResponse obtenerPorId(Long id) {
        return toResponse(buscarOFallar(id));
    }

    @Transactional
    public MarcaResponse crear(MarcaRequest request) {
        Marca marca = new Marca();
        marca.setNombre(request.nombre());
        marca.setDescripcion(request.descripcion());
        marca.setEstado(true);
        return toResponse(marcaRepository.save(marca));
    }

    @Transactional
    public MarcaResponse actualizar(Long id, MarcaRequest request) {
        Marca marca = buscarOFallar(id);
        marca.setNombre(request.nombre());
        marca.setDescripcion(request.descripcion());
        return toResponse(marcaRepository.save(marca));
    }

    @Transactional
    public void eliminar(Long id) {
        Marca marca = buscarOFallar(id);
        marca.setEstado(false);
        marcaRepository.save(marca);
    }

    private Marca buscarOFallar(Long id) {
        return marcaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Marca no encontrada con id " + id));
    }

    private MarcaResponse toResponse(Marca marca) {
        return new MarcaResponse(
                marca.getIdMarca(),
                marca.getNombre(),
                marca.getDescripcion(),
                marca.getEstado()
        );
    }
}
