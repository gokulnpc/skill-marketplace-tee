import { describe, expect, it } from "vitest";

import { MarketplaceStore } from "./store.js";

describe("MarketplaceStore", () => {
  it("tracks buyer balance and reservations", () => {
    const store = new MarketplaceStore();
    store.deposit("buyer_test", 50);
    expect(store.canAfford("buyer_test", 40)).toBe(true);
    expect(store.canAfford("buyer_test", 60)).toBe(false);

    const job = store.createJob({ skill_id: "x", buyer_id: "buyer_test", threshold: 0.8 });
    store.reserveFunds("buyer_test", job.job_id, 40);
    expect(store.canAfford("buyer_test", 20)).toBe(false);
    store.releaseReservation(job.job_id);
    expect(store.canAfford("buyer_test", 20)).toBe(true);
  });

  it("tracks seller balance and issues licenses", () => {
    const store = new MarketplaceStore();
    expect(store.getSellerBalance("seller_demo")).toBe(0);

    store.creditSeller("seller_demo", 25);
    expect(store.getSellerBalance("seller_demo")).toBe(25);

    const license = store.issueLicense({
      buyer_id: "buyer_demo",
      skill_id: "discreet-meeting-notes",
      job_id: "job_test",
      receipt_id: "rcpt_test",
    });
    expect(license.license_id).toMatch(/^lic_/);
    expect(store.getLicense(license.license_id)).toEqual(license);
    expect(store.listLicensesForBuyer("buyer_demo")).toContainEqual(license);
  });
});
