export const DEFAULT_BUYER_ID = "buyer_demo";
export const DEFAULT_SELLER_ID = "seller_demo";

export const CATEGORIES = ["Redaction", "Legal", "Engineering", "Finance", "Operations", "Data"];

export const EVAL_TYPES = ["redaction", "summarization", "classification", "extraction", "transformation"];

export const VERIFY_CHECKS = [
  { k: "Attestation quote valid", d: "Phala TDX quote chains to a genuine enclave" },
  { k: "Runner hash approved", d: "Matches the published evaluation runner image" },
  { k: "Model hash approved", d: "Open-weight model image is the attested build" },
  { k: "Verifier hash expected", d: "Scoring logic matches the listing’s verifier" },
  { k: "Debug mode disabled", d: "No debug shell, no prompt tracing" },
  { k: "Session is fresh", d: "Nonce bound, not replayed" },
  { k: "Ephemeral key bound", d: "Public key is tied to this attested session" },
];

export const PIPELINE = [
  { k: "Verify signed inputs", d: "Marketplace + buyer signatures, hashes, freshness" },
  { k: "Decrypt skill & dataset", d: "Only the enclave holds both in plaintext" },
  { k: "Baseline evaluation", d: "Task run without the seller’s skill" },
  { k: "Local model inference", d: "Open-weight model answers — never leaves localhost" },
  { k: "With-skill evaluation", d: "Same task, seller’s private skill applied" },
  { k: "Verifier scores outputs", d: "Utility · privacy · format against your ground truth" },
  { k: "Leakage guard", d: "Blocks any output that reveals the skill or secrets" },
  { k: "Sign receipt", d: "Ed25519 over the result — secrets then erased" },
];

export const TICKER = [
  { kind: "paid", time: "16:44", text: "discreet-meeting-notes · score 0.91 ≥ 0.85 · license issued" },
  { kind: "run", time: "16:41", text: "enclave sess_7f3c9a21 attested · runner + model + verifier verified" },
  { kind: "new", time: "16:29", text: "new listing · Financial Filing Analyst · pending verification" },
  { kind: "paid", time: "16:12", text: "support-triage · score 0.93 ≥ 0.90 · $18 settled" },
  { kind: "run", time: "15:58", text: "code-review-sentinel · evaluation below threshold · buyer not charged" },
  { kind: "new", time: "15:40", text: "0 bytes of buyer data left the enclave · 2,041 evals today" },
];

export const VALIDATIONS = [
  ["Required files present", "SKILL.md · metadata.json · examples/"],
  ["Metadata valid", "name · version · category · eval type"],
  ["No embedded secrets", "scanned for keys, tokens, canaries"],
  ["No malicious scripts", "static check on bundled scripts"],
  ["No prompt-reveal instructions", "skill can’t ask the model to leak itself"],
  ["Compatible with eval type", "verifier exists for this evaluation type"],
];

export const EVAL_STEPS = [
  ["Threshold", "commit your buying bar"],
  ["Connect dataset", "stays local until encrypted"],
  ["Verify enclave", "attest before sending"],
  ["Run", "sealed evaluation"],
] as const;
