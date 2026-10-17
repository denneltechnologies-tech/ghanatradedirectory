import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import type { BusinessStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = "";
  if (val instanceof Date) {
    str = val.toISOString();
  } else if (Array.isArray(val)) {
    str = val.join("; ");
  } else if (typeof val === "object") {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes(";")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) {
    return new Response("Unauthorized. Super administrator access required.", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const { type } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format")?.toLowerCase() === "json" ? "json" : "csv";
  const dateStr = new Date().toISOString().split("T")[0];

  // 1. BUSINESSES EXPORT
  if (type === "businesses") {
    const statusParam = searchParams.get("status");
    const categoryId = searchParams.get("categoryId") || undefined;
    const regionId = searchParams.get("regionId") || undefined;
    const q = searchParams.get("q") || undefined;

    const where: any = {
      deletedAt: null,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as BusinessStatus;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (regionId) {
      where.locations = { some: { regionId } };
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const businesses = await prisma.business.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        locations: {
          include: {
            region: { select: { id: true, name: true } },
            district: { select: { id: true, name: true } },
          },
        },
        offerings: {
          select: {
            id: true,
            title: true,
            type: true,
            priceAmount: true,
            currency: true,
            description: true,
          },
        },
        owner: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { name: "asc" },
    });

    if (format === "json") {
      const jsonData = businesses.map((b) => {
        const primaryLoc = b.locations[0];
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          category: b.category?.name ?? null,
          categorySlug: b.category?.slug ?? null,
          status: b.status,
          verificationLevel: b.verificationLevel,
          verifiedAt: b.verifiedAt,
          phone: b.phone,
          whatsapp: b.whatsapp,
          email: b.email,
          website: b.website,
          contactHours: b.contactHours,
          preferredChannel: b.preferredChannel,
          description: b.description,
          longDescription: b.longDescription,
          location: primaryLoc
            ? {
                region: primaryLoc.region?.name ?? null,
                district: primaryLoc.district?.name ?? null,
                locality: primaryLoc.locality,
                address: primaryLoc.address,
                landmark: primaryLoc.landmark,
                latitude: primaryLoc.latitude,
                longitude: primaryLoc.longitude,
              }
            : null,
          allLocations: b.locations.map((loc) => ({
            region: loc.region?.name ?? null,
            district: loc.district?.name ?? null,
            locality: loc.locality,
            address: loc.address,
            landmark: loc.landmark,
            latitude: loc.latitude,
            longitude: loc.longitude,
          })),
          offerings: b.offerings.map((o) => ({
            id: o.id,
            title: o.title,
            type: o.type,
            price: o.priceAmount ? Number(o.priceAmount) : null,
            currency: o.currency,
            description: o.description,
          })),
          deliveryOffered: b.deliveryOffered,
          paymentMethods: b.paymentMethods,
          languages: b.languages,
          tags: b.tags,
          featured: b.featured,
          viewCount: b.viewCount,
          claimed: b.claimed,
          registrationName: b.registrationName,
          registrationId: b.registrationId,
          source: b.source,
          sourceRef: b.sourceRef,
          sourceUrl: b.sourceUrl,
          logoUrl: b.logoKey,
          coverUrl: b.coverKey,
          owner: b.owner?.displayName ?? null,
          ownerEmail: b.owner?.email ?? null,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          publishedAt: b.publishedAt,
        };
      });

      return new Response(JSON.stringify(jsonData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="ghana-trade-businesses-${dateStr}.json"`,
        },
      });
    }

    // CSV format
    const headers = [
      "ID",
      "Business Name",
      "Slug",
      "Sector / Category",
      "Status",
      "Verification Level",
      "Verified Date",
      "Phone",
      "WhatsApp",
      "Email",
      "Website",
      "Region",
      "District",
      "Locality",
      "Address",
      "Landmark",
      "Latitude",
      "Longitude",
      "Description",
      "Long Description",
      "Contact Hours",
      "Preferred Channel",
      "Delivery Offered",
      "Payment Methods",
      "Tags",
      "Languages",
      "Featured",
      "View Count",
      "Claimed",
      "Registration Name",
      "Registration ID",
      "Import Source",
      "Source Ref",
      "Source URL",
      "Logo URL",
      "Cover URL",
      "Products & Services Count",
      "Products & Services List",
      "Owner Name",
      "Owner Email",
      "Created At",
      "Updated At",
      "Published At",
    ];

    const rows = businesses.map((b) => {
      const primaryLoc = b.locations[0];
      const offeringsSummary = b.offerings
        .map((o) => `${o.title}${o.priceAmount ? ` (${o.currency} ${Number(o.priceAmount).toFixed(2)})` : ""}`)
        .join("; ");

      return [
        escapeCsv(b.id),
        escapeCsv(b.name),
        escapeCsv(b.slug),
        escapeCsv(b.category?.name),
        escapeCsv(b.status),
        escapeCsv(b.verificationLevel),
        escapeCsv(b.verifiedAt),
        escapeCsv(b.phone),
        escapeCsv(b.whatsapp),
        escapeCsv(b.email),
        escapeCsv(b.website),
        escapeCsv(primaryLoc?.region?.name),
        escapeCsv(primaryLoc?.district?.name),
        escapeCsv(primaryLoc?.locality),
        escapeCsv(primaryLoc?.address),
        escapeCsv(primaryLoc?.landmark),
        escapeCsv(primaryLoc?.latitude),
        escapeCsv(primaryLoc?.longitude),
        escapeCsv(b.description),
        escapeCsv(b.longDescription),
        escapeCsv(b.contactHours),
        escapeCsv(b.preferredChannel),
        escapeCsv(b.deliveryOffered ? "YES" : "NO"),
        escapeCsv(b.paymentMethods),
        escapeCsv(b.tags),
        escapeCsv(b.languages),
        escapeCsv(b.featured ? "YES" : "NO"),
        escapeCsv(b.viewCount),
        escapeCsv(b.claimed ? "YES" : "NO"),
        escapeCsv(b.registrationName),
        escapeCsv(b.registrationId),
        escapeCsv(b.source),
        escapeCsv(b.sourceRef),
        escapeCsv(b.sourceUrl),
        escapeCsv(b.logoKey),
        escapeCsv(b.coverKey),
        escapeCsv(b.offerings.length),
        escapeCsv(offeringsSummary),
        escapeCsv(b.owner?.displayName),
        escapeCsv(b.owner?.email),
        escapeCsv(b.createdAt),
        escapeCsv(b.updatedAt),
        escapeCsv(b.publishedAt),
      ].join(",");
    });

    // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ghana-trade-businesses-${dateStr}.csv"`,
      },
    });
  }

  // 2. CATEGORIES EXPORT
  if (type === "categories" || type === "sectors") {
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { name: true } },
        _count: { select: { businesses: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    if (format === "json") {
      return new Response(JSON.stringify(categories, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="ghana-trade-categories-${dateStr}.json"`,
        },
      });
    }

    const headers = [
      "ID",
      "Category Name",
      "Slug",
      "Parent Category",
      "Icon (Emoji)",
      "Description",
      "Active",
      "Featured",
      "Sort Order",
      "Total Businesses",
      "Created At",
    ];

    const rows = categories.map((c) =>
      [
        escapeCsv(c.id),
        escapeCsv(c.name),
        escapeCsv(c.slug),
        escapeCsv(c.parent?.name),
        escapeCsv(c.icon),
        escapeCsv(c.description),
        escapeCsv(c.active ? "YES" : "NO"),
        escapeCsv(c.featured ? "YES" : "NO"),
        escapeCsv(c.sortOrder),
        escapeCsv(c._count.businesses),
        escapeCsv(c.createdAt),
      ].join(",")
    );

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ghana-trade-categories-${dateStr}.csv"`,
      },
    });
  }

  // 3. USERS EXPORT
  if (type === "users") {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { businesses: true, comments: true, reports: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      const safeUsers = users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        businessesCount: u._count.businesses,
        commentsCount: u._count.comments,
        reportsCount: u._count.reports,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      }));

      return new Response(JSON.stringify(safeUsers, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="ghana-trade-users-${dateStr}.json"`,
        },
      });
    }

    const headers = [
      "ID",
      "Display Name",
      "Email",
      "Phone",
      "Role",
      "Status",
      "Businesses Owned",
      "Comments",
      "Reports",
      "Last Login",
      "Created At",
    ];

    const rows = users.map((u) =>
      [
        escapeCsv(u.id),
        escapeCsv(u.displayName),
        escapeCsv(u.email),
        escapeCsv(u.phone),
        escapeCsv(u.role),
        escapeCsv(u.status),
        escapeCsv(u._count.businesses),
        escapeCsv(u._count.comments),
        escapeCsv(u._count.reports),
        escapeCsv(u.lastLoginAt),
        escapeCsv(u.createdAt),
      ].join(",")
    );

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ghana-trade-users-${dateStr}.csv"`,
      },
    });
  }

  return new Response("Invalid export type. Supported: businesses, categories, users", {
    status: 400,
  });
}
