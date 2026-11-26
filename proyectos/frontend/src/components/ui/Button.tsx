import type { ComponentPropsWithRef } from "react";
import { CLASE_FOCO } from "./foco";

export type ButtonVariant = "primary" | "secondary" | "link" | "danger";

const variantes: Record<ButtonVariant, string> = {
  primary: "rounded-pill border border-transparent bg-brand-solid text-on-solid",
  secondary: "rounded-ghost border border-ink bg-transparent text-ink hover:bg-surface-muted",
  link: "rounded-input border border-transparent bg-transparent text-brand-blue underline underline-offset-4",
  danger: "rounded-ghost border border-status-error bg-transparent text-status-error hover:bg-surface-muted",
};

/** También permite vestir un Link sin cambiar su semántica de navegación. */
export function buttonClassName(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-5 py-3 text-label font-medium uppercase tracking-normal transition-colors cursor-pointer disabled:cursor-not-allowed ${CLASE_FOCO} ${variantes[variant]} ${className}`;
}

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
};

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button {...props} className={buttonClassName(variant, className)} />;
}
