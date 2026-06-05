import type { SkillMetadata } from "@skillvault/shared";
import { z } from "zod";

const metadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  category: z.string().min(1),
  evaluation_type: z.string().min(1),
  description: z.string().min(1),
});

export function validateSkillPackage(skillContent: string, metadata: SkillMetadata): string[] {
  const errors: string[] = [];

  if (!skillContent.trim()) {
    errors.push("SKILL.md content is required");
  }

  const parsed = metadataSchema.safeParse(metadata);
  if (!parsed.success) {
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

  if (metadata.evaluation_type !== "redaction" && metadata.evaluation_type !== "summarization") {
    errors.push("Unsupported evaluation type for MVP");
  }

  return errors;
}
