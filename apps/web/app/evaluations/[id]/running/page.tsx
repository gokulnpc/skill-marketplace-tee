import { RunningScreen } from "@/components/screens/RunningScreen";

export default async function EvaluationRunningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RunningScreen jobId={id} />;
}
