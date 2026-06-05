import Link from "next/link";

import { fetchSkills } from "@/lib/api";

export default async function HomePage() {
  const skills = await fetchSkills();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Private Skill Marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Evaluate skills on your private dataset inside an attested TEE. Only scores and proofs leave
          the enclave.
        </p>
      </div>

      <div className="grid gap-4">
        {skills.map((skill) => (
          <Link
            key={skill.skill_id}
            href={`/skills/${skill.skill_id}`}
            className="rounded-xl border border-border p-5 transition hover:border-accent"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-medium">{skill.name}</h2>
                <p className="mt-1 text-sm text-muted">{skill.description}</p>
              </div>
              <div className="text-right text-sm">
                <div>${skill.price}</div>
                <div className="text-muted">{skill.evaluation_type}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
