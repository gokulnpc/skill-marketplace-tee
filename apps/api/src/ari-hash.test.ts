import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseSkillZip } from "./skill-package.js";

describe("ari seed hash", () => {
  it("matches tee-runner tree hash for bundled zip", () => {
    const zip = readFileSync(join(import.meta.dirname, "../seed/ari-portable-skill.zip"));
    const parsed = parseSkillZip(zip, {
      name: "Ari Juels",
      version: "1.0.0",
      category: "Data",
      evaluation_type: "agent",
      description: "x",
    });
    expect(parsed.treeHash).toBe(
      "sha256:5df8854f149d524cc081528d26798decc293346651368a293b290e2219d5e4a3",
    );
  });
});
