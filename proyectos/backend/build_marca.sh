set -e
BASE="src/main/java/com/example/backend"

# ---------- DTOs ----------
cat > "$BASE/dto/MarcaRequest.java" << 'EOF'
package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos que el cliente envía para crear o actualizar una marca.
 */
public record MarcaRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
        String nombre,

        String descripcion
) {
}
EOF

cat > "$BASE/dto/MarcaResponse.java" << 'EOF'
package com.example.backend.dto;

/**
 * Datos que la API devuelve al consultar una marca.
 */
public record MarcaResponse(
        Long idMarca,
        String nombre,
        String descripcion,
        Boolean estado
) {
}
EOF

# ---------- Service ----------
cat > "$BASE/service/MarcaService.java" << 'EOF'
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
EOF

# ---------- Controller ----------
cat > "$BASE/controller/MarcaController.java" << 'EOF'
package com.example.backend.controller;

import com.example.backend.dto.MarcaRequest;
import com.example.backend.dto.MarcaResponse;
import com.example.backend.service.MarcaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/marcas")
public class MarcaController {

    private final MarcaService marcaService;

    public MarcaController(MarcaService marcaService) {
        this.marcaService = marcaService;
    }

    @GetMapping
    public List<MarcaResponse> listar() {
        return marcaService.listarActivas();
    }

    @GetMapping("/{id}")
    public MarcaResponse obtener(@PathVariable Long id) {
        return marcaService.obtenerPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MarcaResponse crear(@Valid @RequestBody MarcaRequest request) {
        return marcaService.crear(request);
    }

    @PutMapping("/{id}")
    public MarcaResponse actualizar(@PathVariable Long id, @Valid @RequestBody MarcaRequest request) {
        return marcaService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        marcaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
EOF

echo "Listo: MarcaRequest, MarcaResponse, MarcaService, MarcaController creados."