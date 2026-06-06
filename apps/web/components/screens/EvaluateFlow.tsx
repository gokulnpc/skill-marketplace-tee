"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Crumb } from "@/components/shared/Crumb";
import { Icon } from "@/components/shared/Icon";
import { Badge, EnclaveChip, Pill, SectionLabel } from "@/components/shared/Pill";
import type { DisplaySkill } from "@/lib/catalog";
import {
  createEvaluation,
  fetchBuyerBalance,
  submitDataset,
  type EvaluationJob,
} from "@/lib/api";
import { DEFAULT_BUYER_ID, EVAL_STEPS, VERIFY_CHECKS } from "@/lib/constants";
import { encryptEnvelope, verifyAttestation } from "@/lib/crypto";
import { pct, short } from "@/lib/format";

const MOCK_ATTESTATION = {
  session_id: "sess_7f3c9a21e84b0d52",
  ephemeral_public_key:
    "tee-x25519:04bd9f7a3c2e1d8b6f5a0c4e2d1b7a9c8f3e2d1b0a98f7c6e5d4b3a2f19081726",
  attestation_quote:
    "0x0e2f9c7a1b3d8e5f6a4c2d1b9e8f7a6c5d4b3a2f1908172635a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4",
  runner_hash: "sha256:a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5e6f7081",
  model_hash: "sha256:llama31-8b-instruct-q8:7e6d5c4b3a2f190817263544b3c2d1e0f9a8b7c6",
  verifier_hash: "sha256:redact-verifier-0.4:2d1b0a98f7c6e5d4b3a2f1908172635a4b3c2d1e0",
};

type AttestationView = typeof MOCK_ATTESTATION;
type VerifyVariation = "checklist" | "diagram" | "terminal";

function resolveAttestation(job?: EvaluationJob | null): AttestationView {
  const a = job?.attestation ?? {};
  return {
    session_id: String(a.session_id ?? job?.tee_session_id ?? MOCK_ATTESTATION.session_id),
    ephemeral_public_key: String(a.ephemeral_public_key ?? MOCK_ATTESTATION.ephemeral_public_key),
    attestation_quote: String(a.attestation_quote ?? MOCK_ATTESTATION.attestation_quote),
    runner_hash: String(a.runner_hash ?? MOCK_ATTESTATION.runner_hash),
    model_hash: String(a.model_hash ?? MOCK_ATTESTATION.model_hash),
    verifier_hash: String(a.verifier_hash ?? MOCK_ATTESTATION.verifier_hash),
  };
}

function Stepper({
  step,
  setStep,
  maxReached,
}: {
  step: number;
  setStep: (n: number) => void;
  maxReached: number;
}) {
  const steps = EVAL_STEPS.slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {steps.map(([t, d], i) => {
        const done = i < step;
        const active = i === step;
        const reachable = i <= maxReached;
        return (
          <button
            key={t}
            type="button"
            onClick={() => reachable && setStep(i)}
            disabled={!reachable}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              padding: "14px 16px",
              borderRadius: 12,
              textAlign: "left",
              cursor: reachable ? "pointer" : "default",
              background: active ? "var(--card)" : "transparent",
              border: active ? "1px solid var(--line)" : "1px solid transparent",
            }}
          >
            <span
              className="mono"
              style={{
                width: 26,
                height: 26,
                borderRadius: 99,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                marginTop: 1,
                background: done ? "var(--accent)" : active ? "var(--ink)" : "var(--bg-3)",
                color: done || active ? "var(--bg)" : "var(--mute)",
                border: done ? "1px solid var(--accent)" : "none",
              }}
            >
              {done ? <Icon name="check" size={14} stroke={2.4} /> : i + 1}
            </span>
            <span>
              <span
                style={{
                  display: "block",
                  fontWeight: 500,
                  fontSize: 14.5,
                  color: reachable ? "var(--ink)" : "var(--faint)",
                }}
              >
                {t}
              </span>
              <span
                className="mono"
                style={{ display: "block", fontSize: 10.5, color: "var(--mute)", marginTop: 3 }}
              >
                {d}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Marker({
  pos,
  label,
  sub,
  tone,
}: {
  pos: number;
  label: string;
  sub: string;
  tone: "accent" | "mute";
}) {
  const col = tone === "accent" ? "var(--accent)" : "var(--mute)";
  return (
    <div
      style={{
        position: "absolute",
        left: `${Math.max(0, Math.min(100, pos * 100))}%`,
        transform: "translateX(-50%)",
        textAlign: "center",
      }}
    >
      <div style={{ width: 1, height: 8, background: col, margin: "0 auto" }} />
      <div className="mono" style={{ fontSize: 9.5, color: col, marginTop: 3, whiteSpace: "nowrap" }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>
        {sub}
      </div>
    </div>
  );
}

function ThresholdStep({
  skill,
  threshold,
  setThreshold,
  next,
}: {
  skill: DisplaySkill;
  threshold: number;
  setThreshold: (v: number) => void;
  next: () => void;
}) {
  const expectedPass = skill.baseline_avg + skill.median_uplift >= threshold;
  return (
    <div className="reveal reveal-d1">
      <SectionLabel>Step 1 · Buying threshold</SectionLabel>
      <h2
        className="serif"
        style={{ fontSize: 40, lineHeight: 1.05, margin: 0, letterSpacing: "-0.01em" }}
      >
        Set the bar you&apos;ll pay for.
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          marginTop: 12,
          maxWidth: 560,
        }}
      >
        You&apos;re charged <strong>only if</strong> the skill scores at or above this on your private
        benchmark. The threshold is committed before execution and can&apos;t be changed once you&apos;ve
        seen the result.
      </p>

      <div
        style={{
          marginTop: 34,
          border: "1px solid var(--line)",
          borderRadius: 16,
          background: "var(--card)",
          padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="label">skill_score ≥ threshold ⇒ buy</span>
          <Badge variant={expectedPass ? "pass" : "fail"}>
            {expectedPass ? "likely pass" : "likely fail"}
          </Badge>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, margin: "14px 0 24px" }}>
          <span
            className="serif"
            style={{ fontSize: 92, lineHeight: 0.9, letterSpacing: "-0.03em" }}
          >
            {pct(threshold)}
          </span>
          <span
            className="mono"
            style={{ fontSize: 14, color: "var(--mute)", paddingBottom: 16 }}
          >
            minimum
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="0.99"
          step="0.01"
          value={threshold}
          className="sv-range"
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
        />
        <div
          className="mono"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10.5,
            color: "var(--mute)",
            marginTop: 10,
          }}
        >
          <span>0.50 · lenient</span>
          <span>this skill medians {pct(skill.baseline_avg + skill.median_uplift)}</span>
          <span>0.99 · strict</span>
        </div>
        <div style={{ position: "relative", height: 30, marginTop: 6 }}>
          <Marker
            pos={(skill.baseline_avg - 0.5) / 0.49}
            label="baseline"
            sub={pct(skill.baseline_avg)}
            tone="mute"
          />
          <Marker
            pos={(skill.baseline_avg + skill.median_uplift - 0.5) / 0.49}
            label="median w/ skill"
            sub={pct(skill.baseline_avg + skill.median_uplift)}
            tone="accent"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "12px 22px", fontSize: 14 }}
          onClick={next}
        >
          Lock threshold <Icon name="arrow" size={15} />
        </button>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--mute)", alignSelf: "center" }}
        >
          commitment hash recorded on continue
        </span>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function DatasetStep({
  file,
  setFile,
  next,
  back,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  next: () => void;
  back: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const connected = file !== null;

  const bundle = [
    ["transcripts/", "12 files", "meeting_001…012.txt"],
    ["ground_truth/", "12 files", "must-include · must-not-leak"],
    ["eval_config.json", "1 file", "weights · format rules"],
  ];

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  }

  return (
    <div className="reveal reveal-d1">
      <SectionLabel>Step 2 · Connect your benchmark</SectionLabel>
      <h2
        className="serif"
        style={{ fontSize: 40, lineHeight: 1.05, margin: 0, letterSpacing: "-0.01em" }}
      >
        Point at your local dataset.
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          marginTop: 12,
          maxWidth: 560,
        }}
      >
        The connector reads it on <strong>your machine</strong>. Nothing is uploaded yet — it stays in
        plaintext locally until the enclave is attested and you encrypt it to the session key.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {!connected ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn"
          style={{
            marginTop: 30,
            width: "100%",
            border: "1.5px dashed var(--line)",
            borderRadius: 16,
            background: "var(--bg-2)",
            padding: "44px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "var(--card)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              color: "var(--ink)",
            }}
          >
            <Icon name="upload" size={22} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Select dataset JSON</span>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--mute)" }}>
            ./buyer_eval_dataset.json · or drag it here
          </span>
        </button>
      ) : (
        <div
          style={{
            marginTop: 30,
            border: "1px solid var(--line)",
            borderRadius: 16,
            overflow: "hidden",
            background: "var(--card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "15px 20px",
              borderBottom: "1px solid var(--line-2)",
              background: "var(--bg-2)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>
              <Icon name="check" size={18} stroke={2.2} />
            </span>
            <span style={{ fontWeight: 500 }}>{file.name}</span>
            <Pill tone="muted">{formatFileSize(file.size)}</Pill>
            <div style={{ flex: 1 }} />
            <EnclaveChip label="local only · not yet sent" />
          </div>
          {bundle.map(([n, c, d], i) => (
            <div
              key={n}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 14,
                alignItems: "center",
                padding: "13px 20px",
                borderTop: i ? "1px solid var(--line-2)" : "none",
              }}
            >
              <span style={{ color: "var(--mute)" }}>
                <Icon name="doc" size={16} />
              </span>
              <span>
                <span className="mono" style={{ fontSize: 13 }}>
                  {n}
                </span>{" "}
                <span style={{ fontSize: 12, color: "var(--mute)", marginLeft: 8 }}>{d}</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
                {c}
              </span>
            </div>
          ))}
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--mute)",
              padding: "13px 20px",
              borderTop: "1px solid var(--line-2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name="lock" size={13} /> dataset_commitment = sha256(bundle) computed locally · ground
            truth never transmitted in plaintext
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        <button type="button" className="btn btn-ghost" style={{ padding: "12px 20px" }} onClick={back}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!connected}
          style={{
            padding: "12px 22px",
            fontSize: 14,
            opacity: connected ? 1 : 0.45,
            pointerEvents: connected ? "auto" : "none",
          }}
          onClick={next}
        >
          Attest the enclave <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  );
}

function VerifyChecklist({ done }: { done: number }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--card)",
      }}
    >
      {VERIFY_CHECKS.map((c, i) => {
        const ok = i < done;
        return (
          <div
            key={c.k}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 14,
              alignItems: "center",
              padding: "15px 20px",
              borderTop: i ? "1px solid var(--line-2)" : "none",
              opacity: ok ? 1 : 0.5,
              transition: "opacity .3s",
            }}
          >
            <span
              className={ok ? "tick-bounce" : ""}
              style={{
                width: 24,
                height: 24,
                borderRadius: 99,
                display: "grid",
                placeItems: "center",
                background: ok ? "var(--accent-soft)" : "var(--bg-3)",
                color: ok ? "var(--accent)" : "var(--mute)",
              }}
            >
              {ok ? (
                <Icon name="check" size={14} stroke={2.6} />
              ) : (
                <span className="mono" style={{ fontSize: 10 }}>
                  …
                </span>
              )}
            </span>
            <span>
              <span style={{ display: "block", fontWeight: 500, fontSize: 14 }}>{c.k}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--mute)", marginTop: 2 }}>
                {c.d}
              </span>
            </span>
            <span
              className="mono"
              style={{ fontSize: 10.5, color: ok ? "var(--accent)" : "var(--faint)" }}
            >
              {ok ? "verified" : "pending"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VerifyDiagram({ done, attestation }: { done: number; attestation: AttestationView }) {
  const allDone = done >= VERIFY_CHECKS.length;
  const inside: [string, string][] = [
    ["runner", attestation.runner_hash],
    ["model", attestation.model_hash],
    ["verifier", attestation.verifier_hash],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className={allDone ? "" : "ants"} style={{ borderRadius: 18, padding: allDone ? 2 : 3 }}>
        <div
          style={{
            border: allDone ? "1px solid var(--accent)" : "1px solid transparent",
            borderRadius: 16,
            background: "var(--seal)",
            color: "var(--bg)",
            padding: 22,
            height: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <span style={{ color: "oklch(0.78 0.16 145)" }}>
              <Icon name="lock" size={17} />
            </span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Phala TEE · sealed</span>
            <div style={{ flex: 1 }} />
            <span
              className="live-dot"
              style={{ width: 7, height: 7, borderRadius: 99, background: "oklch(0.78 0.16 145)" }}
            />
          </div>
          {inside.map(([k, v], i) => {
            const ok = i + 1 < done || done >= VERIFY_CHECKS.length - 3 + i + 1;
            return (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderTop: i ? "1px solid rgba(255,255,255,.1)" : "none",
                }}
              >
                <span style={{ color: ok ? "oklch(0.78 0.16 145)" : "rgba(255,255,255,.4)" }}>
                  {ok ? (
                    <Icon name="check" size={14} stroke={2.4} />
                  ) : (
                    <Icon name="chip" size={14} />
                  )}
                </span>
                <span className="mono" style={{ fontSize: 11.5, opacity: 0.9 }}>
                  {k}_hash
                </span>
                <div style={{ flex: 1 }} />
                <span
                  className="mono"
                  style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}
                >
                  {short(v.split(":").pop(), 8, 6)}
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.1)" }}>
            <div
              className="mono"
              style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 5 }}
            >
              ephemeral public key
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, wordBreak: "break-all", color: "oklch(0.82 0.10 145)" }}
            >
              {short(attestation.ephemeral_public_key, 30, 8)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 18,
            background: "var(--card)",
            flex: 1,
          }}
        >
          <div className="label" style={{ marginBottom: 12 }}>
            Connector ↔ enclave
          </div>
          {VERIFY_CHECKS.map((c, i) => {
            const ok = i < done;
            return (
              <div
                key={c.k}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "6.5px 0" }}
              >
                <span style={{ color: ok ? "var(--accent)" : "var(--faint)" }}>
                  {ok ? (
                    <Icon name="check" size={13} stroke={2.6} />
                  ) : (
                    <span className="mono" style={{ fontSize: 11 }}>
                      ·
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12.5, color: ok ? "var(--ink)" : "var(--mute)" }}>{c.k}</span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            border: allDone ? "1px solid var(--accent)" : "1px solid var(--line)",
            borderRadius: 14,
            padding: "14px 16px",
            background: allDone ? "var(--accent-soft)" : "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: allDone ? "var(--accent)" : "var(--mute)" }}>
            <Icon name={allDone ? "check" : "eye"} size={16} stroke={2.2} />
          </span>
          <span
            style={{
              fontSize: 12.5,
              color: allDone ? "var(--accent)" : "var(--mute)",
              fontWeight: 500,
            }}
          >
            {allDone
              ? "Genuine enclave — your key is bound. Safe to encrypt."
              : "Awaiting full attestation…"}
          </span>
        </div>
      </div>
    </div>
  );
}

function VerifyTerminal({ done, attestation }: { done: number; attestation: AttestationView }) {
  return (
    <div
      style={{
        border: "1px solid var(--ink)",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--seal)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 16px",
          borderBottom: "1px solid rgba(255,255,255,.1)",
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "#ff5f56" }} />
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "#ffbd2e" }} />
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "#27c93f" }} />
        <span
          className="mono"
          style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginLeft: 8 }}
        >
          skillvault verify --session {short(attestation.session_id, 12, 8)}
        </span>
      </div>
      <div
        className="mono"
        style={{
          padding: "16px 18px",
          fontSize: 12,
          lineHeight: 1.85,
          color: "rgba(255,255,255,.8)",
        }}
      >
        <div style={{ color: "rgba(255,255,255,.45)" }}>$ fetching attestation quote…</div>
        {VERIFY_CHECKS.map((c, i) => {
          const ok = i < done;
          if (!ok) {
            return (
              <div key={c.k} style={{ color: "rgba(255,255,255,.3)" }}>
                {" "}
                · {c.k.toLowerCase()} …{" "}
              </div>
            );
          }
          return (
            <div key={c.k} className="tick-bounce">
              <span style={{ color: "oklch(0.82 0.16 145)" }}> ✓</span> {c.k.toLowerCase()}{" "}
              <span style={{ color: "rgba(255,255,255,.4)" }}>ok</span>
            </div>
          );
        })}
        {done >= VERIFY_CHECKS.length && (
          <div style={{ marginTop: 8, color: "oklch(0.82 0.16 145)" }}>
            → enclave genuine · ephemeral key bound · safe to encrypt ✓
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyStep({
  next,
  back,
  variation,
  setVariation,
  attestation,
  loading,
  submitting,
  error,
}: {
  next: () => void;
  back: () => void;
  variation: VerifyVariation;
  setVariation: (v: VerifyVariation) => void;
  attestation: AttestationView;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}) {
  const [done, setDone] = useState(0);
  const allDone = done >= VERIFY_CHECKS.length && !loading;

  useEffect(() => {
    if (loading) {
      setDone(0);
      return;
    }
    setDone(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setDone(i);
      if (i >= VERIFY_CHECKS.length) clearInterval(t);
    }, 420);
    return () => clearInterval(t);
  }, [variation, loading]);

  return (
    <div className="reveal reveal-d1">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 auto", minWidth: 280 }}>
          <SectionLabel>Step 3 · Verify before you send</SectionLabel>
          <h2
            className="serif"
            style={{ fontSize: 40, lineHeight: 1.05, margin: 0, letterSpacing: "-0.01em" }}
          >
            Attest the enclave.
          </h2>
        </div>
        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--line)",
            borderRadius: 999,
            overflow: "hidden",
            background: "var(--card)",
            flexShrink: 0,
          }}
        >
          {(
            [
              ["checklist", "Checklist"],
              ["diagram", "Diagram"],
              ["terminal", "Terminal"],
            ] as const
          ).map(([id, lab]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVariation(id)}
              className="mono"
              style={{
                padding: "7px 13px",
                fontSize: 11.5,
                background: variation === id ? "var(--ink)" : "transparent",
                color: variation === id ? "var(--bg)" : "var(--mute)",
              }}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>
      <p
        style={{
          fontSize: 15,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          marginTop: 12,
          maxWidth: 560,
        }}
      >
        The connector checks the attestation quote and every hash against the approved build. If any
        check fails, it <strong>refuses to send</strong> your dataset.
      </p>
      <div
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "var(--mute)",
          margin: "14px 0 4px",
          padding: "5px 11px",
          border: "1px solid var(--line)",
          borderRadius: 999,
        }}
      >
        <Icon name="bolt" size={12} /> variation:{" "}
        <strong style={{ color: "var(--ink)" }}>{variation}</strong>
      </div>

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--mute)", padding: "24px 0" }}
          >
            requesting attestation from TEE…
          </div>
        ) : (
          <>
            {variation === "checklist" && <VerifyChecklist done={done} />}
            {variation === "diagram" && <VerifyDiagram done={done} attestation={attestation} />}
            {variation === "terminal" && <VerifyTerminal done={done} attestation={attestation} />}
          </>
        )}
      </div>

      {error ? (
        <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 16 }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 26, alignItems: "center" }}>
        <button type="button" className="btn btn-ghost" style={{ padding: "12px 20px" }} onClick={back}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-accent"
          disabled={!allDone || submitting}
          style={{
            padding: "12px 24px",
            fontSize: 14.5,
            opacity: allDone && !submitting ? 1 : 0.45,
            pointerEvents: allDone && !submitting ? "auto" : "none",
          }}
          onClick={next}
        >
          <Icon name="lock" size={16} /> Encrypt &amp; run evaluation
        </button>
        {loading && (
          <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
            awaiting attestation…
          </span>
        )}
        {!loading && !allDone && (
          <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
            verifying… {done}/{VERIFY_CHECKS.length}
          </span>
        )}
        {!loading && allDone && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--accent)",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <Icon name="check" size={13} stroke={2.4} /> enclave genuine · safe to send
          </span>
        )}
      </div>
    </div>
  );
}

export function EvaluateFlow({ skill }: { skill: DisplaySkill }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxReached, setMax] = useState(0);
  const [threshold, setThreshold] = useState(0.85);
  const [file, setFile] = useState<File | null>(null);
  const [variation, setVariation] = useState<VerifyVariation>("checklist");
  const [balance, setBalance] = useState<number | null>(null);
  const [job, setJob] = useState<EvaluationJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const goStep = useCallback((n: number) => {
    setStep(n);
    setMax((m) => Math.max(m, n));
  }, []);

  useEffect(() => {
    fetchBuyerBalance(DEFAULT_BUYER_ID)
      .then(setBalance)
      .catch(() => setBalance(0));
  }, []);

  useEffect(() => {
    if (step !== 2) return;

    let cancelled = false;
    setJobLoading(true);
    setJobError(null);
    setJob(null);

    createEvaluation(skill.skill_id, threshold, DEFAULT_BUYER_ID)
      .then((created) => {
        if (!cancelled) setJob(created);
      })
      .catch((err) => {
        if (!cancelled) {
          setJobError(err instanceof Error ? err.message : "Failed to create evaluation session");
        }
      })
      .finally(() => {
        if (!cancelled) setJobLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, skill.skill_id, threshold]);

  const attestation = resolveAttestation(job);

  async function handleEncryptAndRun() {
    if (!job || !file) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const att = job.attestation ?? MOCK_ATTESTATION;
      if (!verifyAttestation(att)) {
        throw new Error("Invalid TEE attestation");
      }

      const datasetBytes = new Uint8Array(await file.arrayBuffer());
      const envelope = await encryptEnvelope(String(att.ephemeral_public_key), datasetBytes);
      await submitDataset(job.job_id, envelope);
      router.push(`/evaluations/${job.job_id}/running`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Evaluation failed");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 30px 60px" }}>
      <Crumb skillId={skill.skill_id} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 44,
          alignItems: "start",
        }}
      >
        <aside style={{ position: "sticky", top: 90 }}>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: 16,
              background: "var(--bg-2)",
            }}
          >
            <div style={{ padding: "6px 10px 14px" }}>
              <div className="label" style={{ marginBottom: 6 }}>
                Evaluating
              </div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{skill.name}</div>
              <div
                className="mono"
                style={{ fontSize: 11, color: "var(--mute)", marginTop: 4 }}
              >
                ${skill.price} · pay only if ≥ {pct(threshold)}
              </div>
            </div>
            <Stepper step={step} setStep={goStep} maxReached={maxReached} />
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              color: "var(--faint)",
              textAlign: "center",
              marginTop: 14,
              lineHeight: 1.7,
            }}
          >
            buyer · {DEFAULT_BUYER_ID}
            <br />
            balance ${balance ?? "—"} USDC
          </div>
        </aside>

        <main style={{ minHeight: 480 }}>
          {step === 0 && (
            <ThresholdStep
              skill={skill}
              threshold={threshold}
              setThreshold={setThreshold}
              next={() => goStep(1)}
            />
          )}
          {step === 1 && (
            <DatasetStep
              file={file}
              setFile={setFile}
              next={() => goStep(2)}
              back={() => goStep(0)}
            />
          )}
          {step === 2 && (
            <VerifyStep
              next={handleEncryptAndRun}
              back={() => goStep(1)}
              variation={variation}
              setVariation={setVariation}
              attestation={attestation}
              loading={jobLoading}
              submitting={submitting}
              error={jobError ?? submitError}
            />
          )}
        </main>
      </div>
    </div>
  );
}
