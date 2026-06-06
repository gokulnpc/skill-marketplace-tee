import { describe, expect, it } from "vitest";

import { computeTreeHash, normalizeSkillZipPaths, normalizeZipPath, shouldIncludeInTreeHash } from "./skill-package.js";

describe("skill-package", () => {
  it("excludes adapters from tree hash", () => {
    expect(shouldIncludeInTreeHash("skill/SKILL.md")).toBe(true);
    expect(shouldIncludeInTreeHash("adapters/codex/foo.md")).toBe(false);
  });

  it("computes deterministic tree hash", () => {
    const files = new Map<string, Buffer>([
      ["skill/SKILL.md", Buffer.from("hello")],
      ["adapters/x.md", Buffer.from("ignore")],
    ]);
    const h1 = computeTreeHash(files);
    const h2 = computeTreeHash(files);
    expect(h1).toBe(h2);
    expect(h1.startsWith("sha256:")).toBe(true);
  });

  it("rejects path traversal", () => {
    expect(normalizeZipPath("../etc/passwd")).toBeNull();
    expect(normalizeZipPath("skill/SKILL.md")).toBe("skill/SKILL.md");
  });

  it("rebases nested zip root to skill/", () => {
    const nested = new Map<string, Buffer>([
      ["ari-portable-skill/skill/SKILL.md", Buffer.from("hello")],
      ["ari-portable-skill/skill/knowledge/a.md", Buffer.from("k")],
      ["__MACOSX/._junk", Buffer.from("x")],
    ]);
    const rebased = normalizeSkillZipPaths(nested);
    expect(rebased.has("skill/SKILL.md")).toBe(true);
    expect(rebased.has("skill/knowledge/a.md")).toBe(true);
    expect(rebased.has("__MACOSX/._junk")).toBe(false);
  });
});
