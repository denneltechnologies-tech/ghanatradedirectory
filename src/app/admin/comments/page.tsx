import type { Metadata } from "next";
import Link from "next/link";
import { getModerationComments } from "@/lib/services/admin";
import { moderateCommentAction } from "@/actions/engagement";
import { humanizeEnum, timeAgo } from "@/lib/format";
import { CommentStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Admin · Comments" };

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const statusParam = Array.isArray(query.status) ? query.status[0] : query.status;
  const status = (statusParam as CommentStatus) || "VISIBLE";
  const comments = await getModerationComments(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink-900">Comments</h2>
        <p className="text-sm text-ink-500">{comments.length} shown</p>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Comment status">
        {Object.values(CommentStatus).map((value) => (
          <Link
            key={value}
            href={`/admin/comments?status=${value}`}
            className={status === value ? "badge bg-ink-900 text-white" : "badge-neutral hover:bg-ink-200"}
          >
            {humanizeEnum(value)}
          </Link>
        ))}
      </nav>

      {comments.length === 0 ? (
        <p className="card p-5 text-sm text-ink-500">No comments with this status.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/businesses/${comment.business.slug}#comments`} className="font-semibold text-ink-900 hover:text-brand-700">
                    {comment.business.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink-500">
                    {comment.author.displayName} ({comment.author.email}) · {timeAgo(comment.createdAt)}
                  </p>
                </div>
                <span className={comment.status === "VISIBLE" ? "badge-brand" : "badge-neutral"}>
                  {humanizeEnum(comment.status)}
                </span>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-ink-700">{comment.body}</p>

              <form action={moderateCommentAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="commentId" value={comment.id} />
                <input name="note" className="input text-sm" placeholder="Moderation note" />
                <button type="submit" name="status" value="HIDDEN" className="btn-secondary btn-sm">
                  Hide
                </button>
                <button type="submit" name="status" value="REMOVED" className="btn-danger btn-sm">
                  Remove
                </button>
                <button type="submit" name="status" value="VISIBLE" className="btn-ghost btn-sm">
                  Restore
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
