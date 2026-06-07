from model_server.near_private_engine import near_api_root


def test_near_api_root_preserves_v1_suffix():
    assert near_api_root("https://qwen3-30b.completions.near.ai/v1") == (
        "https://qwen3-30b.completions.near.ai/v1"
    )


def test_near_api_root_adds_v1_when_missing():
    assert near_api_root("https://qwen3-30b.completions.near.ai") == (
        "https://qwen3-30b.completions.near.ai/v1"
    )
