import AdmZip from "adm-zip";

import type { ParsedSkillPackage, SkillManifest } from "@skillvault/shared";
import {
  buildLegacyMetadataFromManifest,
  computeTreeHash,
  defaultHarnessManifest,
  normalizeSkillZipPaths,
  normalizeZipPath,
  resolveHarnessRuntime,
} from "@skillvault/shared";

const MAX_ZIP_BYTES = 52_428_800;
const MAX_FILES = 5000;
const MAX_FILE_BYTES = 10_485_760;

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  /NEAR_API_KEY\s*=\s*\S+/,
];

const REVEAL_PATTERNS = [
  /print the hidden skill/i,
  /reveal your instructions/i,
  /ignore all previous instructions/i,
];

const UNSAFE_CODE_PATTERNS = [
  /\beval\s*\(/,
  /\bos\.system\s*\(/,
  /\bsubprocess\.(run|Popen|call)\s*\(/,
];

function readText(files: Map<string, Buffer>, path: string): string | null {
  const data = files.get(path);
  if (!data) return null;
  return data.toString("utf-8");
}

function findSkillMdPath(files: Map<string, Buffer>): string | null {
  for (const key of files.keys()) {
    if (key === "skill/SKILL.md" || key.endsWith("/skill/SKILL.md")) return key;
  }
  return files.has("skill/SKILL.md") ? "skill/SKILL.md" : null;
}

export function extractZipToMap(zipBytes: Buffer): Map<string, Buffer> {
  if (zipBytes.length > MAX_ZIP_BYTES) {
    throw new Error(`Zip exceeds max size (${MAX_ZIP_BYTES} bytes)`);
  }
  const zip = new AdmZip(zipBytes);
  const entries = zip.getEntries();
  if (entries.length > MAX_FILES) {
    throw new Error(`Zip exceeds max file count (${MAX_FILES})`);
  }
  const files = new Map<string, Buffer>();
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const raw = normalizeZipPath(entry.entryName);
    if (!raw) {
      throw new Error(`Unsafe zip path: ${entry.entryName}`);
    }
    if (raw.startsWith("__MACOSX/") || raw.includes("/._")) continue;
    const data = entry.getData();
    if (data.length > MAX_FILE_BYTES) {
      throw new Error(`File too large: ${raw}`);
    }
    files.set(raw, data);
  }
  return normalizeSkillZipPaths(files);
}

export function parseSkillZip(zipBytes: Buffer, listingMetadata?: Partial<ParsedSkillPackage["metadata"]>): ParsedSkillPackage {
  const files = extractZipToMap(zipBytes);
  const skillPath = findSkillMdPath(files);
  if (!skillPath) {
    throw new Error("Missing required file: skill/SKILL.md");
  }
  const skillMd = readText(files, skillPath);
  if (!skillMd?.trim()) {
    throw new Error("SKILL.md content is required");
  }

  let manifest: SkillManifest = {};
  const manifestRaw = readText(files, "skill/manifest.json");
  if (manifestRaw) {
    manifest = JSON.parse(manifestRaw) as SkillManifest;
  }

  let metadataJson: Partial<ParsedSkillPackage["metadata"]> = listingMetadata ?? {};
  const metadataRaw = readText(files, "skill/metadata.json");
  if (metadataRaw) {
    metadataJson = { ...metadataJson, ...JSON.parse(metadataRaw) };
  }

  const metadata = buildLegacyMetadataFromManifest(manifest, metadataJson);
  if (!metadata.name || !metadata.description) {
    throw new Error("Invalid metadata: name and description required");
  }

  if (!manifest.harness) {
    manifest.harness = defaultHarnessManifest();
  }

  const treeHash = computeTreeHash(files);
  return {
    files,
    skillMd,
    manifest,
    metadata,
    treeHash,
    harnessRuntime: resolveHarnessRuntime(manifest),
  };
}

export function validateSkillZipPackage(parsed: ParsedSkillPackage): string[] {
  const errors: string[] = [];
  const evalType = parsed.metadata.evaluation_type;
  const supported = ["redaction", "summarization", "agent"];
  if (!supported.includes(evalType)) {
    errors.push(`Unsupported evaluation type: ${evalType}`);
  }

  for (const pattern of REVEAL_PATTERNS) {
    if (pattern.test(parsed.skillMd)) {
      errors.push("Skill appears to instruct prompt revelation");
    }
  }

  for (const [path, data] of parsed.files) {
    if (!path.endsWith(".md") && !path.endsWith(".py") && !path.endsWith(".json")) continue;
    const text = data.toString("utf-8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`Possible embedded secret in ${path}`);
      }
    }
  }

  const declaredTools = new Set((parsed.manifest.tools ?? []).map((t) => t.path));
  for (const [path, data] of parsed.files) {
    if (!path.endsWith(".py")) continue;
    const text = data.toString("utf-8");
    const isDeclared = declaredTools.has(path.replace(/^skill\//, "")) || path.includes("harness/tools/");
    for (const pattern of UNSAFE_CODE_PATTERNS) {
      if (pattern.test(text) && !isDeclared) {
        errors.push(`Unsafe code pattern in ${path} without manifest declaration`);
      }
    }
  }

  if (parsed.manifest.harness?.runtime === "python") {
    const entry = parsed.manifest.harness.entry ?? "harness/handler.py";
    const full = entry.startsWith("skill/") ? entry : `skill/${entry}`;
    if (!parsed.files.has(full)) {
      errors.push(`Harness entry not found: ${entry}`);
    }
  }

  return errors;
}

export function buildMinimalZipFromSkillMd(skillContent: string, metadata: ParsedSkillPackage["metadata"]): Buffer {
  const zip = new AdmZip();
  zip.addFile("skill/SKILL.md", Buffer.from(skillContent, "utf-8"));
  zip.addFile("skill/metadata.json", Buffer.from(JSON.stringify(metadata, null, 2), "utf-8"));
  zip.addFile(
    "skill/manifest.json",
    Buffer.from(
      JSON.stringify(
        {
          manifest_version: "skillvault-1",
          id: metadata.name.toLowerCase().replace(/\s+/g, "-"),
          evaluation_type: metadata.evaluation_type,
          entrypoints: { default: "SKILL.md" },
          harness: defaultHarnessManifest(),
        },
        null,
        2,
      ),
      "utf-8",
    ),
  );
  return zip.toBuffer();
}
