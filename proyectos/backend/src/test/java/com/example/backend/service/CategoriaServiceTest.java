package com.example.backend.service;

import com.example.backend.dto.CategoriaRequest;
import com.example.backend.dto.CategoriaResponse;
import com.example.backend.entity.Categoria;
import com.example.backend.exception.ConflictException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.CategoriaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CategoriaServiceTest {

    @Mock
    private CategoriaRepository categoriaRepository;

    @InjectMocks
    private CategoriaService categoriaService;

    private Categoria activeCategoria;
    private Categoria inactiveCategoria;

    @BeforeEach
    void setUp() {
        activeCategoria = new Categoria();
        activeCategoria.setIdCategoria(1L);
        activeCategoria.setNombre("Activa");
        activeCategoria.setDescripcion("Desc");
        activeCategoria.setEstado(true);

        inactiveCategoria = new Categoria();
        inactiveCategoria.setIdCategoria(2L);
        inactiveCategoria.setNombre("Inactiva");
        inactiveCategoria.setDescripcion("Desc");
        inactiveCategoria.setEstado(false);
    }

    @Test
    void listarActivas_deveRetornarSoloActivas() {
        given(categoriaRepository.findByEstadoTrue()).willReturn(List.of(activeCategoria));
        List<CategoriaResponse> result = categoriaService.listarActivas();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).nombre()).isEqualTo("Activa");
        assertThat(result.get(0).estado()).isTrue();
    }

    @Test
    void obtenerPorId_cuandoExiste_devuelveDto() {
        given(categoriaRepository.findById(1L)).willReturn(Optional.of(activeCategoria));
        CategoriaResponse response = categoriaService.obtenerPorId(1L);
        assertThat(response.idCategoria()).isEqualTo(1L);
        assertThat(response.nombre()).isEqualTo("Activa");
    }

    @Test
    void obtenerPorId_cuandoNoExiste_lanzaResourceNotFoundException() {
        given(categoriaRepository.findById(99L)).willReturn(Optional.empty());
        assertThatThrownBy(() -> categoriaService.obtenerPorId(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Categoría no encontrada");
    }

    @Test
    void crear_devePersistirConEstadoTrue() {
        CategoriaRequest request = new CategoriaRequest("Nueva", "Desc");
        Categoria saved = new Categoria();
        saved.setIdCategoria(10L);
        saved.setNombre("Nueva");
        saved.setDescripcion("Desc");
        saved.setEstado(true);
        given(categoriaRepository.save(any(Categoria.class))).willReturn(saved);
        CategoriaResponse response = categoriaService.crear(request);
        assertThat(response.idCategoria()).isEqualTo(10L);
        assertThat(response.estado()).isTrue();
    }

    @Test
    void actualizar_cuandoExiste_actualizaCampos() {
        CategoriaRequest request = new CategoriaRequest("Modificada", "Nueva Desc");
        given(categoriaRepository.findById(1L)).willReturn(Optional.of(activeCategoria));
        given(categoriaRepository.save(any(Categoria.class))).willAnswer(invocation -> invocation.getArgument(0));
        CategoriaResponse response = categoriaService.actualizar(1L, request);
        assertThat(response.nombre()).isEqualTo("Modificada");
        assertThat(response.descripcion()).isEqualTo("Nueva Desc");
    }

    @Test
    void eliminar_cuandoActiva_marcaInactiva() {
        given(categoriaRepository.findById(1L)).willReturn(Optional.of(activeCategoria));
        given(categoriaRepository.save(any(Categoria.class))).willAnswer(invocation -> invocation.getArgument(0));
        categoriaService.eliminar(1L);
        verify(categoriaRepository).save(activeCategoria);
        assertThat(activeCategoria.getEstado()).isFalse();
    }

    @Test
    void eliminar_cuandoYaInactiva_lanzaConflictException() {
        given(categoriaRepository.findById(2L)).willReturn(Optional.of(inactiveCategoria));
        assertThatThrownBy(() -> categoriaService.eliminar(2L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Categoría ya está inactiva");
    }
}
