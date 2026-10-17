import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const tokenParam = Array.isArray(query.token) ? query.token[0] : query.token;

  if (!tokenParam) {
    return (
      <div className="container-page flex justify-center py-12">
        <div className="card w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="text-xl font-bold text-ink-900">Reset link missing</h1>
          <p className="mt-2 text-sm text-ink-600">
            This page needs a valid reset token. Request a new link to continue.
          </p>
          <Link href="/forgot-password" className="btn-primary mt-4">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={tokenParam} />;
}
