import { Badge } from "@/components/ui/Badge";

export function PaymentLicenseCard({
  passed,
  paymentStatus,
  settlementStatus,
  licenseId,
  settlement,
}: {
  passed: boolean;
  paymentStatus?: string;
  settlementStatus?: string;
  licenseId?: string;
  settlement?: {
    amount: number;
    buyer_balance: number;
    seller_balance: number;
  };
}) {
  const charged = paymentStatus === "charged";
  const licenseIssued = Boolean(licenseId);

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="font-medium">Payment & License</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={charged ? "pass" : "neutral"}>
          {charged ? "Charged" : "Not charged"}
        </Badge>
        <Badge variant={licenseIssued ? "accent" : "neutral"}>
          {licenseIssued ? "License issued" : "No license"}
        </Badge>
        {settlementStatus ? <Badge variant="neutral">{settlementStatus}</Badge> : null}
      </div>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Outcome</dt>
          <dd>{passed ? "Purchase completed" : "Evaluation failed — no charge"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">License</dt>
          <dd className="truncate font-mono text-xs">{licenseId ?? "Not issued"}</dd>
        </div>
        {settlement ? (
          <>
            <div className="flex justify-between">
              <dt className="text-muted">Amount</dt>
              <dd>${settlement.amount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Buyer balance</dt>
              <dd>${settlement.buyer_balance}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Seller balance</dt>
              <dd>${settlement.seller_balance}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  );
}
