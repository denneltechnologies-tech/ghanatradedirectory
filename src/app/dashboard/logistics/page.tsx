import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { getProviderProfileForUser } from "@/lib/services/logistics";
import { listBusinessesForUser } from "@/lib/services/businesses";
import { getRegionOptions } from "@/lib/services/discovery";
import { ProviderForm, type ProviderValues } from "@/components/provider-form";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Logistics profile" };

export default async function DashboardLogisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const query = await searchParams;

  const [provider, businesses, regions] = await Promise.all([
    getProviderProfileForUser(user.id),
    listBusinessesForUser(user.id),
    getRegionOptions(),
  ]);

  const options = businesses.map((business) => ({ id: business.id, name: business.name }));

  if (options.length === 0) {
    return (
      <EmptyState
        title="Add a business first"
        description="A logistics profile is attached to one of your businesses. Create a business listing, then set up your provider profile here."
        actionHref="/dashboard/businesses/new"
        actionLabel="Add a business"
      />
    );
  }

  const values: ProviderValues = {
    businessId: provider?.businessId ?? options[0].id,
    description: provider?.description ?? "",
    serviceTypes: provider?.serviceTypes ?? [],
    coverage: provider?.coverage ?? [],
    baseRegionId: provider?.baseRegionId ?? "",
    baseDistrictId: provider?.baseDistrictId ?? "",
    namedRoutes: (provider?.namedRoutes ?? []).join(", "),
    vehicleTypes: (provider?.vehicleTypes ?? []).join(", "),
    capacityMinKg: provider?.capacityMinKg != null ? provider.capacityMinKg.toString() : "",
    capacityMaxKg: provider?.capacityMaxKg != null ? provider.capacityMaxKg.toString() : "",
    operatingHours: provider?.operatingHours ?? "",
    trackingMethod: provider?.trackingMethod ?? "",
    insurancePolicy: provider?.insurancePolicy ?? "",
    responseHours: provider?.responseHours != null ? String(provider.responseHours) : "",
    contactChannel: provider?.contactChannel ?? "",
    active: provider?.active ?? true,
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Logistics profile</h2>
        <p className="mt-1 text-sm text-ink-600">
          Providers receive quote requests from customers and can respond from{" "}
          <Link href="/dashboard/quotes" className="link-muted">
            Quote requests
          </Link>
          . Quoting is not a confirmed booking — agree terms directly with the customer.
        </p>
      </div>

      {query.saved ? (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Provider profile saved.
        </p>
      ) : null}

      {provider && !provider.active ? (
        <p className="rounded-lg border border-gold-200 bg-gold-100 px-3 py-2 text-sm text-gold-500">
          Your profile is currently inactive and hidden from the directory.
        </p>
      ) : null}

      <ProviderForm
        businesses={options}
        regions={regions}
        values={values}
        lockedBusiness={Boolean(provider)}
      />
    </div>
  );
}
