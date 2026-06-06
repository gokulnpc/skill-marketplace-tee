import { MAX_PAPERS_ZIP_BYTES } from "./constants";

export interface PapersZipValidation {
  ok: boolean;
  error?: string;
  fileCount: number;
  extensions: Record<string, number>;
  commitment?: string;
}

const ALLOWED_EXT = new Set([".pdf", ".md", ".txt", ".markdown"]);

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

/** Minimal local-header walk to inventory zip entries in the browser. */
export function listZipEntryNames(buffer: ArrayBuffer): string[] {
  const view = new DataView(buffer);
  const names: string[] = [];
  let offset = 0;
  while offset + 30 < view.byteLength) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const nameLen = readUint16(view, offset + 26);
    const extraLen = readUint16(view, offset + 28);
    const compSize = view.getUint32(offset + 18, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > view.byteLength) break;
    const nameBytes = new Uint8Array(buffer, nameStart, nameLen);
    names.push(new TextDecoder().decode(nameBytes));
    offset = nameEnd + extraLen + compSize;
  }
  return names;
}

export async function validatePapersZip(file: File): Promise<PapersZipValidation> {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return { ok: false, error: "File must be a .zip archive", fileCount: 0, extensions: {} };
  }
  if (file.size > MAX_PAPERS_ZIP_BYTES) {
    return { ok: false, error: "Zip exceeds 50 MB limit", fileCount: 0, extensions: {} };
  }
  const buffer = await file.arrayBuffer();
  const header = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    return { ok: false, error: "Not a valid zip file", fileCount: 0, extensions: {} };
  }

  const entries = listZipEntryNames(buffer).filter(
    (n) => !n.startsWith("__MACOSX/") && !n.includes("/._") && !n.endsWith("/"),
  );
  const extensions: Record<string, number> = {};
  let validCount = 0;
  for (const name of entries) {
    if (name.includes("..")) {
      return { ok: false, error: `Unsafe path in zip: ${name}`, fileCount: 0, extensions: {} };
    }
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
    if (!ALLOWED_EXT.has(ext)) continue;
    extensions[ext] = (extensions[ext] ?? 0) + 1;
    validCount += 1;
  }
  if (validCount === 0) {
    return {
      ok: false,
      error: "Zip must contain at least one .pdf, .md, or .txt paper",
      fileCount: 0,
      extensions: {},
    };
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const commitment = `sha256:${[...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

  return { ok: true, fileCount: validCount, extensions, commitment };
}
