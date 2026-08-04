import { loadEnvFile } from "node:process";

import type { Config } from "drizzle-kit";

try {
  loadEnvFile(".env.local");
} catch {
  // Deployment and CI environments provide DATABASE_URL directly.
}

export default {
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
} satisfies Config;
