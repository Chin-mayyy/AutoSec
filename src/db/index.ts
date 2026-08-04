import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";

import { authRelations, relations } from "./schema";

const client = postgres(env.DATABASE_URL);

export const db = drizzle({
  client,
  relations: { ...relations, ...authRelations },
});
