import Link from "next/link";
import type { SectorCard as SectorCardType } from "@/lib/services/discovery";

export function SectorCard({ sector }: { sector: SectorCardType }) {
  return (
    <Link
      href={`/sectors/${sector.slug}`}
      className="card card-hover flex h-full flex-col gap-2 p-4"
      aria-label={`${sector.name}, ${sector.businessCount} businesses`}
    >
      <span className="text-2xl" aria-hidden>
        {sector.icon ?? "🏷️"}
      </span>
      <span className="font-semibold text-ink-900">{sector.name}</span>
      <span className="text-xs text-ink-500">
        {sector.businessCount} {sector.businessCount === 1 ? "business" : "businesses"}
      </span>
    </Link>
  );
}
