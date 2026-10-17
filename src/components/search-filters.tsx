"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type Option = { id: string; name: string; slug: string };
type RegionOption = Option & { districts: Option[] };

export function SearchFilters({
  sectors,
  regions,
  values,
}: {
  sectors: Option[];
  regions: RegionOption[];
  values: {
    q?: string;
    sector?: string;
    subcategory?: string;
    region?: string;
    district?: string;
    town?: string;
    type?: string;
    delivery?: boolean;
    sort?: string;
  };
}) {
  const router = useRouter();
  const [sector, setSector] = useState(values.sector ?? "");
  const [region, setRegion] = useState(values.region ?? "");
  const [district, setDistrict] = useState(values.district ?? "");
  const [type, setType] = useState(values.type ?? "");
  const [town, setTown] = useState(values.town ?? "");
  const [delivery, setDelivery] = useState(Boolean(values.delivery));
  const [sort, setSort] = useState(values.sort ?? "");
  const [q, setQ] = useState(values.q ?? "");

  const districts = useMemo(
    () => regions.find((option) => option.slug === region)?.districts ?? [],
    [regions, region],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (sector) params.set("sector", sector);
    if (region) params.set("region", region);
    if (region && district) params.set("district", district);
    if (town.trim()) params.set("town", town.trim());
    if (type) params.set("type", type);
    if (delivery) params.set("delivery", "1");
    if (sort) params.set("sort", sort);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clear() {
    router.push("/search");
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Filters</h2>
        <button type="button" onClick={clear} className="text-xs text-ink-500 hover:text-brand-700">
          Clear all
        </button>
      </div>

      <div>
        <label htmlFor="filter-q" className="label">
          Keyword
        </label>
        <input
          id="filter-q"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Business, product or service"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="filter-sector" className="label">
          Sector
        </label>
        <select
          id="filter-sector"
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
        <label htmlFor="filter-region" className="label">
          Region
        </label>
        <select
          id="filter-region"
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setDistrict("");
          }}
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

      <div>
        <label htmlFor="filter-district" className="label">
          District
        </label>
        <select
          id="filter-district"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
          className="select"
          disabled={!region}
        >
          <option value="">All districts</option>
          {districts.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-town" className="label">
          Town / area
        </label>
        <input
          id="filter-town"
          value={town}
          onChange={(event) => setTown(event.target.value)}
          placeholder="e.g. Tema, Cape Coast"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="filter-type" className="label">
          Offers
        </label>
        <select
          id="filter-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="select"
        >
          <option value="">Products and services</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={delivery}
          onChange={(event) => setDelivery(event.target.checked)}
          className="h-4 w-4 rounded border-ink-300"
        />
        Offers delivery
      </label>

      <div>
        <label htmlFor="filter-sort" className="label">
          Sort by
        </label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="select"
        >
          <option value="">Recommended</option>
          <option value="recent">Recently added</option>
          <option value="popular">Most viewed</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      <button type="submit" className="btn-primary w-full">
        Apply filters
      </button>
    </form>
  );
}
