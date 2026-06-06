import Link from "next/link";

import { AuditReceiptViewer } from "@/components/scorecard/AuditReceiptViewer";
import { PaymentLicenseCard } from "@/components/scorecard/PaymentLicenseCard";
import { ScorePanel } from "@/components/scorecard/ScorePanel";
import { TeeProofCard } from "@/components/scorecard/TeeProofCard";
import { Badge } from "@/components/ui/Badge";
import type { EvaluationJob } from "@/lib/api";

interface EvaluationViewModel {
  baselineScore: number;
  skillScore: number;
  uplift: number;
  passed: boolean;
  samples: Array<{
    transcript_id: string;
    approved_output?: string | null;
    leakage_reasons?: string[];
  }>;
  receipt: Record<string, unknown> & {
    receipt_id: string;
    runner_hash: string;
    verifier_hash: string;
    model_hash: string;
    attestation_ref?: string;
  };
  attestation?: Record<string, string>;
}

export function EvaluationScorecard({
  job,
  view,
}: {
  job: EvaluationJob;
  view: EvaluationViewModel;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="text-sm text-muted">
          ← Back to marketplace
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">Evaluation Scorecard</h1>
          <Badge variant={view.passed ? "pass" : "fail"}>{view.passed ? "PASS" : "FAIL"}</Badge>
        </div>
        <p className="text-sm text-muted">
          Job {job.job_id} · Skill {job.skill_id} · Buyer {job.buyer_id}
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <ScorePanel
          baselineScore={view.baselineScore}
          skillScore={view.skillScore}
          uplift={view.uplift}
          threshold={job.threshold}
          passed={view.passed}
        />
        <TeeProofCard
          proof={{
            sessionId: job.tee_session_id,
            attestationQuote: view.attestation?.attestation_quote,
            attestationTimestamp: view.attestation?.timestamp,
            runnerHash: view.attestation?.runner_hash ?? view.receipt.runner_hash,
            verifierHash: view.receipt.verifier_hash,
            modelHash: view.receipt.model_hash,
            receiptId: view.receipt.receipt_id,
            attestationRef: view.receipt.attestation_ref,
            mode: view.attestation?.mode,
          }}
        />
        <PaymentLicenseCard
          passed={view.passed}
          paymentStatus={job.payment_status}
          settlementStatus={job.settlement_status}
          licenseId={job.license_id}
          settlement={job.settlement}
        />
      </section>

      <section className="rounded-xl border border-border p-5">
        <h2 className="font-medium">Approved sample outputs</h2>
        <p className="mt-1 text-sm text-muted">Only leakage-guard-approved outputs are shown</p>
        <div className="mt-4 flex flex-col gap-4">
          {view.samples.map((sample) => (
            <div key={sample.transcript_id}>
              <p className="text-sm text-muted">{sample.transcript_id}</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-black/30 p-3 text-xs">
                {sample.approved_output ??
                  (sample.leakage_reasons?.length
                    ? `Blocked: ${sample.leakage_reasons.join(", ")}`
                    : "Blocked by leakage guard")}
              </pre>
            </div>
          ))}
        </div>
      </section>

      <AuditReceiptViewer jobId={job.job_id} receipt={view.receipt} />
    </div>
  );
}
