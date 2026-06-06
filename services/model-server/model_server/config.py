from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "llama-3.1-8b-instruct"
    messages: list[ChatMessage]
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    model_mode: str = "mock"
    model_name: str = "llama3.1:8b"
    model_hash: str = "sha256:mock-llama-3.1-8b-instruct"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_timeout: float = 300.0
    ollama_pull_on_start: bool = False
    near_completions_base: str = "https://qwen3-30b.completions.near.ai/v1"
    near_model_slug: str = "qwen3-30b"
    near_timeout: float = 120.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
