# NEAR AI Private Inference (Mode 2)

SkillVault can route model calls to [NEAR AI private inference](https://docs.near.ai/cloud/private-inference) instead of hosting weights locally in the CVM.

## Trust model

| Layer | Protects |
| ----- | -------- |
| SkillVault Phala CVM | Seller skill zip, buyer dataset, sandbox orchestration, verifier |
| NEAR AI GPU TEE | Model weights, inference compute |

Prompts containing skill context and evaluation inputs cross from SkillVault TEE → NEAR TEE over TLS. Receipts bind both attestations.

## Configuration

| Env | Purpose |
| --- | ------- |
| `MODEL_MODE=near_private` | Enable NEAR backend |
| `NEAR_API_KEY` | Sealed at Phala deploy |
| `NEAR_COMPLETIONS_BASE` | e.g. `https://qwen3-30b.completions.near.ai/v1` |
| `NEAR_MODEL_SLUG` | Model identifier for receipts |

## Receipt fields

- `inference_provider`: `near_private`
- `inference_model`: slug
- `inference_attestation_ref`: hash of NEAR attestation report

## Related

- [../TECHNICAL.md](../TECHNICAL.md)
- [../../services/model-server/README.md](../../services/model-server/README.md)
