import { z } from "zod";

export const auditReportSchema = z.object({
  executiveSummary: z.string().min(1),
  riskRating: z.enum(["critical", "high", "medium", "low", "informational"]),
  repository: z.object({
    fullName: z.string(),
    commitSha: z.string(),
    target: z.enum(["general", "evm", "solana"]),
  }),
  findings: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      confidence: z.enum(["high", "medium", "low"]),
      category: z.string(),
      description: z.string(),
      impact: z.string(),
      evidence: z.array(
        z.object({
          file: z.string(),
          lineStart: z.number().int().positive().optional(),
          lineEnd: z.number().int().positive().optional(),
          snippet: z.string().optional(),
        }),
      ),
      recommendation: z.string(),
      references: z.array(z.string()),
    }),
  ),
  methodology: z.array(z.string()),
  limitations: z.array(z.string()),
  filesReviewed: z.number().int().nonnegative(),
});

export type AuditReport = z.infer<typeof auditReportSchema>;
