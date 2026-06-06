import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { EvaluationJob, License, SkillListing, SkillMetadata } from "@skillvault/shared";

import { buildMinimalZipFromSkillMd, parseSkillZip } from "./skill-package.js";
import { skillStorage } from "./skill-storage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");

export interface StoredSkill extends SkillListing {
  /** @deprecated Legacy plaintext; new uploads use storage_ref only */
  skill_content?: string;
}

export class MarketplaceStore {
  private skills = new Map<string, StoredSkill>();
  private jobs = new Map<string, EvaluationJob>();
  private buyerBalances = new Map<string, number>();
  private sellerBalances = new Map<string, number>();
  private reservations = new Map<string, number>();
  private licenses = new Map<string, License>();

  constructor() {
    this.buyerBalances.set("buyer_demo", 100);
    this.sellerBalances.set("seller_demo", 0);
    this.seedDefaultSkill();
  }

  listSkills(): SkillListing[] {
    return [...this.skills.values()]
      .filter((skill) => skill.status === "published")
      .map(({ skill_content: _content, ...listing }) => listing);
  }

  getSkill(skillId: string): StoredSkill | undefined {
    return this.skills.get(skillId);
  }

  loadSkillPackageBytes(skill: StoredSkill): Buffer {
    if (skill.storage_ref) {
      return skillStorage.load(skill.storage_ref);
    }
    if (skill.skill_content) {
      return buildMinimalZipFromSkillMd(skill.skill_content, {
        name: skill.name,
        version: "0.1.0",
        category: skill.category,
        evaluation_type: skill.evaluation_type,
        description: skill.description,
      });
    }
    throw new Error("Skill package not available");
  }

  getBalance(buyerId: string): number {
    return this.buyerBalances.get(buyerId) ?? 0;
  }

  getSellerBalance(sellerId: string): number {
    return this.sellerBalances.get(sellerId) ?? 0;
  }

  deposit(buyerId: string, amount: number): number {
    const next = this.getBalance(buyerId) + amount;
    this.buyerBalances.set(buyerId, next);
    return next;
  }

  deductBuyer(buyerId: string, amount: number): number {
    const current = this.getBalance(buyerId);
    if (current < amount) {
      throw new Error("Insufficient buyer balance for settlement");
    }
    const next = current - amount;
    this.buyerBalances.set(buyerId, next);
    return next;
  }

  creditSeller(sellerId: string, amount: number): number {
    const next = this.getSellerBalance(sellerId) + amount;
    this.sellerBalances.set(sellerId, next);
    return next;
  }

  reserveFunds(buyerId: string, jobId: string, amount: number): void {
    if (!this.canAfford(buyerId, amount)) {
      throw new Error("Insufficient balance");
    }
    this.reservations.set(jobId, amount);
  }

  getReservation(jobId: string): number | undefined {
    return this.reservations.get(jobId);
  }

  canAfford(buyerId: string, amount: number): boolean {
    return this.getBalance(buyerId) - this.getReservedTotal(buyerId) >= amount;
  }

  releaseReservation(jobId: string): void {
    this.reservations.delete(jobId);
  }

  issueLicense(input: {
    buyer_id: string;
    skill_id: string;
    job_id: string;
    receipt_id: string;
  }): License {
    const license: License = {
      license_id: `lic_${randomUUID().slice(0, 8)}`,
      buyer_id: input.buyer_id,
      skill_id: input.skill_id,
      job_id: input.job_id,
      receipt_id: input.receipt_id,
      issued_at: new Date().toISOString(),
    };
    this.licenses.set(license.license_id, license);
    return license;
  }

  getLicense(licenseId: string): License | undefined {
    return this.licenses.get(licenseId);
  }

  listLicensesForBuyer(buyerId: string): License[] {
    return [...this.licenses.values()].filter((license) => license.buyer_id === buyerId);
  }

  createSkillFromZip(input: {
    seller_id: string;
    package_bytes: Buffer;
    metadata: SkillMetadata;
    skill_hash: string;
    harness_runtime: string;
    price: number;
    publish?: boolean;
    inference_profile?: "standard" | "premium";
    skill_id?: string;
  }): StoredSkill {
    const storageRef = skillStorage.store(input.package_bytes);
    const skillId = input.skill_id ?? input.metadata.name.toLowerCase().replace(/\s+/g, "-");
    const listing: StoredSkill = {
      skill_id: skillId,
      seller_id: input.seller_id,
      name: input.metadata.name,
      description: input.metadata.description,
      category: input.metadata.category,
      evaluation_type: input.metadata.evaluation_type,
      price: input.price,
      status: input.publish ? "published" : "draft",
      skill_hash: input.skill_hash,
      storage_ref: storageRef,
      package_format_version: "skillvault-1",
      harness_runtime: input.harness_runtime,
      inference_profile: input.inference_profile ?? "standard",
    };
    this.skills.set(skillId, listing);
    if (!this.sellerBalances.has(input.seller_id)) {
      this.sellerBalances.set(input.seller_id, 0);
    }
    return listing;
  }

  /** @deprecated Legacy text upload — wraps into zip internally */
  createSkill(input: {
    seller_id: string;
    skill_content: string;
    metadata: SkillMetadata;
    price: number;
    publish?: boolean;
  }): StoredSkill {
    const zip = buildMinimalZipFromSkillMd(input.skill_content, input.metadata);
    const skillHash = `sha256:${createHash("sha256").update(zip).digest("hex")}`;
    return this.createSkillFromZip({
      seller_id: input.seller_id,
      package_bytes: zip,
      metadata: input.metadata,
      skill_hash: skillHash,
      harness_runtime: "builtin",
      price: input.price,
      publish: input.publish,
    });
  }

  createJob(input: {
    skill_id: string;
    buyer_id: string;
    threshold: number;
  }): EvaluationJob {
    const now = new Date().toISOString();
    const job: EvaluationJob = {
      job_id: `job_${randomUUID().slice(0, 8)}`,
      skill_id: input.skill_id,
      buyer_id: input.buyer_id,
      threshold: input.threshold,
      status: "created",
      settlement_status: "pending",
      created_at: now,
      updated_at: now,
    };
    this.jobs.set(job.job_id, job);
    return job;
  }

  updateJob(jobId: string, patch: Partial<EvaluationJob>): EvaluationJob {
    const current = this.jobs.get(jobId);
    if (!current) {
      throw new Error("Job not found");
    }
    const updated = { ...current, ...patch, updated_at: new Date().toISOString() };
    this.jobs.set(jobId, updated);
    return updated;
  }

  getJob(jobId: string): EvaluationJob | undefined {
    return this.jobs.get(jobId);
  }

  private getReservedTotal(buyerId: string): number {
    let total = 0;
    for (const job of this.jobs.values()) {
      if (job.buyer_id === buyerId && job.status !== "completed" && job.status !== "failed") {
        total += this.reservations.get(job.job_id) ?? 0;
      }
    }
    return total;
  }

  private seedDefaultSkill(): void {
    const skillDir = join(REPO_ROOT, "skills/discreet-meeting-notes");
    const skillContent = readFileSync(join(skillDir, "SKILL.md"), "utf-8");
    const metadata = JSON.parse(readFileSync(join(skillDir, "metadata.json"), "utf-8")) as SkillMetadata;
    this.createSkill({
      seller_id: "seller_demo",
      skill_content: skillContent,
      metadata,
      price: 25,
      publish: true,
    });
    this.seedAriJuelsSkill();
  }

  private seedAriJuelsSkill(): void {
    const zipPath = join(REPO_ROOT, "ari-portable-skill.zip");
    try {
      const packageBytes = readFileSync(zipPath);
      const parsed = parseSkillZip(packageBytes, {
        name: "Ari Juels",
        version: "1.0.0",
        category: "Data",
        evaluation_type: "agent",
        description:
          "Professor-style research agent with private paper corpus, ideation, analysis, and PPTX slide generation.",
      });
      this.createSkillFromZip({
        seller_id: "seller_demo",
        package_bytes: packageBytes,
        metadata: parsed.metadata,
        skill_hash: parsed.treeHash,
        harness_runtime: parsed.harnessRuntime,
        price: 45,
        publish: true,
        skill_id: "ari-juels",
        inference_profile: "premium",
      });
    } catch {
      // Ari zip optional in minimal checkouts
    }
  }
}

export const store = new MarketplaceStore();
