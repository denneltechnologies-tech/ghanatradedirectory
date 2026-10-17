import type { Metadata } from "next";
import { listRegionsWithDistricts } from "@/lib/services/admin";
import { createDistrictAction, deleteDistrictAction } from "@/actions/admin";

export const metadata: Metadata = { title: "Admin · Locations" };

export default async function AdminLocationsPage() {
  const regions = await listRegionsWithDistricts();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink-900">Regions &amp; districts</h2>
        <p className="text-sm text-ink-500">{regions.length} regions</p>
      </div>

      <div className="space-y-3">
        {regions.map((region) => (
          <details key={region.id} className="card p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className="font-semibold text-ink-900">{region.name}</span>
              <span className="text-xs text-ink-500">
                {region.districts.length} districts · {region._count.businessLocations} listings
              </span>
            </summary>

            <div className="mt-4 space-y-3">
              <form action={createDistrictAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="regionId" value={region.id} />
                <div>
                  <label className="label" htmlFor={`district-name-${region.id}`}>
                    District name
                  </label>
                  <input
                    id={`district-name-${region.id}`}
                    name="name"
                    required
                    className="input text-sm"
                    placeholder="e.g. Ablekuma North"
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`district-kind-${region.id}`}>
                    Kind
                  </label>
                  <input
                    id={`district-kind-${region.id}`}
                    name="kind"
                    className="input text-sm"
                    placeholder="Metropolitan / Municipal / District"
                  />
                </div>
                <button type="submit" className="btn-primary btn-sm">
                  Add district
                </button>
              </form>

              {region.districts.length === 0 ? (
                <p className="text-sm text-ink-500">No districts yet.</p>
              ) : (
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {region.districts.map((district) => (
                    <li
                      key={district.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm"
                    >
                      <span className="text-ink-700">
                        {district.name}
                        {district.kind ? <span className="ml-1 text-xs text-ink-400">· {district.kind}</span> : null}
                      </span>
                      <form action={deleteDistrictAction}>
                        <input type="hidden" name="id" value={district.id} />
                        <button type="submit" className="text-xs text-danger hover:underline">
                          Delete
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
