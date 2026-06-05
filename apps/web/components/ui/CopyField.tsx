"use client";

import { useState } from "react";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-muted">{label}</dt>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-border px-2 py-0.5 text-xs text-muted transition hover:border-accent hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <dd className="break-all font-mono text-xs">{value}</dd>
    </div>
  );
}
