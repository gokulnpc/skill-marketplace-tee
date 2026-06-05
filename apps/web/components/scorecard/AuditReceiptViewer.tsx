"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { API_URL } from "@/lib/api";

export function AuditReceiptViewer({
  jobId,
  receipt,
}: {
  jobId: string;
  receipt: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function verifySignature() {
    setVerifyState("loading");
    setVerifyError(null);
    try {
      const response = await fetch(`${API_URL}/v1/evaluations/${jobId}/receipt/verify`);
      const body = (await response.json()) as { valid?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Verification request failed");
      }
      setVerifyState(body.valid ? "valid" : "invalid");
    } catch (error) {
      setVerifyState("invalid");
      setVerifyError(error instanceof Error ? error.message : "Verification failed");
    }
  }

  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Audit receipt</h2>
          <p className="mt-1 text-sm text-muted">Signed TEE evaluation receipt with Ed25519 signature</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="rounded border border-border px-3 py-1.5 text-sm transition hover:border-accent"
          >
            {expanded ? "Collapse" : "Expand JSON"}
          </button>
          <button
            type="button"
            onClick={verifySignature}
            disabled={verifyState === "loading"}
            className="rounded border border-accent bg-accent/10 px-3 py-1.5 text-sm transition hover:bg-accent/20 disabled:opacity-60"
          >
            {verifyState === "loading" ? "Verifying…" : "Verify signature"}
          </button>
        </div>
      </div>

      {verifyState === "valid" ? (
        <div className="mt-4">
          <Badge variant="pass">Signature valid</Badge>
        </div>
      ) : null}
      {verifyState === "invalid" ? (
        <div className="mt-4 flex flex-col gap-2">
          <Badge variant="fail">Signature invalid</Badge>
          {verifyError ? <p className="text-sm text-red-300">{verifyError}</p> : null}
        </div>
      ) : null}

      <pre
        className={`mt-4 overflow-x-auto rounded-md bg-black/30 p-3 text-xs ${expanded ? "" : "max-h-40"}`}
      >
        {JSON.stringify(receipt, null, 2)}
      </pre>
    </section>
  );
}
