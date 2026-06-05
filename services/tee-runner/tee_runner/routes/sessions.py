from fastapi import APIRouter, Depends

from tee_runner.models import (
    AttestationResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    EncryptedEnvelope,
    EncryptedInputResponse,
    EvaluationResponse,
    FinalizeRequest,
    InferenceResponse,
    ReceiptResponse,
    SessionResponse,
)
from tee_runner.services.session_service import SessionService

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])


def get_session_service() -> SessionService:
    from tee_runner.main import session_service

    return session_service


@router.post("", response_model=CreateSessionResponse, status_code=201)
def create_session(
    request: CreateSessionRequest,
    service: SessionService = Depends(get_session_service),
) -> CreateSessionResponse:
    return service.create_session(request)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> SessionResponse:
    return service.get_session(session_id)


@router.get("/{session_id}/attestation", response_model=AttestationResponse)
def get_attestation(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> AttestationResponse:
    return service.get_attestation(session_id)


@router.post("/{session_id}/inputs/skill", response_model=EncryptedInputResponse)
def submit_skill(
    session_id: str,
    envelope: EncryptedEnvelope,
    service: SessionService = Depends(get_session_service),
) -> EncryptedInputResponse:
    return service.submit_skill(session_id, envelope)


@router.post("/{session_id}/inputs/dataset", response_model=EncryptedInputResponse)
def submit_dataset(
    session_id: str,
    envelope: EncryptedEnvelope,
    service: SessionService = Depends(get_session_service),
) -> EncryptedInputResponse:
    return service.submit_dataset(session_id, envelope)


@router.post("/{session_id}/inference", response_model=InferenceResponse)
def run_inference(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> InferenceResponse:
    return service.run_inference(session_id)


@router.post("/{session_id}/evaluate", response_model=EvaluationResponse)
def run_evaluation(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> EvaluationResponse:
    return service.run_evaluation(session_id)


@router.post("/{session_id}/finalize", response_model=ReceiptResponse)
def finalize_session(
    session_id: str,
    request: FinalizeRequest,
    service: SessionService = Depends(get_session_service),
) -> ReceiptResponse:
    return service.finalize(session_id, request)


@router.get("/{session_id}/receipt", response_model=ReceiptResponse)
def get_receipt(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> ReceiptResponse:
    return service.get_receipt(session_id)


@router.get("/{session_id}/receipt/verify")
def verify_receipt(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> dict[str, bool | str]:
    return service.verify_session_receipt(session_id)
