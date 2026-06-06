"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Footer } from "@/components/layout/Shell";
import { Icon } from "@/components/shared/Icon";
import { EnclaveChip, Pill, SectionLabel, VerifiedTag } from "@/components/shared/Pill";
import type { DisplaySkill } from "@/lib/catalog";
import { CATEGORIES, EVAL_TYPES, TICKER } from "@/lib/constants";
import { pct, upl } from "@/lib/format";

function Ticker() {
  const row = (
    <div
      style={{
        display: "flex",
        gap: 38,
        alignItems: "center",
        padding: "9px 0",
        whiteSpace: "nowrap",
      }}
      className="mono"
    >
      {TICKER.map((it, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            gap: 9,
            alignItems: "center",
            fontSize: 11.5,
            color: "var(--ink-2)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 99,
              background:
                it.kind === "paid" ? "var(--accent)" : it.kind === "new" ? "var(--accent-2)" : "var(--mute)",
            }}
          />
          <span style={{ color: "var(--mute)" }}>{it.time}</span>
          <span>{it.text}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-2)", overflow: "hidden" }}>
      <div className="ticker-track" style={{ display: "flex", width: "200%" }}>
        {row}
        {row}
      </div>
    </div>
  );
}

function BrowseHero() {
  const stats = [
    ["Buyer data exposed", "0 bytes", "across every evaluation"],
    ["Skills attested", "6 live", "· 5 verified sellers"],
    ["Evaluations today", "2,041", "98.6% receipts valid"],
    ["Median attestation", "1.9 s", "quote → verified"],
  ] as const;

  return (
    <section style={{ borderBottom: "1px solid var(--line)" }}>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "54px 30px 42px",
          display: "grid",
          gridTemplateColumns: "1.45fr 1fr",
          gap: 46,
        }}
      >
        <div>
          <div className="reveal reveal-d1" style={{ marginBottom: 18 }}>
            <EnclaveChip label="the skill · the model · the verifier · your data — one sealed enclave" />
          </div>
          <h1
            className="serif reveal reveal-d2"
            style={{
              fontSize: "clamp(46px, 5.6vw, 82px)",
              lineHeight: 1.0,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Try a private skill
            <br />
            on data that{" "}
            <span className="italic" style={{ color: "var(--accent)" }}>
              never leaves
              <br />
              your control.
            </span>
          </h1>
          <p
            className="reveal reveal-d3"
            style={{ maxWidth: 540, color: "var(--ink-2)", fontSize: 16, lineHeight: 1.55, marginTop: 22 }}
          >
            Bring your own benchmark. Encrypt it to an attested TEE, evaluate any listed skill on it, and pay only if
            the score clears your threshold. The seller never sees your data — you never see their skill.
          </p>
          <div className="reveal reveal-d4" style={{ display: "flex", gap: 10, marginTop: 26 }}>
            <a href="#feed" className="btn btn-primary shine" style={{ padding: "12px 22px", fontSize: 14 }}>
              Browse skills ↓
            </a>
            <button type="button" className="btn btn-ghost" style={{ padding: "12px 20px", fontSize: 14 }}>
              How the enclave works
            </button>
          </div>
        </div>
        <aside
          style={{
            borderLeft: "1px solid var(--line)",
            paddingLeft: 30,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {stats.map(([l, v, s], i) => (
            <div
              key={l}
              className={`reveal reveal-d${i + 2}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "baseline",
                gap: 12,
                paddingBottom: 13,
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <div>
                <div className="label">{l}</div>
                <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 3 }}>{s}</div>
              </div>
              <div
                className="serif"
                style={{ fontSize: 34, lineHeight: 1, color: i === 0 ? "var(--accent)" : "var(--ink)" }}
              >
                {v}
              </div>
            </div>
          ))}
          <div className="mono" style={{ fontSize: 11, color: "var(--mute)", paddingTop: 4, lineHeight: 1.7 }}>
            Phala TDX · open-weight local model · Ed25519 signed receipts
          </div>
        </aside>
      </div>
    </section>
  );
}

function PrivacyStrip() {
  const cols = [
    ["Buyer", "never sees the raw skill", "Only score, proof & approved output return."],
    ["Seller", "never sees your dataset", "Your transcripts stay encrypted to the enclave."],
    ["Marketplace", "never sees plaintext", "We route ciphertext and verify receipts."],
    ["Model host", "never sees anything", "Inference runs locally inside the TEE."],
  ] as const;

  return (
    <section style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "26px 30px",
          display: "grid",
          gridTemplateColumns: "auto repeat(4, 1fr)",
          gap: 26,
          alignItems: "center",
        }}
      >
        <div className="label" style={{ maxWidth: 90, lineHeight: 1.5, margin: 0 }}>
          Four parties.
          <br />
          Four blind spots.
        </div>
        {cols.map(([who, claim, d]) => (
          <div key={who} style={{ borderLeft: "1px solid var(--line)", paddingLeft: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: "var(--accent)" }}>
                <Icon name="eyeoff" size={15} />
              </span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{who}</span>
            </div>
            <div className="serif italic" style={{ fontSize: 19, color: "var(--ink)", marginTop: 5, lineHeight: 1.15 }}>
              {claim}
            </div>
            <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface Filters {
  q: string;
  cats: string[];
  types: string[];
  price: "any" | "sm" | "md" | "lg";
  verifiedOnly: boolean;
}

function FilterRail({
  filters,
  setF,
  skills,
}: {
  filters: Filters;
  setF: React.Dispatch<React.SetStateAction<Filters>>;
  skills: DisplaySkill[];
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((f) => ({ ...f, [k]: v }));

  return (
    <aside
      style={{
        position: "sticky",
        top: 86,
        alignSelf: "start",
        borderRight: "1px solid var(--line)",
        padding: "26px 26px 26px 0",
      }}
    >
      <SectionLabel>Search</SectionLabel>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input
          placeholder="Skill, seller, tag…"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          style={{
            width: "100%",
            padding: "9px 12px 9px 32px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--card)",
            fontSize: 13,
          }}
        />
        <span style={{ position: "absolute", left: 10, top: 9, color: "var(--faint)" }}>
          <Icon name="search" size={15} />
        </span>
      </div>

      <SectionLabel>Category</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 24 }}>
        {CATEGORIES.map((c) => {
          const on = filters.cats.includes(c);
          const n = skills.filter((s) => s.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => set("cats", on ? filters.cats.filter((x) => x !== c) : [...filters.cats, c])}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 9px",
                background: on ? "var(--ink)" : "transparent",
                color: on ? "var(--bg)" : "var(--ink-2)",
                borderRadius: 6,
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <span style={{ flex: 1 }}>{c}</span>
              <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <SectionLabel>Evaluation type</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {EVAL_TYPES.map((t) => {
          const on = filters.types.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => set("types", on ? filters.types.filter((x) => x !== t) : [...filters.types, t])}
              className="mono"
              style={{
                padding: "4px 9px",
                border: "1px solid var(--line)",
                background: on ? "var(--ink)" : "var(--card)",
                color: on ? "var(--bg)" : "var(--ink-2)",
                borderRadius: 999,
                fontSize: 11,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <SectionLabel>Price</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
        {(
          [
            ["any", "Any"],
            ["sm", "Under $25"],
            ["md", "$25 – $45"],
            ["lg", "$45+"],
          ] as const
        ).map(([id, lab]) => (
          <label
            key={id}
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "3px 0", cursor: "pointer" }}
          >
            <input
              type="radio"
              name="price"
              checked={filters.price === id}
              onChange={() => set("price", id)}
              style={{ accentColor: "var(--ink)" }}
            />{" "}
            {lab}
          </label>
        ))}
      </div>

      <SectionLabel>Trust</SectionLabel>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, padding: "3px 0", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => set("verifiedOnly", e.target.checked)}
        />{" "}
        Verified sellers only
      </label>

      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <button
          type="button"
          onClick={() => setF({ q: "", cats: [], types: [], price: "any", verifiedOnly: false })}
          style={{ color: "var(--mute)", fontSize: 12, textDecoration: "underline" }}
        >
          Clear all filters
        </button>
      </div>
    </aside>
  );
}

function ScoreBar({ value, baseline }: { value: number; baseline: number }) {
  return (
    <div style={{ position: "relative", height: 6, background: "var(--bg-3)", borderRadius: 99, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${baseline * 100}%`,
          background: "var(--line)",
          borderRadius: 99,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${value * 100}%`,
          background: "var(--accent)",
          borderRadius: 99,
        }}
      />
    </div>
  );
}

function SkillRow({ s }: { s: DisplaySkill }) {
  return (
    <Link
      href={`/skills/${s.skill_id}`}
      className="row-lift"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 230px 150px",
        gap: 24,
        alignItems: "start",
        padding: "24px 16px 24px 18px",
        borderBottom: "1px solid var(--line-2)",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 9, alignItems: "center" }}>
          <Pill tone="ink">{s.category}</Pill>
          <Pill tone="muted">{s.evaluation_type}</Pill>
          <VerifiedTag verified={s.verified} />
        </div>
        <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{s.name}</div>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5, maxWidth: 600 }}>
          {s.blurb}
        </div>
        <div
          className="mono"
          style={{
            display: "flex",
            gap: 12,
            marginTop: 11,
            fontSize: 11.5,
            color: "var(--mute)",
            flexWrap: "wrap",
          }}
        >
          <span>
            by <span style={{ color: "var(--ink-2)" }}>{s.seller}</span>
          </span>
          <span>·</span>
          <span>v{s.version}</span>
          <span>·</span>
          <span>{s.runs.toLocaleString()} evals</span>
        </div>
      </div>
      <div style={{ paddingTop: 4 }}>
        <div className="label" style={{ fontSize: 10, marginBottom: 8 }}>
          Skill score · uplift
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="serif" style={{ fontSize: 30, lineHeight: 1 }}>
            {pct(s.baseline_avg + s.median_uplift)}
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>
            {upl(s.median_uplift)}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <ScoreBar value={s.baseline_avg + s.median_uplift} baseline={s.baseline_avg} />
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)", marginTop: 7 }}>
          {Math.round(s.pass_rate * 100)}% clear threshold
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="label" style={{ fontSize: 10 }}>
          Pay if it passes
        </div>
        <div className="serif" style={{ fontSize: 38, lineHeight: 1, letterSpacing: "-0.02em" }}>
          ${s.price}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)", marginTop: 2 }}>
          USDC · per license
        </div>
        <span className="btn btn-primary" style={{ marginTop: 12, width: "100%", justifyContent: "center", padding: "9px 14px" }}>
          Evaluate <span className="row-arrow">→</span>
        </span>
      </div>
    </Link>
  );
}

function SkillCard({ s }: { s: DisplaySkill }) {
  return (
    <Link
      href={`/skills/${s.skill_id}`}
      className="spot"
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        background: "var(--card)",
        padding: 20,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pill tone="ink">{s.category}</Pill>
          {s.verified && (
            <Pill tone="accent">
              <Icon name="check" size={10} stroke={2.4} />
            </Pill>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="serif" style={{ fontSize: 30, lineHeight: 1 }}>
            ${s.price}
          </div>
          <div className="mono" style={{ fontSize: 9.5, color: "var(--mute)" }}>
            per license
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.01em" }}>{s.name}</div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5, minHeight: 58 }}>
          {s.blurb}
        </div>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
            {s.evaluation_type}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="serif" style={{ fontSize: 22 }}>
              {pct(s.baseline_avg + s.median_uplift)}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>
              {upl(s.median_uplift)}
            </span>
          </span>
        </div>
        <ScoreBar value={s.baseline_avg + s.median_uplift} baseline={s.baseline_avg} />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTop: "1px dashed var(--line)",
        }}
      >
        <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
          {s.seller}
        </span>
        <span style={{ color: "var(--accent)" }}>
          <Icon name="arrow" size={17} />
        </span>
      </div>
    </Link>
  );
}

export function BrowseScreen({ skills }: { skills: DisplaySkill[] }) {
  const [filters, setF] = useState<Filters>({
    q: "",
    cats: [],
    types: [],
    price: "any",
    verifiedOnly: false,
  });
  const [layout, setLayout] = useState<"rows" | "grid">("rows");
  const [sort, setSort] = useState<"uplift" | "price" | "runs">("uplift");

  const list = useMemo(() => {
    return skills
      .filter((s) => {
        if (filters.q && !`${s.name} ${s.seller} ${s.tags.join(" ")}`.toLowerCase().includes(filters.q.toLowerCase()))
          return false;
        if (filters.cats.length && !filters.cats.includes(s.category)) return false;
        if (filters.types.length && !filters.types.includes(s.evaluation_type)) return false;
        if (filters.verifiedOnly && !s.verified) return false;
        if (filters.price === "sm" && s.price >= 25) return false;
        if (filters.price === "md" && (s.price < 25 || s.price > 45)) return false;
        if (filters.price === "lg" && s.price < 45) return false;
        return true;
      })
      .sort((a, b) =>
        sort === "uplift"
          ? b.median_uplift - a.median_uplift
          : sort === "price"
            ? a.price - b.price
            : b.runs - a.runs,
      );
  }, [skills, filters, sort]);

  return (
    <div>
      <Ticker />
      <BrowseHero />
      <PrivacyStrip />
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 30px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 36 }}>
          <FilterRail filters={filters} setF={setF} skills={skills} />
          <section id="feed" style={{ padding: "28px 0 56px", scrollMarginTop: 80 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
                gap: 12,
              }}
            >
              <div>
                <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
                  Listed skills
                </div>
                <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 5 }}>
                  <span className="mono">{list.length}</span> skills · each evaluable on your private benchmark before
                  you pay
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--mute)", marginRight: 2 }}>
                  sort
                </span>
                {(
                  [
                    ["uplift", "Uplift"],
                    ["price", "Price"],
                    ["runs", "Most run"],
                  ] as const
                ).map(([id, lab]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSort(id)}
                    className="mono"
                    style={{
                      border: "1px solid var(--line)",
                      background: sort === id ? "var(--ink)" : "var(--card)",
                      color: sort === id ? "var(--bg)" : "var(--ink-2)",
                      borderRadius: 999,
                      padding: "5px 11px",
                      fontSize: 11.5,
                    }}
                  >
                    {lab}
                  </button>
                ))}
                <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
                <button
                  type="button"
                  onClick={() => setLayout("rows")}
                  className="btn"
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 7,
                    padding: "6px 8px",
                    background: layout === "rows" ? "var(--ink)" : "transparent",
                    color: layout === "rows" ? "var(--bg)" : "var(--ink)",
                  }}
                >
                  <Icon name="list" size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("grid")}
                  className="btn"
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 7,
                    padding: "6px 8px",
                    background: layout === "grid" ? "var(--ink)" : "transparent",
                    color: layout === "grid" ? "var(--bg)" : "var(--ink)",
                  }}
                >
                  <Icon name="grid" size={15} />
                </button>
              </div>
            </div>

            {layout === "rows" ? (
              <div style={{ borderTop: "1px solid var(--ink)" }}>
                {list.map((s) => (
                  <SkillRow key={s.skill_id} s={s} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {list.map((s) => (
                  <SkillCard key={s.skill_id} s={s} />
                ))}
              </div>
            )}
            {list.length === 0 && (
              <div style={{ padding: "60px 0", textAlign: "center", color: "var(--mute)" }}>
                No skills match those filters.
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
