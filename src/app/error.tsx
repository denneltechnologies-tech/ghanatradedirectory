"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-5xl" aria-hidden>
        ⚠️
      </span>
      <h1 className="text-2xl font-bold text-ink-900">
        {error.message?.includes("database") || error.digest?.includes("P1001") || error.message?.includes("reach database")
          ? "Database Not Connected"
          : "Something went wrong"}
      </h1>
      <p className="max-w-md text-sm text-ink-600">
        {error.message === "UNAUTHENTICATED"
          ? "Please sign in to continue."
          : error.message === "FORBIDDEN"
            ? "You do not have permission to view this."
            : error.message?.includes("database") || error.digest?.includes("P1001") || error.message?.includes("reach database")
              ? "Unable to reach PostgreSQL at 127.0.0.1:5433. Start your database container with 'docker compose up -d' or update DATABASE_URL in .env."
              : "An unexpected error occurred. Please try again."}
      </p>
      <button type="button" onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
