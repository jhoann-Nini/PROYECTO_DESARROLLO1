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
 * «Me gusta» de un usuario a una respuesta de la comunidad (migración 029). La PK
 * compuesta garantiza uno por usuario; retirarlo es un DELETE físico.
 */
@Entity
@Table(name = "reaccion_respuesta")
@IdClass(ReaccionRespuesta.Clave.class)
public class ReaccionRespuesta {

    @Id
    @Column(name = "id_respuesta", nullable = false)
    private Long idRespuesta;

    @Id
    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoReaccion tipo = TipoReaccion.ME_GUSTA;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = PublicacionComunidad.ahora();

    protected ReaccionRespuesta() {
    }

    public ReaccionRespuesta(Long idRespuesta, Long idUsuario) {
        this.idRespuesta = idRespuesta;
        this.idUsuario = idUsuario;
    }

    public Long getIdRespuesta() { return idRespuesta; }
    public Long getIdUsuario() { return idUsuario; }
    public TipoReaccion getTipo() { return tipo; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }

    /** Clave compuesta (id_respuesta, id_usuario). */
    public static class Clave implements Serializable {
        private Long idRespuesta;
        private Long idUsuario;

        public Clave() {
        }

        public Clave(Long idRespuesta, Long idUsuario) {
            this.idRespuesta = idRespuesta;
            this.idUsuario = idUsuario;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Clave c && Objects.equals(idRespuesta, c.idRespuesta) && Objects.equals(idUsuario, c.idUsuario);
        }

        @Override
        public int hashCode() {
            return Objects.hash(idRespuesta, idUsuario);
        }
    }
}
