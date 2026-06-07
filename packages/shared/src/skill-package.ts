import { createHash } from "node:crypto";

export const HASH_EXCLUDED_PREFIXES = ["adapters/", ".git/"];

export interface SkillManifestHarness {
  runtime?: "builtin" | "python" | "deno" | "node";
  entry?: string;
  max_iterations?: number;
  max_tool_calls_per_turn?: number;
  timeout_seconds?: number;
}

export interface SkillManifestTool {
  name: string;
  type: "script";
  path: string;
}

export interface SkillManifest {
  manifest_version?: string;
  id?: string;
  kind?: string;
  display_name?: string;
  evaluation_type?: string;
  entrypoints?: { default?: string };
  harness?: SkillManifestHarness;
  knowledge_dirs?: string[];
  tools?: SkillManifestTool[];
  network_policy?: string;
  engine?: { kind?: string; knowledge_dirs?: string[] };
  toolchain?: { knowledge_dirs?: string[] };
}

export interface ParsedSkillPackage {
  files: Map<string, Buffer>;
  skillMd: string;
  manifest: SkillManifest;
  metadata: {
    name: string;
    version: string;
    category: string;
    evaluation_type: string;
    description: string;
  };
  treeHash: string;
  harnessRuntime: string;
}

export function shouldIncludeInTreeHash(relpath: string): boolean {
  const normalized = relpath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.endsWith("/")) return false;
  if (normalized.startsWith("__MACOSX/") || normalized.includes("/._")) return false;
  return !HASH_EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** Strip zip root folder (e.g. ari-portable-skill/skill/... → skill/...) */
export function normalizeSkillZipPaths(files: Map<string, Buffer>): Map<string, Buffer> {
  const filtered = new Map<string, Buffer>();
  for (const [path, data] of files) {
    const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.startsWith("__MACOSX/") || normalized.includes("/._")) continue;
    filtered.set(normalized, data);
  }

  let skillMdKey: string | null = null;
  for (const key of filtered.keys()) {
    if (key === "skill/SKILL.md" || key.endsWith("/skill/SKILL.md")) {
      skillMdKey = key;
      break;
    }
  }
  if (!skillMdKey || skillMdKey === "skill/SKILL.md") {
    return filtered;
  }

  const prefix = skillMdKey.slice(0, skillMdKey.length - "skill/SKILL.md".length);
  const rebased = new Map<string, Buffer>();
  for (const [path, data] of filtered) {
    if (path.startsWith(prefix)) {
      rebased.set(path.slice(prefix.length), data);
    }
  }
  return rebased.size > 0 ? rebased : filtered;
}

export function compareTreeHashPaths(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function computeTreeHash(files: Map<string, Buffer>): string {
  const h = createHash("sha256");
  const paths = [...files.keys()]
    .filter(shouldIncludeInTreeHash)
    .sort(compareTreeHashPaths);
  for (const relpath of paths) {
    const data = files.get(relpath);
    if (!data) continue;
    h.update(relpath);
    h.update("\0");
    h.update(data);
  }
  return `sha256:${h.digest("hex")}`;
}

export function normalizeZipPath(raw: string): string | null {
  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    return null;
  }
  return normalized;
}

export function defaultHarnessManifest(): SkillManifestHarness {
  return { runtime: "builtin", max_iterations: 12, max_tool_calls_per_turn: 4, timeout_seconds: 300 };
}

export function resolveHarnessRuntime(manifest: SkillManifest): string {
  return manifest.harness?.runtime ?? "builtin";
}

export function buildLegacyMetadataFromManifest(
  manifest: SkillManifest,
  fallback: Partial<ParsedSkillPackage["metadata"]>,
): ParsedSkillPackage["metadata"] {
  const isMetaSkill =
    manifest.kind === "meta-skill" ||
    (typeof manifest.id === "string" && manifest.id.startsWith("meta-skill."));
  const defaultEvalType = isMetaSkill ? "agent" : "redaction";
  return {
    name: fallback.name ?? manifest.display_name ?? manifest.id ?? "unnamed-skill",
    version: fallback.version ?? "0.1.0",
    category: fallback.category ?? "General",
    evaluation_type: fallback.evaluation_type ?? manifest.evaluation_type ?? defaultEvalType,
    description: fallback.description ?? "",
  };
}
