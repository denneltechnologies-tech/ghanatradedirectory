import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { humanizeEnum, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function DashboardNotificationsPage() {
  const user = await requirePageUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Notifications</h2>
        <p className="mt-1 text-sm text-ink-600">
          Updates about claims, quote requests and your listings.
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="We will let you know when something needs your attention." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const content = (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg" aria-hidden>
                  {notification.type === "QUOTE_REQUEST"
                    ? "🚚"
                    : notification.type === "QUOTE_RESPONSE"
                      ? "💬"
                      : notification.type === "CLAIM_STATUS"
                        ? "🛡️"
                        : "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
                    {notification.title}
                    {!notification.readAt ? <span className="badge-brand">new</span> : null}
                  </p>
                  {notification.body ? (
                    <p className="mt-0.5 text-sm text-ink-600">{notification.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-400">
                    {humanizeEnum(notification.type)} · {timeAgo(notification.createdAt)}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={notification.id} className="card p-4">
                {notification.link ? (
                  <Link href={notification.link} className="block hover:opacity-90">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
