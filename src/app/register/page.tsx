import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create an account" };

const ALLOWED_ROLES = ["CUSTOMER", "BUSINESS_OWNER", "LOGISTICS_PROVIDER"];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const query = await searchParams;
  const roleParam = Array.isArray(query.role) ? query.role[0] : query.role;
  const role = roleParam && ALLOWED_ROLES.includes(roleParam) ? roleParam : "CUSTOMER";

  return <SignUpForm defaultRole={role} />;
}
