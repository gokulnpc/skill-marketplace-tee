import { encryptEnvelope, type EncryptedEnvelope } from "@skillvault/shared";

const DEFAULT_TEE_URL = "http://localhost:8080";

export class TeeClient {
  constructor(private readonly baseUrl = process.env.TEE_RUNNER_URL ?? DEFAULT_TEE_URL) {}

  async createSession(skillId: string, threshold: number) {
    return this.post("/v1/sessions", { skill_id: skillId, threshold });
  }

  async getAttestation(sessionId: string) {
    return this.get(`/v1/sessions/${sessionId}/attestation`);
  }

  async submitSkill(sessionId: string, envelope: EncryptedEnvelope) {
    return this.post(`/v1/sessions/${sessionId}/inputs/skill`, envelope);
  }

  async submitDataset(sessionId: string, envelope: EncryptedEnvelope) {
    return this.post(`/v1/sessions/${sessionId}/inputs/dataset`, envelope);
  }

  async runInference(sessionId: string) {
    return this.post(`/v1/sessions/${sessionId}/inference`, {});
  }

  async runEvaluation(sessionId: string) {
    return this.post(`/v1/sessions/${sessionId}/evaluate`, {});
  }

  async finalize(sessionId: string) {
    return this.post(`/v1/sessions/${sessionId}/finalize`, {});
  }

  async getSigningPublicKey(): Promise<{ public_key_pem: string }> {
    return this.get("/v1/signing-public-key");
  }

  async verifyReceipt(sessionId: string): Promise<{ valid: boolean; receipt_id: string; session_id: string }> {
    return this.get(`/v1/sessions/${sessionId}/receipt/verify`);
  }

  encryptToSession(publicKeyPem: string, plaintext: string | Buffer): EncryptedEnvelope {
    return encryptEnvelope(publicKeyPem, plaintext);
  }

  private async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`TEE GET ${path} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`TEE POST ${path} failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
}

export const teeClient = new TeeClient();
