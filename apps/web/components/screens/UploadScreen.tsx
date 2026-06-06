"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { HashRow } from "@/components/shared/HashRow";
import { Icon } from "@/components/shared/Icon";
import { Pill, SectionLabel } from "@/components/shared/Pill";
import { uploadSkillZip } from "@/lib/api";
import {
  CATEGORIES,
  DEFAULT_SELLER_ID,
  EVAL_TYPES,
  VALIDATIONS,
} from "@/lib/constants";

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 9,
  background: "var(--card)",
  fontSize: 13.5,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span className="label" style={{ fontSize: 10 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const DEFAULT_FORM = {
  name: "Discreet Meeting Notes",
  version: "0.4.2",
  category: "Redaction",
  evaluation_type: "redaction",
  price: 25,
  description:
    "Turns raw meeting transcripts into useful notes while removing sensitive topics, planted secrets, and speaker attribution.",
};

type Phase = "edit" | "validating" | "encrypting" | "done";

export function UploadScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const set = <K extends keyof typeof DEFAULT_FORM>(k: K, v: (typeof DEFAULT_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const [phase, setPhase] = useState<Phase>("edit");
  const [vDone, setVDone] = useState(0);
  const [skillHash, setSkillHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "validating") return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVDone(i);
      if (i >= VALIDATIONS.length) {
        clearInterval(t);
        void (async () => {
          try {
            if (!zipFile) {
              throw new Error("Select a skill package (.zip)");
            }
            const listing = await uploadSkillZip({
              seller_id: DEFAULT_SELLER_ID,
              package: zipFile,
              metadata: {
                name: form.name,
                version: form.version,
                category: form.category,
                evaluation_type: form.evaluation_type,
                description: form.description,
              },
              price: Number(form.price),
              publish: true,
            });
            setSkillHash(listing.skill_hash);
            setTimeout(() => setPhase("encrypting"), 500);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            setPhase("edit");
            setVDone(0);
          }
        })();
      }
    }, 360);
    return () => clearInterval(t);
  }, [phase, form, zipFile]);

  useEffect(() => {
    if (phase !== "encrypting") return;
    const t = setTimeout(() => setPhase("done"), 1400);
    return () => clearTimeout(t);
  }, [phase]);

  function onPublish() {
    setError(null);
    setVDone(0);
    setSkillHash(null);
    setPhase("validating");
  }

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 30px 60px" }}>
      <Link
        href="/seller"
        className="mono"
        style={{ fontSize: 12, color: "var(--mute)", marginBottom: 22, display: "inline-block" }}
      >
        ← Seller dashboard
      </Link>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 44,
          alignItems: "start",
        }}
      >
        <div>
          <SectionLabel>List a skill</SectionLabel>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(36px,4.5vw,58px)",
              lineHeight: 1.02,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Monetize it without
            <br />
            <span className="italic" style={{ color: "var(--accent)" }}>
              ever revealing it.
            </span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-2)",
              lineHeight: 1.55,
              marginTop: 14,
              maxWidth: 540,
            }}
          >
            Upload a portable skill zip (SKILL.md, knowledge base, harness). Hashed, encrypted, and
            only decrypted inside an attested enclave during paid evaluation.
          </p>

          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Skill package (.zip)">
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                disabled={phase !== "edit"}
                onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                style={inp}
              />
              {zipFile ? (
                <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
                  {zipFile.name} ({Math.round(zipFile.size / 1024)} KB)
                </span>
              ) : (
                <span className="mono" style={{ fontSize: 11, color: "var(--mute)" }}>
                  Include skill/SKILL.md, skill/manifest.json, optional knowledge/
                </span>
              )}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <Field label="Skill name">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  style={inp}
                  disabled={phase !== "edit"}
                />
              </Field>
              <Field label="Version">
                <input
                  value={form.version}
                  onChange={(e) => set("version", e.target.value)}
                  style={inp}
                  disabled={phase !== "edit"}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  style={inp}
                  disabled={phase !== "edit"}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Evaluation type">
                <select
                  value={form.evaluation_type}
                  onChange={(e) => set("evaluation_type", e.target.value)}
                  style={inp}
                  disabled={phase !== "edit"}
                >
                  {[...EVAL_TYPES, "agent"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Price (USDC)">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                  style={inp}
                  disabled={phase !== "edit"}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                style={{ ...inp, minHeight: 70, resize: "vertical", lineHeight: 1.5 }}
                disabled={phase !== "edit"}
              />
            </Field>
          </div>
        </div>

        <aside
          style={{
            position: "sticky",
            top: 90,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
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
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Pre-publish validation</h3>
              {phase === "edit" && <Pill tone="muted">not run</Pill>}
              {phase === "validating" && <Pill tone="muted">running…</Pill>}
              {(phase === "encrypting" || phase === "done") && (
                <Pill tone="accent">
                  <Icon name="check" size={10} stroke={2.4} /> passed
                </Pill>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {VALIDATIONS.map((v, i) => {
                const ok =
                  phase === "edit" ? false : phase === "validating" ? i < vDone : true;
                return (
                  <div
                    key={v[0]}
                    style={{
                      display: "flex",
                      gap: 11,
                      alignItems: "flex-start",
                      padding: "10px 0",
                      borderTop: i ? "1px solid var(--line-2)" : "none",
                      opacity: phase === "edit" ? 0.55 : ok ? 1 : 0.4,
                      transition: "opacity .3s",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 99,
                        flexShrink: 0,
                        marginTop: 1,
                        display: "grid",
                        placeItems: "center",
                        background: ok ? "var(--accent-soft)" : "var(--bg-3)",
                        color: ok ? "var(--accent)" : "var(--mute)",
                      }}
                      className={ok && phase === "validating" ? "tick-bounce" : ""}
                    >
                      {ok ? (
                        <Icon name="check" size={12} stroke={2.6} />
                      ) : (
                        <span className="mono" style={{ fontSize: 9 }}>
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>{v[0]}</span>
                      <span
                        className="mono"
                        style={{
                          display: "block",
                          fontSize: 10.5,
                          color: "var(--mute)",
                          marginTop: 2,
                        }}
                      >
                        {v[1]}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              border: phase === "done" ? "1px solid var(--accent)" : "1px solid var(--line)",
              borderRadius: 16,
              background: phase === "done" ? "var(--accent-soft)" : "var(--bg-2)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <span style={{ color: "var(--accent)" }}>
                <Icon name="lock" size={15} />
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
                Encrypted at rest
              </span>
            </div>
            {skillHash ? (
              <HashRow label="skill_hash = sha256(package)" value={skillHash} />
            ) : (
              <HashRow
                label="skill_hash = sha256(package)"
                value="pending publish — hash assigned on encrypt"
              />
            )}
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--mute)", marginTop: 12, lineHeight: 1.6 }}
            >
              {phase === "done"
                ? "Published. The raw skill is now stored encrypted — never shown to buyers."
                : "On publish: hashed, encrypted to storage, listed. Raw skill never shown to buyers."}
            </div>
          </div>

          {error ? (
            <p className="mono" style={{ fontSize: 11.5, color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          ) : null}

          {phase === "done" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push("/seller")}
              style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 14 }}
            >
              <Icon name="check" size={16} stroke={2.2} /> Listing is live — view dashboard
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-accent"
              disabled={phase !== "edit" || !zipFile}
              onClick={onPublish}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "13px",
                fontSize: 14,
                opacity: phase === "edit" && zipFile ? 1 : 0.55,
                pointerEvents: phase === "edit" && zipFile ? "auto" : "none",
              }}
            >
              {phase === "edit" ? (
                <>
                  Validate &amp; publish <Icon name="arrow" size={15} />
                </>
              ) : phase === "validating" ? (
                "Validating…"
              ) : (
                "Encrypting & storing…"
              )}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
