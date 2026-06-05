# OpenAI-Compatible API

The model server exposes an OpenAI-compatible chat completions endpoint inside the TEE.

## Endpoint

```text
POST http://localhost:8000/v1/chat/completions
```

Only callable from within the TEE (tee-runner → model-server). No external access.

## Request format

Standard OpenAI chat completions:

```json
{
  "model": "llama-3.1-8b-instruct",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.0
}
```

## Usage in evaluation

| Run type | System prompt | User content |
| -------- | ------------- | ------------ |
| Baseline | Generic task instruction (no skill) | Buyer transcript |
| With-skill | Seller skill instructions loaded | Buyer transcript |

Both runs use the same model endpoint. The tee-runner constructs prompts and parses responses.

## Constraints

- No request logging with full prompt content to external storage
- Model server must start before evaluation begins
- Model hash included in attestation for buyer verification

## Related

- [../evaluation/baseline-vs-skill.md](../evaluation/baseline-vs-skill.md)
- [../tee-runner/attestation.md](../tee-runner/attestation.md)
