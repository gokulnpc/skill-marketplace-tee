# Portable Agent Skill Package (skillvault-1)

Format for zip-based seller skills with optional knowledge bases and agent harness code.

## Directory layout

```text
skill-package.zip
  skill/
    SKILL.md                 # required
    manifest.json            # required (or metadata.json for legacy)
    meta.json                # optional
    knowledge/               # optional read-only corpus
    harness/                 # optional seller agent code
      handler.py
      tools/
    scripts/                 # optional allowlisted helpers
  adapters/                  # ignored at eval (install-only)
  README.md                  # ignored at eval
```

## manifest.json (skillvault-1)

| Field | Required | Description |
| ----- | -------- | ----------- |
| `manifest_version` | yes | `"skillvault-1"` |
| `id` | yes | Stable skill identifier |
| `evaluation_type` | yes | `redaction`, `summarization`, or `agent` |
| `entrypoints.default` | yes | Primary instruction file (usually `SKILL.md`) |
| `harness.runtime` | no | `builtin`, `python`, `deno`, `node` (default `builtin`) |
| `harness.entry` | if custom | Path under `skill/` e.g. `harness/handler.py` |
| `harness.max_iterations` | no | Agent loop cap (default 12) |
| `knowledge_dirs` | no | Directories for platform read tools |
| `tools` | no | Allowlisted seller scripts |
| `network_policy` | no | `model_proxy_only` (default) |

## Package hash

Tree hash over all files except `adapters/**` and `.git/**`:

1. Walk files, sort paths lexicographically
2. For each file: `hash(relpath + NUL + file_bytes)`
3. Result: `skill_hash = sha256:<hex>`

## Legacy compatibility

Packages with only `skill/SKILL.md` + `skill/metadata.json` receive a synthetic `builtin` harness at eval time.

## Related

- [README.md](README.md)
- [../inference/near-private.md](../inference/near-private.md)
