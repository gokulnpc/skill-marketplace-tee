import type { ReactNode } from "react";

type BadgeVariant = "pass" | "fail" | "neutral" | "accent";

const styles: Record<BadgeVariant, string> = {
  pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  fail: "border-red-500/40 bg-red-500/10 text-red-300",
  neutral: "border-border bg-white/5 text-muted",
  accent: "border-accent/40 bg-accent/10 text-indigo-200",
};

export function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
