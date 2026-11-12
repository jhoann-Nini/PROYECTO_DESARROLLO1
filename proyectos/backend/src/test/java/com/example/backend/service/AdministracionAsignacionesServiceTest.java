package com.example.backend.service;

import com.example.backend.entity.*;
import com.example.backend.exception.ConflictException;
import com.example.backend.repository.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdministracionAsignacionesServiceTest {
    @Mock private UsuarioRepository usuarios;
    @Mock private RolRepository roles;
    @Mock private EstablecimientoRepository establecimientos;
    @Mock private UsuarioRolRepository usuarioRoles;
    @Mock private UsuarioEstablecimientoRepository usuarioEstablecimientos;
    @Mock private AuditoriaUsuarioRolRepository auditoriaRoles;
    @Mock private AuditoriaUsuarioEstablecimientoRepository auditoriaEstablecimientos;

    private AdministracionAsignacionesService service;
    private Usuario actor;
    private Usuario objetivo;
    private Rol rolUsuario;

    @BeforeEach
    void setUp() {
        service = new AdministracionAsignacionesService(
                usuarios, roles, establecimientos, usuarioRoles,
                usuarioEstablecimientos, auditoriaRoles, auditoriaEstablecimientos);
        actor = usuario(10L, "admin-sub");
        objetivo = usuario(20L, "user-sub");
        rolUsuario = new Rol();
        rolUsuario.setIdRol(3L);
        rolUsuario.setNombre("Usuario registrado");
        given(usuarios.findBySupabaseUid("admin-sub")).willReturn(Optional.of(actor));
    }

    @Test
    void asignarRol_nuevaAsignacion_persisteYAudita() {
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(roles.findById(3L)).willReturn(Optional.of(rolUsuario));
        given(usuarioRoles.findByUsuario_IdUsuarioAndRol_IdRol(20L, 3L)).willReturn(Optional.empty());
        given(usuarioRoles.save(any(UsuarioRol.class))).willAnswer(invocation -> {
            UsuarioRol saved = invocation.getArgument(0);
            saved.setIdUsuarioRol(30L);
            return saved;
        });

        UsuarioRol result = service.asignarRol(20L, 3L, "admin-sub", "Alta inicial");

        assertThat(result.getEstado()).isTrue();
        assertThat(result.getAsignadoPor()).isSameAs(actor);
        verify(auditoriaRoles).save(any(AuditoriaUsuarioRol.class));
    }

    @Test
    void asignarRol_duplicadaActiva_lanzaConflicto() {
        UsuarioRol existente = new UsuarioRol();
        existente.setEstado(true);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(roles.findById(3L)).willReturn(Optional.of(rolUsuario));
        given(usuarioRoles.findByUsuario_IdUsuarioAndRol_IdRol(20L, 3L)).willReturn(Optional.of(existente));

        assertThatThrownBy(() -> service.asignarRol(20L, 3L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ya tiene este rol activo");
    }

    @Test
    void revocarRol_ultimoAdministrador_noPermiteRevocacion() {
        Rol admin = new Rol();
        admin.setIdRol(1L);
        admin.setNombre("Administrador");
        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setUsuario(objetivo);
        asignacion.setEstado(true);
        asignacion.setRol(admin);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(roles.findById(1L)).willReturn(Optional.of(admin));
        given(roles.findByNombreForUpdate("Administrador")).willReturn(Optional.of(admin));
        given(usuarioRoles.findByUsuarioAndRolForUpdate(20L, 1L)).willReturn(Optional.of(asignacion));
        given(usuarioRoles.findAdministradoresActivosForUpdate()).willReturn(List.of(asignacion));

        assertThatThrownBy(() -> service.revocarRol(20L, 1L, "admin-sub", "Retiro"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("último rol de Administrador");
    }

    @Test
    void revocarRol_conOtroAdministrador_registraRevocacionYAuditoria() {
        Rol admin = new Rol();
        admin.setIdRol(1L);
        admin.setNombre("Administrador");
        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setUsuario(objetivo);
        asignacion.setEstado(true);
        asignacion.setRol(admin);
        UsuarioRol otraAsignacion = new UsuarioRol();
        otraAsignacion.setEstado(true);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(roles.findById(1L)).willReturn(Optional.of(admin));
        given(roles.findByNombreForUpdate("Administrador")).willReturn(Optional.of(admin));
        given(usuarioRoles.findByUsuarioAndRolForUpdate(20L, 1L)).willReturn(Optional.of(asignacion));
        given(usuarioRoles.findAdministradoresActivosForUpdate()).willReturn(List.of(asignacion, otraAsignacion));
        given(usuarioRoles.save(any(UsuarioRol.class))).willAnswer(invocation -> invocation.getArgument(0));

        service.revocarRol(20L, 1L, "admin-sub", "Cambio de responsabilidades");

        assertThat(asignacion.getEstado()).isFalse();
        assertThat(asignacion.getRevocadoPor()).isSameAs(actor);
        assertThat(asignacion.getFechaRevocacion()).isNotNull();
        verify(auditoriaRoles).save(any(AuditoriaUsuarioRol.class));
    }

    @Test
    void asignarRepresentante_cuentaYEstablecimientoActivos_creaAuditoria() {
        Establecimiento tienda = new Establecimiento();
        tienda.setIdEstablecimiento(40L);
        tienda.setEstado(true);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(establecimientos.findById(40L)).willReturn(Optional.of(tienda));
        given(usuarioEstablecimientos.findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(20L, 40L))
                .willReturn(Optional.empty());
        given(usuarioEstablecimientos.save(any(UsuarioEstablecimiento.class))).willAnswer(invocation -> {
            UsuarioEstablecimiento saved = invocation.getArgument(0);
            saved.setIdUsuarioEstablecimiento(50L);
            return saved;
        });

        UsuarioEstablecimiento result = service.asignarRepresentante(20L, 40L, "admin-sub", "Asignación de tienda");

        assertThat(result.getEstado()).isTrue();
        assertThat(result.getAsignadoPor()).isSameAs(actor);
        verify(auditoriaEstablecimientos).save(any(AuditoriaUsuarioEstablecimiento.class));
    }


    @Test
    void asignarRol_asignacionRevocada_reactivaYAudita() {
        UsuarioRol existente = new UsuarioRol();
        existente.setEstado(false);
        existente.setUsuario(objetivo);
        existente.setRol(rolUsuario);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(roles.findById(3L)).willReturn(Optional.of(rolUsuario));
        given(usuarioRoles.findByUsuario_IdUsuarioAndRol_IdRol(20L, 3L)).willReturn(Optional.of(existente));
        given(usuarioRoles.save(any(UsuarioRol.class))).willAnswer(invocation -> invocation.getArgument(0));

        UsuarioRol result = service.asignarRol(20L, 3L, "admin-sub", "Restitución");

        assertThat(result.getEstado()).isTrue();
        assertThat(result.getFechaRevocacion()).isNull();
        assertThat(result.getRevocadoPor()).isNull();
        verify(auditoriaRoles).save(any(AuditoriaUsuarioRol.class));
    }

    @Test
    void revocarRepresentante_registraFechaActorYAuditoria() {
        Establecimiento tienda = new Establecimiento();
        tienda.setIdEstablecimiento(40L);
        UsuarioEstablecimiento asignacion = new UsuarioEstablecimiento();
        asignacion.setIdUsuarioEstablecimiento(50L);
        asignacion.setUsuario(objetivo);
        asignacion.setEstablecimiento(tienda);
        asignacion.setEstado(true);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(usuarioEstablecimientos.findByUsuarioAndEstablecimientoForUpdate(20L, 40L))
                .willReturn(Optional.of(asignacion));
        given(usuarioEstablecimientos.save(any(UsuarioEstablecimiento.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        service.revocarRepresentante(20L, 40L, "admin-sub", "Fin de representación");

        assertThat(asignacion.getEstado()).isFalse();
        assertThat(asignacion.getRevocadoPor()).isSameAs(actor);
        assertThat(asignacion.getFechaRevocacion()).isNotNull();
        verify(auditoriaEstablecimientos).save(any(AuditoriaUsuarioEstablecimiento.class));
    }

    @Test
    void asignarRepresentante_usuarioInactivo_lanzaConflicto() {
        Usuario inactivo = usuario(20L, "user-sub");
        inactivo.setEstado(false);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(inactivo));

        assertThatThrownBy(() -> service.asignarRepresentante(20L, 40L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("No se pueden asignar representantes inactivos");
    }

    @Test
    void asignarRepresentante_establecimientoInactivo_lanzaConflicto() {
        Establecimiento tiendaInactiva = new Establecimiento();
        tiendaInactiva.setIdEstablecimiento(40L);
        tiendaInactiva.setEstado(false);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(establecimientos.findById(40L)).willReturn(Optional.of(tiendaInactiva));

        assertThatThrownBy(() -> service.asignarRepresentante(20L, 40L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("No se pueden asignar representantes a un establecimiento inactivo");
    }

    @Test
    void asignarRepresentante_duplicadaActiva_lanzaConflicto() {
        Establecimiento tienda = new Establecimiento();
        tienda.setIdEstablecimiento(40L);
        tienda.setEstado(true);
        UsuarioEstablecimiento existente = new UsuarioEstablecimiento();
        existente.setEstado(true);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(establecimientos.findById(40L)).willReturn(Optional.of(tienda));
        given(usuarioEstablecimientos.findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(20L, 40L))
                .willReturn(Optional.of(existente));

        assertThatThrownBy(() -> service.asignarRepresentante(20L, 40L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("El usuario ya representa este establecimiento");
    }

    @Test
    void asignarRepresentante_reactivacion_reactivaYAudita() {
        Establecimiento tienda = new Establecimiento();
        tienda.setIdEstablecimiento(40L);
        tienda.setEstado(true);
        UsuarioEstablecimiento existente = new UsuarioEstablecimiento();
        existente.setIdUsuarioEstablecimiento(50L);
        existente.setUsuario(objetivo);
        existente.setEstablecimiento(tienda);
        existente.setEstado(false);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(establecimientos.findById(40L)).willReturn(Optional.of(tienda));
        given(usuarioEstablecimientos.findByUsuario_IdUsuarioAndEstablecimiento_IdEstablecimiento(20L, 40L))
                .willReturn(Optional.of(existente));
        given(usuarioEstablecimientos.save(any(UsuarioEstablecimiento.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        UsuarioEstablecimiento result = service.asignarRepresentante(20L, 40L, "admin-sub", "Reasignación");

        assertThat(result.getEstado()).isTrue();
        assertThat(result.getFechaRevocacion()).isNull();
        assertThat(result.getRevocadoPor()).isNull();
        assertThat(result.getAsignadoPor()).isSameAs(actor);
        verify(auditoriaEstablecimientos).save(any(AuditoriaUsuarioEstablecimiento.class));
    }

    @Test
    void revocarRepresentante_yaRevocada_lanzaConflicto() {
        UsuarioEstablecimiento asignacion = new UsuarioEstablecimiento();
        asignacion.setEstado(false);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(usuarioEstablecimientos.findByUsuarioAndEstablecimientoForUpdate(20L, 40L))
                .willReturn(Optional.of(asignacion));

        assertThatThrownBy(() -> service.revocarRepresentante(20L, 40L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("La representación ya está revocada");
    }

    @Test
    void asignarRol_usuarioInactivo_lanzaConflicto() {
        Usuario inactivo = usuario(20L, "user-sub");
        inactivo.setEstado(false);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(inactivo));

        assertThatThrownBy(() -> service.asignarRol(20L, 3L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("No se pueden asignar roles a un usuario inactivo");
    }

    @Test
    void revocarRol_rolYaRevocado_lanzaConflicto() {
        UsuarioRol asignacion = new UsuarioRol();
        asignacion.setEstado(false);
        given(usuarios.findByIdForUpdate(20L)).willReturn(Optional.of(objetivo));
        given(roles.findById(3L)).willReturn(Optional.of(new Rol()));
        given(usuarioRoles.findByUsuarioAndRolForUpdate(20L, 3L)).willReturn(Optional.of(asignacion));

        assertThatThrownBy(() -> service.revocarRol(20L, 3L, "admin-sub", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("El rol ya está revocado");
    }

    private Usuario usuario(Long id, String sub) {
        Usuario u = new Usuario();
        u.setIdUsuario(id);
        u.setNombre("Usuario " + id);
        u.setCorreo(id + "@example.com");
        u.setSupabaseUid(sub);
        u.setEstado(true);
        return u;
    }
}
