CREATE TYPE "ai_provider" AS ENUM('openai', 'anthropic', 'openrouter');--> statement-breakpoint
CREATE TYPE "scan_job_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "scan_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "scan_target" AS ENUM('general', 'evm', 'solana');--> statement-breakpoint
CREATE TABLE "ai_credential" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"encryption_iv" text NOT NULL,
	"encryption_auth_tag" text NOT NULL,
	"encryption_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"credential_id" text,
	"repository_id" text NOT NULL,
	"repository_full_name" text NOT NULL,
	"commit_sha" text,
	"target" "scan_target" DEFAULT 'general'::"scan_target" NOT NULL,
	"status" "scan_status" DEFAULT 'pending'::"scan_status" NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"report" jsonb,
	"failure_reason" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_job" (
	"id" text PRIMARY KEY,
	"scan_id" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" "scan_job_status" DEFAULT 'queued'::"scan_job_status" NOT NULL,
	"eve_session_id" text,
	"sandbox_id" text,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credential_user_provider_uidx" ON "ai_credential" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "ai_credential_user_id_idx" ON "ai_credential" ("user_id");--> statement-breakpoint
CREATE INDEX "scan_user_created_at_idx" ON "scan" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "scan_repository_id_idx" ON "scan" ("repository_id");--> statement-breakpoint
CREATE INDEX "scan_status_idx" ON "scan" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_job_scan_attempt_uidx" ON "scan_job" ("scan_id","attempt");--> statement-breakpoint
CREATE INDEX "scan_job_status_idx" ON "scan_job" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_job_active_idx" ON "scan_job" ("scan_id") WHERE "status" in ('queued', 'running');--> statement-breakpoint
ALTER TABLE "ai_credential" ADD CONSTRAINT "ai_credential_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_credential_id_ai_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "ai_credential"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "scan_job" ADD CONSTRAINT "scan_job_scan_id_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scan"("id") ON DELETE CASCADE;
