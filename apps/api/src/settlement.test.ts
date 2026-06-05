import { describe, expect, it } from "vitest";

import { settleEvaluationJob, verifyReceipt } from "./settlement.js";
import { MarketplaceStore } from "./store.js";

describe("settlement", () => {
  it("charges buyer and credits seller on pass", () => {
    const store = new MarketplaceStore();
    const skill = store.getSkill("discreet-meeting-notes");
    expect(skill).toBeDefined();

    store.deposit("buyer_settle", 100);
    const job = store.createJob({
      skill_id: "discreet-meeting-notes",
      buyer_id: "buyer_settle",
      threshold: 0.85,
    });
    store.reserveFunds("buyer_settle", job.job_id, skill!.price);

    const evaluation = { passed: true, skill_score: 0.9 };
    const receipt = {
      receipt_id: "rcpt_test123",
      skill_id: skill!.skill_id,
      skill_hash: skill!.skill_hash,
      passed: true,
      skill_score: 0.9,
      threshold: 0.85,
      signature: "sig_test",
    };

    const result = settleEvaluationJob(store, job.job_id, skill!, evaluation, receipt, 0.85);
    expect(result.payment_status).toBe("charged");
    expect(result.license_id).toBeDefined();
    expect(store.getBalance("buyer_settle")).toBe(75);
    expect(store.getSellerBalance("seller_demo")).toBe(25);
  });

  it("does not charge buyer on fail", () => {
    const store = new MarketplaceStore();
    const skill = store.getSkill("discreet-meeting-notes")!;
    store.deposit("buyer_fail", 100);
    const job = store.createJob({
      skill_id: "discreet-meeting-notes",
      buyer_id: "buyer_fail",
      threshold: 0.85,
    });
    store.reserveFunds("buyer_fail", job.job_id, skill.price);

    const evaluation = { passed: false, skill_score: 0.7 };
    const receipt = {
      receipt_id: "rcpt_fail123",
      skill_id: skill.skill_id,
      skill_hash: skill.skill_hash,
      passed: false,
      skill_score: 0.7,
      threshold: 0.85,
      signature: "sig_test",
    };

    const result = settleEvaluationJob(store, job.job_id, skill, evaluation, receipt, 0.85);
    expect(result.payment_status).toBe("not_charged");
    expect(result.license_id).toBeUndefined();
    expect(store.getBalance("buyer_fail")).toBe(100);
    expect(store.getSellerBalance("seller_demo")).toBe(0);
  });

  it("rejects invalid receipt", () => {
    const store = new MarketplaceStore();
    const skill = store.getSkill("discreet-meeting-notes")!;
    const errors = verifyReceipt(
      skill,
      { passed: true, skill_score: 0.9 },
      {
        receipt_id: "rcpt_bad",
        skill_id: skill.skill_id,
        skill_hash: "sha256:wrong",
        passed: true,
        skill_score: 0.9,
        threshold: 0.85,
        signature: "sig",
      },
      0.85,
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
