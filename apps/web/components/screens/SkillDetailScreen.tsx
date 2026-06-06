import Link from "next/link";

import { Icon } from "@/components/shared/Icon";
import { HashRow } from "@/components/shared/HashRow";
import { EnclaveChip, Pill, SectionLabel, VerifiedTag } from "@/components/shared/Pill";
import type { DisplaySkill } from "@/lib/catalog";
import { pct, upl } from "@/lib/format";

export function SkillDetailScreen({ skill }: { skill: DisplaySkill }) {
  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 30px 60px" }}>
      <Link
        href="/"
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12,
          color: "var(--mute)",
          marginBottom: 22,
          whiteSpace: "nowrap",
        }}
      >
        ← Marketplace <span style={{ color: "var(--faint)" }}>/ {skill.skill_id}</span>
      </Link>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 44, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <Pill tone="ink">{skill.category}</Pill>
            <Pill tone="muted">{skill.evaluation_type}</Pill>
            <VerifiedTag verified={skill.verified} />
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {skill.name}
          </h1>
          <p style={{ fontSize: 17, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 18, maxWidth: 600 }}>
            {skill.blurb}
          </p>
          <div
            className="mono"
            style={{
              display: "flex",
              gap: 14,
              marginTop: 16,
              fontSize: 12,
              color: "var(--mute)",
              flexWrap: "wrap",
              whiteSpace: "nowrap",
            }}
          >
            <span>
              by <span style={{ color: "var(--ink-2)" }}>{skill.seller}</span>
            </span>
            <span>·</span>
            <span>v{skill.version}</span>
            <span>·</span>
            <span>{skill.runs.toLocaleString()} evaluations run</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 0,
              marginTop: 30,
              border: "1px solid var(--line)",
              borderRadius: 14,
              overflow: "hidden",
              background: "var(--card)",
            }}
          >
            {(
              [
                ["Median skill score", pct(skill.baseline_avg + skill.median_uplift), "across all benchmarks"],
                ["Median uplift", upl(skill.median_uplift), "vs. no-skill baseline"],
                ["Clear threshold", `${Math.round(skill.pass_rate * 100)}%`, "of evaluations"],
              ] as const
            ).map(([l, v, d], i) => (
              <div
                key={l}
                style={{ padding: "20px 22px", borderLeft: i ? "1px solid var(--line)" : "none" }}
              >
                <div className="label" style={{ fontSize: 10 }}>
                  {l}
                </div>
                <div
                  className="serif"
                  style={{
                    fontSize: 42,
                    lineHeight: 1.05,
                    marginTop: 6,
                    color: i === 1 ? "var(--accent)" : "var(--ink)",
                  }}
                >
                  {v}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)", marginTop: 4 }}>
                  {d}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 38 }}>
            <SectionLabel>What the verifier measures</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {skill.metrics.map((m, i) => (
                <div
                  key={m.k}
                  style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--bg-2)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--accent)" }}>
                      <Icon name={(["spark", "shield", "doc"] as const)[i] ?? "spark"} size={17} />
                    </span>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{m.k}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 9, lineHeight: 1.5 }}>{m.d}</div>
                </div>
              ))}
            </div>
          </div>

          {skill.examples.length > 0 && (
            <div style={{ marginTop: 38 }}>
              <SectionLabel>Public example · seller-provided</SectionLabel>
              <div style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "16px 18px",
                    borderBottom: "1px solid var(--line-2)",
                    background: "var(--bg-2)",
                  }}
                >
                  <div className="label" style={{ fontSize: 9.5, marginBottom: 7 }}>
                    Input transcript (illustrative)
                  </div>
                  <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
                    {skill.examples[0].in}
                  </div>
                </div>
                <div style={{ padding: "16px 18px", background: "var(--card)" }}>
                  <div className="label" style={{ fontSize: 9.5, marginBottom: 7, color: "var(--accent)" }}>
                    Output that left the enclave
                  </div>
                  <div className="mono" style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6 }}>
                    {skill.examples[0].out}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 38 }}>
            <SectionLabel>The privacy contract</SectionLabel>
            <div style={{ border: "1px solid var(--ink)", borderRadius: 14, overflow: "hidden" }}>
              {(
                [
                  ["You", "see the score, the proof, and leakage-guard-approved output", "never the raw skill"],
                  ["The seller", "gets paid when your score clears threshold", "never sees your dataset"],
                  ["The marketplace", "routes ciphertext and verifies the receipt", "never sees your plaintext"],
                  ["The model host", "nothing — inference is local to the enclave", "no external API call"],
                ] as const
              ).map(([who, gets, never], i) => (
                <div
                  key={who}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 1fr auto",
                    gap: 18,
                    alignItems: "center",
                    padding: "15px 20px",
                    borderTop: i ? "1px solid var(--line-2)" : "none",
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{who}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{gets}</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--accent)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon name="eyeoff" size={13} /> {never}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside style={{ position: "sticky", top: 90 }}>
          <div
            style={{
              border: "1px solid var(--ink)",
              borderRadius: 16,
              background: "var(--card)",
              padding: 24,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div className="label">Pay only if it passes</div>
              <EnclaveChip label="TEE-only" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 10 }}>
              <span className="serif" style={{ fontSize: 60, lineHeight: 1, letterSpacing: "-0.02em" }}>
                ${skill.price}
              </span>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--mute)", lineHeight: 1.4 }}>
                USDC
                <br />
                per license
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 14 }}>
              Set a threshold, encrypt your dataset to the attested enclave, and run. You’re charged only if the skill
              score clears your bar — otherwise, $0.
            </p>
            <Link
              href={`/skills/${skill.skill_id}/evaluate`}
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "13px",
                fontSize: 14.5,
                marginTop: 18,
              }}
            >
              <Icon name="lock" size={16} /> Evaluate on my dataset
            </Link>

            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: "1px dashed var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: 13,
              }}
            >
              <HashRow label="Skill hash" value={skill.skill_hash} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "var(--mute)" }}>Evaluation type</span>
                <span className="mono">{skill.evaluation_type}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "var(--mute)" }}>Model</span>
                <span className="mono" style={{ whiteSpace: "nowrap" }}>
                  Llama 3.1 8B · local
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "var(--mute)" }}>Trial</span>
                <span className="mono" style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>
                  scorecard free
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
