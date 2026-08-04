import type { AiProvider } from "@/db/schema";

export const AI_MODELS = {
  openai: [
    { id: "gpt-5.4-mini", name: "GPT-5.4 mini" },
    { id: "gpt-5.4", name: "GPT-5.4" },
  ],
  anthropic: [
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
  ],
  openrouter: [
    { id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini via OpenRouter" },
    { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5 via OpenRouter" },
  ],
} as const satisfies Record<AiProvider, readonly { id: string; name: string }[]>;

export function isSupportedModel(provider: AiProvider, model: string) {
  return AI_MODELS[provider].some((candidate) => candidate.id === model);
}
