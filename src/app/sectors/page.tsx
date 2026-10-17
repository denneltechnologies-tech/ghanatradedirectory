import type { Metadata } from "next";
import { SectorCard } from "@/components/sector-card";
import { EmptyState } from "@/components/empty-state";
import { getSectorCards } from "@/lib/services/discovery";

export const metadata: Metadata = {
  title: "Sectors",
  description: "Browse Ghanaian businesses by sector, from agriculture and food to logistics and construction.",
};

export default async function SectorsPage() {
  const sectors = await getSectorCards();

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Browse by sector</h1>
        <p className="mt-1 text-sm text-ink-600">
          Pick a sector to see businesses, then narrow by region and district.
        </p>
      </header>

      {sectors.length === 0 ? (
        <EmptyState
          title="No sectors yet"
          description="Sectors appear here once an administrator adds them."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sectors.map((sector) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </div>
      )}
    </div>
  );
}
