"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Crumb } from "@/components/shared/Crumb";
import { HashRow } from "@/components/shared/HashRow";
import { Icon } from "@/components/shared/Icon";
import { Badge, Pill } from "@/components/shared/Pill";
import { API_URL, type EvaluationJob } from "@/lib/api";
import type { DisplaySkill } from "@/lib/catalog";
import { pct, short, upl } from "@/lib/format";

type Variation = "editorial" | "dashboard" | "proof";

interface EvaluationData {
  baseline_score: number;
  skill_score: number;
  uplift: number;
  passed: boolean;
  sub?: Record<string, number>;
  samples?: Array<{
    transcript_id: string;
    approved_output?: string | null;
    approved?: boolean;
    leakage_blocked?: boolean;
    leakage_reasons?: string[];
  }>;
  agent_metrics?: {
    tool_calls?: number;
    iterations_used?: number;
    artifact_generated?: boolean;
    harness_mode?: string;
    slide_task?: boolean;
  };
  artifacts?: Record<string, { size?: number; sha256?: string }>;
}

interface ReceiptData extends Record<string, unknown> {
  receipt_id: string;
  session_id?: string;
  runner_hash?: string;
  model_hash?: string;
  verifier_hash?: string;
  dataset_commitment_hash?: string;
  timestamp?: string;
  passed?: boolean;
}

interface SampleView {
  transcript_id: string;
  approved: boolean;
  output: string | null;
  leakageReasons: string[];
}

interface ScorecardView {
  threshold: number;
  baselineScore: number;
  skillScore: number;
  uplift: number;
  passed: boolean;
  sub: Record<string, number>;
  samples: SampleView[];
  receipt: ReceiptData;
  settlement: {
    payment_status: string;
    settlement_status: string;
    amount: number;
    license_id?: string;
    buyer_balance: number;
    seller_balance: number;
  };
  attestationQuote: string;
  sessionId: string;
  agentMetrics: EvaluationData["agent_metrics"];
  hasSlideArtifact: boolean;
}

function parseScorecardView(job: EvaluationJob): ScorecardView | null {
  const evaluation = job.evaluation as Partial<EvaluationData> | undefined;
  const receipt = job.receipt as ReceiptData | undefined;

  if (!evaluation || !receipt?.receipt_id) {
    return null;
  }

  const threshold = job.threshold;
  const baselineScore = evaluation.baseline_score ?? 0;
  const skillScore = evaluation.skill_score ?? 0;
  const uplift = evaluation.uplift ?? skillScore - baselineScore;
  const passed =
    evaluation.passed ?? receipt.passed ?? skillScore >= threshold;

  const samples: SampleView[] = (evaluation.samples ?? []).map((sample) => ({
    transcript_id: sample.transcript_id,
    approved: sample.approved ?? !!sample.approved_output,
    output: sample.approved_output ?? null,
    leakageReasons: sample.leakage_reasons ?? [],
  }));

  const settlement = job.settlement;
  const attestation = job.attestation as Record<string, string> | undefined;

  return {
    threshold,
    baselineScore,
    skillScore,
    uplift,
    passed,
    sub: evaluation.sub ?? {},
    samples,
    receipt,
    settlement: {
      payment_status: settlement?.payment_status ?? job.payment_status ?? "not_charged",
      settlement_status: job.settlement_status ?? "pending",
      amount: settlement?.amount ?? 0,
      license_id: settlement?.license_id ?? job.license_id,
      buyer_balance: settlement?.buyer_balance ?? 0,
      seller_balance: settlement?.seller_balance ?? 0,
    },
    attestationQuote: attestation?.attestation_quote ?? "",
    sessionId: job.tee_session_id ?? receipt.session_id ?? "",
    agentMetrics: evaluation.agent_metrics,
    hasSlideArtifact: Boolean(evaluation.artifacts?.["slides.pptx"]?.size),
  };
}

function ScoreDonut({
  value,
  threshold,
  size = 150,
}: {
  value: number;
  threshold: number;
  size?: number;
}) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--bg-3)"
        strokeWidth="8"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={size / 2 + r * Math.cos(2 * Math.PI * threshold - Math.PI / 2)}
        cy={size / 2 + r * Math.sin(2 * Math.PI * threshold - Math.PI / 2)}
        r="3.5"
        fill="var(--ink)"
      />
    </svg>
  );
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{label}</span>
        <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>
          {pct(value)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--bg-3)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value * 100}%`,
            background: "var(--accent)",
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  );
}

function Stat3({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="label" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 34,
          lineHeight: 1,
          color: accent ? "var(--accent)" : "var(--ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ProofPanel({
  view,
  compact,
}: {
  view: ScorecardView;
  compact?: boolean;
}) {
  const [show, setShow] = useState(false);
  const r = view.receipt;

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 22,
        background: "var(--card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>TEE proof</h3>
        <Badge variant="accent">
          <Icon name="lock" size={11} /> attested
        </Badge>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {view.sessionId ? <HashRow label="Session ID" value={view.sessionId} /> : null}
        {r.runner_hash ? <HashRow label="Runner hash" value={r.runner_hash} /> : null}
        {r.model_hash ? <HashRow label="Model hash" value={r.model_hash} /> : null}
        {r.verifier_hash ? <HashRow label="Verifier hash" value={r.verifier_hash} /> : null}
        <HashRow label="Receipt ID" value={r.receipt_id} />
        {!compact && r.dataset_commitment_hash ? (
          <HashRow label="Dataset commitment" value={r.dataset_commitment_hash} />
        ) : null}
        {view.attestationQuote ? (
          <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span className="label" style={{ fontSize: 10 }}>
                Attestation quote
              </span>
              <button
                type="button"
                onClick={() => setShow((open) => !open)}
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "2px 9px",
                  display: "inline-flex",
                  gap: 5,
                  alignItems: "center",
                }}
              >
                <Icon name={show ? "eyeoff" : "eye"} size={12} /> {show ? "Hide" : "Show"}
              </button>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-2)",
                wordBreak: "break-all",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {show ? view.attestationQuote : short(view.attestationQuote, 28, 16)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PaymentPanel({ view, skillId }: { view: ScorecardView; skillId: string }) {
  const st = view.settlement;
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 22,
        background: "var(--card)",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Payment &amp; license</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Badge variant={st.payment_status === "charged" ? "pass" : "neutral"}>
          <Icon name="coin" size={12} />{" "}
          {st.payment_status === "charged" ? `charged $${st.amount}` : "not charged"}
        </Badge>
        {st.license_id ? <Badge variant="accent">license issued</Badge> : null}
        <Badge variant="neutral">{st.settlement_status}</Badge>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 13 }}>
        {[
          ["Outcome", view.passed ? "Purchase completed" : "Below threshold — not charged"],
          ["License", st.license_id ?? "—"],
          ["Buyer balance", `$${st.buyer_balance}`],
          ["Seller credited", st.payment_status === "charged" ? `$${st.seller_balance}` : "—"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--mute)" }}>{k}</span>
            <span className="mono" style={{ fontSize: 12 }}>
              {v}
            </span>
          </div>
        ))}
      </div>
      <Link
        href={`/skills/${skillId}`}
        className="btn btn-ghost"
        style={{
          width: "100%",
          justifyContent: "center",
          marginTop: 18,
          padding: "10px",
          display: "flex",
        }}
      >
        Use this skill via the enclave →
      </Link>
    </div>
  );
}

function SamplesPanel({ samples }: { samples: SampleView[] }) {
  if (samples.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 22,
        background: "var(--card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Approved sample outputs</h3>
        <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
          only leakage-guard-approved outputs shown
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          marginTop: 16,
        }}
      >
        {samples.map((s) => (
          <div
            key={s.transcript_id}
            style={{ border: "1px solid var(--line-2)", borderRadius: 12, overflow: "hidden" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderBottom: "1px solid var(--line-2)",
                background: "var(--bg-2)",
              }}
            >
              <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                {s.transcript_id}
              </span>
              <div style={{ flex: 1 }} />
              {s.approved ? (
                <Pill tone="accent">
                  <Icon name="check" size={10} stroke={2.4} /> approved
                </Pill>
              ) : (
                <Pill tone="muted">
                  <Icon name="lock" size={10} /> blocked
                </Pill>
              )}
            </div>
            {s.approved && s.output ? (
              <pre
                className="mono"
                style={{
                  margin: 0,
                  padding: 14,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {s.output}
              </pre>
            ) : (
              <div style={{ padding: 18, textAlign: "center" }}>
                <div style={{ color: "var(--danger)", display: "inline-flex" }}>
                  <Icon name="lock" size={18} />
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--mute)",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Held back by the leakage guard.
                  <br />
                  {s.leakageReasons.length > 0
                    ? `Reasons: ${s.leakageReasons.join(", ")}`
                    : "Output referenced protected skill content."}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceiptPanel({ jobId, receipt }: { jobId: string; receipt: ReceiptData }) {
  const [open, setOpen] = useState(false);
  const [verify, setVerify] = useState<"idle" | "loading" | "valid" | "invalid">("idle");

  async function onVerify() {
    setVerify("loading");
    try {
      const response = await fetch(`${API_URL}/v1/evaluations/${jobId}/receipt/verify`);
      const body = (await response.json()) as { valid?: boolean };
      setVerify(response.ok && body.valid ? "valid" : "invalid");
    } catch {
      setVerify("invalid");
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 22,
        background: "var(--card)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Audit receipt</h3>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--mute)" }}>
            Signed TEE evaluation record · Ed25519
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mono"
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "7px 13px",
              fontSize: 12,
            }}
          >
            {open ? "Collapse" : "Expand JSON"}
          </button>
          <button
            type="button"
            onClick={onVerify}
            disabled={verify === "loading"}
            className="btn"
            style={{
              border: "1px solid var(--accent)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderRadius: 8,
              padding: "7px 13px",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {verify === "loading"
              ? "Verifying…"
              : verify === "valid"
                ? "✓ Signature valid"
                : verify === "invalid"
                  ? "✗ Invalid"
                  : "Verify signature"}
          </button>
        </div>
      </div>
      {verify === "valid" ? (
        <div style={{ marginTop: 14 }}>
          <Badge variant="pass">
            <Icon name="check" size={11} stroke={2.4} /> signature valid · chains to attested
            enclave
          </Badge>
        </div>
      ) : null}
      <pre
        className="mono no-scrollbar"
        style={{
          margin: "16px 0 0",
          padding: 16,
          background: "var(--seal)",
          color: "oklch(0.86 0.04 145)",
          borderRadius: 10,
          fontSize: 11,
          lineHeight: 1.65,
          overflow: "auto",
          maxHeight: open ? "none" : 168,
        }}
      >
        {JSON.stringify(receipt, null, 2)}
      </pre>
    </div>
  );
}

function SubScoreList({ sub }: { sub: Record<string, number> }) {
  const entries = Object.entries(sub);
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map(([k, v]) => (
        <SubScoreBar key={k} label={k[0].toUpperCase() + k.slice(1)} value={v} />
      ))}
    </>
  );
}

function ScorecardEditorial({
  view,
  jobId,
  skillId,
}: {
  view: ScorecardView;
  jobId: string;
  skillId: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ border: "1px solid var(--ink)", borderRadius: 18, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 0 }}>
          <div style={{ padding: "34px 34px 30px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <Badge variant={view.passed ? "pass" : "fail"}>
                <Icon name="check" size={12} stroke={2.6} /> {view.passed ? "PASS" : "FAIL"}
              </Badge>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--mute)" }}>
                {view.skillScore.toFixed(2)} ≥ {view.threshold.toFixed(2)} threshold
              </span>
            </div>
            <div className="label" style={{ fontSize: 10 }}>
              Skill score
            </div>
            <div
              className="serif"
              style={{
                fontSize: 104,
                lineHeight: 0.82,
                letterSpacing: "-0.03em",
                color: "var(--accent)",
                marginTop: 4,
              }}
            >
              {pct(view.skillScore)}
            </div>
            <div style={{ display: "flex", gap: 36, marginTop: 18 }}>
              <Stat3 label="Baseline" value={pct(view.baselineScore)} />
              <Stat3 label="Uplift" value={upl(view.uplift)} accent />
            </div>
            <div
              style={{
                marginTop: 26,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 360,
              }}
            >
              <SubScoreList sub={view.sub} />
            </div>
          </div>
          <div
            style={{
              borderLeft: "1px solid var(--line)",
              background: "var(--bg-2)",
              padding: "34px 30px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 14,
            }}
          >
            <ScoreDonut value={view.skillScore} threshold={view.threshold} size={180} />
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--mute)", textAlign: "center", lineHeight: 1.6 }}
            >
              <span style={{ color: "var(--accent)" }}>●</span> skill score ·{" "}
              <span style={{ color: "var(--ink)" }}>●</span> your threshold
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ProofPanel view={view} />
        <PaymentPanel view={view} skillId={skillId} />
      </div>
      <SamplesPanel samples={view.samples} />
      <ReceiptPanel jobId={jobId} receipt={view.receipt} />
    </div>
  );
}

function ScorecardDashboard({
  view,
  jobId,
  skillId,
}: {
  view: ScorecardView;
  jobId: string;
  skillId: string;
}) {
  const cards: Array<[string, string, boolean, "spark" | "doc" | "bolt" | "shield"]> = [
    ["Skill score", pct(view.skillScore), true, "spark"],
    ["Baseline", pct(view.baselineScore), false, "doc"],
    ["Uplift", upl(view.uplift), true, "bolt"],
    ["Threshold", pct(view.threshold), false, "shield"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {cards.map(([label, value, accent, icon]) => (
          <div
            key={label}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 18,
              background: "var(--card)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="label" style={{ fontSize: 9.5 }}>
                {label}
              </span>
              <span style={{ color: accent ? "var(--accent)" : "var(--faint)" }}>
                <Icon name={icon} size={15} />
              </span>
            </div>
            <div
              className="serif"
              style={{
                fontSize: 46,
                lineHeight: 1.05,
                marginTop: 8,
                color: accent ? "var(--accent)" : "var(--ink)",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: 22,
            background: "var(--card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Sub-scores</h3>
            <Badge variant={view.passed ? "pass" : "fail"}>
              {view.passed ? "PASS" : "FAIL"}
            </Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SubScoreList sub={view.sub} />
          </div>
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--line-2)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <ScoreDonut value={view.skillScore} threshold={view.threshold} size={130} />
          </div>
        </div>
        <ProofPanel view={view} compact />
        <PaymentPanel view={view} skillId={skillId} />
      </div>
      <SamplesPanel samples={view.samples} />
      <ReceiptPanel jobId={jobId} receipt={view.receipt} />
    </div>
  );
}

function ScorecardProofFirst({
  view,
  jobId,
  skillId,
}: {
  view: ScorecardView;
  jobId: string;
  skillId: string;
}) {
  const r = view.receipt;
  const hashEntries: [string, string][] = [];
  if (r.runner_hash) hashEntries.push(["runner", r.runner_hash]);
  if (r.model_hash) hashEntries.push(["model", r.model_hash]);
  if (r.verifier_hash) hashEntries.push(["verifier", r.verifier_hash]);
  if (view.attestationQuote) hashEntries.push(["attestation", view.attestationQuote]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          border: "1px solid var(--accent)",
          borderRadius: 18,
          background: "var(--seal)",
          color: "var(--bg)",
          padding: "30px 34px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid oklch(0.78 0.16 145)",
                color: "oklch(0.82 0.16 145)",
                marginBottom: 18,
              }}
            >
              <Icon name="seal" size={14} />
              <span className="mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                signed by the enclave · Ed25519
              </span>
            </div>
            <div
              className="serif"
              style={{
                fontSize: "clamp(28px,3vw,42px)",
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
              }}
            >
              This result is provable,
              <br />
              <span className="italic" style={{ color: "oklch(0.78 0.12 145)" }}>
                not just reported.
              </span>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11.5,
                color: "rgba(255,255,255,.55)",
                marginTop: 18,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span>receipt {r.receipt_id}</span>
              {r.timestamp ? <span>· {r.timestamp}</span> : null}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="label" style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>
              Verified skill score
            </div>
            <div
              className="serif"
              style={{
                fontSize: 96,
                lineHeight: 0.9,
                color: "oklch(0.82 0.16 145)",
                letterSpacing: "-0.03em",
              }}
            >
              {pct(view.skillScore)}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              ≥ {pct(view.threshold)} · {upl(view.uplift)} uplift
            </div>
          </div>
        </div>
        {hashEntries.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${hashEntries.length},1fr)`,
              gap: 0,
              marginTop: 24,
              paddingTop: 22,
              borderTop: "1px solid rgba(255,255,255,.12)",
            }}
          >
            {hashEntries.map(([k, v], i) => (
              <div
                key={k}
                style={{
                  paddingLeft: i ? 18 : 0,
                  borderLeft: i ? "1px solid rgba(255,255,255,.12)" : "none",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 9.5,
                    color: "rgba(255,255,255,.5)",
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                  }}
                >
                  {k}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "oklch(0.84 0.08 145)",
                    marginTop: 5,
                    wordBreak: "break-all",
                  }}
                >
                  {short(v.split(":").pop() ?? v, 12, 6)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: 22,
            background: "var(--card)",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Score breakdown</h3>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <ScoreDonut value={view.skillScore} threshold={view.threshold} size={120} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 13 }}>
              <SubScoreList sub={view.sub} />
            </div>
          </div>
        </div>
        <PaymentPanel view={view} skillId={skillId} />
      </div>
      <SamplesPanel samples={view.samples} />
      <ReceiptPanel jobId={jobId} receipt={view.receipt} />
    </div>
  );
}

export function ScorecardScreen({ job, skill }: { job: EvaluationJob; skill: DisplaySkill }) {
  const [variation, setVariation] = useState<Variation>("editorial");
  const view = useMemo(() => parseScorecardView(job), [job]);

  if (!view) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 30px 60px" }}>
        <Crumb skillId={skill.skill_id} />
        <h1
          className="serif"
          style={{
            fontSize: "clamp(32px,4vw,48px)",
            lineHeight: 1.02,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Evaluation scorecard
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--mute)", marginTop: 8 }}>
          job {job.job_id} · {skill.name} · buyer {job.buyer_id}
        </p>
        <p className="mt-4" style={{ color: "var(--mute)" }}>
          Status: {job.status}
        </p>
        {job.error ? (
          <p style={{ marginTop: 8, color: "var(--danger)" }}>{job.error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 30px 60px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <Crumb skillId={skill.skill_id} />
          <h1
            className="serif"
            style={{
              fontSize: "clamp(32px,4vw,48px)",
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Evaluation scorecard
          </h1>
          <p className="mono" style={{ fontSize: 12, color: "var(--mute)", marginTop: 8 }}>
            job {job.job_id} · {skill.name} · buyer {job.buyer_id}
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--line)",
            borderRadius: 999,
            overflow: "hidden",
            background: "var(--card)",
            marginTop: 28,
          }}
        >
          {(
            [
              ["editorial", "Editorial"],
              ["dashboard", "Dashboard"],
              ["proof", "Proof-first"],
            ] as const
          ).map(([id, lab]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVariation(id)}
              className="mono"
              style={{
                padding: "8px 14px",
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

      <div
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "var(--mute)",
          marginBottom: 18,
          padding: "5px 11px",
          border: "1px solid var(--line)",
          borderRadius: 999,
        }}
      >
        <Icon name="bolt" size={12} /> scorecard variation:{" "}
        <strong style={{ color: "var(--ink)" }}>{variation}</strong>
      </div>

      {variation === "editorial" ? (
        <ScorecardEditorial
          view={view}
          jobId={job.job_id}
          skillId={skill.skill_id}
        />
      ) : null}
      {variation === "dashboard" ? (
        <ScorecardDashboard view={view} jobId={job.job_id} skillId={skill.skill_id} />
      ) : null}
      {variation === "proof" ? (
        <ScorecardProofFirst view={view} jobId={job.job_id} skillId={skill.skill_id} />
      ) : null}

      {view.hasSlideArtifact ? (
        <div style={{ marginTop: 22 }}>
          <a
            href={`${API_URL}/v1/evaluations/${job.job_id}/artifacts/slides.pptx`}
            className="btn btn-accent"
            style={{ padding: "12px 22px", display: "inline-flex", gap: 8, alignItems: "center" }}
          >
            <Icon name="arrow" size={16} /> Download slides.pptx
          </a>
          <p className="mono" style={{ fontSize: 11, color: "var(--mute)", marginTop: 8 }}>
            PPTX generated inside the TEE · exported after leakage guard
          </p>
        </div>
      ) : null}

      {view.agentMetrics ? (
        <div
          style={{
            marginTop: 18,
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 16,
            background: "var(--card)",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>Agent run metrics</h3>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--mute)", lineHeight: 1.7 }}>
            {[
              ["harness", view.agentMetrics.harness_mode ?? "builtin"],
              ["tool_calls", String(view.agentMetrics.tool_calls ?? 0)],
              ["iterations", String(view.agentMetrics.iterations_used ?? 0)],
              ["artifact", view.agentMetrics.artifact_generated ? "slides.pptx" : "none"],
            ].map(([k, v]) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        <Link href="/" className="btn btn-primary" style={{ padding: "12px 22px" }}>
          Go to my licenses <Icon name="arrow" size={15} />
        </Link>
        <Link href="/" className="btn btn-ghost" style={{ padding: "12px 20px" }}>
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
