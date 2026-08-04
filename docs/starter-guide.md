# Starter guide

This is the day-one workflow for an Auto Sec operator and contributor.

## Run your first audit

Before starting, complete the [setup guide](setup.md) and make sure the application, database, GitHub App, and agent build are configured.

1. Start the app with `pnpm dev` and open `http://localhost:3000`.
2. Select **Continue with GitHub** and authorize the GitHub App OAuth flow.
3. Select **Open app** after sign-in.
4. If the dashboard says no repositories are available, choose **Install GitHub App** or **Configure GitHub App**. Grant the App access to the repository you want to audit, then return to the dashboard.
5. Find the repository card. Choose the appropriate target:
   - **General repository** for ordinary application/codebase review.
   - **EVM / Solidity** for Solidity/EVM projects; this asks the agent to perform EVM-specific checks and use Slither when it can run safely.
   - **Solana** for Solana programs; this asks the agent to examine Solana-specific authorization and account-safety concerns.
6. In local development, select **Full scan**. The app uses your local Codex/ChatGPT setup and shows `ChatGPT · gpt-5.6-sol`.
7. In production, first save an API key in **AI provider**, choose the matching provider and model on the repository card, then select **Full scan**.
8. The audit appears in **Security reports** as queued or scanning. Leave the page open if convenient; it refreshes every five seconds while a scan is active.
9. When complete, read the risk rating and executive summary, then open each finding for impact, recommendation, and cited file/line evidence. Expand **Methodology and limitations** before making decisions from the report.

## How to interpret a report

Each completed report is validated against a fixed schema. It contains:

| Field | Meaning |
| --- | --- |
| Risk rating | Overall assessment: critical, high, medium, low, or informational. |
| Executive summary | Short explanation of the audit outcome. |
| Findings | Actionable issues with ID, severity, confidence, category, impact, evidence, recommendation, and references. |
| Evidence | Repository-relative file path, optional line range, and an optional redacted/short code snippet. |
| Methodology | Checks actually performed by the audit run. |
| Limitations | Missing tools, unanalyzed areas, or other reasons the result is incomplete. |
| Files reviewed | Count reported by the agent. |

Use a report as a review queue. Confirm the evidence against the pinned commit shown beside the report before filing an issue or changing code. A zero-finding report means no actionable findings were confirmed under that run’s limits; it does not prove the repository is secure.

## Choose a scan target

The selected target changes the agent’s inspection focus, not the repository access controls.

| Target | Choose it when | Extra review emphasis |
| --- | --- | --- |
| `general` | The repository is an application, library, service, or mixed codebase. | Auth, data validation, crypto, secrets, external calls, serialization, storage, CI/CD, and deployment. |
| `evm` | The meaningful security surface is Solidity/EVM smart contracts. | Access control, reentrancy, delegatecall, upgrades, oracles, arithmetic, signatures, denial of service, and economic invariants. |
| `solana` | The meaningful security surface is a Solana program. | Signer/owner checks, PDAs and bumps, account reinitialization, duplicate mutable accounts, CPI validation, token authority, arithmetic, rent, and closing behavior. |

For a repository with multiple domains, select the highest-risk primary surface first and run a later scan with another target if needed. Auto Sec allows only one active scan per user.

## Provider keys

Production uses BYOK. Saving a provider key overwrites that user’s previous key for the same provider; the UI never displays it again. The app encrypts it before storage using AES-256-GCM, and the repository sandbox never receives it.

Supported production provider/model choices are defined in `src/lib/ai/models.ts`:

- OpenAI: GPT-5.4 mini or GPT-5.4.
- Anthropic: Claude Sonnet 5 or Claude Opus 4.8.
- OpenRouter: the listed OpenAI and Anthropic models through OpenRouter.

Model names are application configuration, not a promise that every provider account has access. If a provider rejects a model or key, the scan records a failure reason.

## What happens to the repository

Auto Sec stores the repository identity, GitHub App installation ID, chosen target/model, pinned commit SHA, status, timestamps, report, and failure reason. It does not store a working clone in PostgreSQL.

For a scan, the agent uses the GitHub App installation to download an archive of the recorded commit into an isolated sandbox. The agent is instructed to inspect only; it must not modify repository files, install or execute repository code, run tests, or use the network. The sandbox has preinstalled/prepared security tooling and returns only the report.

## Contributor orientation

Start from the path closest to the behavior you want to change:

| If you are changing… | Start here |
| --- | --- |
| Landing/dashboard UI or server actions | `src/app/page.tsx`, `src/app/app/page.tsx`, `src/app/app/actions.ts` |
| Repository discovery and GitHub permissions | `src/lib/github.ts` |
| Credential storage or supported models | `src/lib/ai/credentials.ts`, `src/lib/ai/credential-crypto.ts`, `src/lib/ai/models.ts` |
| Scan validation or submission | `src/lib/ai/scans.ts` |
| Report format/UI | `src/lib/ai/report.ts`, `src/components/scans.tsx` |
| Database records and migrations | `src/db/app-schema.ts`, `drizzle/` |
| Agent behavior and audit rubric | `agent/agent.ts`, `agent/instructions.md` |
| Sandbox preparation and GitHub archive handling | `agent/sandbox/sandbox.ts` |
| Agent authentication, state, or report persistence | `agent/channels/eve.ts`, `agent/lib/model.ts`, `agent/hooks/persist-scan.ts` |

After changing TypeScript, run `pnpm typecheck`. For database changes, generate and review a new migration rather than editing existing migrations that may already have been applied. For agent configuration changes, rebuild the agent with `pnpm agent:build` before testing.

## Current limitations to keep in mind

- The scan UI displays the newest 20 scans only.
- Users cannot cancel or retry scans from the UI today.
- The credential deletion helper exists in server code but is not exposed in the UI.
- A scan has a maximum supported repository size of 250 MB.
- Tool availability can vary during sandbox bootstrap; the report’s limitations section should disclose unavailable or incompatible tools.
- Results may contain false positives or miss vulnerabilities. Human review remains required.
