/**
 * Anillo de foco oficial de TecReview.
 * Se aplica a todo control interactivo y reemplaza el outline del navegador
 * solo cuando el anillo visible está presente.
 */
export const CLASE_FOCO =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** Mantiene Tab dentro del diálogo visible, incluso si se abrió una confirmación encima. */
export function atraparTabulacion(
  evento: ReactKeyboardEvent<HTMLElement>,
  dialogo: HTMLElement | null,
) {
  if (evento.key !== "Tab" || !dialogo) return;
  const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((elemento) => elemento.tabIndex >= 0 && elemento.getClientRects().length > 0);
  // happy-dom no calcula geometría: permitir controles sin rectángulos durante pruebas.
  const candidatos = enfocables.length > 0 ? enfocables : Array.from(dialogo.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
  )).filter((elemento) => elemento.tabIndex >= 0);
  const primero = candidatos[0];
  const ultimo = candidatos[candidatos.length - 1];
  if (!primero) {
    evento.preventDefault();
    dialogo.focus();
  } else if (evento.shiftKey && (document.activeElement === primero || !dialogo.contains(document.activeElement))) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && (document.activeElement === ultimo || !dialogo.contains(document.activeElement))) {
    evento.preventDefault();
    primero.focus();
  }
}
