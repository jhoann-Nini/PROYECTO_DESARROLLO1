package com.example.backend.service;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Explicit version routing for product characteristics; it never converts payloads. */
public final class FichaTecnicaV3Dispatcher {
    public enum Route { V1, V2, V3, LEGACY }
    private static final List<String> V3_CATEGORIES = List.of("celulares", "tablets", "portatiles", "auriculares");
    private FichaTecnicaV3Dispatcher() {}

    public static Route validateAndRoute(Map<String, Object> data) {
        if (data == null) return Route.LEGACY;
        boolean marker = hasV3Markers(data);
        if (!data.containsKey("version_esquema")) {
            if (marker) throw bad("version_esquema: es obligatorio para una ficha técnica V3");
            return Route.LEGACY;
        }
        Object raw = data.get("version_esquema");
        if (!(raw instanceof Number n) || !Double.isFinite(n.doubleValue()) || n.doubleValue() != Math.rint(n.doubleValue()))
            throw bad("version_esquema: debe ser un entero soportado (1, 2 o 3)");
        int version = (int)n.doubleValue();
        if (version == 3) {
            List<String> errors = DatosFichaTecnicaV3Validator.validate(data);
            if (!errors.isEmpty()) throw bad("Ficha técnica V3 inválida: " + String.join("; ", errors));
            return Route.V3;
        }
        if (version != 1 && version != 2) throw bad("version_esquema no soportada: " + version);
        if (marker) throw bad("version_esquema: la estructura contiene marcadores V3 y no puede declararse como V" + version);
        return version == 1 ? Route.V1 : Route.V2;
    }

    /** Exclusive markers: root evidencias, or V3 especificaciones paired with a V3 category / envelope.
     * V2's variantes/fuentes/benchmarks alone are deliberately not markers. */
    public static boolean hasV3Markers(Map<String, Object> data) {
        if (data.containsKey("evidencias")) return true;
        if (!data.containsKey("especificaciones")) return false;
        Object category = data.get("categoria");
        return V3_CATEGORIES.contains(category)
                || (data.containsKey("variantes") && data.containsKey("fuentes") && data.containsKey("benchmarks"));
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
