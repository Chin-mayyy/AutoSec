import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { GithubSignInButton, SignOutButton } from "@/components/auth-buttons";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tighter sm:text-5xl">
            Security analysis for repositories and smart contracts.
          </h1>
          <p className="max-w-lg text-muted-foreground">
            Connect GitHub, choose a repository, and run isolated AI-assisted
            security scans.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          }
        >
          <AuthActions />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthActions() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <GithubSignInButton />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/app" className={buttonVariants()}>
        Open app
      </Link>
      <SignOutButton />
      <span className="ml-2 text-sm text-muted-foreground">
        {session.user.name}
      </span>
    </div>
  );
}
