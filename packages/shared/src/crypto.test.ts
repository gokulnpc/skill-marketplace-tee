import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decryptEnvelope, encryptEnvelope } from "./crypto.js";

describe("encryptEnvelope", () => {
  it("roundtrips with RSA keypair", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const envelope = encryptEnvelope(publicKey, "hello dataset");
    const plaintext = decryptEnvelope(privateKey, envelope);
    expect(plaintext.toString("utf-8")).toBe("hello dataset");
  });
});
