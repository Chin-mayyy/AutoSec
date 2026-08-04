# Auto Sec

Auto Sec is a web application for running AI-assisted, read-only security audits of GitHub repositories and smart contracts. A signed-in user installs the Auto Sec GitHub App on selected repositories, selects an audit target, and receives a structured report with findings, evidence, methodology, and limitations.

It is designed around two trust boundaries:

- The web application manages identity, GitHub access, scan records, and encrypted bring-your-own-key (BYOK) provider credentials.
- An Eve-powered isolated sandbox downloads one pinned Git commit, has no network access while auditing it, and returns a schema-validated report.

## What it supports

- GitHub sign-in through Better Auth.
- GitHub App installation-based access to repositories, including private repositories explicitly granted to the App.
- General repository, EVM/Solidity, and Solana audit targets.
- OpenAI, Anthropic, and OpenRouter credentials in production.
- AES-256-GCM encryption for saved provider API keys.
- Per-user audit history and structured, evidence-backed reports.
- Static-analysis tooling in the audit sandbox: Gitleaks, Semgrep, and, when applicable, Slither.

Auto Sec is an assistant, not a security guarantee. Reports are best-effort and must be reviewed by qualified engineers before acting on them.

## Quick start

Prerequisites: Node.js 24 or newer, pnpm 11, PostgreSQL, a GitHub App, and an Eve/Vercel Sandbox configuration. See the full [setup guide](docs/setup.md).

```bash
pnpm install
cp .env.example .env.local
# Fill in .env.local, then create the schema.
pnpm db:migrate
pnpm agent:build
pnpm dev
```

Open `http://localhost:3000`, sign in with GitHub, install or configure the GitHub App for a repository, and start a scan. The complete click-through walkthrough is in the [starter guide](docs/starter-guide.md).

## Documentation

- [Architecture and scan lifecycle](docs/architecture.md)
- [Local and production setup](docs/setup.md)
- [Starter guide](docs/starter-guide.md)

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the Next.js application in development mode. |
| `pnpm build` | Create a production application build. |
| `pnpm start` | Serve the production build. |
| `pnpm typecheck` | Run TypeScript without emitting files. |
| `pnpm db:generate` | Create a Drizzle migration from schema changes. |
| `pnpm db:migrate` | Apply committed Drizzle migrations. |
| `pnpm db:push` | Synchronize the schema directly; use carefully outside local development. |
| `pnpm auth:generate` | Regenerate Better Auth's database schema. |
| `pnpm agent:info` | Inspect the Eve agent configuration. |
| `pnpm agent:build` | Build the Eve agent and its deployable artifacts. |

## Project layout

```text
src/app/                 Next.js routes, pages, and server actions
src/components/          UI for authentication, repositories, scans, and settings
src/lib/                 Auth, GitHub, AI credential, scan, and report logic
src/db/                  Drizzle database schema and connection
agent/                   Eve agent, channel auth, hooks, model resolver, sandbox
drizzle/                 Committed database migrations and snapshots
docs/                    Architecture, setup, and onboarding documentation
```

## Current product boundaries

- A user may have only one pending or running scan at a time.
- Repositories over 250 MB and archived repositories cannot be scanned.
- The UI shows the 20 newest scans for a user and refreshes every five seconds while a scan is active.
- There is currently no UI action to cancel a scan or remove a saved credential, even though the database schema includes a cancelled state and a credential-deletion helper exists.

For configuration details and deployment considerations, start with the [setup guide](docs/setup.md).
