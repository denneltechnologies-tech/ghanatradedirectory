"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Option = { id: string; name: string; slug: string };

export function SearchForm({
  defaultQuery = "",
  defaultSector = "",
  defaultRegion = "",
  sectors = [],
  regions = [],
  variant = "hero",
}: {
  defaultQuery?: string;
  defaultSector?: string;
  defaultRegion?: string;
  sectors?: Option[];
  regions?: Option[];
  variant?: "hero" | "inline";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [sector, setSector] = useState(defaultSector);
  const [region, setRegion] = useState(defaultRegion);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (sector) params.set("sector", sector);
    if (region) params.set("region", region);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  if (variant === "inline") {
    return (
      <form onSubmit={submit} role="search" className="flex w-full gap-2">
        <label htmlFor="inline-search" className="sr-only">
          Search businesses
        </label>
        <input
          id="inline-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search businesses, products, services"
          className="input"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="card grid gap-3 p-4 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:items-end"
    >
      <div>
        <label htmlFor="hero-search" className="label">
          What are you looking for?
        </label>
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. plumber, fresh produce, catering"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="hero-sector" className="label">
          Sector
        </label>
        <select
          id="hero-sector"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
          className="select"
        >
          <option value="">All sectors</option>
          {sectors.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="hero-region" className="label">
          Region
        </label>
        <select
          id="hero-region"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          className="select"
        >
          <option value="">All regions</option>
          {regions.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary h-[42px]">
        Search
      </button>
    </form>
  );
}
