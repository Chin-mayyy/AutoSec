"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function GithubSignInButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        const result = await authClient.signIn.social({
          provider: "github",
          callbackURL: "/app",
        });

        if (result.error) {
          setIsPending(false);
        }
      }}
    >
      <SiGithub data-icon="inline-start" />
      {isPending ? "Redirecting..." : "Continue with GitHub"}
    </Button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="destructive"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
