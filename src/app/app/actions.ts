"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { upsertAiCredential } from "@/lib/ai/credentials";
import { createAndStartScan } from "@/lib/ai/scans";
import { auth } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const credentialInput = z.object({
  provider: z.enum(["openai", "anthropic", "openrouter"]),
  apiKey: z.string().min(1, "Enter an API key."),
});

const scanInput = z.object({
  repositoryId: z.string().min(1),
  credentialId: z.string(),
  model: z.string().min(1),
  target: z.enum(["general", "evm", "solana"]),
});

export async function saveCredentialAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) return { error: "Sign in to save a provider key." };

    const input = credentialInput.parse(Object.fromEntries(formData));
    await upsertAiCredential({ userId: session.user.id, ...input });
    revalidatePath("/app");
    return { success: `${input.provider} key saved.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save the key." };
  }
}

export async function startScanAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) return { error: "Sign in to start a scan." };

    const input = scanInput.parse(Object.fromEntries(formData));
    await createAndStartScan({ headers: requestHeaders, userId: session.user.id, ...input });
    revalidatePath("/app");
    return { success: "Full repository scan started." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to start the scan." };
  }
}
