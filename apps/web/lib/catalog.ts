import type { SkillListing } from "@/lib/api";

export interface SkillMetric {
  k: string;
  d: string;
}

export interface SkillExample {
  in: string;
  out: string;
}

export interface DisplaySkill extends SkillListing {
  seller: string;
  version: string;
  verified: boolean;
  blurb: string;
  runs: number;
  pass_rate: number;
  median_uplift: number;
  baseline_avg: number;
  tags: string[];
  examples: SkillExample[];
  metrics: SkillMetric[];
}

const CATALOG: Record<string, Partial<DisplaySkill>> = {
  "discreet-meeting-notes": {
    seller: "seller.redact-labs",
    version: "0.4.2",
    verified: true,
    blurb:
      "Turns raw meeting transcripts into useful notes while removing sensitive topics, planted secrets, and speaker attribution — preserving decisions, action items, and logistics.",
    runs: 1284,
    pass_rate: 0.86,
    median_uplift: 0.31,
    baseline_avg: 0.58,
    tags: ["summary", "action items", "must-not-leak", "attribution removal"],
    examples: [
      {
        in: "Sarah: The client is Acme Bank. Maya: Do not mention layoffs. Ravi: I will send the security proposal by Friday.",
        out: "A sensitive client topic was discussed and omitted. Action item: send the revised security proposal by Friday.",
      },
    ],
    metrics: [
      { k: "Utility", d: "Action items, decisions & logistics preserved" },
      { k: "Privacy", d: "Sensitive topics, secrets & attribution removed" },
      { k: "Format", d: "Valid JSON, required fields, no hidden leakage" },
    ],
  },
  "ari-juels": {
    seller: "seller.research-lab",
    version: "1.0.0",
    verified: true,
    blurb:
      "Professor-style research agent grounded in a private paper corpus. Evaluates ideas, analyzes research, and generates conference slide decks (PPTX) from your uploaded papers — all inside the TEE.",
    runs: 312,
    pass_rate: 0.82,
    median_uplift: 0.28,
    baseline_avg: 0.52,
    tags: ["agent", "research", "slides", "knowledge tools", "PPTX"],
    examples: [
      {
        in: "Zip of 3 DeFi/MEV papers → create an 8–12 slide talk deck",
        out: "slides.pptx with problem framing, mechanism design, and evidence-backed takeaways in Ari's presentation style.",
      },
    ],
    metrics: [
      { k: "Research utility", d: "Grounded analysis using skill knowledge + buyer papers" },
      { k: "Privacy", d: "Skill instructions and corpus never leak in outputs" },
      { k: "Artifacts", d: "PPTX slide deck generated and exportable on pass" },
    ],
  },
};

const DEFAULT_METRICS: SkillMetric[] = [
  { k: "Utility", d: "Task output quality on your benchmark" },
  { k: "Privacy", d: "Sensitive content kept in-bounds" },
  { k: "Format", d: "Schema-valid structured output" },
];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function enrichSkill(skill: SkillListing): DisplaySkill {
  const catalog = CATALOG[skill.skill_id] ?? {};
  return {
    ...skill,
    seller: catalog.seller ?? skill.seller_id.replace(/_/g, "."),
    version: catalog.version ?? "0.1.0",
    verified: catalog.verified ?? skill.seller_id === "seller_demo",
    blurb: catalog.blurb ?? skill.description,
    runs: catalog.runs ?? 0,
    pass_rate: catalog.pass_rate ?? 0.75,
    median_uplift: catalog.median_uplift ?? 0.2,
    baseline_avg: catalog.baseline_avg ?? 0.6,
    tags: catalog.tags ?? [skill.evaluation_type, skill.category],
    examples: catalog.examples ?? [],
    metrics: catalog.metrics ?? DEFAULT_METRICS,
    category: titleCase(skill.category),
  };
}

export function enrichSkills(skills: SkillListing[]): DisplaySkill[] {
  return skills.map(enrichSkill);
}

export function skillById(skills: DisplaySkill[], id: string): DisplaySkill | undefined {
  return skills.find((s) => s.skill_id === id);
}
