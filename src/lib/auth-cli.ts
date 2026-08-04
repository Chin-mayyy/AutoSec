import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import { createAuth } from "@/lib/create-auth";

const client = postgres(env.DATABASE_URL);

export const auth = createAuth(drizzle({ client }));
