import type { Metadata } from "next";
import Link from "next/link";
import { getReportQueue } from "@/lib/services/admin";
import { resolveReportAction } from "@/actions/admin";
import { formatDate, humanizeEnum, timeAgo } from "@/lib/format";
import { ReportStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Admin · Reports" };

const TABS: (ReportStatus | "OPEN_QUEUE")[] = ["OPEN_QUEUE", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"];

function tabHref(tab: ReportStatus | "OPEN_QUEUE") {
  return tab === "OPEN_QUEUE" ? "/admin/reports" : `/admin/reports?status=${tab}`;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const statusParam = Array.isArray(query.status) ? query.status[0] : query.status;
  const status = statusParam ? (statusParam as ReportStatus) : undefined;
  const reports = await getReportQueue(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink-900">Reports</h2>
        <p className="text-sm text-ink-500">{reports.length} shown</p>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Report status">
        {TABS.map((tab) => {
          const active = statusParam ? tab === statusParam : tab === "OPEN_QUEUE";
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              className={active ? "badge bg-ink-900 text-white" : "badge-neutral hover:bg-ink-200"}
            >
              {tab === "OPEN_QUEUE" ? "Open queue" : humanizeEnum(tab)}
            </Link>
          );
        })}
      </nav>

      {reports.length === 0 ? (
        <p className="card p-5 text-sm text-ink-500">No reports in this view.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900">
                    {humanizeEnum(report.reason)} · {humanizeEnum(report.targetType)}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {report.business ? (
                      <Link href={`/businesses/${report.business.slug}`} className="link-muted">
                        {report.business.name}
                      </Link>
                    ) : (
                      "No business linked"
                    )}
                    {" · "}
                    reported by {report.reporter?.displayName ?? "guest"} · {timeAgo(report.createdAt)}
                  </p>
                </div>
                <span className={report.status === "OPEN" ? "badge-danger" : "badge-neutral"}>
                  {humanizeEnum(report.status)}
                </span>
              </div>

              {report.detail ? (
                <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">{report.detail}</p>
              ) : null}
              {report.resolutionNote ? (
                <p className="mt-1 text-xs text-ink-500">Resolution: {report.resolutionNote}</p>
              ) : null}

              <form action={resolveReportAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="reportId" value={report.id} />
                <div>
                  <label className="label" htmlFor={`report-status-${report.id}`}>
                    Status
                  </label>
                  <select
                    id={`report-status-${report.id}`}
                    name="status"
                    defaultValue={report.status}
                    className="select text-sm"
                  >
                    {Object.values(ReportStatus).map((value) => (
                      <option key={value} value={value}>
                        {humanizeEnum(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <input name="note" className="input text-sm" placeholder="Resolution note" />
                <button type="submit" className="btn-primary btn-sm">
                  Update
                </button>
                <span className="text-xs text-ink-400">{formatDate(report.createdAt)}</span>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
