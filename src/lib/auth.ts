import "server-only";

import { db } from "@/db";
import { createAuth } from "@/lib/create-auth";

export const auth = createAuth(db);
