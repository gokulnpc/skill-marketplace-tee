from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str | None = None
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None


class ToolFunction(BaseModel):
    name: str
    description: str | None = None
    parameters: dict[str, Any] | None = None


class ToolDefinition(BaseModel):
    type: str = "function"
    function: ToolFunction


class ResponseFormat(BaseModel):
    type: str


class ChatCompletionRequest(BaseModel):
    model: str = "llama-3.1-8b-instruct"
    messages: list[ChatMessage]
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    response_format: ResponseFormat | None = None
    tools: list[ToolDefinition] | None = None
