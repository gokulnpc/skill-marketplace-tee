import type { ReactNode } from "react";

import { Icon } from "@/components/shared/Icon";

type PillTone = "default" | "muted" | "accent" | "ink";

const tones: Record<PillTone, { bg: string; col: string; bd: string }> = {
  default: { bg: "var(--card)", col: "var(--ink-2)", bd: "var(--line)" },
  muted: { bg: "transparent", col: "var(--mute)", bd: "var(--line)" },
  accent: { bg: "var(--accent-soft)", col: "var(--accent)", bd: "transparent" },
  ink: { bg: "var(--ink)", col: "var(--bg)", bd: "var(--ink)" },
};

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: PillTone }) {
  const t = tones[tone];
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        border: `1px solid ${t.bd}`,
        borderRadius: 999,
        fontSize: 11,
        background: t.bg,
        color: t.col,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

type BadgeVariant = "pass" | "fail" | "accent" | "neutral";

export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: BadgeVariant }) {
  const v = {
    pass: { bg: "var(--accent-soft)", col: "var(--accent)", bd: "transparent" },
    fail: { bg: "var(--danger-soft)", col: "var(--danger)", bd: "transparent" },
    accent: { bg: "var(--ink)", col: "var(--bg)", bd: "var(--ink)" },
    neutral: { bg: "transparent", col: "var(--mute)", bd: "var(--line)" },
  }[variant];

  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        background: v.bg,
        color: v.col,
        border: `1px solid ${v.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function VerifiedTag({ verified }: { verified: boolean }) {
  return verified ? (
    <Pill tone="accent">
      <Icon name="check" size={11} stroke={2.2} /> verified seller
    </Pill>
  ) : (
    <Pill tone="muted">pending verification</Pill>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="label" style={{ marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

export function EnclaveChip({ label = "sealed in enclave", live = false }: { label?: string; live?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 11px 5px 9px",
        borderRadius: 999,
        border: "1px solid var(--accent)",
        color: "var(--accent)",
        background: "var(--accent-soft)",
      }}
    >
      {live ? (
        <span
          className="live-dot"
          style={{ width: 7, height: 7, borderRadius: 99, background: "var(--accent)" }}
        />
      ) : (
        <Icon name="lock" size={13} stroke={1.8} />
      )}
      <span className="mono" style={{ fontSize: 11, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </span>
  );
}
