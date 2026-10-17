import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Profile settings" };

export default async function DashboardProfilePage() {
  const user = await requirePageUser();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Profile settings</h2>
        <p className="mt-1 text-sm text-ink-600">
          Update your name and contact phone. Your email ({user.email}) is used to sign in.
        </p>
      </div>
      <ProfileForm displayName={user.displayName} phone={user.phone ?? ""} />
    </div>
  );
}
