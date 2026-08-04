import "server-only";

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

import { env } from "@/env";
import { auth } from "@/lib/auth";

export async function getGithubUserOctokit(headers: Headers) {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return null;
  }

  const accounts = await auth.api.listUserAccounts({ headers });
  const githubAccount = accounts.find((account) => account.providerId === "github");

  if (!githubAccount) {
    throw new Error("No GitHub account is linked to this user.");
  }

  const { accessToken } = await auth.api.getAccessToken({
    headers,
    body: { accountId: githubAccount.id },
  });

  return new Octokit({ auth: accessToken, userAgent: "auto-sec" });
}

export async function getGithubRepositories(headers: Headers) {
  const octokit = await getGithubUserOctokit(headers);

  if (!octokit) {
    throw new Error("Unauthorized");
  }

  const installations = await octokit.paginate(
    octokit.rest.apps.listInstallationsForAuthenticatedUser,
    { per_page: 100 },
  );
  const repositoriesByInstallation = await Promise.all(
    installations.map(async (installation) => ({
      installationId: installation.id,
      repositories: await octokit.paginate(
        octokit.rest.apps.listInstallationReposForAuthenticatedUser,
        {
          installation_id: installation.id,
          per_page: 100,
        },
      ),
    })),
  );
  const repositories = repositoriesByInstallation
    .flatMap(({ installationId, repositories }) =>
      repositories.map((repository) => ({ repository, installationId })),
    )
    .map(({ repository, installationId }) => ({
      id: repository.id,
      installationId,
      fullName: repository.full_name,
      defaultBranch: repository.default_branch,
      description: repository.description,
      url: repository.html_url,
      isPrivate: repository.private,
      isArchived: repository.archived,
      language: repository.language,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      sizeKb: repository.size,
      updatedAt: repository.updated_at,
      ownerAvatarUrl: repository.owner.avatar_url,
    }))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  if (installations.length > 0) {
    return {
      repositories,
      installations: installations.map((installation) => ({
        id: installation.id,
        configureUrl: installation.html_url,
      })),
      installationUrl: null,
    };
  }

  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
    },
    userAgent: "auto-sec",
  });
  const { data: app } = await appOctokit.rest.apps.getAuthenticated();

  if (!app) {
    throw new Error("Unable to load the GitHub App configuration.");
  }

  return {
    repositories,
    installations: [],
    installationUrl: `${app.html_url}/installations/new`,
  };
}
