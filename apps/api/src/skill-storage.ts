import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decryptAtRest, deriveStorageKey, encryptAtRest } from "@skillvault/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORAGE_DIR = join(__dirname, "../data/skill-blobs");

export class SkillStorage {
  private readonly key: Buffer;
  private readonly baseDir: string;

  constructor(secret?: string, baseDir?: string) {
    const storageSecret = secret ?? process.env.SKILL_STORAGE_SECRET ?? "dev-storage-secret-change-me";
    this.key = deriveStorageKey(storageSecret);
    this.baseDir = baseDir ?? process.env.SKILL_STORAGE_DIR ?? DEFAULT_STORAGE_DIR;
    mkdirSync(this.baseDir, { recursive: true });
  }

  store(plaintext: Buffer): string {
    const ref = `blob_${randomUUID().slice(0, 12)}`;
    const encrypted = encryptAtRest(this.key, plaintext);
    writeFileSync(join(this.baseDir, `${ref}.bin`), encrypted);
    return ref;
  }

  load(ref: string): Buffer {
    const encrypted = readFileSync(join(this.baseDir, `${ref}.bin`));
    return decryptAtRest(this.key, encrypted);
  }

  hash(ref: string): string {
    const data = this.load(ref);
    return `sha256:${createHash("sha256").update(data).digest("hex")}`;
  }
}

export const skillStorage = new SkillStorage();
