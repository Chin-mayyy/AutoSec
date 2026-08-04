import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../../src/env";

const client = postgres(env.DATABASE_URL);

export const agentDb = drizzle({ client });
