import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const aiProvider = pgEnum("ai_provider", ["openai", "anthropic", "openrouter"]);
export const scanTarget = pgEnum("scan_target", ["general", "evm", "solana"]);
export const scanStatus = pgEnum("scan_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const scanJobStatus = pgEnum("scan_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const aiCredential = pgTable(
  "ai_credential",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: aiProvider("provider").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    encryptionIv: text("encryption_iv").notNull(),
    encryptionAuthTag: text("encryption_auth_tag").notNull(),
    encryptionVersion: integer("encryption_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("ai_credential_user_provider_uidx").on(table.userId, table.provider),
    index("ai_credential_user_id_idx").on(table.userId),
  ],
);

export const scan = pgTable(
  "scan",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").references(() => aiCredential.id, {
      onDelete: "set null",
    }),
    repositoryId: text("repository_id").notNull(),
    repositoryFullName: text("repository_full_name").notNull(),
    installationId: text("installation_id").notNull(),
    commitSha: text("commit_sha"),
    target: scanTarget("target").default("general").notNull(),
    status: scanStatus("status").default("pending").notNull(),
    provider: aiProvider("provider").notNull(),
    model: text("model").notNull(),
    report: jsonb("report"),
    failureReason: text("failure_reason"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("scan_user_created_at_idx").on(table.userId, table.createdAt),
    index("scan_repository_id_idx").on(table.repositoryId),
    index("scan_status_idx").on(table.status),
    uniqueIndex("scan_user_active_uidx")
      .on(table.userId)
      .where(sql`${table.status} in ('pending', 'running')`),
  ],
);

export const scanJob = pgTable(
  "scan_job",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scan.id, { onDelete: "cascade" }),
    attempt: integer("attempt").default(1).notNull(),
    status: scanJobStatus("status").default("queued").notNull(),
    eveSessionId: text("eve_session_id"),
    sandboxId: text("sandbox_id"),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("scan_job_scan_attempt_uidx").on(table.scanId, table.attempt),
    index("scan_job_status_idx").on(table.status),
    uniqueIndex("scan_job_active_idx")
      .on(table.scanId)
      .where(sql`${table.status} in ('queued', 'running')`),
  ],
);

export type AiProvider = (typeof aiProvider.enumValues)[number];
export type ScanTarget = (typeof scanTarget.enumValues)[number];
