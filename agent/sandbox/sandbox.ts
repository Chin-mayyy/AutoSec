import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { and, eq } from "drizzle-orm";
import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

import { scan, scanJob } from "../../src/db/schema";
import { env } from "../../src/env";
import { agentDb } from "../lib/database";

const TOOLCHAIN_VERSION = "security-tools-v3";

export default defineSandbox({
  backend: vercel({ resources: { vcpus: 2 } }),
  revalidationKey: () => TOOLCHAIN_VERSION,
  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({
      command: `set -u
python3 -m venv /opt/auto-sec-tools
/opt/auto-sec-tools/bin/pip install --disable-pip-version-check semgrep==1.170.1
/opt/auto-sec-tools/bin/pip install --disable-pip-version-check slither-analyzer || true
ln -sf /opt/auto-sec-tools/bin/semgrep /usr/local/bin/semgrep
ln -sf /opt/auto-sec-tools/bin/slither /usr/local/bin/slither
git clone --depth 1 https://github.com/semgrep/semgrep-rules.git /opt/semgrep-rules || true
curl -fsSL https://github.com/gitleaks/gitleaks/releases/download/v8.28.0/gitleaks_8.28.0_linux_x64.tar.gz -o /tmp/gitleaks.tar.gz && tar -xzf /tmp/gitleaks.tar.gz -C /usr/local/bin gitleaks || true`,
    });
  },
  async onSession({ use, ctx }) {
    const scanId = ctx.session.auth.initiator?.attributes.scanId;
    const userId = ctx.session.auth.initiator?.principalId;

    if (typeof scanId !== "string" || !userId) {
      throw new Error("Missing authenticated scan context.");
    }

    const [scanRecord] = await agentDb
      .select({
        installationId: scan.installationId,
        repositoryFullName: scan.repositoryFullName,
        commitSha: scan.commitSha,
      })
      .from(scan)
      .where(and(eq(scan.id, scanId), eq(scan.userId, userId)))
      .limit(1);

    if (!scanRecord?.commitSha) {
      throw new Error("The requested scan or commit was not found.");
    }

    const [owner, repository] = scanRecord.repositoryFullName.split("/");
    if (!owner || !repository) {
      throw new Error("Invalid repository name.");
    }

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
        installationId: Number(scanRecord.installationId),
      },
      userAgent: "auto-sec-agent",
    });
    const archiveResponse = await octokit.rest.repos.downloadTarballArchive({
      owner,
      repo: repository,
      ref: scanRecord.commitSha,
    });
    const archive = archiveResponse.data as unknown as ArrayBuffer;
    const sandbox = await use({ networkPolicy: "deny-all" });

    await sandbox.writeBinaryFile({
      path: "repository.tar.gz",
      content: new Uint8Array(archive),
    });
    const extraction = await sandbox.run({
      command:
        "rm -rf /workspace/repository && mkdir -p /workspace/repository && tar -xzf /workspace/repository.tar.gz --strip-components=1 -C /workspace/repository && rm /workspace/repository.tar.gz",
    });
    if (extraction.exitCode !== 0) {
      throw new Error(`Could not extract the repository archive: ${extraction.stderr}`);
    }

    await agentDb
      .update(scanJob)
      .set({ sandboxId: sandbox.id, eveSessionId: ctx.session.id, updatedAt: new Date() })
      .where(and(eq(scanJob.scanId, scanId), eq(scanJob.status, "running")));
  },
});
