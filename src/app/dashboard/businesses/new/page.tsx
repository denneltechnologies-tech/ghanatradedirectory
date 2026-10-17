import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { getRegionOptions, getSectorOptions } from "@/lib/services/discovery";
import { BusinessForm, emptyBusinessValues } from "@/components/business-form";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Add a business" };

export default async function NewBusinessPage() {
  await requirePageUser();

  const [sectorOptions, regionOptions, categories] = await Promise.all([
    getSectorOptions(),
    getRegionOptions(),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, icon: true, parentId: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  void sectorOptions;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Add a business</h2>
        <p className="mt-1 text-sm text-ink-600">
          Listings start as drafts. Add your products or services, then submit for review.{" "}
          <Link href="/dashboard" className="link-muted">
            Back to dashboard
          </Link>
        </p>
      </div>
      <BusinessForm
        mode="create"
        values={emptyBusinessValues}
        categories={categories}
        regions={regionOptions}
      />
    </div>
  );
}
