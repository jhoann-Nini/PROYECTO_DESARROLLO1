import type { ComponentPropsWithRef } from "react";
import { CLASE_FOCO } from "./foco";

export type InputProps = ComponentPropsWithRef<"input">;

/** Conserva los atributos, la referencia y los eventos del input nativo. */
export default function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-input border-0 border-b border-ink bg-transparent px-0 py-3 text-base font-normal tracking-normal text-ink placeholder:text-text-muted disabled:cursor-not-allowed ${CLASE_FOCO} ${className}`}
    />
  );
}
