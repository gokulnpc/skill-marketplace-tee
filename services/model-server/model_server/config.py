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
    model_name: str = "llama-3.1-8b-instruct"
    model_hash: str = "sha256:mock-llama-3.1-8b-instruct"
    ollama_base_url: str = "http://localhost:11434"


@lru_cache
def get_settings() -> Settings:
    return Settings()
