import { defineRelations } from "drizzle-orm";

import { account, session, user, verification } from "./auth-schema";
import { aiCredential, scan, scanJob } from "./app-schema";

export * from "./auth-schema";
export * from "./app-schema";

export const relations = defineRelations(
  { user, session, account, verification, aiCredential, scan, scanJob },
  () => ({}),
);
