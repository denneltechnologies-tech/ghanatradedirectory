"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { createCommentAction, deleteCommentAction } from "@/actions/engagement";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";
import { ReportDialog } from "@/components/report-dialog";
import { initials, timeAgo } from "@/lib/format";

export type CommentItem = {
  id: string;
  body: string;
  status: string;
  editedAt: Date | string | null;
  createdAt: Date | string;
  author: { id: string; displayName: string };
};

export function CommentSection({
  businessId,
  path,
  items,
  total,
  page,
  totalPages,
  isAuthenticated,
  currentUserId,
  canModerate,
}: {
  businessId: string;
  path: string;
  items: CommentItem[];
  total: number;
  page: number;
  totalPages: number;
  isAuthenticated: boolean;
  currentUserId?: string | null;
  canModerate?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createCommentAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <section className="card p-5" id="comments">
      <div className="flex items-center justify-between">
        <h2 className="section-title">
          Comments <span className="text-ink-400">({total})</span>
        </h2>
      </div>

      {isAuthenticated ? (
        <form ref={formRef} action={formAction} className="mt-4 space-y-2">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="path" value={path} />
          <label htmlFor="comment-body" className="sr-only">
            Write a comment
          </label>
          <textarea
            id="comment-body"
            name="body"
            rows={3}
            maxLength={1000}
            className="textarea"
            placeholder="Share your experience with this business (be specific and fair)."
          />
          <FieldError state={state} name="body" />
          <StatusMessage state={state} />
          <div className="flex justify-end">
            <SubmitButton className="btn-primary btn-sm">Post comment</SubmitButton>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="link-muted font-medium">
            Sign in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {items.length === 0 ? (
          <li className="text-sm text-ink-500">No comments yet. Be the first to share feedback.</li>
        ) : (
          items.map((comment) => (
            <li key={comment.id} className="flex gap-3 border-t border-ink-100 pt-4 first:border-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {initials(comment.author.displayName) || "U"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-ink-900">{comment.author.displayName}</span>
                  <span className="text-xs text-ink-400">{timeAgo(comment.createdAt)}</span>
                  {comment.editedAt ? (
                    <span className="text-xs text-ink-400">· edited</span>
                  ) : null}
                  {comment.status !== "VISIBLE" ? (
                    <span className="badge-neutral">{comment.status.toLowerCase()}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm whitespace-pre-line text-ink-700">{comment.body}</p>
                <div className="mt-1 flex items-center gap-2">
                  {currentUserId === comment.author.id ? (
                    <form action={deleteCommentAction}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="path" value={path} />
                      <button type="submit" className="btn-ghost btn-sm text-ink-500">
                        Delete
                      </button>
                    </form>
                  ) : null}
                  {isAuthenticated && currentUserId !== comment.author.id ? (
                    <ReportDialog
                      targetType="COMMENT"
                      targetId={comment.id}
                      businessId={businessId}
                      path={path}
                      label="Report"
                    />
                  ) : null}
                  {canModerate ? (
                    <span className="badge-neutral">moderator view</span>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Comment pages">
          {page > 1 ? (
            <Link
              href={`${path}${path.includes("?") ? "&" : "?"}commentsPage=${page - 1}#comments`}
              className="btn-secondary btn-sm"
            >
              Newer
            </Link>
          ) : null}
          <span className="text-xs text-ink-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`${path}${path.includes("?") ? "&" : "?"}commentsPage=${page + 1}#comments`}
              className="btn-secondary btn-sm"
            >
              Older
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
