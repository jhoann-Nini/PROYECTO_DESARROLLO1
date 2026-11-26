package com.example.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Decisión de un moderador sobre una publicación o una respuesta (migración
 * 030), de solo inserción. Los triggers validan rol, conflicto de interés,
 * coherencia con el estado y el estado final. tipo_contenido (columna
 * generada) e id_transaccion (valor por defecto) los pone la base de datos.
 */
@Entity
@Table(name = "moderacion_comunidad_auditoria")
public class ModeracionComunidadAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria")
    private Long idAuditoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_publicacion", updatable = false)
    private PublicacionComunidad publicacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_respuesta", updatable = false)
    private RespuestaComunidad respuesta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_moderador", nullable = false, updatable = false)
    private Usuario moderador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private AccionModeracionComunidad accion;

    @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
    private String motivo;

    @Column(name = "contenido_revisado", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String contenidoRevisado;

    @Column(name = "fecha_evento", nullable = false, updatable = false)
    private LocalDateTime fechaEvento = PublicacionComunidad.ahora();

    protected ModeracionComunidadAuditoria() {
    }

    public ModeracionComunidadAuditoria(PublicacionComunidad publicacion, RespuestaComunidad respuesta, Usuario moderador,
        AccionModeracionComunidad accion, String motivo, String contenidoRevisado) {
        this.publicacion = publicacion;
        this.respuesta = respuesta;
        this.moderador = moderador;
        this.accion = accion;
        this.motivo = motivo;
        this.contenidoRevisado = contenidoRevisado;
    }

    public Long getIdAuditoria() { return idAuditoria; }
    public PublicacionComunidad getPublicacion() { return publicacion; }
    public RespuestaComunidad getRespuesta() { return respuesta; }
    public Usuario getModerador() { return moderador; }
    public AccionModeracionComunidad getAccion() { return accion; }
    public String getMotivo() { return motivo; }
    public String getContenidoRevisado() { return contenidoRevisado; }
    public LocalDateTime getFechaEvento() { return fechaEvento; }

    @Override
    public String toString() {
        return "ModeracionComunidadAuditoria[" + accion + ", motivo=" + motivo + ", revisado=" + contenidoRevisado + "]";
    }
}
