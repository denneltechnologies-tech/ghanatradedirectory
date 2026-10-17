import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const next = safeNext(query.next);

  if (user) redirect(next);

  return (
    <div>
      {query.reset ? (
        <p className="container-page mt-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Your password was updated. Please sign in.
        </p>
      ) : null}
      <SignInForm next={next} />
    </div>
  );
}
