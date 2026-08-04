import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray } from "drizzle-orm";
import { Client } from "eve/client";

import { db } from "@/db";
import { aiCredential, scan, scanJob, type ScanTarget } from "@/db/schema";
import { env } from "@/env";
import { isSupportedModel } from "@/lib/ai/models";
import { auditReportSchema } from "@/lib/ai/report";
import { getGithubRepositories, getGithubUserOctokit } from "@/lib/github";

const MAX_REPOSITORY_SIZE_KB = 250 * 1024;

export async function createAndStartScan(input: {
  headers: Headers;
  userId: string;
  repositoryId: string;
  credentialId: string;
  model: string;
  target: ScanTarget;
}) {
  const isLocalDevelopment = process.env.NODE_ENV !== "production";
  const [savedCredential] = isLocalDevelopment
    ? []
    : await db
        .select({ id: aiCredential.id, provider: aiCredential.provider })
        .from(aiCredential)
        .where(
          and(eq(aiCredential.id, input.credentialId), eq(aiCredential.userId, input.userId)),
        )
        .limit(1);
  const credential = isLocalDevelopment
    ? { id: null, provider: "openai" as const }
    : savedCredential;
  const model = isLocalDevelopment ? "gpt-5.6-sol" : input.model;

  if (!credential || (!isLocalDevelopment && !isSupportedModel(credential.provider, model))) {
    throw new Error("Select a valid saved provider and model.");
  }

  const { repositories } = await getGithubRepositories(input.headers);
  const repository = repositories.find((candidate) => String(candidate.id) === input.repositoryId);

  if (!repository || repository.isArchived) {
    throw new Error("This repository is not available for scanning.");
  }
  if (repository.sizeKb > MAX_REPOSITORY_SIZE_KB) {
    throw new Error("Repositories larger than 250 MB are not supported.");
  }

  const [activeScan] = await db
    .select({ id: scan.id })
    .from(scan)
    .where(and(eq(scan.userId, input.userId), inArray(scan.status, ["pending", "running"])))
    .limit(1);
  if (activeScan) {
    throw new Error("Wait for your active scan to finish before starting another.");
  }

  const octokit = await getGithubUserOctokit(input.headers);
  if (!octokit) throw new Error("Unauthorized");

  const [owner, repo] = repository.fullName.split("/");
  if (!owner || !repo) throw new Error("Invalid repository name.");

  const { data: commit } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: repository.defaultBranch,
  });
  const scanId = randomUUID();
  const jobId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(scan).values({
      id: scanId,
      userId: input.userId,
      credentialId: credential.id,
      repositoryId: input.repositoryId,
      repositoryFullName: repository.fullName,
      installationId: String(repository.installationId),
      commitSha: commit.sha,
      target: input.target,
      provider: credential.provider,
      model,
    });
    await tx.insert(scanJob).values({ id: jobId, scanId });
  });

  try {
    const client = new Client({
      host: env.BETTER_AUTH_URL,
      auth: { bearer: env.EVE_INTERNAL_SECRET },
      headers: {
        "x-auto-sec-scan-id": scanId,
        "x-auto-sec-user-id": input.userId,
      },
      redirect: "error",
    });
    await client.session().send({
      message: `Audit ${repository.fullName} at commit ${commit.sha}. The declared target is ${input.target}. The repository is available at /workspace/repository. Perform the complete read-only audit procedure and return the structured report.`,
      outputSchema: auditReportSchema,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start the scan agent.";
    const now = new Date();
    const submissionFailed = await db.transaction(async (tx) => {
      const failedScans = await tx
        .update(scan)
        .set({ status: "failed", failureReason: message, completedAt: now, updatedAt: now })
        .where(and(eq(scan.id, scanId), eq(scan.status, "pending")))
        .returning({ id: scan.id });
      if (failedScans.length > 0) {
        await tx
          .update(scanJob)
          .set({ status: "failed", error: message, completedAt: now, updatedAt: now })
          .where(and(eq(scanJob.id, jobId), eq(scanJob.status, "queued")));
      }
      return failedScans.length > 0;
    });
    if (submissionFailed) throw error;
  }

  return scanId;
}

export async function getUserScans(userId: string) {
  return db
    .select({
      id: scan.id,
      repositoryFullName: scan.repositoryFullName,
      commitSha: scan.commitSha,
      target: scan.target,
      status: scan.status,
      provider: scan.provider,
      model: scan.model,
      report: scan.report,
      failureReason: scan.failureReason,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt,
    })
    .from(scan)
    .where(eq(scan.userId, userId))
    .orderBy(desc(scan.createdAt))
    .limit(20);
}
