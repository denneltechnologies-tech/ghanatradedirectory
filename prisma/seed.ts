import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure .env before seeding.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const REGIONS: { name: string; capital: string; code: string; districts: string[] }[] = [
  {
    name: "Greater Accra",
    capital: "Accra",
    code: "GA",
    districts: [
      "Accra Metropolitan",
      "Tema Metropolitan",
      "Ledzokuku Municipal",
      "Krowor Municipal",
      "Adenta Municipal",
      "Ga East Municipal",
      "Ga West Municipal",
      "Ga South Municipal",
      "Ashaiman Municipal",
      "La Dade-Kotopon Municipal",
    ],
  },
  {
    name: "Ashanti",
    capital: "Kumasi",
    code: "AH",
    districts: [
      "Kumasi Metropolitan",
      "Obuasi Municipal",
      "Asokwa Municipal",
      "Suame Municipal",
      "Bekwai Municipal",
      "Ejisu Municipal",
      "Mampong Municipal",
      "Offinso Municipal",
    ],
  },
  {
    name: "Western",
    capital: "Sekondi-Takoradi",
    code: "WP",
    districts: [
      "Sekondi-Takoradi Metropolitan",
      "Tarkwa-Nsuaem Municipal",
      "Ahanta West Municipal",
      "Nzema East Municipal",
      "Effia-Kwesimintsim Municipal",
    ],
  },
  {
    name: "Western North",
    capital: "Sefwi Wiawso",
    code: "WN",
    districts: ["Sefwi Wiawso Municipal", "Bibiani-Anhwiaso-Bekwai Municipal", "Juaboso", "Aowin"],
  },
  {
    name: "Central",
    capital: "Cape Coast",
    code: "CP",
    districts: [
      "Cape Coast Metropolitan",
      "Komenda-Edina-Eguafo-Abirem Municipal",
      "Abura-Asebu-Kwamankese",
      "Mfantsiman Municipal",
      "Awutu Senya East Municipal",
      "Gomoa East",
    ],
  },
  {
    name: "Eastern",
    capital: "Koforidua",
    code: "EP",
    districts: [
      "New Juaben South Municipal",
      "New Juaben North Municipal",
      "Nsawam Adoagyiri Municipal",
      "Akuapem North Municipal",
      "Birim Central Municipal",
      "Lower Manya Krobo Municipal",
    ],
  },
  {
    name: "Volta",
    capital: "Ho",
    code: "VP",
    districts: [
      "Ho Municipal",
      "Ho West",
      "Keta Municipal",
      "Hohoe Municipal",
      "Kpando Municipal",
      "Akatsi South",
    ],
  },
  {
    name: "Oti",
    capital: "Dambai",
    code: "OT",
    districts: ["Krachi East Municipal", "Krachi West", "Nkwanta South Municipal", "Biakoye", "Jasikan"],
  },
  {
    name: "Bono",
    capital: "Sunyani",
    code: "BO",
    districts: ["Sunyani Municipal", "Sunyani West", "Berekum Municipal", "Dormaa Central Municipal", "Jaman South Municipal"],
  },
  {
    name: "Bono East",
    capital: "Techiman",
    code: "BE",
    districts: ["Techiman Municipal", "Kintampo North Municipal", "Nkoranza South Municipal", "Atebubu-Amantin Municipal", "Sene West"],
  },
  {
    name: "Ahafo",
    capital: "Goaso",
    code: "AF",
    districts: ["Asunafo North Municipal", "Asunafo South", "Asutifi North", "Asutifi South", "Tano North Municipal", "Tano South Municipal"],
  },
  {
    name: "Northern",
    capital: "Tamale",
    code: "NP",
    districts: ["Tamale Metropolitan", "Sagnarigu Municipal", "Savelugu Municipal", "Yendi Municipal", "Nanton", "Kumbungu"],
  },
  {
    name: "Savannah",
    capital: "Damongo",
    code: "SV",
    districts: ["West Gonja Municipal", "Central Gonja", "East Gonja Municipal", "Bole", "Sawla-Tuna-Kalba"],
  },
  {
    name: "North East",
    capital: "Nalerigu",
    code: "NE",
    districts: ["East Mamprusi Municipal", "West Mamprusi Municipal", "Chereponi", "Mamprugu Moagduri", "Yunyoo-Nasuan"],
  },
  {
    name: "Upper East",
    capital: "Bolgatanga",
    code: "UE",
    districts: ["Bolgatanga Municipal", "Bolgatanga East", "Talensi", "Bongo", "Kassena-Nankana Municipal", "Bawku Municipal"],
  },
  {
    name: "Upper West",
    capital: "Wa",
    code: "UW",
    districts: ["Wa Municipal", "Wa East", "Wa West", "Nadowli-Kaleo", "Sissala East Municipal", "Lawra Municipal"],
  },
];

const SECTORS: {
  name: string;
  icon: string;
  featured?: boolean;
  children?: string[];
}[] = [
  { name: "Agriculture & Agri-business", icon: "🌾", children: ["Agro-processing", "Farm Inputs & Seeds", "Livestock & Poultry"] },
  { name: "Food & Beverages", icon: "🍲", featured: true, children: ["Restaurants & Eateries", "Catering & Events", "Food Processing"] },
  { name: "Construction & Building Materials", icon: "🏗️", children: ["Building Materials", "Contractors & Artisans", "Hardware & Tools"] },
  { name: "Fashion & Beauty", icon: "👗", children: ["Tailoring & Fashion", "Salons & Spas", "Cosmetics & Skincare"] },
  { name: "Health & Wellness", icon: "🩺", children: ["Pharmacies", "Clinics & Diagnostics", "Fitness & Wellness"] },
  { name: "Transport & Logistics", icon: "🚚", featured: true, children: ["Courier & Parcel", "Haulage & Trucking", "Warehousing"] },
  { name: "Education & Training", icon: "🎓", children: ["Schools & Academies", "Vocational Training", "Tutoring"] },
  { name: "Technology & IT", icon: "💻", children: ["Software & Web", "Electronics & Repairs", "Internet Services"] },
  { name: "Home Services", icon: "🔧", children: ["Plumbing & Electrical", "Cleaning Services", "Furniture & Interiors"] },
  { name: "Professional Services", icon: "💼", children: ["Accounting & Tax", "Legal Services", "Consulting"] },
  { name: "Retail & General Trade", icon: "🛍️", featured: true, children: ["Groceries & Provisions", "Wholesale & Distribution", "Mobile & Accessories"] },
  { name: "Hospitality & Tourism", icon: "🏨", children: ["Hotels & Lodges", "Travel & Tours", "Event Venues"] },
  { name: "Events & Media", icon: "🎉", children: ["Photography & Video", "Sound & DJ", "Printing & Branding"] },
  { name: "Manufacturing & Industrial", icon: "🏭", children: ["Packaging", "Metalworks & Fabrication", "Chemicals"] },
  { name: "Automotive", icon: "🚗", children: ["Auto Repairs", "Spare Parts", "Car Sales & Rental"] },
  { name: "Real Estate & Property", icon: "🏠", children: ["Property Agents", "Land & Survey", "Rentals"] },
  { name: "Banking & Financial Services", icon: "🏦", featured: true, children: ["Commercial Banks & Microfinance", "Insurance Companies", "Pensions & Trustees", "Investment & Securities"] },
];

async function seedLocations() {
  const regionIds = new Map<string, string>();

  for (const region of REGIONS) {
    const slug = slugify(region.name);
    const row = await prisma.region.upsert({
      where: { slug },
      update: { name: region.name, capital: region.capital, code: region.code },
      create: { name: region.name, slug, capital: region.capital, code: region.code },
    });
    regionIds.set(region.name, row.id);

    for (const district of region.districts) {
      const districtSlug = slugify(district);
      await prisma.district.upsert({
        where: { regionId_slug: { regionId: row.id, slug: districtSlug } },
        update: { name: district },
        create: { regionId: row.id, name: district, slug: districtSlug, kind: "District" },
      });
    }
  }

  return regionIds;
}

async function seedCategories() {
  const categoryIds = new Map<string, string>();

  for (const [index, sector] of SECTORS.entries()) {
    const slug = slugify(sector.name);
    const parent = await prisma.category.upsert({
      where: { slug },
      update: {
        name: sector.name,
        icon: sector.icon,
        featured: Boolean(sector.featured),
        active: true,
        sortOrder: index,
        parentId: null,
      },
      create: {
        name: sector.name,
        slug,
        icon: sector.icon,
        featured: Boolean(sector.featured),
        sortOrder: index,
        parentId: null,
      },
    });
    categoryIds.set(sector.name, parent.id);

    for (const [childIndex, child] of (sector.children ?? []).entries()) {
      const childSlug = slugify(`${sector.name} ${child}`);
      const childRow = await prisma.category.upsert({
        where: { slug: childSlug },
        update: { name: child, parentId: parent.id, active: true, sortOrder: childIndex },
        create: {
          name: child,
          slug: childSlug,
          parentId: parent.id,
          sortOrder: childIndex,
        },
      });
      categoryIds.set(`${sector.name} / ${child}`, childRow.id);
    }
  }

  return categoryIds;
}

async function seedUsers() {
  const passwordHash = await hash("Password123!", 10);

  const users = [
    { email: "admin@ghanatrade.app", displayName: "Ghana Trade Admin", role: "ADMIN" as const, phone: "+233200000001" },
    { email: "moderator@ghanatrade.app", displayName: "Ama Moderator", role: "MODERATOR" as const, phone: "+233200000002" },
    { email: "owner@example.com", displayName: "Kwame Mensah", role: "BUSINESS_OWNER" as const, phone: "+233244123456" },
    { email: "ama@example.com", displayName: "Ama Owusu", role: "BUSINESS_OWNER" as const, phone: "+233201234567" },
    { email: "kofi@example.com", displayName: "Kofi Boateng", role: "BUSINESS_OWNER" as const, phone: "+233551234567" },
    { email: "logistics@example.com", displayName: "Yaw Transport Ltd", role: "LOGISTICS_PROVIDER" as const, phone: "+233261234567" },
    { email: "fastlogistics@example.com", displayName: "FastMove Logistics", role: "LOGISTICS_PROVIDER" as const, phone: "+233271234567" },
    { email: "customer@example.com", displayName: "Efua Sarpong", role: "CUSTOMER" as const, phone: "+233242222222" },
  ];

  const map = new Map<string, string>();
  for (const user of users) {
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role, phone: user.phone },
      create: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        phone: user.phone,
        passwordHash,
        status: "ACTIVE",
      },
    });
    map.set(user.email, row.id);
  }

  return map;
}

type SeedBusiness = {
  slug: string;
  name: string;
  ownerEmail: string;
  category: string;
  description: string;
  longDescription?: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SUSPENDED" | "ARCHIVED";
  featured?: boolean;
  verification?: "UNVERIFIED" | "CONTACT_CONFIRMED" | "DOCUMENTS_REVIEWED" | "LOCATION_CHECKED";
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  region: string;
  district?: string;
  locality: string;
  address?: string;
  delivery?: boolean;
  tags?: string[];
  paymentMethods?: string[];
  offerings?: {
    type: "PRODUCT" | "SERVICE";
    title: string;
    description: string;
    priceAmount?: number;
    priceLabel?: string;
    availability?: string;
  }[];
};

async function seedBusinesses(
  userIds: Map<string, string>,
  categoryIds: Map<string, string>,
  regionIds: Map<string, string>,
) {
  const businesses: SeedBusiness[] = [
    {
      slug: "mensah-agro-farms",
      name: "Mensah Agro Farms",
      ownerEmail: "owner@example.com",
      category: "Agriculture & Agri-business / Agro-processing",
      description: "Grain milling, packaging and wholesale supply of maize, rice and soya for markets and processors.",
      longDescription:
        "Mensah Agro Farms processes and distributes quality grains across Ghana. We run milling and packaging lines in Kumasi and supply wholesalers, food processors and institutional buyers with consistent volumes and tested quality.",
      status: "PUBLISHED",
      featured: true,
      verification: "DOCUMENTS_REVIEWED",
      phone: "+233244123456",
      whatsapp: "+233244123456",
      email: "sales@menshagrofarms.example",
      region: "Ashanti",
      district: "Kumasi Metropolitan",
      locality: "Suame",
      address: "Plot 24, Suame Industrial Area, Kumasi",
      delivery: true,
      tags: ["maize", "rice", "agro-processing", "wholesale"],
      paymentMethods: ["MoMo", "Bank transfer", "Cash on delivery"],
      offerings: [
        { type: "PRODUCT", title: "Premium maize flour (25kg)", description: "Finely milled maize flour packed in 25kg sacks.", priceAmount: 180, availability: "In stock" },
        { type: "PRODUCT", title: "Local rice (50kg)", description: "Cleaned and graded Ghanaian rice.", priceAmount: 620, availability: "In stock" },
        { type: "SERVICE", title: "Contract grain milling", description: "Milling and packaging for processors, priced per tonne.", priceLabel: "From GHS 350 per tonne" },
      ],
    },
    {
      slug: "accra-tech-hub",
      name: "Accra Tech Hub",
      ownerEmail: "ama@example.com",
      category: "Technology & IT / Software & Web",
      description: "Web and mobile app development, IT support and digital training for small businesses in Accra.",
      status: "PUBLISHED",
      featured: true,
      verification: "LOCATION_CHECKED",
      phone: "+233201234567",
      whatsapp: "+233201234567",
      email: "hello@accratechhub.example",
      website: "https://accratechhub.example",
      region: "Greater Accra",
      district: "Accra Metropolitan",
      locality: "Osu",
      address: "12 Oxford Street, Osu, Accra",
      delivery: false,
      tags: ["software", "web design", "IT support", "training"],
      paymentMethods: ["MoMo", "Bank transfer"],
      offerings: [
        { type: "SERVICE", title: "Business website", description: "Mobile-friendly website with content management and hosting setup.", priceAmount: 4500 },
        { type: "SERVICE", title: "POS & inventory setup", description: "Install and configure point-of-sale and stock tracking for shops.", priceAmount: 2500 },
        { type: "SERVICE", title: "Digital skills workshop", description: "Two-day practical workshop for business teams.", priceLabel: "Group rates" },
      ],
    },
    {
      slug: "tema-fresh-foods",
      name: "Tema Fresh Foods & Catering",
      ownerEmail: "ama@example.com",
      category: "Food & Beverages / Catering & Events",
      description: "Corporate catering, event catering and daily meal delivery across Tema and Accra.",
      status: "PUBLISHED",
      verification: "CONTACT_CONFIRMED",
      phone: "+233201234567",
      whatsapp: "+233201234567",
      email: "orders@temafreshfoods.example",
      region: "Greater Accra",
      district: "Tema Metropolitan",
      locality: "Community 1",
      address: "Community 1 Market Road, Tema",
      delivery: true,
      tags: ["catering", "food delivery", "events"],
      paymentMethods: ["MoMo", "Cash"],
      offerings: [
        { type: "SERVICE", title: "Corporate lunch catering", description: "Daily or weekly office lunches with local dishes.", priceLabel: "From GHS 45 per plate" },
        { type: "SERVICE", title: "Event catering", description: "Full-service catering for weddings and conferences.", priceLabel: "Custom quote" },
      ],
    },
    {
      slug: "kumasi-build-supply",
      name: "Kumasi Build Supply",
      ownerEmail: "kofi@example.com",
      category: "Construction & Building Materials / Building Materials",
      description: "Cement, roofing sheets, tiles and general building materials with delivery to sites in Ashanti.",
      status: "PUBLISHED",
      verification: "CONTACT_CONFIRMED",
      phone: "+233551234567",
      whatsapp: "+233551234567",
      region: "Ashanti",
      district: "Asokwa Municipal",
      locality: "Asokwa",
      address: "Adum-Kumasi Road, Asokwa",
      delivery: true,
      tags: ["cement", "roofing", "tiles", "building materials"],
      paymentMethods: ["MoMo", "Bank transfer", "Cash"],
      offerings: [
        { type: "PRODUCT", title: "Portland cement (50kg)", description: "Quality cement for general construction.", priceAmount: 75, availability: "In stock" },
        { type: "PRODUCT", title: "Aluminium roofing sheet per metre", description: "Long-span roofing sheets cut to size.", priceAmount: 55 },
      ],
    },
    {
      slug: "wa-health-pharmacy",
      name: "Wa Community Pharmacy",
      ownerEmail: "kofi@example.com",
      category: "Health & Wellness / Pharmacies",
      description: "Licensed community pharmacy offering medicines, first aid, and health advice in Wa.",
      status: "PENDING_REVIEW",
      phone: "+233551234567",
      region: "Upper West",
      district: "Wa Municipal",
      locality: "Wa Central",
      address: "Near Wa Central Market, Wa",
      delivery: false,
      tags: ["pharmacy", "medicine", "first aid"],
      paymentMethods: ["Cash", "MoMo"],
      offerings: [
        { type: "PRODUCT", title: "Malaria test & medication pack", description: "Rapid test plus recommended antimalarial course.", priceLabel: "Ask in store" },
      ],
    },
    {
      slug: "sekondi-coastal-lodge",
      name: "Sekondi Coastal Lodge",
      ownerEmail: "owner@example.com",
      category: "Hospitality & Tourism / Hotels & Lodges",
      description: "Beachside lodge with conference facilities and local cuisine for travellers and business guests.",
      status: "PUBLISHED",
      featured: true,
      verification: "DOCUMENTS_REVIEWED",
      phone: "+233244123456",
      whatsapp: "+233244123456",
      email: "bookings@coastallodge.example",
      region: "Western",
      district: "Sekondi-Takoradi Metropolitan",
      locality: "Sekondi",
      address: "Beach Road, Sekondi",
      delivery: false,
      tags: ["hotel", "lodge", "conference", "tourism"],
      paymentMethods: ["MoMo", "Bank transfer", "Card"],
      offerings: [
        { type: "SERVICE", title: "Standard room per night", description: "Air-conditioned room with breakfast.", priceAmount: 450 },
        { type: "SERVICE", title: "Conference hall (full day)", description: "Hall for up to 80 guests with projector and refreshments.", priceAmount: 2200 },
      ],
    },
  ];

  const businessIds = new Map<string, string>();

  for (const seed of businesses) {
    const ownerId = userIds.get(seed.ownerEmail);
    const categoryId = categoryIds.get(seed.category);
    const regionId = regionIds.get(seed.region);
    if (!ownerId || !categoryId || !regionId) {
      throw new Error(`Missing reference for business ${seed.slug}`);
    }

    const districtRow = seed.district
      ? await prisma.district.findUnique({
          where: { regionId_slug: { regionId, slug: slugify(seed.district) } },
          select: { id: true },
        })
      : null;

    const row = await prisma.business.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        longDescription: seed.longDescription ?? null,
        status: seed.status,
        featured: Boolean(seed.featured),
        verificationLevel: seed.verification ?? "UNVERIFIED",
        phone: seed.phone,
        whatsapp: seed.whatsapp ?? null,
        email: seed.email ?? null,
        website: seed.website ?? null,
        deliveryOffered: Boolean(seed.delivery),
        tags: seed.tags ?? [],
        paymentMethods: seed.paymentMethods ?? [],
        categoryId,
        publishedAt: seed.status === "PUBLISHED" ? new Date() : null,
      },
      create: {
        ownerId,
        categoryId,
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        longDescription: seed.longDescription ?? null,
        status: seed.status,
        featured: Boolean(seed.featured),
        verificationLevel: seed.verification ?? "UNVERIFIED",
        verifiedAt: seed.verification && seed.verification !== "UNVERIFIED" ? new Date() : null,
        phone: seed.phone,
        whatsapp: seed.whatsapp ?? null,
        email: seed.email ?? null,
        website: seed.website ?? null,
        deliveryOffered: Boolean(seed.delivery),
        tags: seed.tags ?? [],
        paymentMethods: seed.paymentMethods ?? [],
        publishedAt: seed.status === "PUBLISHED" ? new Date() : null,
      },
    });
    businessIds.set(seed.slug, row.id);

    await prisma.businessLocation.deleteMany({ where: { businessId: row.id } });
    await prisma.businessLocation.create({
      data: {
        businessId: row.id,
        regionId,
        districtId: districtRow?.id ?? null,
        locality: seed.locality,
        address: seed.address ?? null,
        isPublic: true,
      },
    });

    await prisma.businessMember.upsert({
      where: { businessId_userId: { businessId: row.id, userId: ownerId } },
      update: { role: "PRIMARY" },
      create: { businessId: row.id, userId: ownerId, role: "PRIMARY" },
    });

    await prisma.offering.deleteMany({ where: { businessId: row.id } });
    for (const [index, offering] of (seed.offerings ?? []).entries()) {
      await prisma.offering.create({
        data: {
          businessId: row.id,
          type: offering.type,
          title: offering.title,
          description: offering.description,
          priceAmount: offering.priceAmount ?? null,
          priceLabel: offering.priceLabel ?? null,
          availability: offering.availability ?? null,
          status: "ACTIVE",
          sortOrder: index,
        },
      });
    }
  }

  return businessIds;
}

async function seedCommunity(userIds: Map<string, string>, businessIds: Map<string, string>) {
  const efua = userIds.get("customer@example.com");
  const ama = userIds.get("ama@example.com");
  const kwame = userIds.get("owner@example.com");

  const likePairs: [string | undefined, string][] = [
    [efua, "mensah-agro-farms"],
    [ama, "mensah-agro-farms"],
    [kwame, "accra-tech-hub"],
    [efua, "accra-tech-hub"],
    [efua, "sekondi-coastal-lodge"],
    [kwame, "sekondi-coastal-lodge"],
  ];

  for (const [userId, slug] of likePairs) {
    const businessId = businessIds.get(slug);
    if (!userId || !businessId) continue;
    await prisma.like.upsert({
      where: { userId_businessId: { userId, businessId } },
      update: {},
      create: { userId, businessId },
    });
  }

  const comments: { business: string; author?: string; body: string }[] = [
    {
      business: "mensah-agro-farms",
      author: efua,
      body: "Ordered maize flour twice this month. Delivery was on time and the quality is consistent. Recommended.",
    },
    {
      business: "accra-tech-hub",
      author: kwame,
      body: "They set up our shop's inventory system and trained the staff. Very professional.",
    },
    {
      business: "sekondi-coastal-lodge",
      author: ama,
      body: "Clean rooms and good conference facilities. The jollof at the restaurant was excellent.",
    },
  ];

  for (const comment of comments) {
    const businessId = businessIds.get(comment.business);
    if (!businessId) continue;
    const existing = await prisma.comment.findFirst({
      where: { businessId, body: comment.body },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.comment.create({
      data: { businessId, authorId: comment.author ?? ama!, body: comment.body, status: "VISIBLE" },
    });
  }
}

async function seedLogistics(
  userIds: Map<string, string>,
  categoryIds: Map<string, string>,
  regionIds: Map<string, string>,
) {
  const providers = [
    {
      slug: "yaw-transport-ltd",
      name: "Yaw Transport Ltd",
      ownerEmail: "logistics@example.com",
      description: "Intercity haulage, courier and parcel delivery with a nationwide partner network.",
      region: "Greater Accra",
      district: "Accra Metropolitan",
      locality: "Accra Central",
      phone: "+233261234567",
      whatsapp: "+233261234567",
      serviceTypes: ["COURIER", "PARCEL", "HAULAGE"],
      coverage: ["LOCAL", "INTERCITY", "NATIONWIDE"],
      namedRoutes: ["Accra - Kumasi", "Accra - Takoradi", "Accra - Tamale"],
      vehicleTypes: ["Kia truck (3 tonnes)", "Cargo van", "Motorbike"],
      capacityMinKg: 1,
      capacityMaxKg: 5000,
      responseHours: 4,
      contactChannel: "Phone or WhatsApp",
    },
    {
      slug: "fastmove-logistics",
      name: "FastMove Logistics",
      ownerEmail: "fastlogistics@example.com",
      description: "Cold-chain and express parcel delivery for pharmacies, groceries and e-commerce sellers.",
      region: "Ashanti",
      district: "Kumasi Metropolitan",
      locality: "Asokwa",
      phone: "+233271234567",
      whatsapp: "+233271234567",
      serviceTypes: ["COURIER", "COLD_CHAIN", "PARCEL"],
      coverage: ["LOCAL", "INTERCITY"],
      namedRoutes: ["Kumasi - Accra", "Kumasi - Sunyani"],
      vehicleTypes: ["Refrigerated van", "Cargo van"],
      capacityMinKg: 1,
      capacityMaxKg: 1500,
      responseHours: 2,
      contactChannel: "WhatsApp",
    },
  ];

  const profileIds = new Map<string, string>();
  const categoryId = categoryIds.get("Transport & Logistics / Courier & Parcel");

  for (const provider of providers) {
    const ownerId = userIds.get(provider.ownerEmail);
    const regionId = regionIds.get(provider.region);
    if (!ownerId || !categoryId || !regionId) {
      throw new Error(`Missing reference for provider ${provider.slug}`);
    }
    const districtRow = await prisma.district.findUnique({
      where: { regionId_slug: { regionId, slug: slugify(provider.district) } },
      select: { id: true },
    });

    const business = await prisma.business.upsert({
      where: { slug: provider.slug },
      update: {
        name: provider.name,
        description: provider.description,
        status: "PUBLISHED",
        categoryId,
        phone: provider.phone,
        whatsapp: provider.whatsapp,
        deliveryOffered: true,
        tags: ["logistics", "delivery", "transport"],
      },
      create: {
        ownerId,
        categoryId,
        name: provider.name,
        slug: provider.slug,
        description: provider.description,
        status: "PUBLISHED",
        verificationLevel: "CONTACT_CONFIRMED",
        verifiedAt: new Date(),
        phone: provider.phone,
        whatsapp: provider.whatsapp,
        deliveryOffered: true,
        tags: ["logistics", "delivery", "transport"],
        publishedAt: new Date(),
      },
    });

    await prisma.businessLocation.deleteMany({ where: { businessId: business.id } });
    await prisma.businessLocation.create({
      data: {
        businessId: business.id,
        regionId,
        districtId: districtRow?.id ?? null,
        locality: provider.locality,
        isPublic: true,
      },
    });

    const profile = await prisma.logisticsProfile.upsert({
      where: { businessId: business.id },
      update: {
        userId: ownerId,
        description: provider.description,
        serviceTypes: provider.serviceTypes as never,
        coverage: provider.coverage as never,
        baseRegionId: regionId,
        baseDistrictId: districtRow?.id ?? null,
        namedRoutes: provider.namedRoutes,
        vehicleTypes: provider.vehicleTypes,
        capacityMinKg: provider.capacityMinKg,
        capacityMaxKg: provider.capacityMaxKg,
        responseHours: provider.responseHours,
        contactChannel: provider.contactChannel,
        verifiedLevel: "CONTACT_CONFIRMED",
        active: true,
      },
      create: {
        businessId: business.id,
        userId: ownerId,
        description: provider.description,
        serviceTypes: provider.serviceTypes as never,
        coverage: provider.coverage as never,
        baseRegionId: regionId,
        baseDistrictId: districtRow?.id ?? null,
        namedRoutes: provider.namedRoutes,
        vehicleTypes: provider.vehicleTypes,
        capacityMinKg: provider.capacityMinKg,
        capacityMaxKg: provider.capacityMaxKg,
        responseHours: provider.responseHours,
        contactChannel: provider.contactChannel,
        verifiedLevel: "CONTACT_CONFIRMED",
        active: true,
      },
    });
    profileIds.set(provider.slug, profile.id);
  }

  return profileIds;
}

async function seedQuoteRequest(
  userIds: Map<string, string>,
  regionIds: Map<string, string>,
  profileIds: Map<string, string>,
) {
  const requesterId = userIds.get("customer@example.com");
  const accraId = regionIds.get("Greater Accra");
  const ashantiId = regionIds.get("Ashanti");
  if (!requesterId || !accraId || !ashantiId) return;

  const existing = await prisma.quoteRequest.findFirst({
    where: { requesterId, contactPhone: "+233242222222" },
    select: { id: true },
  });
  if (existing) return;

  const request = await prisma.quoteRequest.create({
    data: {
      requesterId,
      serviceType: "HAULAGE",
      pickupRegionId: ashantiId,
      pickupDetails: "Suame Industrial Area, Kumasi",
      dropoffRegionId: accraId,
      dropoffDetails: "Osu, Accra",
      cargoType: "Bagged goods",
      cargoDescription: "60 bags of processed maize flour on pallets.",
      weightKg: 1500,
      quantity: 60,
      requestedDate: new Date(Date.now() + 3 * 86_400_000),
      timeWindow: "Morning (7am - 11am)",
      contactName: "Efua Sarpong",
      contactPhone: "+233242222222",
      contactEmail: "customer@example.com",
      consentShare: true,
      consentAt: new Date(),
      status: "RESPONSES_RECEIVED",
      recipients: {
        create: [...profileIds.values()].map((logisticsProfileId) => ({ logisticsProfileId })),
      },
    },
  });

  const yawProfile = profileIds.get("yaw-transport-ltd");
  if (yawProfile) {
    const response = await prisma.quoteResponse.upsert({
      where: {
        quoteRequestId_logisticsProfileId: {
          quoteRequestId: request.id,
          logisticsProfileId: yawProfile,
        },
      },
      update: {},
      create: {
        quoteRequestId: request.id,
        logisticsProfileId: yawProfile,
        providerUserId: userIds.get("logistics@example.com")!,
        priceAmount: 1800,
        currency: "GHS",
        inclusions: "Loading, transport and offloading",
        estimatedPickup: "Within 24 hours",
        estimatedDelivery: "Same day",
        terms: "50% deposit before loading, balance on delivery.",
        validUntil: new Date(Date.now() + 7 * 86_400_000),
        status: "SUBMITTED",
      },
    });

    await prisma.notification.create({
      data: {
        userId: requesterId,
        type: "QUOTE_RESPONSE",
        title: "A provider replied with a quote",
        body: "Open your request to compare quotes and contact the provider.",
        link: `/quotes/${request.id}`,
      },
    });

    return response;
  }
}

async function main() {
  console.log("Seeding Ghana Trade directory...");

  const regionIds = await seedLocations();
  console.log(`  ✓ ${REGIONS.length} regions and districts`);

  const categoryIds = await seedCategories();
  console.log(`  ✓ ${SECTORS.length} sectors with subcategories`);

  const userIds = await seedUsers();
  console.log(`  ✓ ${userIds.size} demo users`);

  const businessIds = await seedBusinesses(userIds, categoryIds, regionIds);
  console.log(`  ✓ ${businessIds.size} businesses with locations and offerings`);

  await seedCommunity(userIds, businessIds);
  console.log("  ✓ likes and comments");

  const profileIds = await seedLogistics(userIds, categoryIds, regionIds);
  console.log(`  ✓ ${profileIds.size} logistics providers`);

  await seedQuoteRequest(userIds, regionIds, profileIds);
  console.log("  ✓ sample quote request and response");

  console.log("Done. Sign in with admin@ghanatrade.app / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
