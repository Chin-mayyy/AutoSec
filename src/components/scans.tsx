import { AlertTriangleIcon, CheckCircle2Icon, Clock3Icon, XCircleIcon } from "lucide-react";

import { ScanRefresh } from "@/components/scan-refresh";
import { auditReportSchema } from "@/lib/ai/report";
import { getUserScans } from "@/lib/ai/scans";

const severityStyles = {
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  info: "border-border bg-muted text-muted-foreground",
} as const;

export async function Scans({ userId }: { userId: string }) {
  const scans = await getUserScans(userId);
  const hasActiveScan = scans.some((item) => item.status === "pending" || item.status === "running");

  if (scans.length === 0) return null;

  return (
    <section className="space-y-4">
      {hasActiveScan && <ScanRefresh />}
      <header className="border-b pb-3">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Audit history
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Security reports</h2>
      </header>

      {scans.map((item) => {
        const parsedReport = auditReportSchema.safeParse(item.report);
        const report = parsedReport.success ? parsedReport.data : null;

        return (
          <article key={item.id} className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.repositoryFullName}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {item.commitSha?.slice(0, 12)} · {item.target} · {item.provider}/{item.model}
                </p>
              </div>
              <ScanStatus status={item.status} />
            </div>

            {item.failureReason && (
              <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {item.failureReason}
              </p>
            )}

            {report && (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Risk rating</p>
                    <p className="mt-1 text-lg font-semibold capitalize">{report.riskRating}</p>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {report.executiveSummary}
                  </p>
                </div>

                <div className="space-y-3">
                  {report.findings.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No actionable findings were confirmed in this scan.
                    </p>
                  ) : (
                    report.findings.map((finding) => (
                      <details key={finding.id} className="group rounded-lg border p-4">
                        <summary className="flex cursor-pointer list-none items-center gap-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${severityStyles[finding.severity]}`}
                          >
                            {finding.severity}
                          </span>
                          <span className="min-w-0 flex-1 font-medium">{finding.title}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {finding.id}
                          </span>
                        </summary>
                        <div className="mt-4 space-y-3 border-t pt-4 text-sm">
                          <p>{finding.description}</p>
                          <p>
                            <strong>Impact:</strong> {finding.impact}
                          </p>
                          <p>
                            <strong>Recommendation:</strong> {finding.recommendation}
                          </p>
                          {finding.evidence.map((evidence, index) => (
                            <div key={`${evidence.file}-${index}`} className="rounded-md bg-muted p-3">
                              <p className="font-mono text-xs">
                                {evidence.file}
                                {evidence.lineStart ? `:${evidence.lineStart}` : ""}
                              </p>
                              {evidence.snippet && (
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                                  {evidence.snippet}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    ))
                  )}
                </div>

                {(report.methodology.length > 0 || report.limitations.length > 0) && (
                  <details className="rounded-lg border border-dashed p-4 text-sm">
                    <summary className="cursor-pointer font-medium">Methodology and limitations</summary>
                    <div className="mt-3 space-y-3 text-muted-foreground">
                      <p>{report.methodology.join(" · ")}</p>
                      <p>{report.limitations.join(" · ")}</p>
                    </div>
                  </details>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ScanStatus({ status }: { status: "pending" | "running" | "completed" | "failed" | "cancelled" }) {
  const content = {
    pending: { icon: Clock3Icon, label: "Queued", className: "text-muted-foreground" },
    running: { icon: AlertTriangleIcon, label: "Scanning", className: "text-amber-600" },
    completed: { icon: CheckCircle2Icon, label: "Complete", className: "text-emerald-600" },
    failed: { icon: XCircleIcon, label: "Failed", className: "text-destructive" },
    cancelled: { icon: XCircleIcon, label: "Cancelled", className: "text-muted-foreground" },
  }[status];
  const Icon = content.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${content.className}`}>
      <Icon className="size-3.5" />
      {content.label}
    </span>
  );
}
