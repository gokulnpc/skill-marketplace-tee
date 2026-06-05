import { Badge } from "@/components/ui/Badge";
import { formatScore, formatUplift } from "./format";

export function ScorePanel({
  baselineScore,
  skillScore,
  uplift,
  threshold,
  passed,
}: {
  baselineScore: number;
  skillScore: number;
  uplift: number;
  threshold: number;
  passed: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-white/[0.03] to-transparent p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Scores</h2>
        <Badge variant={passed ? "pass" : "fail"}>{passed ? "PASS" : "FAIL"}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Baseline" value={formatScore(baselineScore)} />
        <Metric label="Skill score" value={formatScore(skillScore)} highlight />
        <Metric
          label="Uplift"
          value={formatUplift(uplift)}
          valueClass={uplift >= 0 ? "text-emerald-300" : "text-red-300"}
        />
      </div>

      <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Threshold</dt>
          <dd>{formatScore(threshold)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Commitment</dt>
          <dd>Buy if skill score ≥ threshold</dd>
        </div>
      </dl>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
  valueClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`rounded-lg border border-border p-3 ${highlight ? "bg-accent/5" : "bg-black/20"}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}
