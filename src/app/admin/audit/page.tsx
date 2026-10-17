import type { Metadata } from "next";
import { listAuditEvents, listModerationEvents } from "@/lib/services/admin";
import { formatDate, humanizeEnum, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Audit log" };

export default async function AdminAuditPage() {
  const [auditEvents, moderationEvents] = await Promise.all([
    listAuditEvents(100),
    listModerationEvents(100),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink-900">Moderation activity</h2>
        {moderationEvents.length === 0 ? (
          <p className="card p-5 text-sm text-ink-500">No moderation activity recorded.</p>
        ) : (
          <ul className="card divide-y divide-ink-100">
            {moderationEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium text-ink-800">
                    {humanizeEnum(event.action)}{" "}
                    <span className="text-xs text-ink-400">({humanizeEnum(event.targetType)})</span>
                  </p>
                  <p className="text-xs text-ink-500">
                    {event.actor?.displayName ?? "system"}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </div>
                <span className="text-xs text-ink-400" title={formatDate(event.createdAt)}>
                  {timeAgo(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink-900">Audit trail</h2>
        {auditEvents.length === 0 ? (
          <p className="card p-5 text-sm text-ink-500">No audit events recorded.</p>
        ) : (
          <ul className="card divide-y divide-ink-100">
            {auditEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium text-ink-800">{humanizeEnum(event.action)}</p>
                  <p className="text-xs text-ink-500">
                    {event.actor ? `${event.actor.displayName} (${event.actor.role})` : "system"}
                    {event.targetType ? ` · ${humanizeEnum(event.targetType)}` : ""}
                    {event.targetId ? ` · ${event.targetId.slice(0, 8)}…` : ""}
                  </p>
                </div>
                <span className="text-xs text-ink-400" title={formatDate(event.createdAt)}>
                  {timeAgo(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
