import { notFound } from "next/navigation";

import { fetchSkill } from "@/lib/api";

import { EvaluateForm } from "./evaluate-form";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const skill = await fetchSkill(id);
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm text-muted">{skill.category}</p>
          <h1 className="text-3xl font-semibold">{skill.name}</h1>
          <p className="mt-2 max-w-2xl text-muted">{skill.description}</p>
          <p className="mt-4 text-sm">
            Price: ${skill.price} · Type: {skill.evaluation_type}
          </p>
        </div>
        <EvaluateForm skillId={skill.skill_id} />
      </div>
    );
  } catch {
    notFound();
  }
}
