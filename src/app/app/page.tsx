import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth-buttons";
import { AiSettings } from "@/components/ai-settings";
import { Repositories, RepositoriesSkeleton } from "@/components/repositories";
import { Scans } from "@/components/scans";
import { buttonVariants } from "@/components/ui/button";
import { listAiCredentials } from "@/lib/ai/credentials";
import { auth } from "@/lib/auth";

export default function AppPage() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<AppSkeleton />}>
        <AuthenticatedApp />
      </Suspense>
    </main>
  );
}

async function AuthenticatedApp() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect("/");
  }

  return (
    <>
      <nav className="mb-6 flex items-center justify-between gap-4">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back home
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.name}</span>
          <SignOutButton />
        </div>
      </nav>

      <Suspense fallback={<div className="mb-8 h-40 animate-pulse rounded-xl bg-muted" />}>
        <Settings userId={session.user.id} />
      </Suspense>

      <div className="my-8">
        <Suspense fallback={<RepositoriesSkeleton />}>
          <Repositories headers={requestHeaders} userId={session.user.id} />
        </Suspense>
      </div>

      <Suspense fallback={<RepositoriesSkeleton />}>
        <Scans userId={session.user.id} />
      </Suspense>
    </>
  );
}

async function Settings({ userId }: { userId: string }) {
  const credentials = await listAiCredentials(userId);
  return <AiSettings providers={credentials.map((credential) => credential.provider)} />;
}

function AppSkeleton() {
  return (
    <>
      <nav className="mb-6 flex items-center justify-between gap-4">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
      </nav>
      <RepositoriesSkeleton />
    </>
  );
}
