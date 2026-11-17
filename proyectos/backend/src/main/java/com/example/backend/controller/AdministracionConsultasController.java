package com.example.backend.controller;

import com.example.backend.dto.RolResponse;
import com.example.backend.dto.UsuarioAdminResponse;
import com.example.backend.service.AdministracionConsultasService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultas administrativas de apoyo para localizar cuentas y conocer
 * el catálogo de roles antes de asignar o revocar permisos.
 */
@RestController
@RequestMapping("/api/admin")
public class AdministracionConsultasController {

    private final AdministracionConsultasService service;

    public AdministracionConsultasController(AdministracionConsultasService service) {
        this.service = service;
    }

    /**
     * Lista cuentas ordenadas por nombre. Si se recibe "correo", filtra
     * por coincidencia parcial sin distinguir mayúsculas.
     */
    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> listarUsuarios(
            @RequestParam(required = false) String correo) {
        return service.listarUsuarios(correo);
    }

    /** Devuelve el catálogo de roles disponibles para asignación. */
    @GetMapping("/roles")
    public List<RolResponse> listarRoles() {
        return service.listarRoles();
    }
}
