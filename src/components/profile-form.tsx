"use client";

import { useActionState } from "react";
import { deactivateAccountAction, updateProfileAction } from "@/actions/auth";
import { idleState } from "@/lib/actions";
import { FieldError, StatusMessage, SubmitButton } from "@/components/form-bits";

export function ProfileForm({
  displayName,
  phone,
}: {
  displayName: string;
  phone: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, idleState);

  return (
    <div className="space-y-6">
      <form action={formAction} className="card space-y-4 p-5">
        <h2 className="section-title">Profile</h2>
        <div>
          <label htmlFor="profile-name" className="label">
            Display name
          </label>
          <input id="profile-name" name="displayName" defaultValue={displayName} required className="input" />
          <FieldError state={state} name="displayName" />
        </div>
        <div>
          <label htmlFor="profile-phone" className="label">
            Phone
          </label>
          <input id="profile-phone" name="phone" defaultValue={phone} className="input" placeholder="0XX XXX XXXX" />
        </div>
        <div>
          <label htmlFor="profile-password" className="label">
            New password (leave blank to keep current)
          </label>
          <input
            id="profile-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="input"
            placeholder="At least 8 characters"
          />
          <FieldError state={state} name="password" />
        </div>
        <StatusMessage state={state} />
        <SubmitButton className="btn-primary btn-sm">Save profile</SubmitButton>
      </form>

      <form
        action={deactivateAccountAction}
        className="card space-y-3 border-red-200 p-5"
        onSubmit={(event) => {
          if (!window.confirm("Deactivate your account? Your listings will be archived.")) {
            event.preventDefault();
          }
        }}
      >
        <h2 className="section-title text-danger">Deactivate account</h2>
        <p className="text-sm text-ink-600">
          This signs you out everywhere, archives your listings and anonymises your profile. This
          cannot be undone from the app.
        </p>
        <SubmitButton className="btn-danger btn-sm" pendingLabel="Deactivating…">
          Deactivate my account
        </SubmitButton>
      </form>
    </div>
  );
}
