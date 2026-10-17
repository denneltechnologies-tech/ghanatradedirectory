"use client";

import { useActionState, useState } from "react";
import { reportAction } from "@/actions/engagement";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";

const REASONS: { value: string; label: string }[] = [
  { value: "INACCURATE", label: "Inaccurate information" },
  { value: "OUTDATED", label: "Outdated listing" },
  { value: "DUPLICATE", label: "Duplicate listing" },
  { value: "SUSPICIOUS", label: "Suspicious or scam" },
  { value: "OFFENSIVE", label: "Offensive content" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Something else" },
];

export function ReportDialog({
  targetType,
  targetId,
  businessId,
  label = "Report",
  path,
}: {
  targetType: string;
  targetId: string;
  businessId?: string;
  label?: string;
  path: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportAction, idleState);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-ghost btn-sm text-ink-500"
        aria-expanded={open}
      >
        ⚠ {label}
      </button>
      {open ? (
        <form
          action={formAction}
          className="absolute right-0 z-30 mt-2 w-72 space-y-3 rounded-lg border border-ink-200 bg-white p-4 shadow-xl"
        >
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          {businessId ? <input type="hidden" name="businessId" value={businessId} /> : null}
          <input type="hidden" name="path" value={path} />
          <div>
            <label htmlFor={`reason-${targetId}`} className="label">
              Reason
            </label>
            <select id={`reason-${targetId}`} name="reason" className="select" defaultValue="INACCURATE">
              {REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
            <FieldError state={state} name="reason" />
          </div>
          <div>
            <label htmlFor={`detail-${targetId}`} className="label">
              Details (optional)
            </label>
            <textarea
              id={`detail-${targetId}`}
              name="detail"
              rows={3}
              maxLength={1000}
              className="textarea"
              placeholder="Tell moderators what looks wrong."
            />
          </div>
          <StatusMessage state={state} />
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">
              Close
            </button>
            <SubmitButton className="btn-primary btn-sm">Send report</SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
