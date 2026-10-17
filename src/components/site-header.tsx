import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-ink-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
            GH
          </span>
          <span className="hidden text-[15px] leading-tight sm:block">
            Ghana Business
            <br />
            Directory
          </span>
        </Link>
        <div className="ml-auto">
          <UserMenu
            user={
              user
                ? { displayName: user.displayName, role: user.role, isStaff: isStaff(user) }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
}
