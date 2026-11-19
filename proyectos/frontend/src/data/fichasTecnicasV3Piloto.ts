import type { DatosFichaTecnicaV3 } from "@/types/fichaTecnicaV3";
import { validarDatosFichaTecnicaV3 } from "@/types/fichaTecnicaV3";

import ipadPro11M4Raw from "../../../fixtures/fichas-v3-piloto/ipad-pro-11-m4.json";
import thinkpadE14Gen5Raw from "../../../fixtures/fichas-v3-piloto/lenovo-thinkpad-e14-gen-5.json";
import macbookPro16M3MaxRaw from "../../../fixtures/fichas-v3-piloto/macbook-pro-16-m3-max.json";
import nothingEar2Raw from "../../../fixtures/fichas-v3-piloto/nothing-ear-2.json";
import nothingPhone2aRaw from "../../../fixtures/fichas-v3-piloto/nothing-phone-2a.json";
import oneplusPad2Raw from "../../../fixtures/fichas-v3-piloto/oneplus-pad-2.json";
import samsungS24UltraRaw from "../../../fixtures/fichas-v3-piloto/samsung-galaxy-s24-ultra.json";
import sonyWh1000Xm5Raw from "../../../fixtures/fichas-v3-piloto/sony-wh-1000xm5.json";
import imagenesRaw from "../../../fixtures/fichas-v3-piloto/imagenes.json";

export interface ImagenCandidataV3Piloto {
  producto_id: string;
  tipo: string;
  url_original: string;
  pagina_procedencia: string;
  autor: string;
  titular_derechos: string;
  licencia: string;
  estado_licencia: string;
  atribucion_requerida: string;
  variante_id: string | null;
  color_representado: string | null;
  estado_correspondencia_variante: string;
  uso_permitido: boolean;
  nota_legal: string;
  notas: string;
}

export const IMAGENES_CANDIDATAS_V3_PILOTO: readonly ImagenCandidataV3Piloto[] =
  imagenesRaw.imagenes as unknown as ImagenCandidataV3Piloto[];

export function obtenerImagenCandidataV3Piloto(
  productoId: string,
): ImagenCandidataV3Piloto | null {
  return (
    IMAGENES_CANDIDATAS_V3_PILOTO.find(
      (img) => img.producto_id === productoId,
    ) ?? null
  );
}

export const FICHA_V3_NOTHING_PHONE_2A = nothingPhone2aRaw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_SAMSUNG_GALAXY_S24_ULTRA = samsungS24UltraRaw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_ONEPLUS_PAD_2 = oneplusPad2Raw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_IPAD_PRO_11_M4 = ipadPro11M4Raw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_LENOVO_THINKPAD_E14_GEN_5 = thinkpadE14Gen5Raw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_MACBOOK_PRO_16_M3_MAX = macbookPro16M3MaxRaw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_NOTHING_EAR_2 = nothingEar2Raw as unknown as DatosFichaTecnicaV3;
export const FICHA_V3_SONY_WH_1000XM5 = sonyWh1000Xm5Raw as unknown as DatosFichaTecnicaV3;

export const FICHAS_TECNICAS_V3_PILOTO: Readonly<Record<string, DatosFichaTecnicaV3>> = {
  "nothing-phone-2a": FICHA_V3_NOTHING_PHONE_2A,
  "nothing-phone-2a-special-edition": FICHA_V3_NOTHING_PHONE_2A,
  "samsung-galaxy-s24-ultra": FICHA_V3_SAMSUNG_GALAXY_S24_ULTRA,
  "oneplus-pad-2": FICHA_V3_ONEPLUS_PAD_2,
  "ipad-pro-11-m4": FICHA_V3_IPAD_PRO_11_M4,
  "apple-ipad-pro-11-m4": FICHA_V3_IPAD_PRO_11_M4,
  "lenovo-thinkpad-e14-gen-5": FICHA_V3_LENOVO_THINKPAD_E14_GEN_5,
  "macbook-pro-16-m3-max": FICHA_V3_MACBOOK_PRO_16_M3_MAX,
  "apple-macbook-pro-16-m3-max": FICHA_V3_MACBOOK_PRO_16_M3_MAX,
  "nothing-ear-2": FICHA_V3_NOTHING_EAR_2,
  "sony-wh-1000xm5": FICHA_V3_SONY_WH_1000XM5,
};

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolverClavePorId(id: number | string): string | null {
  if (typeof id === "number" || (typeof id === "string" && /^-?\d+$/.test(id))) {
    const numId = typeof id === "number" ? id : parseInt(id, 10);
    const absId = Math.abs(numId);
    switch (absId) {
      case 1:
      case 211:
        return "nothing-phone-2a";
      case 202:
      case 300:
        return "samsung-galaxy-s24-ultra";
      case 5:
      case 108:
      case 303:
        return "oneplus-pad-2";
      case 208:
        return "ipad-pro-11-m4";
      case 6:
        return "lenovo-thinkpad-e14-gen-5";
      case 209:
        return "macbook-pro-16-m3-max";
      case 3:
        return "nothing-ear-2";
      case 109:
        return "sony-wh-1000xm5";
      default:
        return null;
    }
  }
  const slug = String(id).toLowerCase().trim();
  return FICHAS_TECNICAS_V3_PILOTO[slug] ? slug : null;
}

function resolverClavePorNombre(nombre: string): string | null {
  const n = normalizarTexto(nombre);
  if (n.includes("nothing phone 2a") || n.includes("phone (2a)") || n.includes("phone 2a")) {
    return "nothing-phone-2a";
  }
  if (n.includes("s24 ultra") || n.includes("galaxy s24 ultra")) {
    return "samsung-galaxy-s24-ultra";
  }
  if (n.includes("oneplus pad 2")) {
    return "oneplus-pad-2";
  }
  if (n.includes("ipad pro") && (n.includes("m4") || n.includes("11"))) {
    return "ipad-pro-11-m4";
  }
  if (n.includes("thinkpad") && (n.includes("e14") || n.includes("gen 5"))) {
    return "lenovo-thinkpad-e14-gen-5";
  }
  if (n.includes("macbook pro") && (n.includes("m3 max") || n.includes("16"))) {
    return "macbook-pro-16-m3-max";
  }
  if (n.includes("nothing ear") && (n.includes("2") || n.includes("(2)"))) {
    return "nothing-ear-2";
  }
  if (n.includes("wh 1000xm5") || n.includes("wh-1000xm5") || n.includes("1000xm5")) {
    return "sony-wh-1000xm5";
  }
  return null;
}

/**
 * Resuelve la ficha V3 piloto por ID numérico (API/mock/kimovil), clave canónica o nombre del producto.
 * Si se proporcionan tanto ID como nombre, verifica que sean mutuamente coherentes para evitar colisiones.
 */
export function obtenerFichaTecnicaV3Piloto(
  criterio:
    | { id?: number | string | null; nombre?: string | null }
    | number
    | string
    | null
    | undefined,
): DatosFichaTecnicaV3 | null {
  if (criterio === null || criterio === undefined) return null;

  let id: number | string | null = null;
  let nombre: string | null = null;

  if (typeof criterio === "number" || typeof criterio === "string") {
    id = criterio;
  } else {
    id = criterio.id ?? null;
    nombre = criterio.nombre ?? null;
  }

  if (id !== null && nombre) {
    const claveId = resolverClavePorId(id);
    const claveNombre = resolverClavePorNombre(nombre);
    if (claveId && claveNombre && claveId === claveNombre) {
      return FICHAS_TECNICAS_V3_PILOTO[claveId] ?? null;
    }
    return null;
  }

  if (id !== null) {
    const claveId = resolverClavePorId(id);
    return claveId ? FICHAS_TECNICAS_V3_PILOTO[claveId] ?? null : null;
  }

  if (nombre) {
    const claveNombre = resolverClavePorNombre(nombre);
    return claveNombre ? FICHAS_TECNICAS_V3_PILOTO[claveNombre] ?? null : null;
  }

  return null;
}

export function validarTodasLasFichasV3Piloto(): Record<
  string,
  { valido: boolean; errores: string[] }
> {
  const resultado: Record<string, { valido: boolean; errores: string[] }> = {};
  const entradas: Array<[string, DatosFichaTecnicaV3]> = [
    ["ipad-pro-11-m4", FICHA_V3_IPAD_PRO_11_M4],
    ["lenovo-thinkpad-e14-gen-5", FICHA_V3_LENOVO_THINKPAD_E14_GEN_5],
    ["macbook-pro-16-m3-max", FICHA_V3_MACBOOK_PRO_16_M3_MAX],
    ["nothing-ear-2", FICHA_V3_NOTHING_EAR_2],
    ["nothing-phone-2a", FICHA_V3_NOTHING_PHONE_2A],
    ["oneplus-pad-2", FICHA_V3_ONEPLUS_PAD_2],
    ["samsung-galaxy-s24-ultra", FICHA_V3_SAMSUNG_GALAXY_S24_ULTRA],
    ["sony-wh-1000xm5", FICHA_V3_SONY_WH_1000XM5],
  ];

  for (const [clave, ficha] of entradas) {
    const val = validarDatosFichaTecnicaV3(ficha);
    resultado[clave] = { valido: val.valido, errores: val.errores };
  }
  return resultado;
}
