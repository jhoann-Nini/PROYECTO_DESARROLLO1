package com.example.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * «Me gusta» de un usuario a una publicacion de la comunidad (migración 029). La PK
 * compuesta garantiza uno por usuario; retirarlo es un DELETE físico.
 */
@Entity
@Table(name = "reaccion_publicacion")
@IdClass(ReaccionPublicacion.Clave.class)
public class ReaccionPublicacion {

    @Id
    @Column(name = "id_publicacion", nullable = false)
    private Long idPublicacion;

    @Id
    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoReaccion tipo = TipoReaccion.ME_GUSTA;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = PublicacionComunidad.ahora();

    protected ReaccionPublicacion() {
    }

    public ReaccionPublicacion(Long idPublicacion, Long idUsuario) {
        this.idPublicacion = idPublicacion;
        this.idUsuario = idUsuario;
    }

    public Long getIdPublicacion() { return idPublicacion; }
    public Long getIdUsuario() { return idUsuario; }
    public TipoReaccion getTipo() { return tipo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }

    /** Clave compuesta (id_publicacion, id_usuario). */
    public static class Clave implements Serializable {
        private Long idPublicacion;
        private Long idUsuario;

        public Clave() {
        }

        public Clave(Long idPublicacion, Long idUsuario) {
            this.idPublicacion = idPublicacion;
            this.idUsuario = idUsuario;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Clave c && Objects.equals(idPublicacion, c.idPublicacion) && Objects.equals(idUsuario, c.idUsuario);
        }

        @Override
        public int hashCode() {
            return Objects.hash(idPublicacion, idUsuario);
        }
    }
}
