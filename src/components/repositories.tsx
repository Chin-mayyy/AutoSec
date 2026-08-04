import { SiGithub } from "@icons-pack/react-simple-icons";
import { ArchiveIcon, GitForkIcon, LockIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScanControls } from "@/components/scan-controls";
import { listAiCredentials } from "@/lib/ai/credentials";
import { getGithubRepositories } from "@/lib/github";

export async function Repositories({ headers, userId }: { headers: Headers; userId: string }) {
  const [{ repositories, installations, installationUrl }, credentials] = await Promise.all([
    getGithubRepositories(headers),
    listAiCredentials(userId),
  ]);
  const configureUrl = installations[0]?.configureUrl ?? installationUrl;

  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-4 border-b pb-4">
        <div>
          <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            GitHub App access
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repositories.length} {repositories.length === 1 ? "repository" : "repositories"} ready
            for analysis
          </p>
        </div>
        <SiGithub className="size-7 text-muted-foreground" />
      </header>

      {repositories.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <LockIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
          <h2 className="font-medium">No repositories available</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {installations.length > 0
              ? "The GitHub App is installed, but it has not been granted access to any repositories."
              : "Signing in does not install the GitHub App. Install it and choose which repositories Auto Sec can analyze."}
          </p>
          {configureUrl && (
            <Button
              className="mt-5"
              render={
                <a
                  href={configureUrl}
                  aria-label={
                    installations.length > 0 ? "Configure GitHub App" : "Install GitHub App"
                  }
                />
              }
              nativeButton={false}
            >
              <SiGithub />
              {installations.length > 0 ? "Configure GitHub App" : "Install GitHub App"}
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {repositories.map((repository) => (
            <li key={repository.id}>
              <article className="flex h-full flex-col rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <img
                    className="size-8 rounded-md border"
                    src={repository.ownerAvatarUrl}
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="min-w-0 truncate font-medium">
                        <a
                          className="hover:underline"
                          href={repository.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {repository.fullName}
                        </a>
                      </h2>
                      {repository.isPrivate && (
                        <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      {repository.isArchived && (
                        <ArchiveIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {repository.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  {repository.language && <span>{repository.language}</span>}
                  <span className="inline-flex items-center gap-1">
                    <StarIcon className="size-3.5" />
                    {repository.stars}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitForkIcon className="size-3.5" />
                    {repository.forks}
                  </span>
                </div>
                <ScanControls
                  repositoryId={String(repository.id)}
                  credentials={credentials}
                  disabled={repository.isArchived}
                  useLocalChatGpt={process.env.NODE_ENV !== "production"}
                />
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RepositoriesSkeleton() {
  return (
    <section className="space-y-5" aria-label="Loading repositories">
      <header className="flex items-end justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-44 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="size-7 animate-pulse rounded-full bg-muted" />
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    </section>
  );
}
