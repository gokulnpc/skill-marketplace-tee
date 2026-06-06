import { notFound } from "next/navigation";

import { ScorecardScreen } from "@/components/screens/ScorecardScreen";
import { fetchEvaluation, fetchSkill } from "@/lib/api";
import { enrichSkill } from "@/lib/catalog";

export default async function EvaluationScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const job = await fetchEvaluation(id);
    const skill = enrichSkill(await fetchSkill(job.skill_id));
    return <ScorecardScreen job={job} skill={skill} />;
  } catch {
    notFound();
  }
}
