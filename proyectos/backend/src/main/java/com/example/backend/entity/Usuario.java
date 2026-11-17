package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, unique = true, length = 150)
    private String correo;

    @Column(nullable = true)
    private String password;

    @Column(name = "supabase_uid", unique = true, length = 64)
    private String supabaseUid;

    /**
     * Relación heredada conservada durante la transición al modelo multirrol.
     * El origen de permisos será usuario_roles cuando la migración esté aplicada.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL)
    private List<UsuarioRol> roles = new ArrayList<>();

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL)
    private List<UsuarioEstablecimiento> establecimientos = new ArrayList<>();

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    @Column(nullable = false)
    private Boolean estado = true;

    public void agregarRol(UsuarioRol asignacion) {
        if (asignacion == null) {
            return;
        }
        asignacion.setUsuario(this);
        roles.add(asignacion);
    }

    public void agregarEstablecimiento(UsuarioEstablecimiento vinculacion) {
        if (vinculacion == null) {
            return;
        }
        vinculacion.setUsuario(this);
        establecimientos.add(vinculacion);
    }

    public boolean tieneRol(String nombreRol) {
        if (roles != null && !roles.isEmpty()) {
            boolean tieneEnRoles = roles.stream()
                    .filter(ur -> Boolean.TRUE.equals(ur.getEstado()))
                    .map(UsuarioRol::getRol)
                    .anyMatch(r -> r != null && nombreRol.equalsIgnoreCase(r.getNombre()));
            if (tieneEnRoles) {
                return true;
            }
        }
        return rol != null && nombreRol.equalsIgnoreCase(rol.getNombre());
    }

    public boolean esModeradorOAdmin() {
        return tieneRol("Moderador") || tieneRol("Administrador");
    }

    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getSupabaseUid() { return supabaseUid; }
    public void setSupabaseUid(String supabaseUid) { this.supabaseUid = supabaseUid; }
    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }
    public List<UsuarioRol> getRoles() { return roles; }
    public void setRoles(List<UsuarioRol> roles) { this.roles = roles; }
    public List<UsuarioEstablecimiento> getEstablecimientos() { return establecimientos; }
    public void setEstablecimientos(List<UsuarioEstablecimiento> establecimientos) { this.establecimientos = establecimientos; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public Boolean getEstado() { return estado; }
    public void setEstado(Boolean estado) { this.estado = estado; }
}
