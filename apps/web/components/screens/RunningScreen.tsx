"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/shared/Icon";
import { EnclaveChip } from "@/components/shared/Pill";
import { fetchEvaluation, type EvaluationJob } from "@/lib/api";
import { PIPELINE, PIPELINE_AGENT } from "@/lib/constants";

export function RunningScreen({ jobId, isAgent: isAgentProp }: { jobId: string; isAgent?: boolean }) {
  const [job, setJob] = useState<EvaluationJob | null>(null);
  const agentFromJob =
    (job?.evaluation as { agent_metrics?: { evaluation_type?: string } } | undefined)?.agent_metrics
      ?.evaluation_type === "agent" || job?.skill_id === "ari-juels";
  const isAgent = isAgentProp ?? agentFromJob;
  const pipeline = isAgent ? PIPELINE_AGENT : PIPELINE;
  const [active, setActive] = useState(0);
  const done = job?.status === "completed" || job?.status === "failed";
  const sessionId = job?.tee_session_id ?? "sess_7f3c9a21";

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setActive(i);
      if (i >= pipeline.length) clearInterval(t);
    }, 700);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await fetchEvaluation(jobId);
        if (!cancelled) setJob(result);
        if (result.status === "completed" || result.status === "failed") return;
      } catch {
        /* keep polling */
      }
      if (!cancelled) {
        setTimeout(poll, 1000);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 30px 70px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ display: "inline-block", marginBottom: 16 }}>
          <EnclaveChip label="evaluation running · sealed" live />
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(34px,4vw,52px)",
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Nobody can see inside.
          <br />
          <span className="italic" style={{ color: "var(--mute)" }}>
            Not the seller. Not us. Not you.
          </span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 12 }}>
          Your data and the seller&apos;s skill are both decrypted only here. Only the score, the proof,
          and approved output will leave.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div
          style={{
            borderRadius: 20,
            overflow: "hidden",
            position: "relative",
            background: "var(--seal)",
            color: "var(--bg)",
            minHeight: 420,
          }}
        >
          <div
            className="scan-line"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 60,
              background: "linear-gradient(180deg, oklch(0.78 0.16 145 / 0.18), transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,255,255,.1)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name="lock" size={16} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Phala TEE enclave</span>
            <div style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>
              {sessionId}
            </span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {pipeline.map((p, i) => {
              const isDone = i < active;
              const isActive = i === active && !done;
              return (
                <div
                  key={p.k}
                  style={{
                    display: "flex",
                    gap: 13,
                    alignItems: "flex-start",
                    padding: "11px 24px",
                    opacity: i <= active ? 1 : 0.32,
                    transition: "opacity .35s",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      flexShrink: 0,
                      marginTop: 1,
                      display: "grid",
                      placeItems: "center",
                      background: isDone
                        ? "oklch(0.78 0.16 145)"
                        : isActive
                          ? "rgba(255,255,255,.14)"
                          : "transparent",
                      border: isActive
                        ? "1px solid oklch(0.78 0.16 145)"
                        : isDone
                          ? "none"
                          : "1px solid rgba(255,255,255,.2)",
                      color: isDone ? "var(--seal)" : "#fff",
                    }}
                  >
                    {isDone ? (
                      <Icon name="check" size={13} stroke={2.6} />
                    ) : isActive ? (
                      <span className="live-dot mono" style={{ fontSize: 10 }}>
                        ▸
                      </span>
                    ) : (
                      <span className="mono" style={{ fontSize: 9 }}>
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {p.k}
                      </span>
                      {isActive && (
                        <span
                          className="mono"
                          style={{ fontSize: 9.5, color: "oklch(0.82 0.16 145)" }}
                        >
                          running
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        color: "rgba(255,255,255,.55)",
                        marginTop: 2,
                      }}
                    >
                      {p.d}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: 20,
              background: "var(--card)",
            }}
          >
            <div className="label" style={{ marginBottom: 14 }}>
              What you can observe from outside
            </div>
            {(
              [
                ["Your dataset", "redacted"],
                ["Seller skill", "redacted"],
                ["Model prompts", "redacted"],
                ["Ground truth", "redacted"],
              ] as const
            ).map(([k]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 0",
                  borderTop: "1px solid var(--line-2)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--ink-2)", width: 110 }}>{k}</span>
                <span className="redacted" style={{ flex: 1, height: 11 }} />
              </div>
            ))}
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--mute)",
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Icon name="eyeoff" size={13} /> opaque by construction — not a UI redaction
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: 20,
              background: "var(--bg-2)",
            }}
          >
            <div className="label" style={{ marginBottom: 12 }}>
              Cleared to leave the enclave
            </div>
            {(
              [
                ["Skill score", "on completion"],
                ["Signed receipt", "Ed25519"],
                ["Approved output", "leakage-guard checked"],
              ] as const
            ).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderTop: "1px solid var(--line-2)",
                }}
              >
                <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--accent)" }}>
                    <Icon name="check" size={13} stroke={2.2} />
                  </span>
                  {k}
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--mute)" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          <Link
            href={`/evaluations/${jobId}`}
            className="btn btn-accent"
            aria-disabled={!done}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px",
              fontSize: 14.5,
              opacity: done ? 1 : 0.45,
              pointerEvents: done ? "auto" : "none",
            }}
          >
            {done ? (
              <>
                View scorecard <Icon name="arrow" size={16} />
              </>
            ) : (
              "Sealing receipt…"
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
