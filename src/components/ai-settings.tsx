"use client";

import { KeyRoundIcon } from "lucide-react";
import { useActionState } from "react";

import { saveCredentialAction, type FormState } from "@/app/app/actions";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

export function AiSettings({ providers }: { providers: string[] }) {
  const [state, action, isPending] = useActionState(saveCredentialAction, initialState);

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Encrypted BYOK
          </p>
          <h2 className="mt-1 text-lg font-semibold">AI provider</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keys are encrypted server-side and never sent to the repository sandbox.
          </p>
        </div>
        <KeyRoundIcon className="size-5 text-muted-foreground" />
      </div>

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
        <select
          name="provider"
          aria-label="AI provider"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          defaultValue="openai"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="openrouter">OpenRouter</option>
        </select>
        <input
          name="apiKey"
          type="password"
          autoComplete="off"
          required
          placeholder="Provider API key"
          className="h-9 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Encrypting..." : "Save key"}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {providers.length > 0 ? (
          providers.map((provider) => (
            <span key={provider} className="rounded-full border px-2 py-1 capitalize">
              {provider} configured
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">No provider keys configured.</span>
        )}
        {state.error && <span className="text-destructive">{state.error}</span>}
        {state.success && <span className="text-emerald-600">{state.success}</span>}
      </div>
    </section>
  );
}
