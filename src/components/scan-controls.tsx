"use client";

import { ScanSearchIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { startScanAction, type FormState } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import type { AiProvider } from "@/db/schema";
import { AI_MODELS } from "@/lib/ai/models";

const initialState: FormState = {};

type Credential = { id: string; provider: AiProvider };

export function ScanControls({
  repositoryId,
  credentials,
  disabled,
  useLocalChatGpt,
}: {
  repositoryId: string;
  credentials: Credential[];
  disabled: boolean;
  useLocalChatGpt: boolean;
}) {
  const [state, action, isPending] = useActionState(startScanAction, initialState);
  const [credentialId, setCredentialId] = useState(credentials[0]?.id ?? "");
  const provider = credentials.find((credential) => credential.id === credentialId)?.provider;
  const models = provider ? AI_MODELS[provider] : [];

  return (
    <form action={action} className="mt-4 space-y-2 border-t pt-3">
      <input type="hidden" name="repositoryId" value={repositoryId} />
      {useLocalChatGpt && (
        <>
          <input type="hidden" name="credentialId" value="local-chatgpt" />
          <input type="hidden" name="model" value="gpt-5.6-sol" />
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select
          name="target"
          aria-label="Scan target"
          className="h-8 rounded-md border bg-background px-2 text-xs"
          defaultValue="general"
        >
          <option value="general">General repository</option>
          <option value="evm">EVM / Solidity</option>
          <option value="solana">Solana</option>
        </select>
        {useLocalChatGpt ? (
          <span className="flex h-8 items-center rounded-md border bg-muted/40 px-2 text-xs">
            ChatGPT · gpt-5.6-sol
          </span>
        ) : (
          <select
            name="credentialId"
            aria-label="AI provider credential"
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={credentialId}
            onChange={(event) => setCredentialId(event.target.value)}
            required
          >
            {credentials.length === 0 && <option value="">Save an AI key first</option>}
            {credentials.map((credential) => (
              <option key={credential.id} value={credential.id}>
                {credential.provider}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-2">
        {useLocalChatGpt ? (
          <p className="min-w-0 flex-1 self-center text-xs text-muted-foreground">
            Uses your local Codex login and ChatGPT subscription.
          </p>
        ) : (
          <select
            key={provider}
            name="model"
            aria-label="AI model"
            className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
            defaultValue={models[0]?.id ?? ""}
            required
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={disabled || (!useLocalChatGpt && credentials.length === 0) || isPending}
        >
          <ScanSearchIcon />
          {isPending ? "Starting..." : "Full scan"}
        </Button>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
    </form>
  );
}
