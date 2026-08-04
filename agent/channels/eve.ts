import { timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";
import type { AuthFn } from "eve/channels/auth";
import { extractBearerToken, UnauthenticatedError } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

import { scan } from "../../src/db/schema";
import { env } from "../../src/env";
import { agentDb } from "../lib/database";

const internalAuth: AuthFn<Request> = async (request) => {
  const token = extractBearerToken(request.headers.get("authorization"));
  const expected = Buffer.from(env.EVE_INTERNAL_SECRET);
  const provided = Buffer.from(token ?? "");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new UnauthenticatedError({ message: "Invalid agent credential." });
  }

  const scanId = request.headers.get("x-auto-sec-scan-id");
  const userId = request.headers.get("x-auto-sec-user-id");

  if (!scanId || !userId) {
    throw new UnauthenticatedError({ message: "Missing scan identity." });
  }

  const [authorizedScan] = await agentDb
    .select({ id: scan.id })
    .from(scan)
    .where(and(eq(scan.id, scanId), eq(scan.userId, userId)))
    .limit(1);

  if (!authorizedScan) {
    throw new UnauthenticatedError({ message: "Unknown scan identity." });
  }

  return {
    attributes: { scanId },
    authenticator: "auto-sec-internal",
    principalId: userId,
    principalType: "user",
  };
};

export default eveChannel({ auth: internalAuth });
