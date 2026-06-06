import pytest
from fastapi.testclient import TestClient

from tee_runner.config import Settings
from tee_runner.crypto.envelope import encrypt_envelope
from tee_runner.main import app
from tee_runner.services.session_service import SessionService
from tee_runner.session.store import SessionStore
from tee_runner.tee.mock import MockTeeAdapter


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def service() -> SessionService:
    settings = Settings(runner_mode="mock")
    return SessionService(store=SessionStore(), tee=MockTeeAdapter(settings), settings=settings)


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_session_and_attestation(client: TestClient) -> None:
    create = client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    assert create.status_code == 201
    session_id = create.json()["session_id"]

    attestation = client.get(f"/v1/sessions/{session_id}/attestation")
    assert attestation.status_code == 200
    body = attestation.json()
    assert body["session_id"] == session_id
    assert body["runner_hash"].startswith("sha256:")
    assert "BEGIN PUBLIC KEY" in body["ephemeral_public_key"]
    assert body["attestation_quote"]


def test_encrypted_inputs_and_finalize(client: TestClient) -> None:
    create = client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    session_id = create.json()["session_id"]
    public_key = client.get(f"/v1/sessions/{session_id}/attestation").json()[
        "ephemeral_public_key"
    ]

    skill_env = encrypt_envelope(public_key, b"skill-package-bytes")
    dataset_env = encrypt_envelope(public_key, b"dataset-bytes")

    skill_resp = client.post(f"/v1/sessions/{session_id}/inputs/skill", json=skill_env)
    assert skill_resp.status_code == 200
    assert skill_resp.json()["status"] == "inputs_partial"

    dataset_resp = client.post(f"/v1/sessions/{session_id}/inputs/dataset", json=dataset_env)
    assert dataset_resp.status_code == 200
    assert dataset_resp.json()["status"] == "inputs_received"

    finalize = client.post(
        f"/v1/sessions/{session_id}/finalize",
        json={
            "baseline_score": 0.6,
            "skill_score": 0.9,
            "skill_hash": "sha256:abc123",
        },
    )
    assert finalize.status_code == 200
    receipt = finalize.json()
    assert receipt["passed"] is True
    assert receipt["uplift"] == pytest.approx(0.3)
    assert receipt["signature"]

    get_receipt = client.get(f"/v1/sessions/{session_id}/receipt")
    assert get_receipt.status_code == 200
    assert get_receipt.json()["receipt_id"] == receipt["receipt_id"]


def test_finalize_fails_without_inputs(client: TestClient) -> None:
    create = client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    session_id = create.json()["session_id"]

    response = client.post(
        f"/v1/sessions/{session_id}/finalize",
        json={"baseline_score": 0.5, "skill_score": 0.9},
    )
    assert response.status_code == 400


def test_threshold_fail(client: TestClient) -> None:
    create = client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    session_id = create.json()["session_id"]
    public_key = client.get(f"/v1/sessions/{session_id}/attestation").json()[
        "ephemeral_public_key"
    ]

    client.post(f"/v1/sessions/{session_id}/inputs/skill", json=encrypt_envelope(public_key, b"skill"))
    client.post(
        f"/v1/sessions/{session_id}/inputs/dataset",
        json=encrypt_envelope(public_key, b"dataset"),
    )

    receipt = client.post(
        f"/v1/sessions/{session_id}/finalize",
        json={"baseline_score": 0.6, "skill_score": 0.7},
    ).json()
    assert receipt["passed"] is False


def test_receipt_signing_roundtrip(service: SessionService) -> None:
    from tee_runner.crypto.envelope import encrypt_envelope
    from tee_runner.crypto.receipt import verify_receipt
    from tee_runner.models import CreateSessionRequest, FinalizeRequest

    created = service.create_session(
        CreateSessionRequest(skill_id="test-skill", threshold=0.8)
    )
    attestation = service.get_attestation(created.session_id)
    skill_env = encrypt_envelope(attestation.ephemeral_public_key, b"skill")
    dataset_env = encrypt_envelope(attestation.ephemeral_public_key, b"dataset")

    from tee_runner.models import EncryptedEnvelope

    service.submit_skill(created.session_id, EncryptedEnvelope(**skill_env))
    service.submit_dataset(created.session_id, EncryptedEnvelope(**dataset_env))
    receipt = service.finalize(
        created.session_id,
        FinalizeRequest(baseline_score=0.5, skill_score=0.95, skill_hash="sha256:deadbeef"),
    )

    from tee_runner.crypto.receipt import public_key_pem_from_private

    public_pem = public_key_pem_from_private(service._signing_key)
    record = service._store.get(created.session_id)
    assert record.receipt is not None
    verify_receipt(public_pem, record.receipt, receipt.signature)


def test_signing_public_key(client: TestClient) -> None:
    response = client.get("/v1/signing-public-key")
    assert response.status_code == 200
    assert "BEGIN PUBLIC KEY" in response.json()["public_key_pem"]


def test_verify_receipt_endpoint(client: TestClient) -> None:
    create = client.post("/v1/sessions", json={"skill_id": "verify-skill", "threshold": 0.8})
    session_id = create.json()["session_id"]
    public_key = client.get(f"/v1/sessions/{session_id}/attestation").json()[
        "ephemeral_public_key"
    ]
    skill_env = encrypt_envelope(public_key, b"skill")
    dataset_env = encrypt_envelope(public_key, b"dataset")
    client.post(f"/v1/sessions/{session_id}/inputs/skill", json=skill_env)
    client.post(f"/v1/sessions/{session_id}/inputs/dataset", json=dataset_env)
    client.post(
        f"/v1/sessions/{session_id}/finalize",
        json={"baseline_score": 0.5, "skill_score": 0.95},
    )

    verify = client.get(f"/v1/sessions/{session_id}/receipt/verify")
    assert verify.status_code == 200
    assert verify.json()["valid"] is True
