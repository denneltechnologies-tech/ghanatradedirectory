import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listProviders } from "@/lib/services/logistics";
import { getRegionOptions } from "@/lib/services/discovery";
import { QuoteRequestForm, type ProviderOption } from "@/components/quote-request-form";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Request a delivery quote",
  description:
    "Send one delivery or transport request to the logistics providers you choose and receive quotes.",
};

export default async function QuoteRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/logistics/quote");

  const query = await searchParams;
  const providerParam = Array.isArray(query.provider) ? query.provider[0] : query.provider;
  const serviceParam = Array.isArray(query.serviceType) ? query.serviceType[0] : query.serviceType;

  const [providerResult, regions] = await Promise.all([
    listProviders({ page: 1, perPage: 48, serviceType: serviceParam }),
    getRegionOptions(),
  ]);

  const providers: ProviderOption[] = providerResult.items.map((item) => ({
    id: item.id,
    businessName: item.business.name,
    regionName: item.baseRegion?.name ?? null,
  }));

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Request a delivery or transport quote</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          Describe what needs moving, choose the providers you want, and they will reply with a
          quote. Quoting is not a confirmed booking — agree final terms with the provider.{" "}
          <Link href="/logistics" className="link-muted">
            Browse providers
          </Link>
        </p>
      </header>

      {providers.length === 0 ? (
        <EmptyState
          title="No providers available yet"
          description="There are no active logistics providers to send a request to. Check back soon."
          actionHref="/logistics"
          actionLabel="Back to providers"
        />
      ) : (
        <QuoteRequestForm
          providers={providers}
          regions={regions}
          preselectedProviderId={providerParam}
          defaults={{
            contactName: user.displayName,
            contactPhone: user.phone ?? "",
            contactEmail: user.email,
          }}
        />
      )}
    </div>
  );
}
