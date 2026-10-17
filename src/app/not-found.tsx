import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-5xl" aria-hidden>
        🧭
      </span>
      <h1 className="text-2xl font-bold text-ink-900">We could not find that page</h1>
      <p className="max-w-md text-sm text-ink-600">
        The listing may have been removed, renamed, or never existed. Try searching the directory
        instead.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary">
          Back home
        </Link>
        <Link href="/search" className="btn-secondary">
          Browse businesses
        </Link>
      </div>
    </div>
  );
}
