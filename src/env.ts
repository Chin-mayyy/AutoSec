import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().min(1),
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_APP_CLIENT_ID: z.string().min(1),
    GITHUB_APP_CLIENT_SECRET: z.string().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1),
    CREDENTIAL_ENCRYPTION_KEY: z.string().refine(
      (value) => Buffer.from(value, "base64").byteLength === 32,
      "CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    ),
    EVE_INTERNAL_SECRET: z.string().min(32),
  },
  runtimeEnv: {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID,
    GITHUB_APP_CLIENT_SECRET: process.env.GITHUB_APP_CLIENT_SECRET,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY,
    EVE_INTERNAL_SECRET: process.env.EVE_INTERNAL_SECRET,
  },
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
