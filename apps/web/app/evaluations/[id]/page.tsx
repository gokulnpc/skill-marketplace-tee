import Link from "next/link";
import { notFound } from "next/navigation";

import { EvaluationScorecard } from "@/components/scorecard/EvaluationScorecard";
import { fetchEvaluation } from "@/lib/api";

export default async function EvaluationScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const job = await fetchEvaluation(id);
    const evaluation = job.evaluation as
      | {
          baseline_score: number;
          skill_score: number;
          uplift: number;
          passed: boolean;
          samples?: Array<{
            transcript_id: string;
            approved_output?: string | null;
            leakage_reasons?: string[];
          }>;
        }
      | undefined;
    const receipt = job.receipt as
      | (Record<string, unknown> & {
          receipt_id: string;
          runner_hash: string;
          verifier_hash: string;
          model_hash: string;
        })
      | undefined;
    const attestation = job.attestation as Record<string, string> | undefined;

    if (!evaluation || !receipt) {
      return (
        <div>
          <h1 className="text-2xl font-semibold">Evaluation {job.job_id}</h1>
          <p className="mt-2 text-muted">Status: {job.status}</p>
          {job.error ? <p className="mt-2 text-red-400">{job.error}</p> : null}
        </div>
      );
    }

    return (
      <EvaluationScorecard
        job={job}
        view={{
          baselineScore: evaluation.baseline_score,
          skillScore: evaluation.skill_score,
          uplift: evaluation.uplift,
          passed: evaluation.passed,
          samples: evaluation.samples ?? [],
          receipt,
          attestation,
        }}
      />
    );
  } catch {
    notFound();
  }
}
