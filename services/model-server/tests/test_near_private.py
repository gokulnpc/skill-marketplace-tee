from model_server.config import Settings
from model_server.near_private_engine import near_api_root


def test_near_api_root_preserves_v1_suffix():
    assert near_api_root("https://qwen3-30b.completions.near.ai/v1") == (
        "https://qwen3-30b.completions.near.ai/v1"
    )


def test_near_api_root_adds_v1_when_missing():
    assert near_api_root("https://qwen3-30b.completions.near.ai") == (
        "https://qwen3-30b.completions.near.ai/v1"
    )


def test_near_model_slug_matches_near_endpoint_registry():
    settings = Settings()
    assert settings.near_model_slug == "Qwen/Qwen3-30B-A3B-Instruct-2507"
