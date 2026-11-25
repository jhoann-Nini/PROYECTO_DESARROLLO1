import { CLASE_FOCO } from "@/components/ui/foco";

/** Clases compartidas de la comunidad, con los tokens de color del sitio. */
export const CLASE_BOTON = `cursor-pointer rounded-md border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`;
export const CLASE_BOTON_PRINCIPAL = `cursor-pointer rounded-md bg-[var(--color-brand-solid)] px-4 py-2 text-sm font-semibold text-[var(--color-on-solid)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${CLASE_FOCO}`;
export const CLASE_CAMPO = `mt-1 block w-full rounded-md border border-[var(--color-hairline)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-blue)] ${CLASE_FOCO}`;
export const CLASE_ALERTA = "rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700";
