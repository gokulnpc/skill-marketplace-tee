from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    CREATED = "created"
    ATTESTATION_READY = "attestation_ready"
    INPUTS_PARTIAL = "inputs_partial"
    INPUTS_RECEIVED = "inputs_received"
    INFERENCE_COMPLETE = "inference_complete"
    EVALUATED = "evaluated"
    FINALIZED = "finalized"


class CreateSessionRequest(BaseModel):
    skill_id: str = Field(..., min_length=1)
    threshold: float = Field(..., ge=0.0, le=1.0)


class CreateSessionResponse(BaseModel):
    session_id: str
    status: SessionStatus


class AttestationResponse(BaseModel):
    attestation_quote: str
    runner_hash: str
    verifier_hash: str
    model_hash: str
    ephemeral_public_key: str
    session_id: str
    timestamp: datetime
    mode: str


class EncryptedEnvelope(BaseModel):
    ciphertext: str
    encrypted_key: str
    nonce: str


class EncryptedInputResponse(BaseModel):
    session_id: str
    input_type: str
    received: bool
    status: SessionStatus


class FinalizeRequest(BaseModel):
    baseline_score: float | None = Field(default=None, ge=0.0, le=1.0)
    skill_score: float | None = Field(default=None, ge=0.0, le=1.0)
    skill_hash: str | None = None


class ReceiptResponse(BaseModel):
    receipt_id: str
    session_id: str
    skill_id: str
    skill_hash: str
    runner_hash: str
    verifier_hash: str
    model_hash: str
    baseline_score: float
    skill_score: float
    uplift: float
    threshold: float
    passed: bool
    attestation_ref: str
    timestamp: datetime
    signature: str


class SessionResponse(BaseModel):
    session_id: str
    skill_id: str
    threshold: float
    status: SessionStatus
    has_skill: bool
    has_dataset: bool
    has_inference: bool = False
    has_evaluation: bool = False
    receipt_id: str | None = None


class SampleEvaluationResult(BaseModel):
    transcript_id: str
    baseline_score: float
    skill_score: float
    baseline_checks: dict
    skill_checks: dict
    approved_output: str | None = None
    leakage_blocked: bool
    leakage_reasons: list[str]


class EvaluationResponse(BaseModel):
    session_id: str
    status: SessionStatus
    baseline_score: float
    skill_score: float
    uplift: float
    threshold: float
    passed: bool
    sample_count: int
    samples: list[SampleEvaluationResult]


class TranscriptInferenceResult(BaseModel):
    transcript_id: str
    baseline_output: str
    with_skill_output: str


class InferenceResponse(BaseModel):
    session_id: str
    status: SessionStatus
    sample_count: int
    results: list[TranscriptInferenceResult]
