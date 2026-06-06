import Link from "next/link";

import { HashRow } from "@/components/shared/HashRow";
import { Icon } from "@/components/shared/Icon";
import { Badge, SectionLabel } from "@/components/shared/Pill";
import type { License } from "@/lib/api";
import type { DisplaySkill } from "@/lib/catalog";
import { skillById } from "@/lib/catalog";

export interface LicensesScreenProps {
  buyerId: string;
  balance: number;
  licenses: License[];
  skills: DisplaySkill[];
}

function formatIssued(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function LicensesScreen({ buyerId, balance, licenses, skills }: LicensesScreenProps) {
  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 30px 60px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionLabel>Buyer</SectionLabel>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(36px,4.5vw,56px)",
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {buyerId}
          </h1>
          <div className="mono" style={{ fontSize: 12, color: "var(--mute)", marginTop: 10 }}>
            internal credits · settles in USDC
          </div>
        </div>
        <Link
          href="/"
          className="btn btn-primary"
          style={{ marginTop: 30, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          Evaluate another skill <Icon name="arrow" size={15} />
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 0,
          marginTop: 28,
          border: "1px solid var(--ink)",
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--card)",
        }}
      >
        {(
          [
            ["Balance", `$${balance}`, "available to commit", true],
            ["Active licenses", String(licenses.length), "usable via the enclave"],
            ["Evaluations run", "—", "history available after evaluations"],
          ] as const
        ).map(([l, v, d, hl], i) => (
          <div
            key={l}
            style={{
              padding: "22px 24px",
              borderLeft: i ? "1px solid var(--line)" : "none",
              background: hl ? "var(--bg-2)" : "transparent",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <div className="label" style={{ fontSize: 10 }}>
                {l}
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 44,
                  lineHeight: 1.05,
                  marginTop: 6,
                  color: hl ? "var(--accent)" : "var(--ink)",
                }}
              >
                {v}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)", marginTop: 4 }}>
                {d}
              </div>
            </div>
            {hl ? (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "7px 13px", fontSize: 12 }}
                disabled
              >
                Deposit
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 24,
          marginTop: 32,
        }}
      >
        <div>
          <SectionLabel>Your licenses</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {licenses.length === 0 ? (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  background: "var(--card)",
                  padding: 22,
                }}
              >
                <p className="mono" style={{ fontSize: 12, color: "var(--mute)", margin: 0 }}>
                  No licenses yet. Pass an evaluation threshold to receive a usable license.
                </p>
              </div>
            ) : (
              licenses.map((l) => {
                const sk = skillById(skills, l.skill_id);
                return (
                  <div
                    key={l.license_id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 16,
                      background: "var(--card)",
                      padding: 22,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 500, fontSize: 17 }}>
                            {sk?.name ?? l.skill_id}
                          </span>
                          <Badge variant="pass">
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 99,
                                background: "var(--accent)",
                                display: "inline-block",
                              }}
                            />{" "}
                            active
                          </Badge>
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 7 }}
                        >
                          issued {formatIssued(l.issued_at)} · usage via enclave
                        </div>
                      </div>
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: "var(--seal)",
                          color: "var(--bg)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="key" size={17} />
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        marginTop: 18,
                        paddingTop: 16,
                        borderTop: "1px dashed var(--line)",
                      }}
                    >
                      <HashRow label="License ID" value={l.license_id} full />
                      <HashRow label="Receipt" value={l.receipt_id} full />
                    </div>
                    <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "9px 16px", fontSize: 13 }}
                        disabled
                      >
                        <Icon name="lock" size={14} /> Run via enclave
                      </button>
                      <Link
                        href={`/evaluations/${l.job_id}`}
                        className="btn btn-ghost"
                        style={{
                          padding: "9px 16px",
                          fontSize: 13,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        View scorecard
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <SectionLabel>Evaluation history</SectionLabel>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 16,
              overflow: "hidden",
              background: "var(--card)",
            }}
          >
            <div
              className="mono"
              style={{ padding: "18px 18px", fontSize: 12, color: "var(--mute)", lineHeight: 1.6 }}
            >
              Evaluation history is not available in this MVP build. Completed runs appear on each
              license scorecard.
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              color: "var(--faint)",
              marginTop: 12,
              lineHeight: 1.6,
              padding: "0 4px",
            }}
          >
            Failed evaluations are never charged. Your dataset left no trace — only the signed
            receipt remains.
          </div>
        </div>
      </div>
    </div>
  );
}
