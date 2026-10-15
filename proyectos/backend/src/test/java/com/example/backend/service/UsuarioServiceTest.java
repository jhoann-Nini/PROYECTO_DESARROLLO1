package com.example.backend.service;

import com.example.backend.dto.UsuarioMeResponse;
import com.example.backend.entity.Rol;
import com.example.backend.entity.Usuario;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.RolRepository;
import com.example.backend.repository.UsuarioRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private RolRepository rolRepository;

    @Mock
    private PlatformTransactionManager txManager;

    private UsuarioService usuarioService;

    private final String validUuidStr = UUID.randomUUID().toString();
    private final String testEmail = "usuario@tecreview.com";
    private Rol rolDefault;

    @BeforeEach
    void setUp() {
        TransactionStatus status = mock(TransactionStatus.class);
        lenient().when(txManager.getTransaction(any())).thenReturn(status);

        usuarioService = new UsuarioService(usuarioRepository, rolRepository, txManager);

        rolDefault = new Rol();
        rolDefault.setIdRol(1L);
        rolDefault.setNombre("Usuario registrado");
        rolDefault.setDescripcion("Rol predeterminado");
    }

    private Jwt buildJwt(String sub, String email, Boolean emailVerified, Map<String, Object> userMetadata) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", sub);
        if (email != null) {
            claims.put("email", email);
        }
        if (emailVerified != null) {
            claims.put("email_verified", emailVerified);
        }
        if (userMetadata != null) {
            claims.put("user_metadata", userMetadata);
        }

        return new Jwt(
                "mock-token-value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "ES256", "typ", "JWT"),
                claims
        );
    }

    @Test
    @DisplayName("Usuario existente: devuelve DTO sin intentar persistir un nuevo registro")
    void obtenerOProveerUsuario_cuandoUsuarioYaExiste_retornaDtoSinPersistir() {
        Usuario existente = new Usuario();
        existente.setIdUsuario(42L);
        existente.setNombre("Carlos Existente");
        existente.setCorreo(testEmail);
        existente.setSupabaseUid(validUuidStr);
        existente.setRol(rolDefault);
        existente.setEstado(true);
        existente.setFechaRegistro(LocalDateTime.now().minusDays(5));

        given(usuarioRepository.findBySupabaseUid(validUuidStr)).willReturn(Optional.of(existente));

        Jwt jwt = buildJwt(validUuidStr, testEmail, true, null);

        UsuarioMeResponse response = usuarioService.obtenerOProveerUsuario(jwt);

        assertThat(response).isNotNull();
        assertThat(response.idUsuario()).isEqualTo(42L);
        assertThat(response.nombre()).isEqualTo("Carlos Existente");
        assertThat(response.correo()).isEqualTo(testEmail);
        assertThat(response.rol()).isEqualTo("Usuario registrado");
        assertThat(response.activo()).isTrue();

        verify(usuarioRepository, never()).saveAndFlush(any());
        verify(rolRepository, never()).findByNombre(any());
    }

    @Test
    @DisplayName("Usuario nuevo: aprovisiona perfil con rol predeterminado y extrae nombre de metadata")
    void obtenerOProveerUsuario_cuandoUsuarioNuevo_creaConRolDefault() {
        given(usuarioRepository.findBySupabaseUid(validUuidStr)).willReturn(Optional.empty());
        given(usuarioRepository.findByCorreo(testEmail)).willReturn(Optional.empty());
        given(rolRepository.findByNombre("Usuario registrado")).willReturn(Optional.of(rolDefault));

        Usuario nuevoPersistido = new Usuario();
        nuevoPersistido.setIdUsuario(100L);
        nuevoPersistido.setNombre("Ana García");
        nuevoPersistido.setCorreo(testEmail);
        nuevoPersistido.setSupabaseUid(validUuidStr);
        nuevoPersistido.setRol(rolDefault);
        nuevoPersistido.setEstado(true);
        nuevoPersistido.setFechaRegistro(LocalDateTime.now());

        given(usuarioRepository.saveAndFlush(any(Usuario.class))).willReturn(nuevoPersistido);

        Map<String, Object> metadata = Map.of("full_name", "Ana García");
        Jwt jwt = buildJwt(validUuidStr, testEmail, true, metadata);

        UsuarioMeResponse response = usuarioService.obtenerOProveerUsuario(jwt);

        assertThat(response).isNotNull();
        assertThat(response.idUsuario()).isEqualTo(100L);
        assertThat(response.nombre()).isEqualTo("Ana García");
        assertThat(response.correo()).isEqualTo(testEmail);
        assertThat(response.rol()).isEqualTo("Usuario registrado");
        assertThat(response.activo()).isTrue();

        verify(usuarioRepository).saveAndFlush(any(Usuario.class));
    }

    @Test
    @DisplayName("Zero-Trust: Ignora rol 'admin' intentado en user_metadata y asigna 'Usuario registrado'")
    void obtenerOProveerUsuario_cuandoMetadataIntentaAsignarAdmin_asignaRolDefault() {
        given(usuarioRepository.findBySupabaseUid(validUuidStr)).willReturn(Optional.empty());
        given(usuarioRepository.findByCorreo(testEmail)).willReturn(Optional.empty());
        given(rolRepository.findByNombre("Usuario registrado")).willReturn(Optional.of(rolDefault));

        Usuario nuevoPersistido = new Usuario();
        nuevoPersistido.setIdUsuario(101L);
        nuevoPersistido.setNombre("Atacante");
        nuevoPersistido.setCorreo(testEmail);
        nuevoPersistido.setSupabaseUid(validUuidStr);
        nuevoPersistido.setRol(rolDefault);
        nuevoPersistido.setEstado(true);
        nuevoPersistido.setFechaRegistro(LocalDateTime.now());

        given(usuarioRepository.saveAndFlush(any(Usuario.class))).willReturn(nuevoPersistido);

        Map<String, Object> metadata = Map.of(
                "full_name", "Atacante",
                "role", "admin",
                "roles", "ADMINISTRADOR"
        );
        Jwt jwt = buildJwt(validUuidStr, testEmail, true, metadata);

        UsuarioMeResponse response = usuarioService.obtenerOProveerUsuario(jwt);

        assertThat(response.rol()).isEqualTo("Usuario registrado");
        verify(rolRepository).findByNombre("Usuario registrado");
        verify(rolRepository, never()).findByNombre("admin");
        verify(rolRepository, never()).findByNombre("ADMINISTRADOR");
    }

    @Test
    @DisplayName("Validación sub: Ausente o vacío lanza 400 Bad Request")
    void obtenerOProveerUsuario_cuandoSubAusente_lanzaBadRequest() {
        Jwt jwt = buildJwt(null, testEmail, true, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwt))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("Validación sub: No es UUID válido lanza 400 Bad Request")
    void obtenerOProveerUsuario_cuandoSubInvalido_lanzaBadRequest() {
        Jwt jwt = buildJwt("no-es-un-uuid-valido-1234", testEmail, true, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwt))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("debe ser un UUID válido");
                });
    }

    @Test
    @DisplayName("Validación email: Ausente o sin formato válido lanza 400 Bad Request")
    void obtenerOProveerUsuario_cuandoEmailInvalido_lanzaBadRequest() {
        Jwt jwtSinEmail = buildJwt(validUuidStr, null, true, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwtSinEmail))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));

        Jwt jwtEmailInvalido = buildJwt(validUuidStr, "correo-sin-arroba", true, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwtEmailInvalido))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("Rol predeterminado inexistente: lanza 500 Internal Server Error")
    void obtenerOProveerUsuario_cuandoRolDefaultNoExiste_lanza500() {
        given(usuarioRepository.findBySupabaseUid(validUuidStr)).willReturn(Optional.empty());
        given(usuarioRepository.findByCorreo(testEmail)).willReturn(Optional.empty());
        given(rolRepository.findByNombre("Usuario registrado")).willReturn(Optional.empty());

        Jwt jwt = buildJwt(validUuidStr, testEmail, true, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwt))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                    assertThat(rse.getReason()).contains("rol predeterminado");
                });
    }

    @Test
    @DisplayName("Cuenta histórica: Si existe una cuenta con el mismo correo sin supabase_uid, devuelve 409 Conflict")
    void obtenerOProveerUsuario_cuandoExisteCuentaHistorica_devuelve409Conflict() {
        given(usuarioRepository.findBySupabaseUid(validUuidStr)).willReturn(Optional.empty());

        Usuario cuentaHistorica = new Usuario();
        cuentaHistorica.setIdUsuario(5L);
        cuentaHistorica.setCorreo(testEmail);
        cuentaHistorica.setSupabaseUid(null);

        given(usuarioRepository.findByCorreo(testEmail)).willReturn(Optional.of(cuentaHistorica));

        Jwt jwt = buildJwt(validUuidStr, testEmail, true, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwt))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("sin vinculación segura");

        verify(usuarioRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Manejo de concurrencia: Recupera el usuario existente ante DataIntegrityViolationException")
    void obtenerOProveerUsuario_cuandoHayConflictoConcurrente_seRecuperaConsultandoPorSub() {
        given(usuarioRepository.findBySupabaseUid(validUuidStr))
                .willReturn(Optional.empty()) // Primera consulta en paso 3: no existe aún
                .willReturn(Optional.of(crearUsuarioMock(200L, validUuidStr, testEmail))); // Segunda consulta tras colisión

        given(usuarioRepository.findByCorreo(testEmail)).willReturn(Optional.empty());
        given(rolRepository.findByNombre("Usuario registrado")).willReturn(Optional.of(rolDefault));

        given(usuarioRepository.saveAndFlush(any(Usuario.class)))
                .willThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        Jwt jwt = buildJwt(validUuidStr, testEmail, true, null);

        UsuarioMeResponse response = usuarioService.obtenerOProveerUsuario(jwt);

        assertThat(response).isNotNull();
        assertThat(response.idUsuario()).isEqualTo(200L);
        assertThat(response.correo()).isEqualTo(testEmail);
    }

    @Test
    @DisplayName("Correo no verificado: Si email_verified es false explícitamente, responde 403 Forbidden")
    void obtenerOProveerUsuario_cuandoEmailVerifiedEsFalse_lanza403Forbidden() {
        Jwt jwt = buildJwt(validUuidStr, testEmail, false, null);

        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(jwt))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("no ha sido verificado");
                });
    }

    @Test
    @DisplayName("Token sin claim email_verified: Permite aprovisionamiento porque Supabase ya valida antes de emitir access tokens")
    void obtenerOProveerUsuario_cuandoEmailVerifiedEsNull_permiteAprovisionamiento() {
        given(usuarioRepository.findBySupabaseUid(validUuidStr)).willReturn(Optional.empty());
        given(usuarioRepository.findByCorreo(testEmail)).willReturn(Optional.empty());
        given(rolRepository.findByNombre("Usuario registrado")).willReturn(Optional.of(rolDefault));

        Usuario nuevoPersistido = crearUsuarioMock(105L, validUuidStr, testEmail);
        given(usuarioRepository.saveAndFlush(any(Usuario.class))).willReturn(nuevoPersistido);

        Jwt jwt = buildJwt(validUuidStr, testEmail, null, null);

        UsuarioMeResponse response = usuarioService.obtenerOProveerUsuario(jwt);
        assertThat(response).isNotNull();
        assertThat(response.idUsuario()).isEqualTo(105L);
    }

    @Test
    @DisplayName("Token JWT nulo: Lanza 401 Unauthorized")
    void obtenerOProveerUsuario_cuandoJwtNulo_lanza401() {
        assertThatThrownBy(() -> usuarioService.obtenerOProveerUsuario(null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    private Usuario crearUsuarioMock(Long id, String sub, String email) {
        Usuario u = new Usuario();
        u.setIdUsuario(id);
        u.setNombre("Usuario Concurrente");
        u.setCorreo(email);
        u.setSupabaseUid(sub);
        u.setRol(rolDefault);
        u.setEstado(true);
        u.setFechaRegistro(LocalDateTime.now());
        return u;
    }
}
