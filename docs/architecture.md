# Architecture and scan lifecycle

## System overview

Auto Sec has a Next.js application and an Eve audit agent. PostgreSQL is the shared system of record. The application never clones a repository locally; the agent sandbox obtains the requested commit using a GitHub App installation token.

```text
Browser
  | GitHub OAuth / forms
  v
Next.js application ----> PostgreSQL <---- Eve channel, hooks, model resolver
  |   |                                      |
  |   +--> GitHub OAuth token                 +--> Vercel Sandbox
  |          (list accessible installs/repos)       | GitHub App installation token
  |                                                 v
  +--> authenticated Eve session              pinned repository archive
                                                     |
                                                     v
                                          read-only AI audit + scanners
                                                     |
                                                     v
                                           validated report persisted to DB
```

## Main components

| Area | Responsibility | Key files |
| --- | --- | --- |
| Web UI | Landing page, authenticated dashboard, provider-key form, repository cards, report rendering | `src/app`, `src/components` |
| Authentication | GitHub OAuth, session cookies, Better Auth database adapter | `src/lib/create-auth.ts`, `src/app/api/auth/[...all]/route.ts` |
| GitHub integration | Uses the user OAuth token to discover installations and repositories; uses App credentials for installation and archive access | `src/lib/github.ts`, `agent/sandbox/sandbox.ts` |
| Credential vault | Encrypts provider keys before persistence and decrypts only when resolving a production scan model | `src/lib/ai/credential-crypto.ts`, `src/lib/ai/credentials.ts`, `agent/lib/model.ts` |
| Scan orchestration | Validates inputs, pins the default-branch commit, creates scan/job rows, and submits the Eve session | `src/lib/ai/scans.ts` |
| Agent control plane | Authenticates internal Eve calls, changes statuses, validates/persists results | `agent/channels/eve.ts`, `agent/hooks/persist-scan.ts` |
| Sandbox | Downloads and extracts the pinned tarball, installs static-analysis tools during bootstrap, and runs with network denied | `agent/sandbox/sandbox.ts`, `agent/instructions.md` |

## Scan lifecycle

1. A signed-in user chooses a repository, target (`general`, `evm`, or `solana`), provider credential, and model. In development, the UI sends a fixed local Codex/ChatGPT selection instead.
2. `startScanAction` validates the submitted form and passes the authenticated request headers and user ID to `createAndStartScan`.
3. The scan service confirms that the saved credential belongs to the user (production), resolves repositories accessible through the user’s GitHub account and App installations, rejects archived repositories and repositories over 250 MB, and enforces one active scan per user.
4. It fetches the current default-branch commit, then writes a `scan` row in `pending` state and a `scan_job` row in `queued` state in one transaction.
5. The application opens an internally authenticated Eve session. The channel verifies the bearer secret and confirms that the scan belongs to the supplied user.
6. When the agent begins, its dynamic model resolver changes the scan/job to `running`. In production it decrypts the selected user key and constructs the corresponding OpenAI, Anthropic, or OpenRouter model. In non-production it uses `experimental_chatgpt("gpt-5.6-sol")`.
7. The sandbox creates a GitHub App installation client, downloads the exact recorded commit as a tarball, extracts it under `/workspace/repository`, and then operates with a `deny-all` network policy.
8. The agent follows `agent/instructions.md`: static inspection only, Gitleaks and Semgrep when available, Slither where applicable, manual verification of findings, and a structured report.
9. The result hook validates the report with Zod, normalizes the repository metadata from the stored scan, and atomically marks the scan/job `completed`. Session failures and interactive-input requests mark both records `failed` where still active.
10. The dashboard polls every five seconds while it has a pending or running scan and renders reports only after they pass the same Zod schema.

## Data model

Authentication tables (`user`, `session`, `account`, and `verification`) are generated for Better Auth. Application tables are defined in `src/db/app-schema.ts`.

| Table | Purpose | Important constraints |
| --- | --- | --- |
| `ai_credential` | Encrypted API key per user/provider | Unique `(user_id, provider)`; deleting a user cascades. |
| `scan` | Audit request and final report | Unique active scan per user for `pending`/`running`; a deleted credential becomes `NULL`; report is JSONB. |
| `scan_job` | Attempt-level agent execution metadata | One active queued/running job per scan; unique `(scan_id, attempt)`. |

`scan` records the full repository name, installation ID, and commit SHA. This makes the scan reproducible against a particular revision even if the default branch moves later.

## Security model

### Repository access

The signed-in user’s GitHub OAuth token is used for discovery only: it lists the user’s GitHub App installations and the repositories that each installation grants. The agent uses the App private key plus the selected installation ID to download a single recorded commit. An OAuth sign-in alone does not grant repository access; the GitHub App must be installed and explicitly granted repository permissions.

### Credential handling

Saved provider keys are encrypted with AES-256-GCM. Each encryption uses a random 12-byte IV and authenticated additional data (`auto-sec:ai-credential:v1`). PostgreSQL stores ciphertext, IV, authentication tag, and version—not plaintext. Keep `CREDENTIAL_ENCRYPTION_KEY` private and stable: changing it makes existing credentials undecryptable.

The repository sandbox does not receive the user’s API key. The agent runtime resolves the selected model before performing the audit; the sandbox itself runs without network access.

### Agent isolation and safety

The agent is instructed to be read-only, treat repository contents as untrusted, avoid network access, and never run repository code, dependencies, tests, lifecycle scripts, or binaries. Its own interactive tools are disabled. It can use the prepared security tools and static inspection only. The sandbox fetches the archive before enabling the deny-all network policy.

This design reduces risk but does not eliminate it: LLM output can be wrong, scanners can be unavailable or incomplete, and the sandbox bootstrap itself depends on external downloads when rebuilt. Treat all reports as review inputs, not a release gate by themselves.

## Operational behavior and limits

- Maximum repository size is 250 MB based on the GitHub repository size metadata.
- A scan can run for up to six hours, with up to 1,000,000 input tokens and 60,000 output tokens configured for the Eve agent.
- Scan history is limited to the most recent 20 records per user.
- A report requires an executive summary, risk rating, repository metadata, structured findings, methodology, limitations, and reviewed-file count.
- The current UI has no cancellation/retry controls. Failed scans can be diagnosed from their stored failure reason; a new scan can be started once no active scan remains.

## Development versus production

In non-production (`NODE_ENV !== "production"`), scan requests intentionally ignore saved provider credentials and run through the local Codex/ChatGPT integration with `gpt-5.6-sol`. This is convenient for a developer with an authenticated local Codex environment, but it is not a production configuration.

In production, users must save a supported provider key and select a compatible model. The allowed list is maintained in `src/lib/ai/models.ts`; update it deliberately when provider availability changes.
