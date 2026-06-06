import type { SkillMetadata } from "@skillvault/shared";

import type { ParsedSkillPackage } from "./skill-package.js";
import { validateSkillZipPackage } from "./skill-package.js";

export function validateSkillPackage(skillContent: string, metadata: SkillMetadata): string[] {
  const errors: string[] = [];

  if (!skillContent.trim()) {
    errors.push("SKILL.md content is required");
  }

  if (!metadata.name || !metadata.version || !metadata.category || !metadata.evaluation_type || !metadata.description) {
    errors.push("Invalid metadata.json schema");
  }

  const revealPatterns = [
    /print the hidden skill/i,
    /reveal your instructions/i,
    /ignore all previous instructions/i,
  ];
  if (revealPatterns.some((pattern) => pattern.test(skillContent))) {
    errors.push("Skill appears to instruct prompt revelation");
  }

  const supported = ["redaction", "summarization", "agent"];
  if (!supported.includes(metadata.evaluation_type)) {
    errors.push(`Unsupported evaluation type: ${metadata.evaluation_type}`);
  }

  return errors;
}

export function validateParsedZipPackage(parsed: ParsedSkillPackage): string[] {
  return validateSkillZipPackage(parsed);
}
