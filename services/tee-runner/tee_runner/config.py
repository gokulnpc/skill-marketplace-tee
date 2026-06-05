from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    runner_mode: str = "mock"
    dstack_endpoint: str | None = None
    runner_hash: str = "sha256:dev-runner-v0.1.0"
    verifier_hash: str = "sha256:dev-verifier-v0.1.0"
    model_hash: str = "sha256:mock-llama-3.1-8b-instruct"
    model_server_url: str = "http://localhost:8000"
    model_name: str = "llama-3.1-8b-instruct"
    receipt_signing_key_pem: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
