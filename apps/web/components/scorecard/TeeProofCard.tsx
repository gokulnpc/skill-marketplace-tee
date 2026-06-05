"use client";

import { useState } from "react";

import { CopyField } from "@/components/ui/CopyField";
import { Badge } from "@/components/ui/Badge";
import { truncateHash } from "./format";

export interface TeeProofData {
  sessionId?: string;
  attestationQuote?: string;
  attestationTimestamp?: string;
  runnerHash: string;
  verifierHash: string;
  modelHash: string;
  receiptId: string;
  attestationRef?: string;
  mode?: string;
}

export function TeeProofCard({ proof }: { proof: TeeProofData }) {
  const [showQuote, setShowQuote] = useState(false);

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">TEE Proof</h2>
        <Badge variant="accent">{proof.mode ?? "attested"}</Badge>
      </div>

      <dl className="mt-4 flex flex-col gap-4 text-sm">
        {proof.sessionId ? (
          <CopyField label="Session ID" value={proof.sessionId} />
        ) : null}
        {proof.attestationTimestamp ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Attested at</dt>
            <dd>{new Date(proof.attestationTimestamp).toLocaleString()}</dd>
          </div>
        ) : null}
        <HashRow label="Runner hash" value={proof.runnerHash} />
        <HashRow label="Verifier hash" value={proof.verifierHash} />
        <HashRow label="Model hash" value={proof.modelHash} />
        {proof.attestationRef ? (
          <HashRow label="Attestation ref" value={proof.attestationRef} />
        ) : null}
        <HashRow label="Receipt ID" value={proof.receiptId} />

        {proof.attestationQuote ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Attestation quote</dt>
              <button
                type="button"
                onClick={() => setShowQuote((open) => !open)}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted transition hover:border-accent hover:text-foreground"
              >
                {showQuote ? "Hide" : "Show"}
              </button>
            </div>
            <dd className="break-all font-mono text-xs">
              {showQuote ? proof.attestationQuote : truncateHash(proof.attestationQuote, 24, 16)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="break-all font-mono text-xs" title={value}>
        {truncateHash(value, 18, 10)}
      </dd>
    </div>
  );
}
