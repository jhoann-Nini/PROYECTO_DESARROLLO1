import type {
  Establecimiento,
  EstablecimientoRequest,
} from "@/types/establecimiento";

/**
 * Estado editable del formulario de establecimiento. Los campos numéricos se
 * mantienen como texto para distinguir "sin dato" de un cero válido.
 */
export interface FormularioEstablecimiento {
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  descripcion: string;
  latitud: string;
  longitud: string;
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function aFormulario(
  establecimiento: Establecimiento,
): FormularioEstablecimiento {
  return {
    nombre: establecimiento.nombre,
    direccion: establecimiento.direccion ?? "",
    telefono: establecimiento.telefono ?? "",
    correo: establecimiento.correo ?? "",
    descripcion: establecimiento.descripcion ?? "",
    latitud:
      establecimiento.latitud === null || establecimiento.latitud === undefined
        ? ""
        : String(establecimiento.latitud),
    longitud:
      establecimiento.longitud === null ||
      establecimiento.longitud === undefined
        ? ""
        : String(establecimiento.longitud),
  };
}

export function formularioVacio(): FormularioEstablecimiento {
  return {
    nombre: "",
    direccion: "",
    telefono: "",
    correo: "",
    descripcion: "",
    latitud: "",
    longitud: "",
  };
}

/**
 * Réplica de las validaciones de `EstablecimientoUpdateRequest` en el
 * backend, para dar retroalimentación inmediata sin sustituir su autoridad.
 */
export function validarFormulario(
  formulario: FormularioEstablecimiento,
): string[] {
  const errores: string[] = [];
  const nombre = formulario.nombre.trim();

  if (!nombre) {
    errores.push("El nombre es obligatorio.");
  } else if (nombre.length > 150) {
    errores.push("El nombre no puede superar 150 caracteres.");
  }

  if (formulario.direccion.trim().length > 255) {
    errores.push("La dirección no puede superar 255 caracteres.");
  }

  if (formulario.telefono.trim().length > 30) {
    errores.push("El teléfono no puede superar 30 caracteres.");
  }

  const correo = formulario.correo.trim();
  if (correo) {
    if (correo.length > 150) {
      errores.push("El correo no puede superar 150 caracteres.");
    } else if (!CORREO_VALIDO.test(correo)) {
      errores.push("El correo del establecimiento no es válido.");
    }
  }

  const latitud = formulario.latitud.trim();
  if (latitud) {
    const valor = Number(latitud);
    if (!Number.isFinite(valor)) {
      errores.push("La latitud debe ser un número válido.");
    } else if (valor < -90 || valor > 90) {
      errores.push("La latitud debe estar entre -90 y 90.");
    }
  }

  const longitud = formulario.longitud.trim();
  if (longitud) {
    const valor = Number(longitud);
    if (!Number.isFinite(valor)) {
      errores.push("La longitud debe ser un número válido.");
    } else if (valor < -180 || valor > 180) {
      errores.push("La longitud debe estar entre -180 y 180.");
    }
  }

  return errores;
}

export function aRequest(
  formulario: FormularioEstablecimiento,
): EstablecimientoRequest {
  return {
    nombre: formulario.nombre.trim(),
    direccion: formulario.direccion.trim() || null,
    telefono: formulario.telefono.trim() || null,
    correo: formulario.correo.trim() || null,
    descripcion: formulario.descripcion.trim() || null,
    latitud: formulario.latitud.trim() ? Number(formulario.latitud) : null,
    longitud: formulario.longitud.trim() ? Number(formulario.longitud) : null,
  };
}
