import Link from "next/link";

import { Icon } from "@/components/shared/Icon";
import { Pill, SectionLabel, VerifiedTag } from "@/components/shared/Pill";
import type { DisplaySkill } from "@/lib/catalog";

export interface SellerScreenProps {
  sellerId: string;
  balance: number;
  listings: DisplaySkill[];
}

export function SellerScreen({ sellerId, balance, listings }: SellerScreenProps) {
  const mine = listings.filter((l) => l.seller_id === sellerId);
  const totalRuns = mine.reduce((sum, l) => sum + l.runs, 0);
  const avgPass =
    mine.length > 0 ? mine.reduce((sum, l) => sum + l.pass_rate, 0) / mine.length : 0;
  const lifetimeRevenue = 0;

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
          <SectionLabel>Seller</SectionLabel>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(36px,4.5vw,56px)",
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {sellerId}
          </h1>
          <div
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--mute)",
              marginTop: 10,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <span>payout → internal balance</span>
            <span>·</span>
            <VerifiedTag verified />
          </div>
        </div>
        <Link
          href="/upload"
          className="btn btn-primary"
          style={{ marginTop: 30, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Icon name="upload" size={15} /> List a new skill
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
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
            ["Available balance", `$${balance}`, "USDC · withdrawable", true],
            ["Lifetime revenue", `$${lifetimeRevenue}`, `across ${mine.length} listing${mine.length === 1 ? "" : "s"}`],
            ["Evaluations run", totalRuns.toLocaleString(), "on your skills"],
            ["Pass → purchase", `${Math.round(avgPass * 100)}%`, "cleared buyer thresholds"],
          ] as const
        ).map(([l, v, d, hl], i) => (
          <div
            key={l}
            style={{
              padding: "22px 24px",
              borderLeft: i ? "1px solid var(--line)" : "none",
              background: hl ? "var(--bg-2)" : "transparent",
            }}
          >
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
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 24,
          marginTop: 32,
        }}
      >
        <div>
          <SectionLabel>Your listings</SectionLabel>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 16,
              overflow: "hidden",
              background: "var(--card)",
            }}
          >
            {mine.length === 0 ? (
              <div
                className="mono"
                style={{ padding: "22px 20px", fontSize: 12, color: "var(--mute)" }}
              >
                No listings yet — publish your first skill.
              </div>
            ) : (
              mine.map((sk, i) => (
                <Link
                  key={sk.skill_id}
                  href={`/skills/${sk.skill_id}`}
                  className="row-lift"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 18,
                    alignItems: "center",
                    padding: "18px 20px",
                    borderTop: i ? "1px solid var(--line-2)" : "none",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ fontWeight: 500, fontSize: 15 }}>{sk.name}</span>
                      <Pill tone="accent">
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 99,
                            background: "var(--accent)",
                            display: "inline-block",
                          }}
                        />{" "}
                        {sk.status}
                      </Pill>
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "var(--mute)", marginTop: 5 }}
                    >
                      v{sk.version} · {sk.evaluation_type} · ${sk.price}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="serif" style={{ fontSize: 24, lineHeight: 1 }}>
                      {sk.runs.toLocaleString()}
                    </div>
                    <div className="label" style={{ fontSize: 9 }}>
                      evals
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <div
                      className="serif"
                      style={{ fontSize: 24, lineHeight: 1, color: "var(--accent)" }}
                    >
                      $0
                    </div>
                    <div className="label" style={{ fontSize: 9 }}>
                      {Math.round(sk.pass_rate * 100)}% pass
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionLabel>Recent settlements</SectionLabel>
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
              Settlement history will appear here after buyers purchase licenses on your skills.
            </div>
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--line-2)" }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "center", padding: "9px" }}
                disabled
              >
                Withdraw ${balance} →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
