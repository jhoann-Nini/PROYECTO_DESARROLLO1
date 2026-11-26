import type { ComponentPropsWithRef } from "react";

export type TagVariant = "neutral" | "verified" | "pending" | "missing" | "deal" | "danger";

const variantes: Record<TagVariant, string> = {
  neutral: "border-line bg-transparent text-text-secondary",
  verified: "border-transparent bg-surface-2 text-ink",
  pending: "border-solid border-surface-border-strong bg-transparent text-text-secondary",
  missing: "border-dotted border-surface-border-strong bg-transparent text-text-secondary",
  deal: "border-star bg-transparent text-star",
  danger: "border-status-error bg-transparent text-status-error",
};

export type TagProps = ComponentPropsWithRef<"span"> & {
  variant?: TagVariant;
};

export default function Tag({ variant = "neutral", className = "", ...props }: TagProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label font-medium uppercase tracking-normal ${variantes[variant]} ${className}`}
    />
  );
}
