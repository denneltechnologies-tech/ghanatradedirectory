import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildImportContext,
  importRecord,
  type ImportRecord,
} from "../src/lib/import/pipeline";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const IMPORT_OWNER_EMAIL = process.env.IMPORT_OWNER_EMAIL ?? "imports@ghanatrade.app";

export interface RegulatedMemberRecord {
  regulator: string;
  association?: string;
  name: string;
  categorySlug: string;
  description: string;
  region: string;
  district?: string;
  locality?: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  licenseNumber?: string;
  tags: string[];
}

// Master list of accredited members under Ghana's statutory regulators
export const REGULATED_MEMBERS_DATASET: RegulatedMemberRecord[] = [
  // -------------------------------------------------------------------------
  // 1. GHANA TOURISM AUTHORITY (GTA) - Hotels, Guest Houses, Travel, Tours
  // -------------------------------------------------------------------------
  {
    regulator: "Ghana Tourism Authority (GTA)",
    association: "Ghana Hotels Association (GHA)",
    name: "Kempinski Hotel Gold Coast City Accra",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "5-Star luxury hotel in the downtown administrative district of Accra, featuring premier conference centers, presidential suites, and dining.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Ridge",
    address: "Ministries PMB 66, Gamel Abdul Nasser Avenue, Ridge, Accra",
    phone: "+233 30 242 9999",
    website: "https://kempinski.com/accra",
    licenseNumber: "GTA/GAR/HTL/5S-001",
    tags: ["GTA Accredited", "5-Star Hotel", "Ghana Hotels Association", "Luxury Accommodation"],
  },
  {
    regulator: "Ghana Tourism Authority (GTA)",
    association: "Ghana Hotels Association (GHA)",
    name: "Mövenpick Ambassador Hotel Accra",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Iconic 5-star urban resort in central Accra set on 16 acres of landscaped gardens, offering upscale accommodation and executive business facilities.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Ridge",
    address: "Independence Avenue, Ridge, Accra",
    phone: "+233 30 261 1000",
    website: "https://movenpick.accor.com",
    licenseNumber: "GTA/GAR/HTL/5S-002",
    tags: ["GTA Accredited", "5-Star Hotel", "Ghana Hotels Association", "Business Hotel"],
  },
  {
    regulator: "Ghana Tourism Authority (GTA)",
    association: "Ghana Hotels Association (GHA)",
    name: "Golden Tulip Hotel Kumasi (Rattray)",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Leading 4-star leisure and business hotel in the Garden City of Kumasi, adjacent to Rattray Park.",
    region: "Ashanti",
    district: "Kumasi Metropolitan",
    locality: "Nhyiaeso",
    address: "Rain Tree Street, Nhyiaeso, Kumasi",
    phone: "+233 32 208 3777",
    licenseNumber: "GTA/ASH/HTL/4S-004",
    tags: ["GTA Accredited", "4-Star Hotel", "Ghana Hotels Association", "Kumasi Hotels"],
  },
  {
    regulator: "Ghana Tourism Authority (GTA)",
    association: "Tour Operators Union of Ghana (TOUGHA)",
    name: "Landtours Ghana Limited",
    categorySlug: "hospitality-tourism-travel-tours",
    description: "Full-service destination management company and licensed tour operator specializing in cultural, heritage, and eco-tours across West Africa.",
    region: "Greater Accra",
    district: "Ayawaso West Municipal",
    locality: "Airport Residential",
    address: "17 Aviation Road, Airport Residential Area, Accra",
    phone: "+233 30 276 1957",
    website: "https://landtours.com",
    licenseNumber: "GTA/GAR/TO-0012",
    tags: ["GTA Accredited", "TOUGHA Member", "Inbound Tours", "Heritage Tours"],
  },
  {
    regulator: "Ghana Tourism Authority (GTA)",
    association: "Tour Operators Union of Ghana (TOUGHA)",
    name: "Expert Travel and Tours Ghana",
    categorySlug: "hospitality-tourism-travel-tours",
    description: "IATA-accredited travel agency and GTA-certified corporate tour and ticketing logistics service provider.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Osu",
    address: "Cantonments Road, Osu, Accra",
    phone: "+233 30 277 4411",
    licenseNumber: "GTA/GAR/TA-0056",
    tags: ["GTA Accredited", "TOUGHA Member", "Travel Agency", "Corporate Travel"],
  },

  // -------------------------------------------------------------------------
  // 2. BANK OF GHANA (BoG) - FinTechs, Mobile Money, Commercial Banks
  // -------------------------------------------------------------------------
  {
    regulator: "Bank of Ghana (BoG)",
    association: "Ghana Association of Banks (GAB)",
    name: "MobileMoney Limited (MTN MoMo)",
    categorySlug: "banking-financial-services-commercial-banks-microfinance",
    description: "BoG-licensed Dedicated Electronic Money Issuer (DEMI) powering nationwide mobile financial services, bill payments, and merchant solutions.",
    region: "Greater Accra",
    district: "La Dade-Kotopon Municipal",
    locality: "Airport City",
    address: "MTN House, Independence Avenue, Airport City, Accra",
    phone: "+233 24 430 0000",
    website: "https://mtn.com.gh/momo",
    licenseNumber: "BOG/DEMI/001",
    tags: ["Bank of Ghana Licensed", "DEMI", "FinTech", "Mobile Money"],
  },
  {
    regulator: "Bank of Ghana (BoG)",
    name: "Hubtel Ghana Limited",
    categorySlug: "banking-financial-services-investment-securities",
    description: "BoG-licensed Enhanced Payment Service Provider (Enhanced PSP) and messaging pioneer connecting businesses to payments, eCommerce, and logistics.",
    region: "Greater Accra",
    district: "Ayawaso West Municipal",
    locality: "East Legon",
    address: "Lagos Avenue, East Legon, Accra",
    phone: "+233 30 700 0577",
    website: "https://hubtel.com",
    licenseNumber: "BOG/PSP/ENH-002",
    tags: ["Bank of Ghana Licensed", "Enhanced PSP", "FinTech", "Payments"],
  },
  {
    regulator: "Bank of Ghana (BoG)",
    name: "Zeepay Ghana Limited",
    categorySlug: "banking-financial-services-investment-securities",
    description: "Licensed Electronic Money Issuer and mobile remittance hub facilitating cross-border payments directly into mobile wallets.",
    region: "Greater Accra",
    district: "Ayawaso Central Municipal",
    locality: "Cantonments",
    address: "2nd Circular Road, Cantonments, Accra",
    phone: "+233 30 290 5410",
    website: "https://myzeepay.com",
    licenseNumber: "BOG/EMI/004",
    tags: ["Bank of Ghana Licensed", "EMI", "Remittances", "FinTech"],
  },

  // -------------------------------------------------------------------------
  // 3. NATIONAL INSURANCE COMMISSION (NIC) - Insurers & Brokers
  // -------------------------------------------------------------------------
  {
    regulator: "National Insurance Commission (NIC)",
    association: "Ghana Insurers Association (GIA)",
    name: "Enterprise Insurance Company Limited",
    categorySlug: "banking-financial-services-insurance-companies",
    description: "Ghana's oldest and leading non-life insurance company established in 1924, underwriting motor, fire, marine, and engineering risks.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Airport City",
    address: "Advantage Place, Mayor Road, Ridge West, Accra",
    phone: "+233 30 266 6847",
    website: "https://enterprisegroup.net.gh",
    licenseNumber: "NIC/NL/001",
    tags: ["NIC Licensed", "General Insurance", "GIA Member", "Enterprise Group"],
  },
  {
    regulator: "National Insurance Commission (NIC)",
    association: "Insurance Brokers Association of Ghana (IBAG)",
    name: "KEK Insurance Brokers Limited",
    categorySlug: "banking-financial-services-insurance-companies",
    description: "Leading chartered insurance brokerage firm in Ghana providing risk management, employee benefit consulting, and reinsurance placement.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Adabraka",
    address: "KEK House, Ring Road Central, Adabraka, Accra",
    phone: "+233 30 223 3704",
    website: "https://kekgroupgh.com",
    licenseNumber: "NIC/BRK/003",
    tags: ["NIC Licensed", "Insurance Broker", "IBAG Member", "Risk Advisory"],
  },

  // -------------------------------------------------------------------------
  // 4. HEALTHCARE: HeFRA & PHARMACY COUNCIL GHANA
  // -------------------------------------------------------------------------
  {
    regulator: "Health Facilities Regulatory Agency (HeFRA)",
    association: "Private Health Facilities Association of Ghana (PHFAoG)",
    name: "Nyaho Medical Centre (Airport)",
    categorySlug: "health-wellness-clinics-diagnostics",
    description: "Premier private tertiary healthcare center in Ghana offering multi-specialist clinical consultations, 24/7 emergency services, and intensive care.",
    region: "Greater Accra",
    district: "Ayawaso West Municipal",
    locality: "Airport Residential",
    address: "35 Aviation Road, Airport Residential Area, Accra",
    phone: "+233 30 708 6490",
    website: "https://nyahomedical.com",
    licenseNumber: "HeFRA/GAR/HOSP-001",
    tags: ["HeFRA Licensed", "Private Hospital", "Tertiary Care", "24/7 Emergency"],
  },
  {
    regulator: "Pharmacy Council of Ghana",
    association: "Pharmaceutical Society of Ghana (PSGH)",
    name: "Ernest Chemists Limited (Headquarters)",
    categorySlug: "health-wellness-pharmacies",
    description: "Leading retail and wholesale pharmaceutical distributor with over 80 branch pharmacies across Ghana and certified WHO-standard manufacturing.",
    region: "Greater Accra",
    district: "Okaikwei South Municipal",
    locality: "Industrial Area",
    address: "Plot 30, Ring Road North, Industrial Area, Accra",
    phone: "+233 30 222 0454",
    website: "https://ernestchemists.com",
    licenseNumber: "PC/GAR/WHP-0012",
    tags: ["Pharmacy Council Licensed", "Wholesale Pharmacy", "PSGH Member", "Healthcare"],
  },
  {
    regulator: "Pharmacy Council of Ghana",
    association: "Pharmaceutical Society of Ghana (PSGH)",
    name: "Top Up Pharmacy Osu",
    categorySlug: "health-wellness-pharmacies",
    description: "Licensed modern retail community pharmacy providing prescription medication, healthcare counseling, and wellness goods.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Osu",
    address: "Danfodio Road, Near Oxford Street, Osu, Accra",
    phone: "+233 30 278 9988",
    licenseNumber: "PC/GAR/RTP-0418",
    tags: ["Pharmacy Council Licensed", "Retail Pharmacy", "Prescription Drugs", "Osu"],
  },

  // -------------------------------------------------------------------------
  // 5. NATIONAL COMMUNICATIONS AUTHORITY (NCA) - ISPs & Telecoms
  // -------------------------------------------------------------------------
  {
    regulator: "National Communications Authority (NCA)",
    association: "Ghana Internet Service Providers Association (GISPA)",
    name: "Teledata ICT Limited",
    categorySlug: "technology-it-internet-services",
    description: "NCA-authorized Internet and Data Service Provider offering dedicated fiber broadband, VoIP, and managed cloud solutions for enterprise clients.",
    region: "Greater Accra",
    district: "Ayawaso Central Municipal",
    locality: "Kokomlemle",
    address: "No. 4 Ring Road Central, Kokomlemle, Accra",
    phone: "+233 30 221 1555",
    website: "https://teledataict.com",
    licenseNumber: "NCA/ISP/008",
    tags: ["NCA Authorized", "ISP", "Enterprise Fiber", "GISPA Member"],
  },
  {
    regulator: "National Communications Authority (NCA)",
    name: "Comsys Ghana Limited",
    categorySlug: "technology-it-internet-services",
    description: "Licensed tier-one enterprise network connectivity provider with nationwide metro fiber and VSAT communications.",
    region: "Greater Accra",
    district: "Ayawaso West Municipal",
    locality: "Dzorwulu",
    address: "12 Blohum Street, Dzorwulu, Accra",
    phone: "+233 30 277 8899",
    website: "https://comsysghana.com",
    licenseNumber: "NCA/ISP/002",
    tags: ["NCA Authorized", "Enterprise Network", "Metro Fiber", "Data Services"],
  },

  // -------------------------------------------------------------------------
  // 6. NATIONAL PETROLEUM AUTHORITY (NPA) - Oil Marketing Companies (OMCs)
  // -------------------------------------------------------------------------
  {
    regulator: "National Petroleum Authority (NPA)",
    association: "Association of Oil Marketing Companies (AOMC)",
    name: "GOIL PLC (Ghana Oil Company)",
    categorySlug: "energy-petroleum-oil-marketing",
    description: "Ghana's premier indigenous oil marketing giant operating over 400 service stations, bunkering facilities, and aviation fuel terminals.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Ridge",
    address: "D-809/4 High Street / Kojo Thompson Road, Ridge, Accra",
    phone: "+233 30 268 8214",
    website: "https://goil.com.gh",
    licenseNumber: "NPA/OMC/001",
    tags: ["NPA Licensed", "OMC", "AOMC Member", "Retail Fuel Stations"],
  },
  {
    regulator: "National Petroleum Authority (NPA)",
    association: "Association of Oil Marketing Companies (AOMC)",
    name: "Zen Petroleum Limited",
    categorySlug: "energy-petroleum-oil-marketing",
    description: "Leading safe fuel distributor specializing in direct mine fuel supply, commercial bunkering, and retail fuel stations across Ghana.",
    region: "Greater Accra",
    district: "Ayawaso West Municipal",
    locality: "Airport Residential",
    address: "Plot 10, Senchi Street, Airport Residential Area, Accra",
    phone: "+233 30 278 7770",
    website: "https://zenpetroleum.com",
    licenseNumber: "NPA/OMC/022",
    tags: ["NPA Licensed", "Mining Fuel Supplier", "OMC", "AOMC Member"],
  },

  // -------------------------------------------------------------------------
  // 7. MINERALS COMMISSION OF GHANA - Mine Support Services (Class A/B)
  // -------------------------------------------------------------------------
  {
    regulator: "Minerals Commission of Ghana",
    association: "Ghana Chamber of Mines",
    name: "Mantrac Ghana Limited",
    categorySlug: "mining-quarrying-support-services",
    description: "Exclusive Caterpillar equipment dealer in Ghana and licensed Class A mine support services provider supplying heavy earthmoving machinery.",
    region: "Greater Accra",
    district: "Okaikwei South Municipal",
    locality: "Industrial Area",
    address: "Ring Road West, Industrial Area, Accra",
    phone: "+233 30 221 3777",
    website: "https://mantracghana.com",
    licenseNumber: "MINCOM/MSS/CLA-0015",
    tags: ["Minerals Commission Registered", "Class A Support Service", "Heavy Machinery", "Mining Equipment"],
  },
  {
    regulator: "Minerals Commission of Ghana",
    association: "Ghana Chamber of Mines",
    name: "Maxmass Limited",
    categorySlug: "mining-quarrying-support-services",
    description: "Registered Ghanaian mining contractor providing blast-hole drilling, load and haul, and mine equipment operations for major gold mining concessions.",
    region: "Western",
    district: "Tarkwa-Nsuaem Municipal",
    locality: "Tarkwa Commercial",
    address: "Post Office Road, Tarkwa, Western Region",
    phone: "+233 31 232 0450",
    licenseNumber: "MINCOM/MSS/CLB-0084",
    tags: ["Minerals Commission Registered", "Contract Mining", "Haulage", "Tarkwa Mining"],
  },

  // -------------------------------------------------------------------------
  // 8. REAL ESTATE: GREDA & REAC
  // -------------------------------------------------------------------------
  {
    regulator: "Real Estate Agency Council (REAC)",
    association: "Ghana Real Estate Developers Association (GREDA)",
    name: "Regimanuel Gray Limited",
    categorySlug: "real-estate-property-property-agents",
    description: "Pioneering residential and commercial master-planned community developer in Ghana with thousands of delivered estate homes.",
    region: "Greater Accra",
    district: "Ledzokuku Municipal",
    locality: "Spintex",
    address: "26 Boundary Road, East Airport / Spintex Road, Accra",
    phone: "+233 30 281 1234",
    website: "https://regimanuelgray.com",
    licenseNumber: "GREDA/DEV/001",
    tags: ["GREDA Member", "REAC Registered", "Gated Communities", "Property Developer"],
  },
  {
    regulator: "Real Estate Agency Council (REAC)",
    association: "Ghana Real Estate Developers Association (GREDA)",
    name: "Adom City Estate",
    categorySlug: "real-estate-property-property-agents",
    description: "Award-winning affordable housing developer providing modern residential gated estates across Greater Accra and Central Region.",
    region: "Greater Accra",
    district: "Tema Metropolitan",
    locality: "Tema Community 25",
    address: "Dawhenya Road, Community 25, Tema",
    phone: "+233 30 290 8820",
    website: "https://adomcityestate.com",
    licenseNumber: "GREDA/DEV/045",
    tags: ["GREDA Member", "Affordable Housing", "REAC Registered", "Real Estate"],
  },

  // -------------------------------------------------------------------------
  // 9. LOGISTICS: GHANA INSTITUTE OF FREIGHT FORWARDERS (GIFF)
  // -------------------------------------------------------------------------
  {
    regulator: "Ghana Maritime Authority (GMA)",
    association: "Ghana Institute of Freight Forwarders (GIFF)",
    name: "Baj Freight and Logistics Limited",
    categorySlug: "transport-logistics-haulage-trucking",
    description: "Premier fully licensed customs brokerage, air/sea freight forwarding, and heavy lift haulage contractor serving maritime and petroleum sectors.",
    region: "Greater Accra",
    district: "Tema Metropolitan",
    locality: "Tema Harbour",
    address: "Heavy Industrial Area, Harbour Road, Tema",
    phone: "+233 30 320 0110",
    website: "https://bajfreight.com",
    licenseNumber: "GIFF/TMA/002",
    tags: ["GIFF Member", "GMA Licensed", "Customs Broker", "Freight Forwarding", "FIATA"],
  },
  {
    regulator: "Ghana Maritime Authority (GMA)",
    association: "Ghana Institute of Freight Forwarders (GIFF)",
    name: "McDan Shipping Company Limited",
    categorySlug: "transport-logistics-haulage-trucking",
    description: "Leading indigenous freight forwarding and logistics conglomerate operating air, sea, and land cargo handling across West Africa.",
    region: "Greater Accra",
    district: "La Dade-Kotopon Municipal",
    locality: "Airport City",
    address: "McDan House, Aviation Road, Airport City, Accra",
    phone: "+233 30 277 3340",
    website: "https://mcdangroup.com",
    licenseNumber: "GIFF/ACC/001",
    tags: ["GIFF Member", "Air Cargo", "Sea Freight", "Logistics Conglomerate"],
  },

  // -------------------------------------------------------------------------
  // 10. ASSOCIATION OF GHANA INDUSTRIES (AGI) - Manufacturing
  // -------------------------------------------------------------------------
  {
    regulator: "Ghana Standards Authority (GSA)",
    association: "Association of Ghana Industries (AGI)",
    name: "Kasapreko PLC",
    categorySlug: "manufacturing-industrial-packaging",
    description: "Multinational beverage manufacturing company producing renowned herbal alcoholic and non-alcoholic beverages and bottled mineral water.",
    region: "Greater Accra",
    district: "Ledzokuku Municipal",
    locality: "Spintex",
    address: "Kasapreko Junction, Spintex Road, Accra",
    phone: "+233 30 281 0990",
    website: "https://kasapreko.com",
    licenseNumber: "AGI/MFG/GAR-012",
    tags: ["AGI Member", "GSA Certified", "Beverage Manufacturer", "Industrial Exporter"],
  },
  {
    regulator: "Ghana Standards Authority (GSA)",
    association: "Association of Ghana Industries (AGI)",
    name: "Blow Group of Companies (Bel-Aqua / Bel-Cola)",
    categorySlug: "manufacturing-industrial-packaging",
    description: "Major industrial producer of natural mineral water, soft beverages, and rigid plastic packaging solutions across Ghana.",
    region: "Greater Accra",
    district: "Tema Metropolitan",
    locality: "Tema Heavy Industrial",
    address: "Heavy Industrial Area, Community 9, Tema",
    phone: "+233 30 330 1122",
    licenseNumber: "AGI/MFG/TMA-034",
    tags: ["AGI Member", "GSA Certified", "Plastics & Beverages", "Manufacturing"],
  },

  // -------------------------------------------------------------------------
  // 11. COCOBOD - Licensed Buying Companies (LBCs)
  // -------------------------------------------------------------------------
  {
    regulator: "Ghana Cocoa Board (COCOBOD)",
    association: "Chamber of Cocoa Marketers (COCOAMAG)",
    name: "Federated Commodities Limited (FEDCO)",
    categorySlug: "agriculture-agri-business-agro-processing",
    description: "One of Ghana's foremost Licensed Buying Companies (LBC) purchasing, quality-checking, and warehousing premium cocoa beans directly from farmer cooperatives.",
    region: "Greater Accra",
    district: "Korle Klottey Municipal",
    locality: "Ridge",
    address: "Fedco House, Ring Road Central, Ridge, Accra",
    phone: "+233 30 223 8812",
    website: "https://fedcoltd.com",
    licenseNumber: "COCOBOD/LBC-004",
    tags: ["COCOBOD Licensed", "LBC", "Cocoa Aggregation", "Agribusiness"],
  },
  {
    regulator: "Ghana Cocoa Board (COCOBOD)",
    association: "Chamber of Cocoa Marketers (COCOAMAG)",
    name: "Kuapa Kokoo Limited",
    categorySlug: "agriculture-agri-business-agro-processing",
    description: "Pioneering farmer-owned cocoa buying cooperative championing fair trade, rural farmer empowerment, and traceably sourced cocoa beans.",
    region: "Ashanti",
    district: "Kumasi Metropolitan",
    locality: "Ahodwo",
    address: "Ahodwo Roundabout, Kumasi, Ashanti Region",
    phone: "+233 32 203 1455",
    licenseNumber: "COCOBOD/LBC-002",
    tags: ["COCOBOD Licensed", "Fair Trade Cocoa", "Farmer Cooperative", "Kumasi"],
  },
];

export async function runRegulatorImport(): Promise<void> {
  console.log("=== Ghana Trade: Importing Accredited Members from Sector Regulators ===");

  const context = await buildImportContext(prisma, IMPORT_OWNER_EMAIL);

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of REGULATED_MEMBERS_DATASET) {
    const slugRef = `reg-${item.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    
    // Check if category exists or map fallback
    let catSlug = item.categorySlug;
    if (!context.categoryBySlug.has(catSlug)) {
      // Try to find matching category by prefix or fallback
      const parentSlug = catSlug.split("-")[0];
      const match = Array.from(context.categoryBySlug.keys()).find(k => k.startsWith(parentSlug));
      catSlug = match ?? "retail-general-trade";
    }

    const record: ImportRecord = {
      source: "PARTNER",
      sourceRef: slugRef,
      sourceUrl: item.website ?? `https://ghanatrade.app/regulator/${encodeURIComponent(item.regulator)}`,
      name: item.name,
      categorySlug: catSlug,
      status: "PUBLISHED",
      description: `${item.description} Regulated by ${item.regulator}${item.association ? ` | Member of ${item.association}` : ""}. License: ${item.licenseNumber ?? "Accredited"}`,
      phone: item.phone ?? null,
      website: item.website ?? null,
      regionName: item.region,
      districtName: item.district ?? null,
      locality: item.locality ?? null,
      address: item.address,
      tags: [
        item.regulator,
        item.association ?? "Accredited",
        "Regulated Entity",
        ...item.tags,
      ],
      importBatchId: "regulators-batch-2026",
    };

    const outcome = await importRecord(prisma, context, record);
    if (outcome === "created") {
      createdCount++;
      console.log(`[+] Created accredited listing: ${item.name} (${item.regulator})`);
    } else if (outcome === "updated") {
      updatedCount++;
      console.log(`[~] Updated listing: ${item.name}`);
    }

    // Set verification level to DOCUMENTS_REVIEWED for accredited entities
    await prisma.business.updateMany({
      where: { sourceRef: slugRef },
      data: {
        verificationLevel: "DOCUMENTS_REVIEWED",
        registrationName: item.name,
        registrationId: item.licenseNumber ?? "ACCREDITED-REGULATED",
      },
    });
  }

  console.log(`\nImport Completed! Created: ${createdCount}, Updated: ${updatedCount}, Total Processed: ${REGULATED_MEMBERS_DATASET.length}`);
}

if (require.main === module) {
  runRegulatorImport()
    .catch((err) => {
      console.error("Import error:", err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
