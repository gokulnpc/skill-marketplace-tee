import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

export function deriveStorageKey(secret: string): Buffer {
  return createHash("sha256").update(`skillvault-storage:${secret}`).digest();
}

export function encryptAtRest(key: Buffer, plaintext: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  return Buffer.concat([nonce, encrypted]);
}

export function decryptAtRest(key: Buffer, blob: Buffer): Buffer {
  const nonce = blob.subarray(0, 12);
  const payload = blob.subarray(12);
  const authTag = payload.subarray(payload.length - 16);
  const ciphertext = payload.subarray(0, payload.length - 16);
  const decipher = createDecipheriv(ALGO, key, nonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
