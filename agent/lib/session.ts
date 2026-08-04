import type { DynamicResolveContext } from "eve";

type ScanContext = {
  readonly session: Pick<DynamicResolveContext["session"], "auth">;
};

export function getScanId(ctx: ScanContext) {
  const scanId = ctx.session.auth.initiator?.attributes.scanId;

  if (typeof scanId !== "string") {
    throw new Error("The agent session is missing a scan ID.");
  }

  return scanId;
}
