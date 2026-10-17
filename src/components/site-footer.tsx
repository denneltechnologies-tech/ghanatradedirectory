import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-block">
            <img
              src="/logo.png"
              alt="GhanaMarketTrade"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <p className="mt-3 text-sm text-ink-600">
            Find and buy anything in Ghana. Connect directly with trusted Ghanaian businesses, verified commercial providers, and logistics services.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Discover</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>
              <Link href="/search" className="link-muted">
                Browse businesses
              </Link>
            </li>
            <li>
              <Link href="/sectors" className="link-muted">
                Sectors
              </Link>
            </li>
            <li>
              <Link href="/logistics" className="link-muted">
                Logistics providers
              </Link>
            </li>
            <li>
              <Link href="/logistics/quote" className="link-muted">
                Request a delivery quote
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">For businesses</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>
              <Link href="/register" className="link-muted">
                Create a free listing
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="link-muted">
                Owner dashboard
              </Link>
            </li>
            <li>
              <Link href="/dashboard/logistics" className="link-muted">
                Offer logistics services
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Trust &amp; safety</h2>
          <p className="mt-3 text-sm text-ink-600">
            Labels describe the exact check completed, not payment or government approval. Report
            inaccurate or suspicious listings at any time.
          </p>
        </div>
      </div>
      <div className="border-t border-ink-100 py-4">
        <p className="container-page text-xs text-ink-500">
          © {new Date().getFullYear()} Ghana Business Directory. Prices shown in Ghana cedi (GHS)
          where provided. Listings are supplied by owners; always confirm details before paying.
        </p>
        <p className="container-page mt-1 text-xs text-ink-500">
          Some listings include data derived from{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            className="link-muted"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>{" "}
          (available under the Open Database License) and from Google. These are flagged as unclaimed
          and awaiting verification.
        </p>
      </div>
    </footer>
  );
}
