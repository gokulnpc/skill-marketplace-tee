from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class ResponseFormat(BaseModel):
    type: str


class ChatCompletionRequest(BaseModel):
    model: str = "llama-3.1-8b-instruct"
    messages: list[ChatMessage]
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    response_format: ResponseFormat | None = None
