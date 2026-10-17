import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <img
            src="/logo.png"
            alt="GhanaMarketTrade — Find and buy anything in Ghana"
            className="h-10 w-auto object-contain sm:h-12"
          />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {user && isStaff(user) ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
              ⚡ Super Admin
            </Link>
          ) : null}
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
