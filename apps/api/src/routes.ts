import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { validateParsedZipPackage, validateSkillPackage } from "./skill-validator.js";
import { parseSkillZip } from "./skill-package.js";
import { settleEvaluationJob, type TeeEvaluation, type TeeReceipt } from "./settlement.js";
import { store } from "./store.js";
import { teeClient } from "./tee-client.js";

export const app = new Hono();

app.use("*", cors());

app.get("/health", (c) =>
  c.json({ status: "ok", service: "skillvault-api", tee_url: process.env.TEE_RUNNER_URL ?? "http://localhost:8080" }),
);

app.get("/v1/skills", (c) => c.json({ skills: store.listSkills() }));

app.get("/v1/skills/:skillId", (c) => {
  const skill = store.getSkill(c.req.param("skillId"));
  if (!skill || skill.status !== "published") {
    return c.json({ error: "Skill not found" }, 404);
  }
  const { skill_content: _content, ...listing } = skill;
  return c.json(listing);
});

app.post("/v1/skills/upload", async (c) => {
  const contentType = c.req.header("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.parseBody();
    const packageField = form.package;
    if (!(packageField instanceof File)) {
      return c.json({ error: "Missing package file" }, 400);
    }
    const metadataRaw = form.metadata;
    if (typeof metadataRaw !== "string") {
      return c.json({ error: "Missing metadata JSON" }, 400);
    }
    const sellerId = String(form.seller_id ?? "");
    const price = Number(form.price ?? 0);
    const publish = form.publish === "true" || form.publish === true;
    if (!sellerId || !Number.isFinite(price) || price <= 0) {
      return c.json({ error: "Invalid seller_id or price" }, 400);
    }

    const packageBytes = Buffer.from(await packageField.arrayBuffer());
    let parsed;
    try {
      parsed = parseSkillZip(packageBytes);
    } catch (error) {
      return c.json(
        { error: "Invalid skill package", detail: error instanceof Error ? error.message : "parse failed" },
        400,
      );
    }

    const listingMeta = JSON.parse(metadataRaw) as {
      name?: string;
      version?: string;
      category?: string;
      evaluation_type?: string;
      description?: string;
    };
    parsed.metadata = {
      ...parsed.metadata,
      ...listingMeta,
      name: listingMeta.name ?? parsed.metadata.name,
      description: listingMeta.description ?? parsed.metadata.description,
    };

    const errors = validateParsedZipPackage(parsed);
    if (errors.length > 0) {
      return c.json({ error: "Skill validation failed", reasons: errors }, 400);
    }

    const listing = store.createSkillFromZip({
      seller_id: sellerId,
      package_bytes: packageBytes,
      metadata: parsed.metadata,
      skill_hash: parsed.treeHash,
      harness_runtime: parsed.harnessRuntime,
      price,
      publish,
    });
    const { skill_content: _content, ...publicListing } = listing;
    return c.json(publicListing, 201);
  }

  const body = await c.req.json();
  const schema = z.object({
    seller_id: z.string().min(1),
    skill_content: z.string().min(1),
    metadata: z.object({
      name: z.string(),
      version: z.string(),
      category: z.string(),
      evaluation_type: z.string(),
      description: z.string(),
    }),
    price: z.number().positive(),
    publish: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid upload payload", details: parsed.error.flatten() }, 400);
  }

  const errors = validateSkillPackage(parsed.data.skill_content, parsed.data.metadata);
  if (errors.length > 0) {
    return c.json({ error: "Skill validation failed", reasons: errors }, 400);
  }

  const listing = store.createSkill(parsed.data);
  const { skill_content: _content, ...publicListing } = listing;
  return c.json(publicListing, 201);
});

app.get("/v1/buyers/:buyerId/balance", (c) =>
  c.json({ buyer_id: c.req.param("buyerId"), balance: store.getBalance(c.req.param("buyerId")) }),
);

app.get("/v1/sellers/:sellerId/balance", (c) =>
  c.json({
    seller_id: c.req.param("sellerId"),
    balance: store.getSellerBalance(c.req.param("sellerId")),
  }),
);

app.get("/v1/buyers/:buyerId/licenses", (c) =>
  c.json({ buyer_id: c.req.param("buyerId"), licenses: store.listLicensesForBuyer(c.req.param("buyerId")) }),
);

app.get("/v1/licenses/:licenseId", (c) => {
  const license = store.getLicense(c.req.param("licenseId"));
  if (!license) {
    return c.json({ error: "License not found" }, 404);
  }
  return c.json(license);
});

app.post("/v1/buyers/:buyerId/deposit", async (c) => {
  const body = await c.req.json();
  const amount = Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return c.json({ error: "Invalid deposit amount" }, 400);
  }
  const balance = store.deposit(c.req.param("buyerId"), amount);
  return c.json({ buyer_id: c.req.param("buyerId"), balance });
});

app.post("/v1/evaluations", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    skill_id: z.string().min(1),
    threshold: z.number().min(0).max(1),
    buyer_id: z.string().min(1),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid evaluation request" }, 400);
  }

  const skill = store.getSkill(parsed.data.skill_id);
  if (!skill || skill.status !== "published") {
    return c.json({ error: "Skill not available" }, 404);
  }

  if (!store.canAfford(parsed.data.buyer_id, skill.price)) {
    return c.json({ error: "Insufficient balance for evaluation" }, 402);
  }

  const job = store.createJob(parsed.data);
  try {
    store.reserveFunds(parsed.data.buyer_id, job.job_id, skill.price);
  } catch {
    store.updateJob(job.job_id, { status: "failed", error: "Insufficient balance" });
    return c.json({ error: "Insufficient balance for evaluation" }, 402);
  }

  try {
    const session = await teeClient.createSession(skill.skill_id, parsed.data.threshold);
    const attestation = await teeClient.getAttestation(session.session_id);
    const skillPackage = store.loadSkillPackageBytes(skill);
    const skillEnvelope = teeClient.encryptToSession(
      attestation.ephemeral_public_key,
      skillPackage,
    );
    await teeClient.submitSkill(session.session_id, skillEnvelope);

    const updated = store.updateJob(job.job_id, {
      status: "attestation_ready",
      tee_session_id: session.session_id,
      attestation,
    });
    return c.json(updated, 201);
  } catch (error) {
    store.releaseReservation(job.job_id);
    store.updateJob(job.job_id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Failed to provision TEE session",
    });
    return c.json({ error: "Failed to start TEE evaluation session" }, 502);
  }
});

app.get("/v1/evaluations/:jobId", (c) => {
  const job = store.getJob(c.req.param("jobId"));
  if (!job) {
    return c.json({ error: "Evaluation job not found" }, 404);
  }
  return c.json(job);
});

app.get("/v1/evaluations/:jobId/receipt/verify", async (c) => {
  const job = store.getJob(c.req.param("jobId"));
  if (!job?.tee_session_id) {
    return c.json({ error: "Receipt not available" }, 404);
  }

  try {
    const result = await teeClient.verifyReceipt(job.tee_session_id);
    return c.json(result);
  } catch (error) {
    return c.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      502,
    );
  }
});

app.get("/v1/evaluations/:jobId/artifacts/:name", async (c) => {
  const job = store.getJob(c.req.param("jobId"));
  if (!job?.tee_session_id) {
    return c.json({ error: "Artifact not available" }, 404);
  }
  const name = c.req.param("name");
  try {
    const data = await teeClient.fetchArtifact(job.tee_session_id, name);
    const media = name.endsWith(".pptx")
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/octet-stream";
    return new Response(data, {
      headers: {
        "Content-Type": media,
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch {
    return c.json({ error: "Artifact not found" }, 404);
  }
});

app.post("/v1/evaluations/:jobId/dataset", async (c) => {
  const job = store.getJob(c.req.param("jobId"));
  if (!job) {
    return c.json({ error: "Evaluation job not found" }, 404);
  }
  if (!job.tee_session_id) {
    return c.json({ error: "TEE session not ready" }, 409);
  }

  const envelopeSchema = z.object({
    ciphertext: z.string(),
    encrypted_key: z.string(),
    nonce: z.string(),
  });
  const body = await c.req.json();
  const parsed = envelopeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid encrypted dataset envelope" }, 400);
  }

  try {
    store.updateJob(job.job_id, { status: "dataset_received" });
    await teeClient.submitDataset(job.tee_session_id, parsed.data);
    store.updateJob(job.job_id, { status: "running" });

    await teeClient.runInference(job.tee_session_id);
    const evaluation = await teeClient.runEvaluation(job.tee_session_id);
    const receipt = await teeClient.finalize(job.tee_session_id);

    const skill = store.getSkill(job.skill_id);
    if (!skill) {
      throw new Error("Skill not found for settlement");
    }

    const settlement = settleEvaluationJob(
      store,
      job.job_id,
      skill,
      evaluation as TeeEvaluation,
      receipt as TeeReceipt,
      job.threshold,
    );

    const updated = store.updateJob(job.job_id, {
      status: "completed",
      evaluation,
      receipt,
      settlement_status: settlement.payment_status === "charged" ? "settled" : "not_charged",
      payment_status: settlement.payment_status,
      license_id: settlement.license_id,
    });
    return c.json({ ...updated, settlement });
  } catch (error) {
    store.releaseReservation(job.job_id);
    store.updateJob(job.job_id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Evaluation failed",
    });
    return c.json({ error: "Evaluation pipeline failed" }, 502);
  }
});
