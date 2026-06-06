import { describe, expect, it } from "vitest";

import { buildMinimalZipFromSkillMd, parseSkillZip } from "./skill-package.js";

describe("skill-package API", () => {
  it("builds and parses minimal zip", () => {
    const zip = buildMinimalZipFromSkillMd("# Skill", {
      name: "Test Skill",
      version: "1.0",
      category: "Redaction",
      evaluation_type: "redaction",
      description: "desc",
    });
    const parsed = parseSkillZip(zip);
    expect(parsed.treeHash.startsWith("sha256:")).toBe(true);
    expect(parsed.harnessRuntime).toBe("builtin");
  });
});
