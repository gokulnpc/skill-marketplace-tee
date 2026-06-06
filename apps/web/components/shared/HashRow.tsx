"use client";

import { useState } from "react";

import { Icon } from "@/components/shared/Icon";
import { short } from "@/lib/format";

export function HashRow({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1100);
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="label" style={{ fontSize: 10 }}>
        {label}
      </span>
      <button
        type="button"
        onClick={onCopy}
        title={value}
        style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
      >
        <span
          className="mono"
          style={{ fontSize: 11.5, color: "var(--ink-2)", wordBreak: "break-all", lineHeight: 1.5 }}
        >
          {full ? value : short(value, 20, 10)}
        </span>
        <span style={{ color: copied ? "var(--accent)" : "var(--faint)", flexShrink: 0 }}>
          {copied ? <Icon name="check" size={13} stroke={2.2} /> : <Icon name="copy" size={13} />}
        </span>
      </button>
    </div>
  );
}
