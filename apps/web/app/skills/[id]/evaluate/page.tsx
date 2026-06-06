import { notFound } from "next/navigation";

import { EvaluateFlow } from "@/components/screens/EvaluateFlow";
import { enrichSkill } from "@/lib/catalog";
import { fetchSkill } from "@/lib/api";

export default async function EvaluatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const skill = enrichSkill(await fetchSkill(id));
    return <EvaluateFlow skill={skill} />;
  } catch {
    notFound();
  }
}
