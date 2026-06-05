# Model Server

Open-weight LLM running locally inside the Phala TEE alongside the evaluation runner.

## Purpose

Provide inference without sending buyer data to external model providers. All prompts stay inside the TEE.

## Planned location

`services/model-server/`

## Serving options

- vLLM
- llama.cpp
- Ollama
- Text Generation Inference

## Default MVP model

Llama 3.1 8B Instruct (subject to GPU/memory constraints).

Alternatives: Mistral 7B, Qwen2.5 7B, Phi-3.5 Mini.

## Topics

- [openai-compatible-api.md](openai-compatible-api.md) — Internal API contract

## Related

- [../tee-runner/](../tee-runner/)
- [../evaluation/baseline-vs-skill.md](../evaluation/baseline-vs-skill.md)
- [../TECHNICAL.md](../TECHNICAL.md)
