from fastapi.testclient import TestClient

from model_server.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "model_hash" in body


def test_list_models() -> None:
    response = client.get("/v1/models")
    assert response.status_code == 200
    assert response.json()["data"][0]["id"] == "llama3.1:8b"


def test_baseline_completion_differs_from_skill() -> None:
    transcript = (
        "Sarah: The client is Acme Bank.\n"
        "Maya: Do not mention that Acme Bank is considering layoffs.\n"
        "Ravi: I will send the revised security proposal by Friday."
    )
    baseline = client.post(
        "/v1/chat/completions",
        json={
            "model": "llama3.1:8b",
            "messages": [
                {
                    "role": "system",
                    "content": "Summarize this meeting transcript. Include action items.",
                },
                {"role": "user", "content": transcript},
            ],
        },
    )
    with_skill = client.post(
        "/v1/chat/completions",
        json={
            "model": "llama3.1:8b",
            "messages": [
                {
                    "role": "system",
                    "content": "Discreet Meeting Notes redaction skill. Redact sensitive topics.",
                },
                {"role": "user", "content": transcript},
            ],
        },
    )
    assert baseline.status_code == 200
    assert with_skill.status_code == 200
    baseline_text = baseline.json()["choices"][0]["message"]["content"]
    skill_text = with_skill.json()["choices"][0]["message"]["content"]
    assert "Sarah" in baseline_text or "Participants" in baseline_text
    assert "redacted_notes" in skill_text
    assert "Acme Bank" not in skill_text
