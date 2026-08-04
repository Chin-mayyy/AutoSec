import { createOpenAI } from "@ai-sdk/openai";
import { defineAgent, defineDynamic } from "eve";
import { experimental_chatgpt } from "eve/models/openai";

import { auditReportSchema } from "../src/lib/ai/report";
import { resolveScanModel } from "./lib/model";

const fallbackModel =
  process.env.NODE_ENV === "production"
    ? createOpenAI({ apiKey: "disabled" })("gpt-5.4-mini")
    : experimental_chatgpt("gpt-5.6-sol");

export default defineAgent({
  model: defineDynamic({
    fallback: fallbackModel,
    events: {
      "step.started": (_event, ctx) => resolveScanModel(ctx),
    },
  }),
  modelContextWindowTokens: 200_000,
  outputSchema: auditReportSchema,
  reasoning: "high",
  limits: {
    maxInputTokensPerSession: 1_000_000,
    maxOutputTokensPerSession: 60_000,
    sessionTimeoutMs: 6 * 60 * 60 * 1_000,
  },
});
