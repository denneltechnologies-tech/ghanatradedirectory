"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? "Please wait…") : children}
    </button>
  );
}

export function StatusMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <p
      role="status"
      aria-live="polite"
      className={
        isError
          ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger"
          : "rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700"
      }
    >
      {state.message}
    </p>
  );
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const message = state.fieldErrors?.[name];
  if (!message) return null;
  return <p className="field-error">{message}</p>;
}
