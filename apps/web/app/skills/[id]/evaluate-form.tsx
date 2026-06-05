"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createEvaluation, submitDataset } from "@/lib/api";
import { encryptEnvelope, verifyAttestation } from "@/lib/crypto";

export function EvaluateForm({ skillId }: { skillId: string }) {
  const router = useRouter();
  const [threshold, setThreshold] = useState("0.85");
  const [buyerId, setBuyerId] = useState("buyer_demo");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("Creating TEE evaluation session...");

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("dataset") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Select a dataset JSON file");
      return;
    }

    try {
      const job = await createEvaluation(skillId, Number(threshold), buyerId);
      if (!job.attestation || !verifyAttestation(job.attestation)) {
        throw new Error("Invalid TEE attestation");
      }

      setStatus("Encrypting dataset to TEE public key...");
      const datasetBytes = new Uint8Array(await file.arrayBuffer());
      const envelope = await encryptEnvelope(
        String(job.attestation.ephemeral_public_key),
        datasetBytes,
      );

      setStatus("Running private evaluation inside TEE...");
      const completed = await submitDataset(job.job_id, envelope);
      router.push(`/evaluations/${completed.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
      setStatus(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4 rounded-xl border border-border p-5">
      <h2 className="text-lg font-medium">Evaluate on private dataset</h2>
      <label className="flex flex-col gap-1 text-sm">
        Threshold (0-1)
        <input
          className="rounded-md border border-border bg-transparent px-3 py-2"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Buyer ID
        <input
          className="rounded-md border border-border bg-transparent px-3 py-2"
          value={buyerId}
          onChange={(e) => setBuyerId(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dataset JSON
        <input name="dataset" type="file" accept="application/json,.json" className="text-sm" />
      </label>
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 font-medium text-white"
      >
        Start private evaluation
      </button>
      {status ? <p className="text-sm text-muted">{status}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
