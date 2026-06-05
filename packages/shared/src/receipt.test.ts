import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  canonicalReceiptPayload,
  extractReceiptPayload,
  verifyReceiptSignature,
} from "./receipt.js";

describe("receipt", () => {
  it("canonicalizes payload with sorted keys", () => {
    const canonical = canonicalReceiptPayload({ b: 2, a: 1 }).toString("utf-8");
    expect(canonical).toBe('{"a":1,"b":2}');
  });

  it("verifies ed25519 receipt signatures", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const payload = {
      receipt_id: "rcpt_test",
      session_id: "sess_1",
      skill_id: "skill-1",
      skill_hash: "sha256:abc",
      runner_hash: "sha256:runner",
      verifier_hash: "sha256:verifier",
      model_hash: "sha256:model",
      baseline_score: 0.5,
      skill_score: 0.9,
      uplift: 0.4,
      threshold: 0.85,
      passed: true,
      attestation_ref: "sha256:quote",
      timestamp: "2026-06-05T12:00:00+00:00",
    };

    const signature = sign(null, canonicalReceiptPayload(payload), privateKey).toString("base64");
    const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    expect(verifyReceiptSignature(publicPem, payload, signature)).toBe(true);
    expect(verifyReceiptSignature(publicPem, { ...payload, passed: false }, signature)).toBe(false);
  });

  it("extracts signed payload fields from receipt response", () => {
    const extracted = extractReceiptPayload({
      receipt_id: "rcpt_1",
      session_id: "sess_1",
      skill_id: "skill-1",
      skill_hash: "sha256:abc",
      runner_hash: "sha256:runner",
      verifier_hash: "sha256:verifier",
      model_hash: "sha256:model",
      baseline_score: 0.5,
      skill_score: 0.9,
      uplift: 0.4,
      threshold: 0.85,
      passed: true,
      attestation_ref: "sha256:quote",
      timestamp: "2026-06-05T12:00:00.000Z",
      signature: "ignored",
    });

    expect(extracted).not.toHaveProperty("signature");
    expect(extracted.receipt_id).toBe("rcpt_1");
  });
});
