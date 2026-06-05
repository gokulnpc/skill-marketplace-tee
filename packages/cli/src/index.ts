#!/usr/bin/env node
import { Command } from "commander";

import {
  encryptDataset,
  loadDataset,
  MarketplaceClient,
  verifyAttestation,
} from "./client.js";

const program = new Command();

program
  .name("skillvault")
  .description("SkillVault TEE buyer local connector")
  .version("0.1.0");

program
  .command("eval")
  .description("Evaluate a skill on a private local dataset")
  .requiredOption("--skill <skillId>", "Skill listing ID")
  .requiredOption("--dataset <path>", "Path to buyer evaluation dataset JSON")
  .requiredOption("--threshold <number>", "Minimum skill score to purchase", parseFloat)
  .option("--buyer <buyerId>", "Buyer account ID", "buyer_demo")
  .option("--api <url>", "Marketplace API base URL", "http://localhost:3001")
  .action(async (options) => {
    const client = new MarketplaceClient(options.api);
    const dataset = loadDataset(options.dataset);

    console.log(`Creating evaluation for skill '${options.skill}'...`);
    const job = await client.createEvaluation(options.skill, options.threshold, options.buyer);

    if (!job.attestation) {
      throw new Error("Job created without attestation bundle");
    }

    verifyAttestation(job.attestation);
    console.log(`Attestation verified. TEE session: ${job.tee_session_id}`);

    const publicKey = String(job.attestation.ephemeral_public_key);
    const envelope = encryptDataset(publicKey, dataset);

    console.log("Submitting encrypted dataset and running evaluation...");
    const completed = await client.submitDataset(job.job_id, envelope);

    if (completed.status !== "completed") {
      throw new Error(`Evaluation ended with status: ${completed.status} ${completed.error ?? ""}`);
    }

    const evaluation = completed.evaluation as {
      baseline_score: number;
      skill_score: number;
      uplift: number;
      passed: boolean;
      samples: Array<{ transcript_id: string; skill_score: number; approved_output?: string | null }>;
    };
    const receipt = completed.receipt as { receipt_id: string; passed: boolean; signature: string };

    console.log("\n=== Scorecard ===");
    console.log(`Baseline score: ${evaluation.baseline_score}`);
    console.log(`Skill score:    ${evaluation.skill_score}`);
    console.log(`Uplift:         ${evaluation.uplift}`);
    console.log(`Threshold:      ${options.threshold}`);
    console.log(`Result:         ${evaluation.passed ? "PASS" : "FAIL"}`);
    console.log(`Payment:        ${completed.payment_status === "charged" ? "Charged" : "Not charged"}`);
    if (completed.license_id) {
      console.log(`License:        ${completed.license_id}`);
    }
    console.log(`Receipt:        ${receipt.receipt_id}`);
    console.log(`Signature:      ${receipt.signature.slice(0, 32)}...`);
  });

program.parse();
