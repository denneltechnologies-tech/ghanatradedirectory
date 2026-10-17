"use client";

import Link from "next/link";
import { useActionState } from "react";
import { claimBusinessAction } from "@/actions/business";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";

export function ClaimForm({
  businessId,
  path,
  isAuthenticated,
}: {
  businessId: string;
  path: string;
  isAuthenticated: boolean;
}) {
  const [state, formAction] = useActionState(claimBusinessAction, idleState);

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-ink-600">
        <Link href={`/login?next=${encodeURIComponent(path)}`} className="link-muted font-medium">
          Sign in
        </Link>{" "}
        to claim this listing if you own or manage it.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <div>
        <label htmlFor="claim-evidence" className="label">
          Evidence you manage this business
        </label>
        <textarea
          id="claim-evidence"
          name="evidence"
          rows={3}
          maxLength={1500}
          className="textarea"
          placeholder="e.g. I am the registered owner; I can confirm the listed phone number and business registration."
        />
        <FieldError state={state} name="evidence" />
      </div>
      <div>
        <label htmlFor="claim-phone" className="label">
          Contact phone (optional)
        </label>
        <input id="claim-phone" name="contactPhone" className="input" placeholder="0XX XXX XXXX" />
      </div>
      <StatusMessage state={state} />
      <SubmitButton className="btn-primary btn-sm">Submit claim</SubmitButton>
    </form>
  );
}
