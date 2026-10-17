import { mediaUrl } from "@/lib/storage";

// Real, authentic Unsplash photography representing Ghanaian business sectors
export const SECTOR_COVERS: Record<string, string> = {
  "banking-financial-services":
    "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=1200&q=80",
  "health-wellness":
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
  "transport-logistics":
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  "technology-it":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  "hospitality-tourism":
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  "food-beverages":
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
  "agriculture-agri-business":
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
  "construction-building-materials":
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
  "retail-general-trade":
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
  "fashion-beauty":
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
  "education-training":
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
  "automotive":
    "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80",
  "real-estate-property":
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "manufacturing-industrial":
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
  "professional-services":
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  "home-services":
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
  "events-media":
    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
};

export const DEFAULT_FALLBACK_COVER =
  "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=1200&q=80";

// Real online logos for major Ghanaian institutions and companies
export const KNOWN_BRAND_LOGOS: Record<string, string> = {
  "mtn": "https://upload.wikimedia.org/wikipedia/commons/a/af/MTN_Logo.svg",
  "telecel": "https://www.google.com/s2/favicons?domain=telecel.com.gh&sz=128",
  "at ghana": "https://www.google.com/s2/favicons?domain=at.com.gh&sz=128",
  "airteltigo": "https://www.google.com/s2/favicons?domain=at.com.gh&sz=128",
  "ecobank": "https://www.google.com/s2/favicons?domain=ecobank.com&sz=128",
  "absa": "https://www.google.com/s2/favicons?domain=absa.com.gh&sz=128",
  "standard chartered": "https://www.google.com/s2/favicons?domain=sc.com&sz=128",
  "stanbic": "https://www.google.com/s2/favicons?domain=stanbicbank.com.gh&sz=128",
  "gcb": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/GCBBANK.jpg/500px-GCBBANK.jpg",
  "fidelity": "https://www.google.com/s2/favicons?domain=fidelitybank.com.gh&sz=128",
  "zenith": "https://www.google.com/s2/favicons?domain=zenithbank.com.gh&sz=128",
  "calbank": "https://www.google.com/s2/favicons?domain=calbank.net&sz=128",
  "access bank": "https://www.google.com/s2/favicons?domain=accessbankplc.com&sz=128",
  "cbg": "https://www.google.com/s2/favicons?domain=cbg.com.gh&sz=128",
  "first national bank": "https://www.google.com/s2/favicons?domain=firstnationalbank.com.gh&sz=128",
  "gtbank": "https://www.google.com/s2/favicons?domain=gtbghana.com&sz=128",
  "republic bank": "https://www.google.com/s2/favicons?domain=republicghana.com&sz=128",
  "uba": "https://www.google.com/s2/favicons?domain=ubagroup.com&sz=128",
  "fbnbank": "https://www.google.com/s2/favicons?domain=fbnbankghana.com&sz=128",
  "agricultural development bank": "https://www.google.com/s2/favicons?domain=agricbank.com&sz=128",
  "prudential bank": "https://www.google.com/s2/favicons?domain=prudentialbank.com.gh&sz=128",
  "societe generale": "https://www.google.com/s2/favicons?domain=societegenerale.com.gh&sz=128",
  "bank of africa": "https://www.google.com/s2/favicons?domain=bankofafrica.com.gh&sz=128",
  "first atlantic": "https://www.google.com/s2/favicons?domain=firstatlanticbank.com.gh&sz=128",
  "omnibsic": "https://www.google.com/s2/favicons?domain=omnibsiconline.com&sz=128",
  "goil": "https://www.google.com/s2/favicons?domain=goil.com.gh&sz=128",
  "vivo energy": "https://www.google.com/s2/favicons?domain=vivoenergy.com&sz=128",
  "shell": "https://www.google.com/s2/favicons?domain=vivoenergy.com&sz=128",
  "totalenergies": "https://www.google.com/s2/favicons?domain=totalenergies.com.gh&sz=128",
  "star oil": "https://www.google.com/s2/favicons?domain=staroil.com&sz=128",
  "bost": "https://www.google.com/s2/favicons?domain=bost.com.gh&sz=128",
  "ecg": "https://www.google.com/s2/favicons?domain=ecg.com.gh&sz=128",
  "vra": "https://www.google.com/s2/favicons?domain=vra.com&sz=128",
  "gridco": "https://www.google.com/s2/favicons?domain=gridcogh.com&sz=128",
  "cocobod": "https://www.google.com/s2/favicons?domain=cocobod.gh&sz=128",
  "kempinski": "https://www.google.com/s2/favicons?domain=kempinski.com&sz=128",
  "movenpick": "https://www.google.com/s2/favicons?domain=movenpick.com&sz=128",
  "marriott": "https://www.google.com/s2/favicons?domain=marriott.com&sz=128",
  "labadi beach": "https://www.google.com/s2/favicons?domain=labadibeachhotelgh.com&sz=128",
  "senchi": "https://www.google.com/s2/favicons?domain=theroyalsenchi.com&sz=128",
  "nyaho": "https://www.google.com/s2/favicons?domain=nyahomedical.com&sz=128",
  "korle bu": "https://www.google.com/s2/favicons?domain=korlebu.gov.gh&sz=128",
  "trust hospital": "https://www.google.com/s2/favicons?domain=thetrusthospital.com&sz=128",
  "ernest chemists": "https://www.google.com/s2/favicons?domain=ernestchemists.com&sz=128",
  "tobinco": "https://www.google.com/s2/favicons?domain=tobinco.com&sz=128",
  "kinapharma": "https://www.google.com/s2/favicons?domain=kinapharma.com&sz=128",
  "kasapreko": "https://www.google.com/s2/favicons?domain=kasapreko.com&sz=128",
  "fan milk": "https://www.google.com/s2/favicons?domain=fanmilk-gh.com&sz=128",
  "unilever": "https://www.google.com/s2/favicons?domain=unilever.com&sz=128",
  "melcom": "https://www.google.com/s2/favicons?domain=melcom.com&sz=128",
  "intercity stc": "https://www.google.com/s2/favicons?domain=intercitystc.com&sz=128",
  "gold fields": "https://www.google.com/s2/favicons?domain=goldfields.com&sz=128",
  "anglogold": "https://www.google.com/s2/favicons?domain=anglogoldashanti.com&sz=128",
  "newmont": "https://www.google.com/s2/favicons?domain=newmont.com&sz=128",
  "enterprise": "https://www.google.com/s2/favicons?domain=enterprise.com.gh&sz=128",
  "sic insurance": "https://www.google.com/s2/favicons?domain=sic-gh.com&sz=128",
  "star assurance": "https://www.google.com/s2/favicons?domain=starassurance.com&sz=128",
  "hubtel": "https://www.google.com/s2/favicons?domain=hubtel.com&sz=128",
  "zeepay": "https://www.google.com/s2/favicons?domain=zeepay.com&sz=128",
  "devtraco": "https://www.google.com/s2/favicons?domain=devtraco.com&sz=128",
  "clifton homes": "https://www.google.com/s2/favicons?domain=cliftonhomes.com&sz=128",
  "ghacem": "https://www.google.com/s2/favicons?domain=ghacem.com&sz=128",
};

export function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const raw = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getSectorDefaultCover(sectorSlugOrName?: string | null): string {
  if (!sectorSlugOrName) return DEFAULT_FALLBACK_COVER;
  const key = sectorSlugOrName.toLowerCase().trim();
  for (const [k, v] of Object.entries(SECTOR_COVERS)) {
    if (key.includes(k) || k.includes(key)) {
      return v;
    }
  }
  return DEFAULT_FALLBACK_COVER;
}

export function getBusinessCover(business: {
  coverKey?: string | null;
  logoKey?: string | null;
  name?: string;
  category?: { slug?: string; name?: string; parent?: { slug?: string; name?: string } | null } | null;
}): string {
  if (business.coverKey) {
    const url = mediaUrl(business.coverKey);
    if (url) return url;
  }
  const sectorSlug =
    business.category?.parent?.slug ??
    business.category?.slug ??
    business.category?.parent?.name ??
    business.category?.name;
  return getSectorDefaultCover(sectorSlug);
}

export function getBusinessLogo(business: {
  logoKey?: string | null;
  website?: string | null;
  name: string;
}): string | null {
  if (business.logoKey) {
    const url = mediaUrl(business.logoKey);
    if (url) return url;
  }
  const domain = extractDomain(business.website);
  if (domain && !domain.includes("facebook.com") && !domain.includes("instagram.com")) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  const lowerName = business.name.toLowerCase();
  for (const [key, logoUrl] of Object.entries(KNOWN_BRAND_LOGOS)) {
    if (lowerName.includes(key)) {
      return logoUrl;
    }
  }
  return null;
}

export type SectorOfferingItem = {
  title: string;
  type: "SERVICE" | "PRODUCT";
  priceLabel: string;
  description: string;
  icon: string;
};

// Rich, tailored products and services catalog templates for each sector in Ghana
export const SECTOR_OFFERINGS: Record<string, SectorOfferingItem[]> = {
  "banking-financial-services": [
    {
      title: "Personal & Commercial Banking Accounts",
      type: "SERVICE",
      priceLabel: "Competitive Rates",
      description: "Comprehensive current and savings accounts with instant debit card issuance, 24/7 mobile app access, and automated monthly e-statements.",
      icon: "💳",
    },
    {
      title: "SME Commercial Credit & Working Capital",
      type: "SERVICE",
      priceLabel: "Custom Financing",
      description: "Structured business credit facilities, trade financing, overdraft protection, and flexible loan repayment tenures tailored for Ghanaian enterprises.",
      icon: "📈",
    },
    {
      title: "International Forex & Wire Remittance",
      type: "SERVICE",
      priceLabel: "Bank Tariff",
      description: "Rapid cross-border payments, SWIFT transfers, FX spot & forward contracts, and direct diaspora remittance payouts in GHS, USD, GBP, and EUR.",
      icon: "🌐",
    },
    {
      title: "Digital Treasury & Merchant Payment Gateways",
      type: "SERVICE",
      priceLabel: "Standard Tariff",
      description: "Seamless point-of-sale (POS) terminals, GhQR payment integration, bulk payroll automation, and institutional liquidity investment funds.",
      icon: "📱",
    },
  ],
  "health-wellness": [
    {
      title: "Specialist & General Medical Consultation",
      type: "SERVICE",
      priceLabel: "Consultation Fee",
      description: "Comprehensive in-person and outpatient medical evaluations by certified physicians, specialized diagnostics, and clinical care planning.",
      icon: "🩺",
    },
    {
      title: "Laboratory Diagnostic & Screening Services",
      type: "SERVICE",
      priceLabel: "Tariff on Request",
      description: "State-of-the-art hematology, clinical chemistry, ultrasound scanning, ECG, and routine preventative health checkups with fast digital results.",
      icon: "🔬",
    },
    {
      title: "Prescription & Over-the-Counter Dispensing",
      type: "PRODUCT",
      priceLabel: "Regulated Pricing",
      description: "Authentic, FDA-approved pharmaceutical medications, chronic illness refills, pediatric supplies, and professional pharmacist counseling.",
      icon: "💊",
    },
    {
      title: "Emergency Care & Outpatient Treatment",
      type: "SERVICE",
      priceLabel: "Standard Rates",
      description: "24/7 urgent healthcare intervention, wound dressing, pediatric care, vital signs triage, and coordinated patient transfer services.",
      icon: "🚑",
    },
  ],
  "transport-logistics": [
    {
      title: "Nationwide Cargo Haulage & Freight Transport",
      type: "SERVICE",
      priceLabel: "Distance / Tonnage Quote",
      description: "Heavy haulage and flatbed trucking across all 16 regions of Ghana, connecting industrial hubs, mining concessions, and regional distribution depots.",
      icon: "🚛",
    },
    {
      title: "Express Same-Day Courier & Parcel Delivery",
      type: "SERVICE",
      priceLabel: "From GH₵ 35.00",
      description: "Rapid door-to-door dispatch and express delivery with real-time GPS tracking and SMS delivery confirmation throughout major urban centres.",
      icon: "📦",
    },
    {
      title: "Tema & Takoradi Port Customs Clearance",
      type: "SERVICE",
      priceLabel: "Competitive Tariff",
      description: "End-to-end maritime and air cargo clearance, ICUMS documentation processing, container devanning, and duty tariff advisory.",
      icon: "🚢",
    },
    {
      title: "Secure Warehousing & Cold-Chain Storage",
      type: "SERVICE",
      priceLabel: "Flexible Storage Rates",
      description: "Temperature-controlled warehousing, bulk pallet storage, inventory management, and cross-docking logistics with 24/7 CCTV surveillance.",
      icon: "🏭",
    },
  ],
  "technology-it": [
    {
      title: "Custom Software & Web Application Development",
      type: "SERVICE",
      priceLabel: "Project-Based Quote",
      description: "High-performance enterprise web platforms, mobile applications for iOS & Android, API integrations, and robust database architectures.",
      icon: "💻",
    },
    {
      title: "Enterprise Cloud Hosting & IT Infrastructure",
      type: "SERVICE",
      priceLabel: "Monthly / Annual SLA",
      description: "Managed server deployment, multi-region cloud backup, cybersecurity protection, email exchange setup, and 99.9% uptime guarantees.",
      icon: "☁️",
    },
    {
      title: "IT Hardware, Network Cabling & CCTV Solutions",
      type: "PRODUCT",
      priceLabel: "Competitive Supply",
      description: "High-grade office networking, structured CAT6 cabling, enterprise WiFi routers, security surveillance cameras, and certified workstation supply.",
      icon: "🖥️",
    },
    {
      title: "Managed IT Support & Technical Consulting",
      type: "SERVICE",
      priceLabel: "Retainer / On-Demand",
      description: "Proactive network monitoring, hardware troubleshooting, disaster recovery planning, and specialized digital transformation advisory.",
      icon: "🛠️",
    },
  ],
  "food-beverages": [
    {
      title: "Authentic Ghanaian Specialties & Gourmet Dishes",
      type: "PRODUCT",
      priceLabel: "Menu Prices",
      description: "Freshly prepared local and continental dishes made from premium farm-fresh ingredients, served hot for dine-in, takeaway, or delivery.",
      icon: "🍲",
    },
    {
      title: "Full-Service Event & Corporate Buffet Catering",
      type: "SERVICE",
      priceLabel: "Per Person Pricing",
      description: "Professional catering for corporate lunches, weddings, executive banquets, and private parties with complete tableware and waitstaff service.",
      icon: "🍽️",
    },
    {
      title: "Fresh Beverages, Cocktails & Artisanal Juices",
      type: "PRODUCT",
      priceLabel: "From GH₵ 20.00",
      description: "Refreshing natural fruit juices, sobolo, craft smoothies, cocktails, and chilled soft drinks crafted daily.",
      icon: "🍹",
    },
  ],
  "hospitality-tourism": [
    {
      title: "Executive Suites & Deluxe Accommodation",
      type: "SERVICE",
      priceLabel: "Nightly Rate",
      description: "Elegantly appointed rooms featuring high-speed WiFi, smart entertainment, premium bedding, climate control, and complimentary breakfast.",
      icon: "🏨",
    },
    {
      title: "Executive Conference & Banquet Hall Hire",
      type: "SERVICE",
      priceLabel: "Day / Half-Day Rates",
      description: "Acoustically treated conference venues equipped with modern projectors, video conferencing facilities, PA systems, and dedicated event support.",
      icon: "🎤",
    },
    {
      title: "Guided Heritage & Eco-Tourism Tour Packages",
      type: "SERVICE",
      priceLabel: "Package Rates",
      description: "Curated cultural tours and excursions covering Ghana's historic forts, national parks, scenic waterfalls, and vibrant arts markets.",
      icon: "🗺️",
    },
  ],
  "construction-building-materials": [
    {
      title: "Building Construction & General Contracting",
      type: "SERVICE",
      priceLabel: "Contract Bill of Quantities",
      description: "Turnkey residential and commercial building execution, structural framing, foundation engineering, and quality-controlled project management.",
      icon: "🏗️",
    },
    {
      title: "High-Grade Cement, Aggregates & Iron Rods",
      type: "PRODUCT",
      priceLabel: "Wholesale & Retail",
      description: "Certified Grade 42.5R/32.5N cement, high-tensile steel rebars, granite quarry stone, sand, and precast concrete masonry blocks.",
      icon: "🧱",
    },
    {
      title: "Architectural Planning & Structural Engineering",
      type: "SERVICE",
      priceLabel: "Design Consultation",
      description: "Professional 2D/3D CAD architectural designs, structural calculations, MEP schematics, and municipal building permit facilitation.",
      icon: "📐",
    },
  ],
  "agriculture-agri-business": [
    {
      title: "Certified Seeds, Fertilizers & Agro-Chemicals",
      type: "PRODUCT",
      priceLabel: "Bulk & Retail",
      description: "High-germination hybrid seeds, NPK fertilizers, organic soil enhancers, and registered crop protection products for commercial farming.",
      icon: "🌱",
    },
    {
      title: "Farm Produce Harvesting & Agro-Processing",
      type: "SERVICE",
      priceLabel: "Standard Processing Fee",
      description: "Mechanized sorting, washing, drying, milling, and vacuum packing of cocoa, maize, soya, cashew, and fresh horticultural produce.",
      icon: "🌾",
    },
    {
      title: "Farm Equipment Hire & Agronomic Advisory",
      type: "SERVICE",
      priceLabel: "Daily / Seasonal Hire",
      description: "Modern tractor ploughing, harrowing, precision spraying equipment hire, and expert on-site soil testing and crop yield consultation.",
      icon: "🚜",
    },
  ],
  "automotive": [
    {
      title: "Comprehensive Computerized Vehicle Diagnostics",
      type: "SERVICE",
      priceLabel: "Diagnostic Fee",
      description: "Full electronic scan, engine code diagnosis, ABS and transmission troubleshooting, and detailed digital vehicle health reports.",
      icon: "🚗",
    },
    {
      title: "Engine Overhaul & Preventative Auto Servicing",
      type: "SERVICE",
      priceLabel: "Service Package",
      description: "Complete synthetic oil change, brake pad replacement, suspension repairs, coolant flushing, and preventative maintenance checklists.",
      icon: "🔧",
    },
    {
      title: "Genuine OEM Spare Parts & Batteries",
      type: "PRODUCT",
      priceLabel: "Competitive Retail",
      description: "Authentic factory-warranted automotive replacement parts, heavy-duty maintenance-free batteries, filters, belts, and performance tires.",
      icon: "⚙️",
    },
  ],
  "retail-general-trade": [
    {
      title: "Wholesale & Retail Consumer Goods Supply",
      type: "PRODUCT",
      priceLabel: "Wholesale Pricing",
      description: "Bulk distribution of packaged groceries, personal care products, beverages, household essentials, and daily provisions.",
      icon: "🛍️",
    },
    {
      title: "Scheduled Institutional Delivery & Replenishment",
      type: "SERVICE",
      priceLabel: "Custom Schedule",
      description: "Direct supply deliveries to supermarkets, educational institutions, offices, and neighborhood retailers with flexible payment terms.",
      icon: "🚚",
    },
  ],
};

export function getSectorOfferings(
  sectorSlugOrName?: string | null,
  businessName = "Business",
): SectorOfferingItem[] {
  if (sectorSlugOrName) {
    const key = sectorSlugOrName.toLowerCase().trim();
    for (const [k, items] of Object.entries(SECTOR_OFFERINGS)) {
      if (key.includes(k) || k.includes(key)) {
        return items;
      }
    }
  }

  // Universal professional services & products fallback
  return [
    {
      title: `Core Services & Solutions`,
      type: "SERVICE",
      priceLabel: "Competitive Rates",
      description: `Comprehensive professional service delivery and tailored customer solutions provided by ${businessName} across Ghana.`,
      icon: "💼",
    },
    {
      title: `Specialist Consultation & Support`,
      type: "SERVICE",
      priceLabel: "Inquiry on Request",
      description: `Dedicated advisory, customer support, and customized service execution matching industry standards and regulatory compliance.`,
      icon: "🤝",
    },
    {
      title: `Premium Products & Supplies`,
      type: "PRODUCT",
      priceLabel: "Market Standard",
      description: `Quality-tested authentic products and supplies sourced directly from accredited suppliers with reliable fulfillment.`,
      icon: "📦",
    },
  ];
}
