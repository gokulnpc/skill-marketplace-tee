import { createPublicKey, verify } from "node:crypto";

export const RECEIPT_PAYLOAD_FIELDS = [
  "receipt_id",
  "session_id",
  "skill_id",
  "skill_hash",
  "runner_hash",
  "verifier_hash",
  "model_hash",
  "baseline_score",
  "skill_score",
  "uplift",
  "threshold",
  "passed",
  "attestation_ref",
  "timestamp",
] as const;

export type ReceiptPayloadField = (typeof RECEIPT_PAYLOAD_FIELDS)[number];

export function canonicalReceiptPayload(payload: Record<string, unknown>): Buffer {
  const sorted = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});
  return Buffer.from(JSON.stringify(sorted));
}

export function extractReceiptPayload(receipt: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of RECEIPT_PAYLOAD_FIELDS) {
    if (receipt[field] !== undefined) {
      payload[field] = receipt[field];
    }
  }
  return payload;
}

export function verifyReceiptSignature(
  publicKeyPem: string,
  payload: Record<string, unknown>,
  signatureB64: string,
): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    const signature = Buffer.from(signatureB64, "base64");
    return verify(null, canonicalReceiptPayload(payload), key, signature);
  } catch {
    return false;
  }
}
