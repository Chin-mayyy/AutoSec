import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { DB } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import * as schema from "@/db/schema";
import { env } from "@/env";

export function createAuth(db: DB) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    telemetry: {
      enabled: false,
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    plugins: [nextCookies()],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_APP_CLIENT_ID,
        clientSecret: env.GITHUB_APP_CLIENT_SECRET,
      },
    },
    advanced: {
      database: {
        joins: true,
      },
    },
  });
}
