const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface SkillListing {
  skill_id: string;
  seller_id: string;
  name: string;
  description: string;
  category: string;
  evaluation_type: string;
  price: number;
  status: string;
  skill_hash: string;
}

export interface EvaluationJob {
  job_id: string;
  skill_id: string;
  buyer_id: string;
  threshold: number;
  status: string;
  tee_session_id?: string;
  attestation?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  receipt?: Record<string, unknown>;
  settlement_status?: string;
  payment_status?: string;
  license_id?: string;
  settlement?: {
    passed: boolean;
    payment_status: string;
    license_id?: string;
    buyer_balance: number;
    seller_balance: number;
    amount: number;
  };
  error?: string;
  artifacts?: Record<string, { sha256?: string; size?: number; content_type?: string }>;
}

export async function fetchEvaluationArtifact(jobId: string, name: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/v1/evaluations/${jobId}/artifacts/${name}`);
  if (!response.ok) throw new Error("Artifact not found");
  return response.blob();
}

export async function fetchSkills(): Promise<SkillListing[]> {
  const response = await fetch(`${API_URL}/v1/skills`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load skills");
  const data = await response.json();
  return data.skills;
}

export async function fetchSkill(skillId: string): Promise<SkillListing> {
  const response = await fetch(`${API_URL}/v1/skills/${skillId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Skill not found");
  return response.json();
}

export async function fetchEvaluation(jobId: string): Promise<EvaluationJob> {
  const response = await fetch(`${API_URL}/v1/evaluations/${jobId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Evaluation not found");
  return response.json();
}

export async function createEvaluation(
  skillId: string,
  threshold: number,
  buyerId: string,
): Promise<EvaluationJob> {
  const response = await fetch(`${API_URL}/v1/evaluations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill_id: skillId, threshold, buyer_id: buyerId }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function submitDataset(
  jobId: string,
  envelope: { ciphertext: string; encrypted_key: string; nonce: string },
): Promise<EvaluationJob> {
  const response = await fetch(`${API_URL}/v1/evaluations/${jobId}/dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function uploadSkillZip(payload: {
  seller_id: string;
  package: File;
  metadata: {
    name: string;
    version: string;
    category: string;
    evaluation_type: string;
    description: string;
  };
  price: number;
  publish?: boolean;
}) {
  const form = new FormData();
  form.append("package", payload.package);
  form.append("metadata", JSON.stringify(payload.metadata));
  form.append("seller_id", payload.seller_id);
  form.append("price", String(payload.price));
  form.append("publish", String(payload.publish ?? true));
  const response = await fetch(`${API_URL}/v1/skills/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

/** @deprecated Legacy JSON upload */
export async function uploadSkill(payload: {
  seller_id: string;
  skill_content: string;
  metadata: {
    name: string;
    version: string;
    category: string;
    evaluation_type: string;
    description: string;
  };
  price: number;
  publish?: boolean;
}) {
  const response = await fetch(`${API_URL}/v1/skills/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export interface License {
  license_id: string;
  buyer_id: string;
  skill_id: string;
  job_id: string;
  receipt_id: string;
  issued_at: string;
}

export async function fetchBuyerBalance(buyerId: string): Promise<number> {
  const response = await fetch(`${API_URL}/v1/buyers/${buyerId}/balance`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load balance");
  const data = await response.json();
  return data.balance;
}

export async function fetchSellerBalance(sellerId: string): Promise<number> {
  const response = await fetch(`${API_URL}/v1/sellers/${sellerId}/balance`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load seller balance");
  const data = await response.json();
  return data.balance;
}

export async function fetchBuyerLicenses(buyerId: string): Promise<License[]> {
  const response = await fetch(`${API_URL}/v1/buyers/${buyerId}/licenses`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load licenses");
  const data = await response.json();
  return data.licenses;
}

export { API_URL };
