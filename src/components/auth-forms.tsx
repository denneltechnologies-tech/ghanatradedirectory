"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/actions/auth";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";

const inputClass = "input";

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-sm text-ink-600">{footer}</div> : null}
      </div>
    </div>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInAction, idleState);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your dashboard, listings and quote requests."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="link-muted font-medium">
            Create an account
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="signin-email" className="label">
            Email
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder="you@example.com"
          />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label htmlFor="signin-password" className="label">
            Password
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            placeholder="••••••••"
          />
          <FieldError state={state} name="password" />
        </div>
        <StatusMessage state={state} />
        <SubmitButton className="btn-primary w-full">Sign in</SubmitButton>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="link-muted">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

const ROLE_OPTIONS = [
  { value: "CUSTOMER", label: "I am here to find businesses" },
  { value: "BUSINESS_OWNER", label: "I want to list a business" },
  { value: "LOGISTICS_PROVIDER", label: "I provide delivery or transport services" },
];

export function SignUpForm({ defaultRole = "CUSTOMER" }: { defaultRole?: string }) {
  const [state, formAction] = useActionState(signUpAction, idleState);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to join. Listing a business or logistics service is free."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="link-muted font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="label">
            Full name
          </label>
          <input id="signup-name" name="displayName" required className={inputClass} placeholder="Ama Mensah" />
          <FieldError state={state} name="displayName" />
        </div>
        <div>
          <label htmlFor="signup-email" className="label">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder="you@example.com"
          />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label htmlFor="signup-phone" className="label">
            Phone (optional)
          </label>
          <input id="signup-phone" name="phone" className={inputClass} placeholder="0XX XXX XXXX" />
        </div>
        <div>
          <label htmlFor="signup-password" className="label">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            placeholder="At least 8 characters"
          />
          <FieldError state={state} name="password" />
        </div>
        <div>
          <label htmlFor="signup-role" className="label">
            How will you use the directory?
          </label>
          <select id="signup-role" name="role" defaultValue={defaultRole} className="select">
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 rounded border-ink-300" />
          <span>
            I agree to keep listings accurate and to the platform&apos;s fair-use terms.
          </span>
        </label>
        <FieldError state={state} name="acceptTerms" />
        <StatusMessage state={state} />
        <SubmitButton className="btn-primary w-full">Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, idleState);

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send a reset link."
      footer={
        <Link href="/login" className="link-muted font-medium">
          Back to sign in
        </Link>
      }
    >
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="forgot-email" className="label">
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="you@example.com"
          />
          <FieldError state={state} name="email" />
        </div>
        <StatusMessage state={state} />
        {state.token ? (
          <p className="rounded-lg border border-gold-200 bg-gold-100 px-3 py-2 text-xs break-all text-gold-500">
            Dev reset link:{" "}
            <Link href={`/reset-password?token=${state.token}`} className="font-medium underline">
              /reset-password?token={state.token.slice(0, 12)}…
            </Link>
          </p>
        ) : null}
        <SubmitButton className="btn-primary w-full">Send reset link</SubmitButton>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, idleState);
  const [mismatch, setMismatch] = useState(false);

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Set a new password, then sign in with it."
      footer={
        <Link href="/login" className="link-muted font-medium">
          Back to sign in
        </Link>
      }
    >
      <form
        action={formAction}
        className="space-y-4"
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          if (data.get("password") !== data.get("confirmPassword")) {
            event.preventDefault();
            setMismatch(true);
          } else {
            setMismatch(false);
          }
        }}
      >
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="reset-password" className="label">
            New password
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            required
            minLength={8}
            className={inputClass}
            placeholder="At least 8 characters"
          />
          <FieldError state={state} name="password" />
        </div>
        <div>
          <label htmlFor="reset-confirm" className="label">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className={inputClass}
            placeholder="Repeat password"
          />
          {mismatch ? <p className="field-error">Passwords do not match.</p> : null}
        </div>
        <StatusMessage state={state} />
        <SubmitButton className="btn-primary w-full">Update password</SubmitButton>
      </form>
    </AuthShell>
  );
}
