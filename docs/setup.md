# Setup guide

This guide covers a full local installation and the configuration that production requires. All secrets belong in `.env.local`, which is ignored by Git. Never commit private keys, OAuth secrets, API keys, database URLs with passwords, or generated encryption keys.

## Prerequisites

- Node.js **24 or newer** (`node --version`).
- pnpm **11.18.0**; the repository declares this exact package-manager version.
- A reachable PostgreSQL database.
- A GitHub App you control, configured for OAuth sign-in and repository installation.
- For a fully working sandboxed scan environment, Vercel credentials for Eve’s hosted Vercel Sandbox.
- For production scans, an API key from OpenAI, Anthropic, or OpenRouter. Local development instead uses a local Codex/ChatGPT login.

## 1. Install dependencies

```bash
pnpm install
```

Use pnpm rather than npm or Yarn so that the lockfile and the package-manager declaration remain authoritative.

## 2. Create a PostgreSQL database

Create a dedicated database and a connection string, for example:

```text
postgresql://postgres:password@localhost:5432/auto_sec
```

The application and the Eve agent both use `DATABASE_URL`. They must point at the same database because scan orchestration, agent status changes, and report persistence happen through shared tables.

## 3. Configure the GitHub App

Create a GitHub App for Auto Sec. The application uses the App in two different ways:

- Its **client ID and client secret** configure GitHub OAuth through Better Auth.
- Its **App ID and private key** let the audit agent mint installation credentials and download the exact repository revision.

Set the OAuth callback URL to:

```text
http://localhost:3000/api/auth/callback/github
```

For deployed environments, replace the host with the public `BETTER_AUTH_URL`. The App needs enough repository read permission to list its granted repositories and download source archives. Keep permissions minimal; Auto Sec’s implemented flow needs read access only. Install the App on selected repositories (not necessarily all repositories) after sign-in. The app dashboard surfaces an install/configure link when no accessible repositories are found.

GitHub Apps may require a public callback URL in your configuration. If localhost is unsuitable for your GitHub App setup, expose the local app through an HTTPS tunnel and use that public HTTPS base URL consistently for `BETTER_AUTH_URL` and the callback URL.

## 4. Create `.env.local`

Start from the template:

```bash
cp .env.example .env.local
```

Fill it in using the following reference.

| Variable | Required | Description |
| --- | --- | --- |
| `BETTER_AUTH_URL` | Yes | Canonical application URL, such as `http://localhost:3000`. |
| `BETTER_AUTH_SECRET` | Yes | Cookie/session signing secret; at least 32 characters. |
| `DATABASE_URL` | Yes | PostgreSQL connection string shared by app and agent. |
| `GITHUB_APP_ID` | Yes | Numeric/string GitHub App ID. |
| `GITHUB_APP_CLIENT_ID` | Yes | GitHub App OAuth client ID. |
| `GITHUB_APP_CLIENT_SECRET` | Yes | GitHub App OAuth client secret. |
| `GITHUB_APP_PRIVATE_KEY` | Yes | Full GitHub App PEM private key. Preserve newlines in a dotenv-compatible form. |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | Base64 encoding of exactly 32 random bytes; encrypts user API keys. |
| `EVE_INTERNAL_SECRET` | Yes | At least 32 characters; authenticates app-to-agent session creation. |
| `VERCEL_TEAM_ID` | Required for hosted sandbox | Vercel team that hosts the Eve sandbox. |
| `VERCEL_PROJECT_ID` | Required for hosted sandbox | Vercel project for the sandbox. |
| `VERCEL_TOKEN` | Required for hosted sandbox | Vercel token authorized for that project/team. |

Generate the two random secrets safely:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Use one output for `CREDENTIAL_ENCRYPTION_KEY` and one for `EVE_INTERNAL_SECRET`. The encryption key must decode to exactly 32 bytes; the application validates this during startup. Store a production copy in a secrets manager and do not rotate it until existing encrypted credentials have been migrated or removed.

### PEM formatting

`GITHUB_APP_PRIVATE_KEY` must become the original PEM text at runtime. A common `.env.local` format is a double-quoted single line whose line breaks are written as `\n`; ensure your environment loader converts them to actual newlines if required by your deployment platform. Do not paste the key into application source or documentation.

## 5. Apply the database migrations

```bash
pnpm db:migrate
```

This applies the committed migrations in `drizzle/`, creating Better Auth’s tables plus `ai_credential`, `scan`, and `scan_job`. For schema development, edit `src/db/app-schema.ts`, generate a migration, review it, and apply it:

```bash
pnpm db:generate
pnpm db:migrate
```

`pnpm db:push` writes schema changes directly to the configured database. It is useful for disposable local work but should not replace reviewed migrations in shared or production environments.

If Better Auth settings change, regenerate its schema with `pnpm auth:generate`, inspect the resulting `src/db/auth-schema.ts`, generate a Drizzle migration, and apply it.

## 6. Build the audit agent

```bash
pnpm agent:info
pnpm agent:build
```

Both commands load `.env.local` if it exists. The Next.js configuration uses `withEve`, so agent build artifacts are part of the application’s runtime setup. Sandbox bootstrap installs Semgrep and attempts to install Slither, clone Semgrep rules, and fetch Gitleaks. Those bootstrap downloads require network access when the sandbox image is built; audits themselves run with network denied.

## 7. Run and verify locally

```bash
pnpm dev
```

Visit `http://localhost:3000`. A healthy first-run path is:

1. The home page renders a GitHub sign-in button.
2. GitHub returns to `/app` after authentication.
3. The dashboard either lists repositories or explains how to install/configure the GitHub App.
4. After App installation grants a repository, the card shows a **Full scan** action.

Run these checks before a production deployment:

```bash
pnpm typecheck
pnpm build
```

## Production checklist

- Set `NODE_ENV=production` through the deployment platform.
- Set `BETTER_AUTH_URL` to the exact public HTTPS origin and update the GitHub callback URL to match.
- Use managed PostgreSQL with backups, TLS, and least-privilege application credentials.
- Store all environment variables in the platform’s secrets manager.
- Configure `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` for Eve’s Vercel Sandbox.
- Build the agent as part of the deployment workflow.
- Verify a scan against a non-sensitive test repository before granting production repositories.
- Monitor failed scan records and sandbox/bootstrap availability.

In production, the dashboard requires a saved provider key before it enables scan submission. It permits only the provider/model pairs in `src/lib/ai/models.ts`.

## Troubleshooting

| Symptom | Likely cause and resolution |
| --- | --- |
| Environment validation fails at startup | Fill every required variable; check `BETTER_AUTH_SECRET` and `EVE_INTERNAL_SECRET` are 32+ characters and the encryption key is valid Base64 for 32 bytes. |
| GitHub sign-in fails | Confirm the GitHub App client ID, secret, callback URL, and `BETTER_AUTH_URL` have the same public/local origin. |
| “No repositories available” | OAuth sign-in worked, but the GitHub App is not installed or has no repository access. Use the dashboard’s install/configure action. |
| “This repository is not available for scanning” | The repo is missing from the current installation, is archived, or does not match the selected installation’s accessible list. |
| “Repositories larger than 250 MB are not supported” | Select a smaller repository or reduce the repository’s effective size. |
| “Wait for your active scan…” | The user already has a pending/running scan. Wait for it to finish or fail; the current UI has no cancellation action. |
| Scan fails immediately | Check agent build/configuration, `EVE_INTERNAL_SECRET`, the database, GitHub App private key, and sandbox Vercel credentials. Read the error shown in audit history. |
| Production says credential/model is invalid | Save a key for the selected provider and select one of its supported models. |
| Existing provider key stops working after a deployment | The credential encryption key changed. Restore the previous key or have users save keys again. |
