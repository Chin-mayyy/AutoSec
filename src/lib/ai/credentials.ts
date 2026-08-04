import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { aiCredential, type AiProvider } from "@/db/schema";
import { decryptCredential, encryptCredential } from "@/lib/ai/credential-crypto";

export async function upsertAiCredential(input: {
  userId: string;
  provider: AiProvider;
  apiKey: string;
}) {
  if (input.apiKey.length === 0) {
    throw new Error("API key cannot be empty.");
  }

  const encrypted = encryptCredential(input.apiKey);
  const [credential] = await db
    .insert(aiCredential)
    .values({
      id: randomUUID(),
      userId: input.userId,
      provider: input.provider,
      encryptedApiKey: encrypted.ciphertext,
      encryptionIv: encrypted.iv,
      encryptionAuthTag: encrypted.authTag,
      encryptionVersion: encrypted.version,
    })
    .onConflictDoUpdate({
      target: [aiCredential.userId, aiCredential.provider],
      set: {
        encryptedApiKey: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionAuthTag: encrypted.authTag,
        encryptionVersion: encrypted.version,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: aiCredential.id,
      provider: aiCredential.provider,
      createdAt: aiCredential.createdAt,
      updatedAt: aiCredential.updatedAt,
    });

  return credential;
}

export async function listAiCredentials(userId: string) {
  return db
    .select({
      id: aiCredential.id,
      provider: aiCredential.provider,
      createdAt: aiCredential.createdAt,
      updatedAt: aiCredential.updatedAt,
    })
    .from(aiCredential)
    .where(eq(aiCredential.userId, userId));
}

export async function getAiCredentialApiKey(input: { userId: string; credentialId: string }) {
  const [credential] = await db
    .select({
      ciphertext: aiCredential.encryptedApiKey,
      iv: aiCredential.encryptionIv,
      authTag: aiCredential.encryptionAuthTag,
      version: aiCredential.encryptionVersion,
    })
    .from(aiCredential)
    .where(
      and(eq(aiCredential.id, input.credentialId), eq(aiCredential.userId, input.userId)),
    )
    .limit(1);

  if (!credential) {
    throw new Error("AI credential not found.");
  }

  return decryptCredential(credential);
}

export async function deleteAiCredential(input: { userId: string; credentialId: string }) {
  const [deleted] = await db
    .delete(aiCredential)
    .where(
      and(eq(aiCredential.id, input.credentialId), eq(aiCredential.userId, input.userId)),
    )
    .returning({ id: aiCredential.id });

  return deleted !== undefined;
}
