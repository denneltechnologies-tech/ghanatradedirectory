import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-2xl" aria-hidden>
        🔎
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="max-w-md text-sm text-ink-600">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-primary mt-1">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
