"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/shared/Icon";
import { SectionLabel } from "@/components/shared/Pill";
import { validatePapersZip, type PapersZipValidation } from "@/lib/papers-zip";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PapersZipStep({
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
  const [validation, setValidation] = useState<PapersZipValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(null);
    setValidation(null);
    setError(null);
    if (!selected) return;

    setValidating(true);
    try {
      const result = await validatePapersZip(selected);
      if (!result.ok) {
        setError(result.error ?? "Invalid papers zip");
        return;
      }
      setFile(selected);
      setValidation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="reveal reveal-d1">
      <SectionLabel>Step 2 · Upload research papers</SectionLabel>
      <h2
        className="serif"
        style={{ fontSize: 40, lineHeight: 1.05, margin: 0, letterSpacing: "-0.01em" }}
      >
        Bring your paper corpus.
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
        Upload a <strong>.zip</strong> of PDF or markdown research papers. The agent will generate an
        8–12 slide PPTX deck inside the enclave. Nothing leaves your machine until attestation completes.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {!file ? (
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
            }}
          >
            <Icon name="upload" size={22} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            {validating ? "Validating zip…" : "Select papers.zip"}
          </span>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--mute)" }}>
            .pdf · .md · .txt · max 50 MB
          </span>
        </button>
      ) : (
        <div
          style={{
            marginTop: 30,
            border: "1px solid var(--line)",
            borderRadius: 16,
            background: "var(--card)",
            padding: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{file.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 4 }}>
                {formatFileSize(file.size)}
                {validation ? ` · ${validation.fileCount} papers` : ""}
              </div>
            </div>
            <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
              Change
            </button>
          </div>
          {validation && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(validation.extensions).map(([ext, count]) => (
                <div key={ext} className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                  {count}× {ext} files
                </div>
              ))}
              {validation.commitment && (
                <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)", marginTop: 6 }}>
                  dataset_commitment {validation.commitment.slice(0, 20)}…
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: "var(--fail)", fontSize: 13, marginTop: 12 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        <button type="button" className="btn" onClick={back}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!file || validating}
          onClick={next}
        >
          Continue <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  );
}
