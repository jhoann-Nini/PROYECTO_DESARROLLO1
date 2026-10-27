export type Tema = "claro" | "oscuro";

export const CLAVE_TEMA = "tecreview:tema";
export const EVENTO_TEMA = "tecreview:tema-cambio";

export function esTema(valor: unknown): valor is Tema {
  return valor === "claro" || valor === "oscuro";
}

/**
 * Lee la preferencia guardada por el usuario sin fallar en entornos sin
 * almacenamiento (SSR, modo privado o almacenamiento bloqueado).
 */
export function leerTemaGuardado(): Tema | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const valor = window.localStorage.getItem(CLAVE_TEMA);
    return esTema(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function obtenerTemaInicial(): Tema {
  // El tema oscuro es la identidad principal de TecReview. El claro solo se
  // aplica cuando el usuario lo elige y queda guardado.
  return leerTemaGuardado() ?? "oscuro";
}

export function obtenerTemaDelDocumento(): Tema {
  if (typeof document === "undefined") {
    return "claro";
  }

  return document.documentElement.classList.contains("dark")
    ? "oscuro"
    : "claro";
}

export function aplicarTema(tema: Tema, raiz?: HTMLElement): void {
  if (typeof document === "undefined") {
    return;
  }

  const elemento = raiz ?? document.documentElement;
  elemento.classList.toggle("dark", tema === "oscuro");
  elemento.dataset.tema = tema;
  elemento.style.colorScheme = tema === "oscuro" ? "dark" : "light";
}

export function guardarTema(tema: Tema): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Si el almacenamiento no está disponible, el tema sigue funcionando
    // durante la sesión actual.
  }
}

/**
 * Aplica el tema antes de la hidratación para evitar el destello del tema
 * incorrecto. Se inyecta como script beforeInteractive en el layout raíz.
 */
export const SCRIPT_TEMA = `(function(){var oscuro=true;try{var guardado=window.localStorage.getItem(${JSON.stringify(
  CLAVE_TEMA,
)});if(guardado==="claro"){oscuro=false;}}catch(e){}var raiz=document.documentElement;raiz.classList.toggle("dark",oscuro);raiz.dataset.tema=oscuro?"oscuro":"claro";raiz.style.colorScheme=oscuro?"dark":"light";})();`;
