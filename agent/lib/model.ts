import { createDecipheriv } from "node:crypto";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { and, eq } from "drizzle-orm";
import type { DynamicResolveContext } from "eve";
import { experimental_chatgpt } from "eve/models/openai";

import { aiCredential, scan, scanJob } from "../../src/db/schema";
import { env } from "../../src/env";
import { agentDb } from "./database";
import { getScanId } from "./session";

const AUTH_CONTEXT = "auto-sec:ai-credential:v1";

function decryptApiKey(input: {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
}) {
  if (input.version !== 1) {
    throw new Error(`Unsupported credential encryption version: ${input.version}`);
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, "base64"),
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(AUTH_CONTEXT));
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function resolveScanModel(ctx: DynamicResolveContext) {
  const scanId = getScanId(ctx);
  const [configuration] = await agentDb
    .select({
      provider: scan.provider,
      model: scan.model,
      userId: scan.userId,
      credentialId: scan.credentialId,
      encryptedApiKey: aiCredential.encryptedApiKey,
      encryptionIv: aiCredential.encryptionIv,
      encryptionAuthTag: aiCredential.encryptionAuthTag,
      encryptionVersion: aiCredential.encryptionVersion,
    })
    .from(scan)
    .leftJoin(
      aiCredential,
      and(eq(scan.credentialId, aiCredential.id), eq(scan.userId, aiCredential.userId)),
    )
    .where(eq(scan.id, scanId))
    .limit(1);

  if (!configuration) {
    throw new Error("The scan configuration was not found.");
  }

  const now = new Date();
  await agentDb.transaction(async (tx) => {
    await tx
      .update(scan)
      .set({ status: "running", startedAt: now, updatedAt: now })
      .where(and(eq(scan.id, scanId), eq(scan.status, "pending")));
    await tx
      .update(scanJob)
      .set({ status: "running", eveSessionId: ctx.session.id, startedAt: now, updatedAt: now })
      .where(and(eq(scanJob.scanId, scanId), eq(scanJob.status, "queued")));
  });

  if (process.env.NODE_ENV !== "production") {
    return {
      model: experimental_chatgpt("gpt-5.6-sol"),
      modelContextWindowTokens: 200_000,
    };
  }

  if (
    !configuration.credentialId ||
    !configuration.encryptedApiKey ||
    !configuration.encryptionIv ||
    !configuration.encryptionAuthTag ||
    configuration.encryptionVersion === null
  ) {
    throw new Error("The scan has no usable AI credential.");
  }

  const apiKey = decryptApiKey({
    ciphertext: configuration.encryptedApiKey,
    iv: configuration.encryptionIv,
    authTag: configuration.encryptionAuthTag,
    version: configuration.encryptionVersion,
  });

  if (configuration.provider === "anthropic") {
    return createAnthropic({ apiKey })(configuration.model);
  }

  if (configuration.provider === "openrouter") {
    return createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      name: "openrouter",
      headers: {
        "HTTP-Referer": env.BETTER_AUTH_URL,
        "X-Title": "Auto Sec",
      },
    }).chat(configuration.model);
  }

  return createOpenAI({ apiKey })(configuration.model);
}
