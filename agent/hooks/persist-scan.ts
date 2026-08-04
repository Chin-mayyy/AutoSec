import { and, eq, inArray } from "drizzle-orm";
import { defineHook } from "eve/hooks";

import { scan, scanJob } from "../../src/db/schema";
import { auditReportSchema } from "../../src/lib/ai/report";
import { agentDb } from "../lib/database";
import { getScanId } from "../lib/session";

async function failScan(scanId: string, message: string) {
  const now = new Date();
  await agentDb.transaction(async (tx) => {
    await tx
      .update(scan)
      .set({ status: "failed", failureReason: message, completedAt: now, updatedAt: now })
      .where(and(eq(scan.id, scanId), inArray(scan.status, ["pending", "running"])));
    await tx
      .update(scanJob)
      .set({ status: "failed", error: message, completedAt: now, updatedAt: now })
      .where(and(eq(scanJob.scanId, scanId), inArray(scanJob.status, ["queued", "running"])));
  });
}

export default defineHook({
  events: {
    async "result.completed"(event, ctx) {
      const scanId = getScanId(ctx);
      const report = auditReportSchema.parse(event.data.result);
      const [scanRecord] = await agentDb
        .select({
          repositoryFullName: scan.repositoryFullName,
          commitSha: scan.commitSha,
          target: scan.target,
        })
        .from(scan)
        .where(eq(scan.id, scanId))
        .limit(1);

      if (!scanRecord?.commitSha) {
        throw new Error("Could not associate the Eve result with a scan.");
      }

      const normalizedReport = {
        ...report,
        repository: {
          fullName: scanRecord.repositoryFullName,
          commitSha: scanRecord.commitSha,
          target: scanRecord.target,
        },
      };

      const now = new Date();
      await agentDb.transaction(async (tx) => {
        await tx
          .update(scan)
          .set({ report: normalizedReport, status: "completed", completedAt: now, updatedAt: now })
          .where(and(eq(scan.id, scanId), eq(scan.status, "running")));
        await tx
          .update(scanJob)
          .set({ status: "completed", completedAt: now, updatedAt: now })
          .where(and(eq(scanJob.scanId, scanId), eq(scanJob.status, "running")));
      });
    },
    async "input.requested"(event, ctx) {
      const prompts = event.data.requests.map((request) => request.prompt).join(" ");
      await failScan(
        getScanId(ctx),
        `The unattended audit requested interactive input and could not continue. ${prompts}`,
      );
    },
    async "session.failed"(event, ctx) {
      await failScan(getScanId(ctx), event.data.message);
    },
  },
});
