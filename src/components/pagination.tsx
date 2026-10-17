import Link from "next/link";

function hrefFor(
  pathname: string,
  params: Record<string, string | number | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  if (page > 1) search.set("page", String(page));
  else search.delete("page");
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function Pagination({
  pathname,
  params,
  page,
  totalPages,
}: {
  pathname: string;
  params: Record<string, string | number | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={hrefFor(pathname, params, Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`btn-secondary btn-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
      >
        Previous
      </Link>
      {pages.map((number) => (
        <Link
          key={number}
          href={hrefFor(pathname, params, number)}
          aria-current={number === page ? "page" : undefined}
          className={
            number === page
              ? "btn btn-sm bg-brand-600 text-white"
              : "btn-secondary btn-sm"
          }
        >
          {number}
        </Link>
      ))}
      <Link
        href={hrefFor(pathname, params, Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`btn-secondary btn-sm ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
      >
        Next
      </Link>
    </nav>
  );
}
