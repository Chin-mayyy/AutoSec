import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/env";

const ENCRYPTION_VERSION = 1;
const AUTH_CONTEXT = "auto-sec:ai-credential:v1";

export type EncryptedCredential = {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
};

function getEncryptionKey() {
  return Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, "base64");
}

export function encryptCredential(apiKey: string): EncryptedCredential {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(AUTH_CONTEXT));

  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    version: ENCRYPTION_VERSION,
  };
}

export function decryptCredential(payload: EncryptedCredential) {
  if (payload.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported credential encryption version: ${payload.version}`);
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(AUTH_CONTEXT));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
