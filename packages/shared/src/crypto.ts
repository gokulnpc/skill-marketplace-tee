import { createCipheriv, createDecipheriv, privateDecrypt, publicEncrypt, randomBytes } from "node:crypto";

import type { EncryptedEnvelope } from "./types.js";

const RSA_PADDING = 4; // RSA_PKCS1_OAEP_PADDING
const OAEP_HASH = "sha256";

export function encryptEnvelope(publicKeyPem: string, plaintext: Buffer | string): EncryptedEnvelope {
  const data = typeof plaintext === "string" ? Buffer.from(plaintext, "utf-8") : plaintext;
  const aesKey = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, nonce);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);

  const encryptedKey = publicEncrypt(
    {
      key: publicKeyPem,
      padding: RSA_PADDING,
      oaepHash: OAEP_HASH,
    },
    aesKey,
  );

  return {
    ciphertext: encrypted.toString("base64"),
    encrypted_key: encryptedKey.toString("base64"),
    nonce: nonce.toString("base64"),
  };
}

export function decryptEnvelope(privateKeyPem: string, envelope: EncryptedEnvelope): Buffer {
  const aesKey = privateDecrypt(
    {
      key: privateKeyPem,
      padding: RSA_PADDING,
      oaepHash: OAEP_HASH,
    },
    Buffer.from(envelope.encrypted_key, "base64"),
  );

  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  const nonce = Buffer.from(envelope.nonce, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", aesKey, nonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
