import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { encryptEnvelope, type EncryptedEnvelope, type EvaluationJob } from "@skillvault/shared";

export class MarketplaceClient {
  constructor(private readonly baseUrl: string) {}

  async createEvaluation(skillId: string, threshold: number, buyerId: string): Promise<EvaluationJob> {
    const response = await fetch(`${this.baseUrl}/v1/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill_id: skillId, threshold, buyer_id: buyerId }),
    });
    if (!response.ok) {
      throw new Error(`Create evaluation failed: ${response.status} ${await response.text()}`);
    }
    return response.json() as Promise<EvaluationJob>;
  }

  async submitDataset(jobId: string, envelope: EncryptedEnvelope): Promise<EvaluationJob> {
    const response = await fetch(`${this.baseUrl}/v1/evaluations/${jobId}/dataset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (!response.ok) {
      throw new Error(`Submit dataset failed: ${response.status} ${await response.text()}`);
    }
    return response.json() as Promise<EvaluationJob>;
  }

  async getEvaluation(jobId: string): Promise<EvaluationJob> {
    const response = await fetch(`${this.baseUrl}/v1/evaluations/${jobId}`);
    if (!response.ok) {
      throw new Error(`Get evaluation failed: ${response.status}`);
    }
    return response.json() as Promise<EvaluationJob>;
  }
}

export function loadDataset(datasetPath: string): Buffer {
  const absolute = resolve(datasetPath);
  return readFileSync(absolute);
}

export function verifyAttestation(attestation: Record<string, unknown>): void {
  const required = ["runner_hash", "verifier_hash", "model_hash", "ephemeral_public_key", "attestation_quote"];
  for (const field of required) {
    if (!attestation[field]) {
      throw new Error(`Attestation missing required field: ${field}`);
    }
  }
}

export function encryptDataset(publicKeyPem: string, datasetBytes: Buffer): EncryptedEnvelope {
  return encryptEnvelope(publicKeyPem, datasetBytes);
}
