import type { License, SettlementResult } from "@skillvault/shared";

import type { MarketplaceStore, StoredSkill } from "./store.js";

export interface TeeReceipt {
  receipt_id: string;
  skill_id: string;
  skill_hash: string;
  passed: boolean;
  skill_score: number;
  threshold: number;
  signature: string;
}

export interface TeeEvaluation {
  passed: boolean;
  skill_score: number;
}

export function verifyReceipt(
  skill: StoredSkill,
  evaluation: TeeEvaluation,
  receipt: TeeReceipt,
  jobThreshold: number,
): string[] {
  const errors: string[] = [];

  if (!receipt.signature) {
    errors.push("Receipt missing signature");
  }
  if (receipt.skill_id !== skill.skill_id) {
    errors.push("Receipt skill_id mismatch");
  }
  if (receipt.skill_hash !== skill.skill_hash) {
    errors.push("Receipt skill_hash mismatch");
  }
  if (receipt.passed !== evaluation.passed) {
    errors.push("Receipt passed flag does not match evaluation");
  }
  if (receipt.threshold !== jobThreshold) {
    errors.push("Receipt threshold mismatch");
  }
  if (receipt.passed && evaluation.skill_score < jobThreshold) {
    errors.push("Passed receipt but score below threshold");
  }

  return errors;
}

export function settleEvaluationJob(
  store: MarketplaceStore,
  jobId: string,
  skill: StoredSkill,
  evaluation: TeeEvaluation,
  receipt: TeeReceipt,
  jobThreshold: number,
): SettlementResult {
  const job = store.getJob(jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  if (job.settlement_status === "settled" || job.settlement_status === "not_charged") {
    const license = job.license_id ? store.getLicense(job.license_id) : undefined;
    return {
      job_id: jobId,
      passed: receipt.passed,
      payment_status: job.payment_status ?? "not_charged",
      license_id: license?.license_id,
      buyer_balance: store.getBalance(job.buyer_id),
      seller_balance: store.getSellerBalance(skill.seller_id),
      amount: skill.price,
    };
  }

  const errors = verifyReceipt(skill, evaluation, receipt, jobThreshold);
  if (errors.length > 0) {
    throw new Error(`Receipt verification failed: ${errors.join("; ")}`);
  }

  store.releaseReservation(jobId);

  let license: License | undefined;
  let paymentStatus: "charged" | "not_charged" = "not_charged";
  let settlementStatus: "settled" | "not_charged" = "not_charged";

  if (receipt.passed) {
    store.deductBuyer(job.buyer_id, skill.price);
    store.creditSeller(skill.seller_id, skill.price);
    license = store.issueLicense({
      buyer_id: job.buyer_id,
      skill_id: skill.skill_id,
      job_id: jobId,
      receipt_id: receipt.receipt_id,
    });
    paymentStatus = "charged";
    settlementStatus = "settled";
  } else {
    settlementStatus = "not_charged";
  }

  store.updateJob(jobId, {
    settlement_status: settlementStatus,
    payment_status: paymentStatus,
    license_id: license?.license_id,
  });

  return {
    job_id: jobId,
    passed: receipt.passed,
    payment_status: paymentStatus,
    license_id: license?.license_id,
    buyer_balance: store.getBalance(job.buyer_id),
    seller_balance: store.getSellerBalance(skill.seller_id),
    amount: skill.price,
  };
}
