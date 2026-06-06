export interface SkillMetadata {
  name: string;
  version: string;
  category: string;
  evaluation_type: string;
  description: string;
}

export interface SkillListing {
  skill_id: string;
  seller_id: string;
  name: string;
  description: string;
  category: string;
  evaluation_type: string;
  price: number;
  status: "draft" | "published" | "rejected";
  skill_hash: string;
  storage_ref?: string;
  package_format_version?: string;
  harness_runtime?: string;
  inference_profile?: "standard" | "premium";
}

export interface EncryptedEnvelope {
  ciphertext: string;
  encrypted_key: string;
  nonce: string;
}

export type EvaluationJobStatus =
  | "created"
  | "attestation_ready"
  | "dataset_received"
  | "running"
  | "completed"
  | "failed";

export interface EvaluationJob {
  job_id: string;
  skill_id: string;
  buyer_id: string;
  threshold: number;
  status: EvaluationJobStatus;
  tee_session_id?: string;
  attestation?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
  receipt?: Record<string, unknown>;
  settlement_status?: "pending" | "settled" | "not_charged";
  payment_status?: "charged" | "not_charged";
  license_id?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface License {
  license_id: string;
  buyer_id: string;
  skill_id: string;
  job_id: string;
  receipt_id: string;
  issued_at: string;
}

export interface SettlementResult {
  job_id: string;
  passed: boolean;
  payment_status: "charged" | "not_charged";
  license_id?: string;
  buyer_balance: number;
  seller_balance: number;
  amount: number;
}

export interface CreateEvaluationRequest {
  skill_id: string;
  threshold: number;
  buyer_id: string;
}
