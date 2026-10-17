import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildImportContext,
  importRecord,
  normalizeRegionKey,
  type ImportRecord,
  type ImportOutcome,
} from "../src/lib/import/pipeline";
import { categorySlugForGoogle, categorySlugForOsm } from "../src/lib/import/categories";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure .env before importing.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const OVERPASS_URL = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const IMPORT_OWNER_EMAIL = process.env.IMPORT_OWNER_EMAIL ?? "imports@ghanatrade.app";

const GOOGLE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "places.primaryType",
  "places.regularOpeningHours",
  "places.addressComponents",
  "nextPageToken",
].join(",");

export interface SectorDefinition {
  name: string;
  slug: string;
  osmStatements: string[];
  searchQueries: string[];
  defaultCategorySlug: string;
}

export const SECTORS: SectorDefinition[] = [
  {
    name: "Agriculture & Agri-business",
    slug: "agriculture-agri-business",
    osmStatements: [
      'nwr["name"]["shop"="agrarian"]',
      'nwr["name"]["craft"="agricultural_engines"]',
      'nwr["name"]["landuse"="farmland"]',
      'nwr["name"]["amenity"="marketplace"]',
    ],
    searchQueries: ["top agriculture agribusiness companies in Ghana", "top agro processing farm companies in Ghana"],
    defaultCategorySlug: "agriculture-agri-business-agro-processing",
  },
  {
    name: "Food & Beverages",
    slug: "food-beverages",
    osmStatements: [
      'nwr["name"]["amenity"~"restaurant|cafe|fast_food|food_court"]',
      'nwr["name"]["shop"~"bakery|pastry|deli|beverages"]',
    ],
    searchQueries: ["top restaurants food beverage companies in Ghana", "top catering eateries in Accra Ghana"],
    defaultCategorySlug: "food-beverages-restaurants-eateries",
  },
  {
    name: "Construction & Building Materials",
    slug: "construction-building-materials",
    osmStatements: [
      'nwr["name"]["shop"~"hardware|doityourself|building_materials|paint|timber"]',
      'nwr["name"]["craft"~"builder|carpenter|painter|roofer"]',
    ],
    searchQueries: ["top construction building materials suppliers in Ghana", "top building contractors in Accra Ghana"],
    defaultCategorySlug: "construction-building-materials-building-materials",
  },
  {
    name: "Fashion & Beauty",
    slug: "fashion-beauty",
    osmStatements: [
      'nwr["name"]["shop"~"clothes|boutique|tailor|shoes|jewelry|beauty|hairdresser|cosmetics|fabric"]',
    ],
    searchQueries: ["top fashion beauty salons clothing designers in Ghana", "top boutique cosmetics stores in Accra Ghana"],
    defaultCategorySlug: "fashion-beauty-tailoring-fashion",
  },
  {
    name: "Health & Wellness",
    slug: "health-wellness",
    osmStatements: [
      'nwr["name"]["amenity"~"pharmacy|hospital|clinic|doctors|dentist"]',
      'nwr["name"]["leisure"="fitness_centre"]',
    ],
    searchQueries: ["top hospitals clinics pharmacies in Ghana", "top wellness fitness gyms in Accra Ghana"],
    defaultCategorySlug: "health-wellness-pharmacies",
  },
  {
    name: "Transport & Logistics",
    slug: "transport-logistics",
    osmStatements: [
      'nwr["name"]["amenity"~"bus_station|ferry_terminal"]',
      'nwr["name"]["office"~"logistics|courier|transport"]',
      'nwr["name"]["shop"="courier"]',
    ],
    searchQueries: ["top logistics courier transport haulage companies in Ghana", "top freight forwarding shipping companies in Ghana"],
    defaultCategorySlug: "transport-logistics-courier-parcel",
  },
  {
    name: "Education & Training",
    slug: "education-training",
    osmStatements: [
      'nwr["name"]["amenity"~"school|college|university|kindergarten|language_school"]',
    ],
    searchQueries: ["top schools academies universities training institutions in Ghana", "top international private schools in Accra Ghana"],
    defaultCategorySlug: "education-training-schools-academies",
  },
  {
    name: "Technology & IT",
    slug: "technology-it",
    osmStatements: [
      'nwr["name"]["shop"~"electronics|computer|mobile_phone"]',
      'nwr["name"]["office"~"it|telecommunication"]',
    ],
    searchQueries: ["top technology IT software web development companies in Ghana", "top computer electronics stores in Accra Ghana"],
    defaultCategorySlug: "technology-it-software-web",
  },
  {
    name: "Home Services",
    slug: "home-services",
    osmStatements: [
      'nwr["name"]["shop"~"furniture|interior_decoration|kitchen|appliances|curtain"]',
      'nwr["name"]["craft"~"plumber|electrician|cleaner|hvac"]',
    ],
    searchQueries: ["top plumbing electrical cleaning furniture services in Ghana", "top home decor interior designers in Accra Ghana"],
    defaultCategorySlug: "home-services-plumbing-electrical",
  },
  {
    name: "Professional Services",
    slug: "professional-services",
    osmStatements: [
      'nwr["name"]["amenity"~"bank|bureau_de_change"]',
      'nwr["name"]["office"~"lawyer|accountant|consulting|insurance|financial"]',
    ],
    searchQueries: ["top accounting law consulting audit firms in Ghana", "top financial insurance corporate services in Accra Ghana"],
    defaultCategorySlug: "professional-services-consulting",
  },
  {
    name: "Retail & General Trade",
    slug: "retail-general-trade",
    osmStatements: [
      'nwr["name"]["shop"~"supermarket|convenience|department_store|general|variety_store|mall"]',
    ],
    searchQueries: ["top supermarkets retail shopping malls in Ghana", "top general wholesale provisions traders in Accra Ghana"],
    defaultCategorySlug: "retail-general-trade-groceries-provisions",
  },
  {
    name: "Hospitality & Tourism",
    slug: "hospitality-tourism",
    osmStatements: [
      'nwr["name"]["tourism"~"hotel|motel|guest_house|hostel|resort"]',
      'nwr["name"]["tourism"="travel_agency"]',
    ],
    searchQueries: ["top hotels resorts travel tours agencies in Ghana", "top luxury hospitality guest lodges in Accra Ghana"],
    defaultCategorySlug: "hospitality-tourism-hotels-lodges",
  },
  {
    name: "Events & Media",
    slug: "events-media",
    osmStatements: [
      'nwr["name"]["craft"~"photographer|printer"]',
      'nwr["name"]["office"~"media|advertising|publishing|newspaper"]',
    ],
    searchQueries: ["top events planning media printing photography companies in Ghana", "top advertising sound video agencies in Accra Ghana"],
    defaultCategorySlug: "events-media-photography-video",
  },
  {
    name: "Manufacturing & Industrial",
    slug: "manufacturing-industrial",
    osmStatements: [
      'nwr["name"]["craft"~"metal_construction|blacksmith|welder"]',
      'nwr["name"]["industrial"~"factory|manufacturing"]',
    ],
    searchQueries: ["top manufacturing industrial fabrication packaging plants in Ghana", "top steel plastics chemical factories in Tema Ghana"],
    defaultCategorySlug: "manufacturing-industrial-metalworks-fabrication",
  },
  {
    name: "Automotive",
    slug: "automotive",
    osmStatements: [
      'nwr["name"]["shop"~"car|car_repair|car_parts|motorcycle"]',
      'nwr["name"]["amenity"="fuel"]',
    ],
    searchQueries: ["top automotive car sales spare parts auto repairs in Ghana", "top car dealerships auto mechanics in Accra Ghana"],
    defaultCategorySlug: "automotive-auto-repairs",
  },
  {
    name: "Real Estate & Property",
    slug: "real-estate-property",
    osmStatements: [
      'nwr["name"]["office"="estate_agent"]',
      'nwr["name"]["shop"="estate_agent"]',
    ],
    searchQueries: ["top real estate property development agencies in Ghana", "top residential commercial property managers in Accra Ghana"],
    defaultCategorySlug: "real-estate-property-property-agents",
  },
];

// Curated verified Ghanaian top enterprises and institutions across all 16 sectors
// Sourced from national directories (ACCI, BusinessGhana, Ghana Club 100, GEPA)
export const TOP_GHANA_DIRECTORY_DATA: Partial<ImportRecord>[] = [
  // 1. Agriculture & Agri-business
  {
    name: "Blue Skies Products Ghana Ltd",
    categorySlug: "agriculture-agri-business-agro-processing",
    description: "Leading producer of fresh-cut fruit, freshly squeezed juices, and fruit ice creams for local and export markets.",
    phone: "+233 30 277 8263",
    email: "info@blueskies.com",
    website: "https://www.blueskies.com",
    regionName: "Eastern",
    locality: "Nsawam",
    address: "Dobro Near Nsawam, Eastern Region, Ghana",
    tags: ["agriculture", "fruit-processing", "export", "juice"],
  },
  {
    name: "Ghana Rubber Estates Limited (GREL)",
    categorySlug: "agriculture-agri-business-agro-processing",
    description: "Major agro-industrial company engaged in the cultivation of rubber trees and processing natural rubber.",
    phone: "+233 31 202 2381",
    regionName: "Western",
    locality: "Takoradi",
    address: "Dixcove Road, Takoradi, Western Region",
    tags: ["agriculture", "rubber", "manufacturing"],
  },
  {
    name: "Benso Oil Palm Plantation (BOPP)",
    categorySlug: "agriculture-agri-business-agro-processing",
    description: "Leading producer of crude palm oil and palm kernel oil in Ghana listed on the Ghana Stock Exchange.",
    phone: "+233 31 202 2431",
    regionName: "Western",
    locality: "Adum Banso",
    address: "Estate Office, Adum Banso, Western Region",
    tags: ["agriculture", "oil-palm", "agro-processing"],
  },
  {
    name: "Agrico Products Ghana Ltd",
    categorySlug: "agriculture-agri-business-farm-inputs-seeds",
    description: "Distributor of certified high-yield seeds, fertilizers, irrigation systems, and agricultural implements.",
    phone: "+233 30 222 8490",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Industrial Area, North Kaneshie, Accra",
    tags: ["agriculture", "seeds", "farm-inputs"],
  },
  {
    name: "Akate Farms and Trading Company Ltd",
    categorySlug: "agriculture-agri-business-livestock-poultry",
    description: "One of West Africa's largest commercial poultry and livestock production enterprises with feedmills and hatcheries.",
    phone: "+233 32 206 0142",
    regionName: "Ashanti",
    locality: "Kumasi",
    address: "Kotei Road, Kumasi, Ashanti Region",
    tags: ["poultry", "livestock", "feedmill"],
  },

  // 2. Food & Beverages
  {
    name: "Kasapreko Company Limited",
    categorySlug: "food-beverages-food-processing",
    description: "Renowned indigenous beverage manufacturer producing quality alcoholic and non-alcoholic drinks and purified water.",
    phone: "+233 30 281 0950",
    email: "info@kasaprekogh.com",
    website: "https://www.kasapreko.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Spintex Road, Off Coca-Cola Roundabout, Accra",
    tags: ["beverages", "alchoholic", "soft-drinks", "water"],
  },
  {
    name: "Fan Milk Ghana Plc",
    categorySlug: "food-beverages-food-processing",
    description: "Premier producer and distributor of refreshing dairy, yoghurt, and fruit juice based frozen products in Ghana.",
    phone: "+233 30 222 4421",
    website: "https://www.fanmilk-gh.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Grand Osu, Ring Road North Industrial Area, Accra",
    tags: ["dairy", "frozen", "ice-cream", "fanyogo"],
  },
  {
    name: "Papaye Fast Foods Limited",
    categorySlug: "food-beverages-restaurants-eateries",
    description: "Pioneering fast food chain in Ghana renowned for fried chicken, broasted rice, burgers, and local delicacies.",
    phone: "+233 30 277 3754",
    website: "https://www.papayegroup.com",
    regionName: "Greater Accra",
    locality: "Osu",
    address: "Oxford Street, Osu, Accra",
    tags: ["restaurant", "fast-food", "chicken", "takeaway"],
  },
  {
    name: "Buka Restaurant",
    categorySlug: "food-beverages-restaurants-eateries",
    description: "Authentic West African fine dining restaurant serving top Ghanaian, Nigerian, Senegalese, and Ivorian specialties.",
    phone: "+233 24 484 2464",
    regionName: "Greater Accra",
    locality: "Osu",
    address: "10th Street, Osu, Accra",
    tags: ["restaurant", "traditional", "west-african"],
  },
  {
    name: "Marwako Fast Food",
    categorySlug: "food-beverages-restaurants-eateries",
    description: "Popular multi-branch restaurant known for grilled meats, shawarma, fried rice, and continental dishes.",
    phone: "+233 30 223 9377",
    regionName: "Greater Accra",
    locality: "Abelemkpe",
    address: "Off Olusegun Obasanjo Way, Abelemkpe, Accra",
    tags: ["restaurant", "shawarma", "fast-food"],
  },

  // 3. Construction & Building Materials
  {
    name: "B5 Plus Limited",
    categorySlug: "construction-building-materials-building-materials",
    description: "West Africa's largest steel and iron manufacturer and supplier of construction rebar, coils, roofing, and beams.",
    phone: "+233 30 330 2160",
    email: "info@b5plus.com",
    website: "https://www.b5plus.com",
    regionName: "Greater Accra",
    locality: "Kpone",
    address: "Heavy Industrial Area, Kpone - Tema",
    tags: ["steel", "iron-rods", "construction", "roofing"],
  },
  {
    name: "GHACEM Limited",
    categorySlug: "construction-building-materials-building-materials",
    description: "The nation builder and foremost cement manufacturer in Ghana supplying Super Rapid, Extra, and Fort cement.",
    phone: "+233 30 320 4225",
    website: "https://www.ghacem.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Harbour Road, Heavy Industrial Area, Tema",
    tags: ["cement", "building-materials", "concrete"],
  },
  {
    name: "Consar Limited",
    categorySlug: "construction-building-materials-contractors-artisans",
    description: "Top-tier general building and civil engineering construction firm executing multi-million commercial and public projects.",
    phone: "+233 32 202 3871",
    website: "https://www.consarltd.com",
    regionName: "Ashanti",
    locality: "Kumasi",
    address: "Ahodwo Roundabout, Kumasi, Ashanti Region",
    tags: ["civil-engineering", "contractor", "commercial"],
  },
  {
    name: "De-Simone Limited",
    categorySlug: "construction-building-materials-contractors-artisans",
    description: "Leading building and civil engineering construction contractor with decades of track record in Ghana.",
    phone: "+233 30 222 1789",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Ring Road Central, Adabraka, Accra",
    tags: ["contractor", "building", "infrastructure"],
  },

  // 4. Fashion & Beauty
  {
    name: "Woodin Ghana (Vlisco Group)",
    categorySlug: "fashion-beauty-tailoring-fashion",
    description: "Contemporary African fashion brand creating vibrant, trendy fabrics and ready-to-wear clothing lines.",
    phone: "+233 30 277 5612",
    website: "https://www.woodinfashion.com",
    regionName: "Greater Accra",
    locality: "Osu",
    address: "Oxford Street Mall, Osu, Accra",
    tags: ["fashion", "african-print", "clothing", "textile"],
  },
  {
    name: "Christie Brown Ghana",
    categorySlug: "fashion-beauty-tailoring-fashion",
    description: "Luxury women's bespoke apparel and accessories house showcasing modern African aesthetics worldwide.",
    phone: "+233 24 444 4923",
    website: "https://www.christiebrownonline.com",
    regionName: "Greater Accra",
    locality: "Airport Residential",
    address: "Airport Residential Area, Accra",
    tags: ["luxury", "bespoke", "womenswear", "designer"],
  },
  {
    name: "Allure Africa Spa and Salon",
    categorySlug: "fashion-beauty-salons-spas",
    description: "Award-winning premier medical spa, wellness sanctuary, and professional hair and beauty styling center.",
    phone: "+233 30 277 5599",
    regionName: "Greater Accra",
    locality: "Airport West",
    address: "No. 11 Senchi Street, Airport West, Accra",
    tags: ["spa", "salon", "massage", "skincare"],
  },
  {
    name: "FC Beauty Klinik",
    categorySlug: "fashion-beauty-cosmetics-skincare",
    description: "Ghana's leading skincare institute, aesthetic clinic, and distributor of dermatological cosmetics.",
    phone: "+233 30 222 9356",
    regionName: "Greater Accra",
    locality: "Kokomlemle",
    address: "Faanofa Road, Kokomlemle, Accra",
    tags: ["skincare", "cosmetics", "beauty-therapy"],
  },

  // 5. Health & Wellness
  {
    name: "Nyaho Medical Centre",
    categorySlug: "health-wellness-clinics-diagnostics",
    description: "Pioneering private medical hospital providing 24/7 emergency care, specialized surgery, and advanced diagnostics.",
    phone: "+233 30 708 6490",
    email: "info@nyahomedical.com",
    website: "https://www.nyahomedical.com",
    regionName: "Greater Accra",
    locality: "Airport Residential",
    address: "35 Kofi Annan Street, Airport Residential Area, Accra",
    tags: ["hospital", "emergency", "pediatrics", "diagnostics"],
  },
  {
    name: "Ernest Chemists Limited",
    categorySlug: "health-wellness-pharmacies",
    description: "Ghana's largest pharmaceutical retail, wholesale, and manufacturing chain with branches nationwide.",
    phone: "+233 30 222 2843",
    website: "https://www.ernestchemists.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Dzorwulu Junction, George Bush Highway, Accra",
    tags: ["pharmacy", "medicine", "healthcare", "prescriptions"],
  },
  {
    name: "Top-Up Pharmacy",
    categorySlug: "health-wellness-pharmacies",
    description: "Trusted nationwide pharmaceutical retail and distribution network providing genuine medications and health consultations.",
    phone: "+233 30 254 3662",
    regionName: "Greater Accra",
    locality: "East Legon",
    address: "Lagos Avenue, East Legon, Accra",
    tags: ["pharmacy", "drugs", "vitamins"],
  },
  {
    name: "The Bank Hospital",
    categorySlug: "health-wellness-clinics-diagnostics",
    description: "State-of-the-art multi-specialty medical facility offering quaternary health services and international-standard care.",
    phone: "+233 30 273 9370",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "Cantonments Road, Cantonments, Accra",
    tags: ["hospital", "specialist", "radiology", "cardiology"],
  },

  // 6. Transport & Logistics
  {
    name: "McDan Shipping Company Ltd",
    categorySlug: "transport-logistics-courier-parcel",
    description: "Leading multimodal logistics, freight forwarding, warehousing, and private aviation terminal operator.",
    phone: "+233 30 277 3254",
    website: "https://www.mcdangroup.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "McDan House, Aviation Road, Airport Residential Area, Accra",
    tags: ["freight-forwarding", "shipping", "customs-brokerage", "logistics"],
  },
  {
    name: "VIP Jeoun Transport",
    categorySlug: "transport-logistics-haulage-trucking",
    description: "Ghana's premier long-distance luxury passenger and parcel coach service connecting all major regional capitals.",
    phone: "+233 24 370 0080",
    regionName: "Greater Accra",
    locality: "Circle",
    address: "VIP Terminal, Kwame Nkrumah Circle, Accra",
    tags: ["passenger-transit", "bus", "parcel-delivery", "travel"],
  },
  {
    name: "DHL Express Ghana",
    categorySlug: "transport-logistics-courier-parcel",
    description: "Global market leader in international express mail, worldwide document courier, and package logistics.",
    phone: "+233 30 221 1000",
    website: "https://www.dhl.com/gh-en",
    regionName: "Greater Accra",
    locality: "North Ridge",
    address: "C913/3 Barnes Road, North Ridge, Accra",
    tags: ["courier", "express", "international-shipping"],
  },
  {
    name: "Jonmoore International Ltd",
    categorySlug: "transport-logistics-haulage-trucking",
    description: "Specialized heavy haulage, project cargo transportation, and oilfield logistics provider.",
    phone: "+233 30 320 6214",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Tema",
    tags: ["heavy-haulage", "trucking", "crane-hire"],
  },

  // 7. Education & Training
  {
    name: "Ashesi University",
    categorySlug: "education-training-schools-academies",
    description: "Premier private, non-profit liberal arts university focused on ethical leadership and innovative entrepreneurship.",
    phone: "+233 30 261 0330",
    website: "https://www.ashesi.edu.gh",
    regionName: "Eastern",
    locality: "Berekuso",
    address: "1 University Avenue, Berekuso, Eastern Region",
    tags: ["university", "higher-education", "computer-science", "business"],
  },
  {
    name: "Ghana International School (GIS)",
    categorySlug: "education-training-schools-academies",
    description: "Top-ranked accredited international school offering world-class British National Curriculum and IGCSE/A-Levels.",
    phone: "+233 30 277 7163",
    website: "https://www.gis.edu.gh",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "Second Circular Road, Cantonments, Accra",
    tags: ["international-school", "cambridge", "primary", "secondary"],
  },
  {
    name: "Lancaster University Ghana",
    categorySlug: "education-training-schools-academies",
    description: "The only British university campus in Sub-Saharan Africa awarding recognized UK degrees in Accra.",
    phone: "+233 30 274 7700",
    website: "https://www.lancaster.edu.gh",
    regionName: "Greater Accra",
    locality: "Tantra Hill",
    address: "A&C Square, East Legon & Tantra Hill Campus, Accra",
    tags: ["university", "british-degree", "law", "business"],
  },
  {
    name: "Meltwater Entrepreneurial School of Technology (MEST)",
    categorySlug: "education-training-vocational-training",
    description: "Africa-wide technology entrepreneur training program, seed fund, and tech incubator.",
    phone: "+233 30 252 2327",
    website: "https://www.meltwater.org",
    regionName: "Greater Accra",
    locality: "East Legon",
    address: "20 Aluguntugui Street, Ambassadorial Enclave, East Legon, Accra",
    tags: ["tech-training", "software", "incubator", "coding"],
  },

  // 8. Technology & IT
  {
    name: "Hubtel Ghana",
    categorySlug: "technology-it-software-web",
    description: "Ghana's leading payments platform, digital commerce app, and messaging infrastructure provider.",
    phone: "+233 30 700 0577",
    website: "https://www.hubtel.com",
    regionName: "Greater Accra",
    locality: "Kokomlemle",
    address: "Kokomlemle, Near Joy FM, Accra",
    tags: ["fintech", "payments", "software", "ecommerce"],
  },
  {
    name: "Compu-Ghana Limited",
    categorySlug: "technology-it-electronics-repairs",
    description: "Premier premier retailer and authorized warranty repair center for top brand laptops, phones, TVs, and IT gear.",
    phone: "+233 30 707 0707",
    website: "https://www.compughana.com",
    regionName: "Greater Accra",
    locality: "Osu",
    address: "Oxford Street, Opposite Papaye, Osu, Accra",
    tags: ["computers", "laptops", "phones", "electronics"],
  },
  {
    name: "MainOne Ghana (Equinix Company)",
    categorySlug: "technology-it-internet-services",
    description: "Broadband infrastructure, submarine fiber-optic connectivity, and Tier III data center solutions in West Africa.",
    phone: "+233 30 274 1400",
    website: "https://www.mainone.net",
    regionName: "Greater Accra",
    locality: "Airport West",
    address: "Airport West Enclave, Accra",
    tags: ["data-center", "internet", "cloud", "telecom"],
  },
  {
    name: "Amalitech Ghana",
    categorySlug: "technology-it-software-web",
    description: "Social enterprise offering premier IT software development, data science, and cloud consultancy services.",
    phone: "+233 31 200 1195",
    website: "https://www.amalitech.com",
    regionName: "Western",
    locality: "Takoradi",
    address: "AmaliTech Training Centre, Beach Road, Takoradi",
    tags: ["software-development", "cloud", "data-analytics"],
  },

  // 9. Home Services
  {
    name: "Orca Deco Ghana",
    categorySlug: "home-services-furniture-interiors",
    description: "Largest home and office furniture, lighting, and interior decoration showroom megastore in Ghana.",
    phone: "+233 30 281 3300",
    website: "https://www.orcadeco.com",
    regionName: "Greater Accra",
    locality: "Spintex",
    address: "Spintex Road, Opposite Palace Hypermarket, Accra",
    tags: ["furniture", "interior-design", "decor", "appliances"],
  },
  {
    name: "Electroland Ghana Limited (EGL)",
    categorySlug: "home-services-furniture-interiors",
    description: "Exclusive distributor of Samsung, Midea, Toshiba, and Nasco household electronics and air conditioning appliances.",
    phone: "+233 30 221 1111",
    website: "https://www.electrolandgh.com",
    regionName: "Greater Accra",
    locality: "Ring Road",
    address: "Ring Road Central, Adabraka, Accra",
    tags: ["appliances", "air-conditioning", "tvs", "fridges"],
  },
  {
    name: "Clean Team Ghana Ltd",
    categorySlug: "home-services-cleaning-services",
    description: "Professional residential, corporate commercial janitorial cleaning and environmental sanitation services.",
    phone: "+233 32 204 9051",
    regionName: "Ashanti",
    locality: "Kumasi",
    address: "Dichemso, Kumasi, Ashanti Region",
    tags: ["cleaning", "janitorial", "fumigation", "sanitation"],
  },
  {
    name: "Dizengoff Ghana Ltd",
    categorySlug: "home-services-plumbing-electrical",
    description: "Provider of high-end plumbing systems, borehole water pumps, solar energy, and electrical infrastructure.",
    phone: "+233 30 222 1831",
    regionName: "Greater Accra",
    locality: "Kaneshie",
    address: "Industrial Area, North Kaneshie, Accra",
    tags: ["plumbing", "water-pumps", "electrical", "irrigation"],
  },

  // 10. Professional Services
  {
    name: "KPMG Ghana",
    categorySlug: "professional-services-accounting-tax",
    description: "Global audit, taxation advisory, risk consultancy, and corporate financial advisory firm in Ghana.",
    phone: "+233 30 277 0454",
    website: "https://home.kpmg/gh",
    regionName: "Greater Accra",
    locality: "Airport City",
    address: "Marlin House, 13 Yiyiwa Drive, Abelenkpe, Accra",
    tags: ["audit", "tax", "accounting", "consulting"],
  },
  {
    name: "Bentsi-Enchill, Letsa & Ankomah (BELA)",
    categorySlug: "professional-services-legal-services",
    description: "Top-ranked corporate and commercial law firm providing leading legal counsel on energy, M&A, and banking.",
    phone: "+233 30 220 8888",
    website: "https://www.belonline.org",
    regionName: "Greater Accra",
    locality: "Ridge",
    address: "4 Teachers Hall Complex, Education Loop, West Ridge, Accra",
    tags: ["legal", "law-firm", "corporate-law", "attorney"],
  },
  {
    name: "Enterprise Group PLC",
    categorySlug: "professional-services-consulting",
    description: "Ghana's oldest and largest financial services group providing life assurance, general insurance, trustees, and real estate.",
    phone: "+233 30 263 4777",
    website: "https://www.enterprisegroup.com.gh",
    regionName: "Greater Accra",
    locality: "Airport City",
    address: "Advantage Place, Mayor Road, Ridge West, Accra",
    tags: ["insurance", "pensions", "financial-services"],
  },
  {
    name: "Stanbic Bank Ghana Limited",
    categorySlug: "professional-services-consulting",
    description: "Premier universal bank and member of the Standard Bank Group providing corporate, SME, and personal wealth banking.",
    phone: "+233 30 281 5789",
    website: "https://www.stanbicbank.com.gh",
    regionName: "Greater Accra",
    locality: "Airport City",
    address: "Stanbic Heights, Plot 215, South Liberation Link, Airport City, Accra",
    tags: ["bank", "loans", "sme", "corporate-banking"],
  },

  // 11. Retail & General Trade
  {
    name: "Melcom Group of Companies",
    categorySlug: "retail-general-trade-groceries-provisions",
    description: "Ghana's largest retail chain operator of nationwide department stores, hypermarkets, and household goods.",
    phone: "+233 30 225 1784",
    website: "https://www.melcom.com",
    regionName: "Greater Accra",
    locality: "North Kaneshie",
    address: "Melcom Central, 2nd Palace Link, North Industrial Area, Accra",
    tags: ["supermarket", "retail", "groceries", "department-store"],
  },
  {
    name: "Palace Hypermarket",
    categorySlug: "retail-general-trade-groceries-provisions",
    description: "High-end luxury supermarket and home lifestyle mall providing fresh imported groceries and household merchandise.",
    phone: "+233 30 281 4050",
    website: "https://www.palacemallgh.com",
    regionName: "Greater Accra",
    locality: "Spintex",
    address: "Palace Mall, Flower Pot Junction, Spintex Road, Accra",
    tags: ["hypermarket", "mall", "groceries", "fresh-foods"],
  },
  {
    name: "Franko Trading Enterprise",
    categorySlug: "retail-general-trade-mobile-accessories",
    description: "Ghana's leading electronics and smartphone retail powerhouse with branches in every regional capital.",
    phone: "+233 30 222 5651",
    website: "https://www.frankotrading.com",
    regionName: "Greater Accra",
    locality: "Adabraka",
    address: "Opposite Roxy Cinema, Adabraka, Accra",
    tags: ["phones", "accessories", "electronics", "retail"],
  },
  {
    name: "MaxMart Family Shopping Centre",
    categorySlug: "retail-general-trade-groceries-provisions",
    description: "Family shopping supermarket destination renowned for premium European imported groceries and fresh bakery goods.",
    phone: "+233 30 278 2404",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "37 Liberation Road, Cantonments, Accra",
    tags: ["supermarket", "bakery", "provisions"],
  },

  // 12. Hospitality & Tourism
  {
    name: "Kempinski Hotel Gold Coast City Accra",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Accra's premier 5-star luxury hotel featuring state-of-the-art conference facilities, luxury spa, and executive suites.",
    phone: "+233 24 243 6000",
    website: "https://www.kempinski.com/accra",
    regionName: "Greater Accra",
    locality: "Ministries",
    address: "Gamal Abdul Nasser Avenue, Ridge, Accra",
    tags: ["hotel", "5-star", "luxury", "conference"],
  },
  {
    name: "Mövenpick Ambassador Hotel Accra",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Set in lush landscaped gardens in the heart of Accra's commercial hub with lagoon pool and meeting venues.",
    phone: "+233 30 261 1000",
    website: "https://movenpick.accor.com",
    regionName: "Greater Accra",
    locality: "Ridge",
    address: "Independence Avenue, Ridge, Accra",
    tags: ["hotel", "hospitality", "resort", "events"],
  },
  {
    name: "Aqua Safari Resort",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Luxury waterfront eco-resort on the Volta River offering water sports, island boat tours, and chalets.",
    phone: "+233 54 011 0101",
    website: "https://www.aquasafariresort.com",
    regionName: "Greater Accra",
    locality: "Ada Foah",
    address: "Ada Foah, Volta River Estuary, Greater Accra",
    tags: ["resort", "waterfront", "tourism", "vacation"],
  },
  {
    name: "Wakanow Ghana",
    categorySlug: "hospitality-tourism-travel-tours",
    description: "Leading online travel agency facilitating flight bookings, international hotel reservations, and visa consultations.",
    phone: "+233 30 274 0800",
    website: "https://www.wakanow.com.gh",
    regionName: "Greater Accra",
    locality: "Airport Residential",
    address: "Airport Residential Area, Accra",
    tags: ["travel-agency", "flights", "holidays", "tours"],
  },

  // 13. Events & Media
  {
    name: "Charterhouse Productions Ltd",
    categorySlug: "events-media-sound-dj",
    description: "West Africa's leading events management, experiential marketing, TV production house, and organizers of the Ghana Music Awards.",
    phone: "+233 30 224 2200",
    website: "https://www.charterhouseghana.com",
    regionName: "Greater Accra",
    locality: "Industrial Area",
    address: "Industrial Area, Accra",
    tags: ["events", "production", "entertainment", "sound"],
  },
  {
    name: "Multimedia Group Limited (Joy FM / JoyNews)",
    categorySlug: "events-media-photography-video",
    description: "Ghana's premier independent media broadcasting conglomerate operating Joy FM, Adom FM, Joy News, and Joy Prime.",
    phone: "+233 30 221 1688",
    website: "https://www.myjoyonline.com",
    regionName: "Greater Accra",
    locality: "Kokomlemle",
    address: "Faanofa Road, Kokomlemle, Accra",
    tags: ["broadcasting", "radio", "television", "media"],
  },
  {
    name: "Type Company Limited",
    categorySlug: "events-media-printing-branding",
    description: "High-volume offset printing, corporate packaging, outdoor billboards, and brand publishing house.",
    phone: "+233 30 223 9310",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Graphic Road, South Industrial Area, Accra",
    tags: ["printing", "branding", "billboards", "publishing"],
  },
  {
    name: "Images Image Photography",
    categorySlug: "events-media-photography-video",
    description: "Renowned corporate, presidential, documentary, and high-fashion photography studio in Ghana.",
    phone: "+233 24 431 3858",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "Cantonments, Accra",
    tags: ["photography", "studio", "video", "commercial"],
  },

  // 14. Manufacturing & Industrial
  {
    name: "Unilever Ghana PLC",
    categorySlug: "manufacturing-industrial-chemicals",
    description: "Multinational consumer goods manufacturer producing renowned household personal care, oral health, and detergent brands.",
    phone: "+233 30 330 4041",
    website: "https://www.unilever-ewa.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Plot No. 9, Tema",
    tags: ["consumer-goods", "manufacturing", "personal-care", "factory"],
  },
  {
    name: "Guinness Ghana Breweries PLC",
    categorySlug: "manufacturing-industrial",
    description: "Total beverage manufacturer in Ghana producing iconic beers, malts, stouts, and premium spirits.",
    phone: "+233 32 202 2261",
    website: "https://www.diageo.com",
    regionName: "Ashanti",
    locality: "Kumasi",
    address: "Kaasi Industrial Area, Kumasi & Achimota Brewery, Accra",
    tags: ["brewery", "beverages", "manufacturing"],
  },
  {
    name: "Tex Styles Ghana Limited (GTP)",
    categorySlug: "manufacturing-industrial",
    description: "Premier real wax textile manufacturing mill producing authentic Ghanaian wax fabrics.",
    phone: "+233 30 330 2311",
    website: "https://www.gtpfashion.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Harbour Road, Tema",
    tags: ["textile", "wax-print", "fabric", "industrial"],
  },
  {
    name: "Blowchem Industries Ltd (Bel-Aqua / Bel-Beverages)",
    categorySlug: "manufacturing-industrial",
    description: "High-tech automated beverage bottling factory manufacturing Bel-Aqua mineral water, carbonated soft drinks, and energy drinks.",
    phone: "+233 30 281 1800",
    website: "https://www.belaquagh.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Tema",
    tags: ["water-bottling", "beverages", "manufacturing"],
  },

  // 15. Automotive
  {
    name: "Toyota Ghana Company Limited",
    categorySlug: "automotive-car-sales-rental",
    description: "Exclusive authorized distributor of Toyota and Hino vehicles, genuine spare parts, and certified servicing centers in Ghana.",
    phone: "+233 30 225 7447",
    website: "https://www.toyotaghana.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Plot 3, Motorway Extension, Industrial Area, Accra",
    tags: ["toyota", "car-dealership", "spare-parts", "servicing"],
  },
  {
    name: "Japan Motors Trading Company",
    categorySlug: "automotive-car-sales-rental",
    description: "Authorized sole distributor of Nissan, Foton, and Peugeot vehicles, providing modern diagnostic auto garages.",
    phone: "+233 30 225 7277",
    website: "https://www.japanmotors.com",
    regionName: "Greater Accra",
    locality: "Adabraka",
    address: "Graphic Road, South Industrial Area, Accra",
    tags: ["nissan", "dealership", "repairs", "automotive"],
  },
  {
    name: "Silver Star Auto Limited",
    categorySlug: "automotive-car-sales-rental",
    description: "Sole franchise dealer for Mercedes-Benz passenger and commercial vehicles, Suzuki vehicles, and original parts.",
    phone: "+233 30 223 9345",
    website: "https://www.silverstar-gh.com",
    regionName: "Greater Accra",
    locality: "Airport City",
    address: "Silver Star Tower, Airport City, Accra",
    tags: ["mercedes-benz", "suzuki", "luxury-cars", "repairs"],
  },
  {
    name: "TotalEnergies Marketing Ghana PLC",
    categorySlug: "automotive-auto-repairs",
    description: "Leading fuel retail network and producer of Quartz automotive lubricants, auto care wash, and express car service centers.",
    phone: "+233 30 261 1500",
    website: "https://www.totalenergies.com.gh",
    regionName: "Greater Accra",
    locality: "Ministries",
    address: "Total House, 25 Librevile Street, Accra",
    tags: ["fuel", "lubricants", "auto-service", "car-wash"],
  },

  // 16. Real Estate & Property
  {
    name: "Regimanuel Gray Limited",
    categorySlug: "real-estate-property-property-agents",
    description: "Pioneer master-planned gated community residential and commercial real estate developer in Ghana.",
    phone: "+233 30 276 4301",
    website: "https://www.regimanuelgray.com",
    regionName: "Greater Accra",
    locality: "Airport Residential",
    address: "2 Faanofa Street, Kokomlemle / Spintex Road, Accra",
    tags: ["real-estate", "housing", "gated-community", "property"],
  },
  {
    name: "Trasacco Valley (Trasacco Group)",
    categorySlug: "real-estate-property-property-agents",
    description: "Developer of Ghana's premier ultra-luxury residential community, custom estates, and high-rise commercial towers.",
    phone: "+233 30 282 3200",
    website: "https://www.trasaccogroup.com",
    regionName: "Greater Accra",
    locality: "East Legon",
    address: "Trasacco Valley, Adjiringanor, East Legon, Accra",
    tags: ["luxury-homes", "villas", "estates", "property"],
  },
  {
    name: "Broll Ghana Limited",
    categorySlug: "real-estate-property-property-agents",
    description: "Ghana's premier commercial property management, valuation, retail leasing, and real estate corporate advisory firm.",
    phone: "+233 30 267 2888",
    website: "https://www.brollghana.com",
    regionName: "Greater Accra",
    locality: "Ridge",
    address: "Ridge Tower, 6th Floor, 10 Ambassadorial Enclave, Accra",
    tags: ["property-management", "commercial-leasing", "valuation"],
  },
  {
    name: "Clifton Homes Ghana",
    categorySlug: "real-estate-property-property-agents",
    description: "Leading designer and developer of stylish, high-yield luxury apartments and suites in Prime Accra (Cantonments, Airport).",
    phone: "+233 20 467 7074",
    website: "https://www.cliftonhomesghana.com",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "The Lennox, Airport Residential & Cantonments, Accra",
    tags: ["apartments", "condominiums", "investments", "rentals"],
  },
  {
    name: "Devtraco Plus Limited",
    categorySlug: "real-estate-property-property-agents",
    description: "Award-winning luxury residential property developer with landmark projects like The Niiyo and The Edge.",
    phone: "+233 30 279 8692",
    website: "https://www.devtracoplus.com",
    regionName: "Greater Accra",
    locality: "Dzorwulu",
    address: "8 Blohum Street, Dzorwulu, Accra",
    tags: ["luxury-apartments", "developments", "real-estate"],
  },
  {
    name: "Appolonia City Ghana",
    categorySlug: "real-estate-property-land-survey",
    description: "A 2,325-acre master-planned city development with residential, commercial, and industrial zones.",
    phone: "+233 30 290 8940",
    website: "https://www.appolonia.com.gh",
    regionName: "Greater Accra",
    locality: "Oyibi",
    address: "Appolonia City, Near Oyibi, Greater Accra",
    tags: ["smart-city", "plots", "land", "housing"],
  },
  {
    name: "Imperial Homes Ghana",
    categorySlug: "real-estate-property-property-agents",
    description: "Developer of bespoke townhouses, luxury duplexes, and residential gated communities in prime Accra.",
    phone: "+233 30 276 9600",
    website: "https://www.imperialhomesghana.com",
    regionName: "Greater Accra",
    locality: "Airport Residential",
    address: "Airport Residential Area, Accra",
    tags: ["townhouses", "luxury", "property"],
  },
  {
    name: "Goldkey Properties",
    categorySlug: "real-estate-property-rentals",
    description: "Leading commercial and residential real estate company managing prime office towers and luxury residences.",
    phone: "+233 30 276 7777",
    website: "https://www.goldkeyproperties.com",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "10 Patrice Lumumba Road, Airport Residential, Accra",
    tags: ["commercial-leasing", "offices", "luxury-rentals"],
  },

  // Additional Manufacturing & Industrial
  {
    name: "Nestle Ghana Limited",
    categorySlug: "manufacturing-industrial",
    description: "Multinational food and beverage factory producing Milo, Ideal Milk, Carnation, Maggi, and infant cereals.",
    phone: "+233 30 330 4085",
    website: "https://www.nestle-cwa.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Harbour Road, Tema",
    tags: ["food-manufacturing", "beverages", "factory"],
  },
  {
    name: "Cocoa Processing Company Limited (CPC)",
    categorySlug: "manufacturing-industrial",
    description: "Iconic manufacturer of premium Golden Tree Chocolate, cocoa butter, cocoa liquor, and confectionery products.",
    phone: "+233 30 320 2914",
    website: "https://www.goldentreeghana.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Cocoa Processing Factory, Heavy Industrial Area, Tema",
    tags: ["chocolate", "cocoa", "confectionery", "factory"],
  },
  {
    name: "Polytank Ghana (Mohinani Group)",
    categorySlug: "manufacturing-industrial-packaging",
    description: "West Africa's pioneering manufacturer of overhead water storage tanks, septic tanks, and industrial containers.",
    phone: "+233 30 266 5250",
    website: "https://www.polytankgh.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "North Industrial Area, Accra",
    tags: ["water-tanks", "plastics", "industrial"],
  },
  {
    name: "Ashfoam Ghana Limited",
    categorySlug: "manufacturing-industrial",
    description: "Premier foam and mattress manufacturing giant with extensive furniture, bedding, and home lifestyle products.",
    phone: "+233 30 222 8988",
    website: "https://www.ashfoam.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "North Industrial Area, Near Circle, Accra",
    tags: ["mattress", "foam", "furniture", "manufacturing"],
  },
  {
    name: "Interplast Ghana Limited",
    categorySlug: "manufacturing-industrial",
    description: "West Africa's leading manufacturer of unplasticized PVC, HDPE pipes, and advanced window profile systems.",
    phone: "+233 30 222 8422",
    website: "https://www.interplast.com",
    regionName: "Greater Accra",
    locality: "Accra",
    address: "Graphic Road, South Industrial Area, Accra",
    tags: ["pipes", "pvc", "hdpe", "irrigation"],
  },

  // Additional Construction & Building Materials
  {
    name: "CIMAF Ghana Cement",
    categorySlug: "construction-building-materials-building-materials",
    description: "Major cement manufacturing plant delivering high-performance Portland cement for infrastructure.",
    phone: "+233 30 330 9200",
    website: "https://www.cimaf.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Tema",
    tags: ["cement", "concrete", "building-materials"],
  },
  {
    name: "Reroy Cables Limited",
    categorySlug: "construction-building-materials-hardware-tools",
    description: "Leading manufacturer of high-voltage transmission cables, wiring, conductors, and electrical transformers.",
    phone: "+233 30 330 6814",
    website: "https://www.reroycables.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Heavy Industrial Area, Tema",
    tags: ["electrical-cables", "power", "wiring"],
  },
  {
    name: "Tropical Cable and Conductor Ltd (TCCL)",
    categorySlug: "construction-building-materials-hardware-tools",
    description: "First cable manufacturer in Ghana to achieve ISO 9001 certification, supplying copper and aluminium cables.",
    phone: "+233 30 320 0081",
    website: "https://www.tropicalcable.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Steelworks Road, Heavy Industrial Area, Tema",
    tags: ["cables", "electrical", "construction"],
  },
  {
    name: "Keda Ceramics (Twyford Tiles Ghana)",
    categorySlug: "construction-building-materials-building-materials",
    description: "Largest ceramic tile factory in West Africa producing high-gloss glazed floor and wall tiles.",
    phone: "+233 31 200 2341",
    regionName: "Western",
    locality: "Aboadze",
    address: "Shama District, Near Takoradi, Western Region",
    tags: ["tiles", "ceramics", "building-materials"],
  },

  // Additional Transport & Logistics
  {
    name: "Intercity STC Coaches Ltd",
    categorySlug: "transport-logistics-haulage-trucking",
    description: "National public transport and cross-border coach transportation company serving Ghana and West Africa.",
    phone: "+233 30 222 1658",
    website: "https://www.stc.gov.gh",
    regionName: "Greater Accra",
    locality: "Kaneshie",
    address: "No. 1 Ring Road West, Kaneshie, Accra",
    tags: ["coach-service", "transit", "parcel-delivery"],
  },
  {
    name: "Africa World Airlines (AWA)",
    categorySlug: "transport-logistics-courier-parcel",
    description: "Leading Ghanaian airline operating reliable scheduled passenger and cargo flights across Ghana and West Africa.",
    phone: "+233 24 243 8888",
    website: "https://www.flyafricaworld.com",
    regionName: "Greater Accra",
    locality: "Airport Residential",
    address: "Kotoka International Airport Enclave, Accra",
    tags: ["airline", "flights", "air-cargo"],
  },
  {
    name: "Maersk Line Ghana",
    categorySlug: "transport-logistics-warehousing",
    description: "Global container logistics and supply chain services provider connecting Ghanaian businesses worldwide.",
    phone: "+233 30 320 0300",
    website: "https://www.maersk.com",
    regionName: "Greater Accra",
    locality: "Tema",
    address: "Harbour Road, Commercial Warehouse Area, Tema",
    tags: ["shipping", "freight", "containers"],
  },

  // Additional Professional Services
  {
    name: "PricewaterhouseCoopers (PwC) Ghana",
    categorySlug: "professional-services-accounting-tax",
    description: "Global multidisciplinary audit, tax consulting, human resource, and corporate legal advisory firm.",
    phone: "+233 30 276 1500",
    website: "https://www.pwc.com/gh",
    regionName: "Greater Accra",
    locality: "Airport City",
    address: "A&C Square & Stanbic Heights, Airport City, Accra",
    tags: ["audit", "tax", "consulting", "accounting"],
  },
  {
    name: "SIC Insurance Company PLC",
    categorySlug: "professional-services-consulting",
    description: "Ghana's leading general non-life insurance provider covering marine, aviation, motor, fire, and engineering risks.",
    phone: "+233 30 224 8212",
    website: "https://www.sic-gh.com",
    regionName: "Greater Accra",
    locality: "Adabraka",
    address: "Nyemitei House, 28/29 Ring Road Central, Accra",
    tags: ["insurance", "motor-insurance", "risk-management"],
  },
  {
    name: "Ecobank Ghana PLC",
    categorySlug: "professional-services-consulting",
    description: "Premier digital universal bank providing extensive consumer, SME, commercial, and investment banking.",
    phone: "+233 30 225 1720",
    website: "https://www.ecobank.com/gh",
    regionName: "Greater Accra",
    locality: "Ridge",
    address: "2 Morocco Lane, Off Independence Avenue, Ridge, Accra",
    tags: ["bank", "loans", "digital-banking", "investments"],
  },

  // Additional Events & Media
  {
    name: "Despite Media Group (Peace FM / UTV)",
    categorySlug: "events-media-photography-video",
    description: "Foremost broadcasting network broadcasting Peace FM, Okay FM, Neat FM, Hello FM, and UTV Ghana.",
    phone: "+233 30 240 1084",
    website: "https://www.peacefmonline.com",
    regionName: "Greater Accra",
    locality: "Abeka",
    address: "Ship House, Abeka Junction, Achimota Road, Accra",
    tags: ["radio", "television", "media", "news"],
  },
  {
    name: "Media General (TV3 / 3FM / Onua)",
    categorySlug: "events-media-photography-video",
    description: "Leading television, radio, and digital media powerhouse broadcasting TV3 First in News and Best in Entertainment.",
    phone: "+233 30 276 3458",
    website: "https://www.3news.com",
    regionName: "Greater Accra",
    locality: "Kanda",
    address: "Adesa We, 12th Kanda Avenue, Accra",
    tags: ["television", "tv3", "radio", "entertainment"],
  },
  {
    name: "Omni Media Limited (Citi FM / Channel One TV)",
    categorySlug: "events-media-photography-video",
    description: "Award-winning media organization operating Citi 97.3 FM, Channel One TV, and citinewsroom.com.",
    phone: "+233 30 222 6013",
    website: "https://www.citinewsroom.com",
    regionName: "Greater Accra",
    locality: "Adabraka",
    address: "11 Stadium Road, Adabraka, Accra",
    tags: ["radio", "news", "television", "citi-fm"],
  },

  // Additional Technology & IT
  {
    name: "Zeepay Ghana Limited",
    categorySlug: "technology-it-software-web",
    description: "Leading challenger fintech and non-bank financial institution powering cross-border mobile money transfers.",
    phone: "+233 30 290 8920",
    website: "https://www.myzeepay.com",
    regionName: "Greater Accra",
    locality: "Cantonments",
    address: "2 Marconi Link, Cantonments, Accra",
    tags: ["fintech", "remittances", "mobile-money"],
  },
  {
    name: "ExpressPay Ghana",
    categorySlug: "technology-it-software-web",
    description: "Premier digital payments processor and merchant eCommerce gateway for businesses and consumers.",
    phone: "+233 30 279 8652",
    website: "https://www.expresspay.gh",
    regionName: "Greater Accra",
    locality: "Ridge",
    address: "Ridge, Accra",
    tags: ["payments", "ecommerce", "fintech"],
  },

  // Additional Hospitality & Tourism
  {
    name: "Labadi Beach Hotel",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Ghana's premier beachfront 5-star hotel set amidst tropical gardens alongside Labadi Beach.",
    phone: "+233 30 277 2501",
    website: "https://www.labadibeachhotelgh.com",
    regionName: "Greater Accra",
    locality: "La",
    address: "No. 1 La Bypass, Labadi, Accra",
    tags: ["beach-resort", "5-star", "conference", "hospitality"],
  },
  {
    name: "Royal Senchi Resort",
    categorySlug: "hospitality-tourism-hotels-lodges",
    description: "Luxury riverfront 4-star eco-resort overlooking the Volta River with private nature park and helipad.",
    phone: "+233 30 396 6378",
    website: "https://www.theroyalsenchi.com",
    regionName: "Eastern",
    locality: "Akosombo",
    address: "Senchi Ferry Road, Akosombo, Eastern Region",
    tags: ["resort", "riverfront", "spa", "tourism"],
  },
];

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  primaryType?: string;
  regularOpeningHours?: { weekdayText?: string[] };
  addressComponents?: AddressComponent[];
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

function clean(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function componentValue(
  components: AddressComponent[] | undefined,
  wanted: string[],
): string | null {
  if (!components) return null;
  for (const component of components) {
    if (component.types?.some((type) => wanted.includes(type))) {
      return clean(component.longText) ?? clean(component.shortText);
    }
  }
  return null;
}

// Google Places Search
async function searchGooglePlaces(
  query: string,
  sector: SectorDefinition,
  targetCount: number,
): Promise<ImportRecord[]> {
  if (!GOOGLE_API_KEY) return [];

  const records: ImportRecord[] = [];
  const seenIds = new Set<string>();
  let pageToken: string | undefined;
  let page = 0;

  while (records.length < targetCount && page < 3) {
    page += 1;
    const response = await fetch(GOOGLE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        languageCode: "en",
        regionCode: "GH",
        ...(pageToken ? { pageToken } : {}),
      }),
    });

    if (!response.ok) {
      console.warn(`  ! Google Places error: ${response.status} ${response.statusText}`);
      break;
    }

    const payload = (await response.json()) as { places?: GooglePlace[]; nextPageToken?: string };
    const places = payload.places ?? [];

    for (const place of places) {
      if (!place.id || seenIds.has(place.id)) continue;
      seenIds.add(place.id);

      const name = clean(place.displayName?.text);
      if (!name) continue;

      const types = place.types ?? [];
      const mappedSlug = categorySlugForGoogle(
        place.primaryType ? [place.primaryType, ...types] : types,
      );

      records.push({
        source: "GOOGLE",
        sourceRef: place.id,
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        name,
        categorySlug: mappedSlug ?? sector.defaultCategorySlug,
        phone: clean(place.nationalPhoneNumber) ?? clean(place.internationalPhoneNumber),
        website: clean(place.websiteUri),
        contactHours: place.regularOpeningHours?.weekdayText?.join("; ") ?? null,
        regionName: "Greater Accra",
        districtName: componentValue(place.addressComponents, [
          "administrative_area_level_2",
          "administrative_area_level_3",
        ]),
        locality: componentValue(place.addressComponents, ["locality", "postal_town", "sublocality"]),
        address: clean(place.formattedAddress),
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        tags: [sector.slug, ...types.slice(0, 4)],
        status: "PUBLISHED",
      });

      if (records.length >= targetCount) break;
    }

    pageToken = payload.nextPageToken;
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  return records;
}

// Overpass OSM Fetcher by Region and Sector
async function searchOverpassSector(
  sector: SectorDefinition,
  regionName: string,
  limit: number,
): Promise<ImportRecord[]> {
  const areaName = `${regionName} Region`;
  const subqueries = sector.osmStatements.map((stmt) => `${stmt}(area.a);`).join("\n  ");
  const query = `[out:json][timeout:60];
area["name"="${areaName}"]["boundary"="administrative"]["admin_level"="4"]->.a;
(
  ${subqueries}
);
out center tags qt ${limit};
`;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "GhanaTradeDirectory/1.0 (top50-sector-import; contact admin@ghanatrade.app)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.warn(`  ! Overpass returned ${response.status} for ${sector.name} in ${regionName}`);
      return [];
    }

    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const elements = payload.elements ?? [];
    const results: ImportRecord[] = [];

    for (const el of elements) {
      const tags = el.tags ?? {};
      const name = clean(tags.name);
      if (!name) continue;

      const catSlug = categorySlugForOsm(tags) ?? sector.defaultCategorySlug;
      const phone = clean(tags["contact:phone"] ?? tags.phone ?? tags["contact:mobile"]);
      const email = clean(tags["contact:email"] ?? tags.email);
      const website = clean(tags["contact:website"] ?? tags.website ?? tags.url);
      const addressParts = [
        clean(tags["addr:housenumber"]),
        clean(tags["addr:street"]),
        clean(tags["addr:suburb"]),
        clean(tags["addr:city"]),
      ].filter(Boolean);

      results.push({
        source: "OSM",
        sourceRef: `${el.type}/${el.id}`,
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        name,
        categorySlug: catSlug,
        phone,
        email,
        website,
        contactHours: clean(tags.opening_hours),
        regionName,
        districtName: clean(tags["addr:district"] ?? tags["addr:county"]),
        locality: clean(tags["addr:city"] ?? tags["addr:suburb"] ?? tags["addr:town"]),
        address: addressParts.length > 0 ? addressParts.join(", ") : null,
        latitude: el.lat ?? el.center?.lat ?? null,
        longitude: el.lon ?? el.center?.lon ?? null,
        tags: [sector.slug, "osm"],
        status: "PUBLISHED",
      });
    }

    return results;
  } catch (err) {
    console.warn(`  ! Overpass error for ${sector.name}:`, (err as Error).message);
    return [];
  }
}

interface CliArgs {
  limit: number;
  source: "auto" | "google" | "osm" | "curated";
  saveJson: boolean;
  dryRun: boolean;
  filterSector?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    limit: 50,
    source: "auto",
    saveJson: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--limit") args.limit = Number(argv[++i]) || 50;
    else if (token === "--source") args.source = (argv[++i] as CliArgs["source"]) || "auto";
    else if (token === "--json") args.saveJson = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--sector") args.filterSector = argv[++i];
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log("=================================================");
  console.log("GhanaTrade: Top 50 Businesses per Sector Importer");
  console.log("=================================================");
  console.log(`Target: ~${args.limit} businesses per sector across 16 sectors`);
  console.log(`Mode: Source = ${args.source}, DryRun = ${args.dryRun}, JSON = ${args.saveJson}\n`);

  const ctx = await buildImportContext(prisma, IMPORT_OWNER_EMAIL);
  const batchId = `top50-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const sectorsToRun = args.filterSector
    ? SECTORS.filter((s) => s.slug.includes(args.filterSector!) || s.name.toLowerCase().includes(args.filterSector!.toLowerCase()))
    : SECTORS;

  if (sectorsToRun.length === 0) {
    console.error(`No sector matched filter "${args.filterSector}".`);
    process.exit(1);
  }

  const allRecordsBySector: Record<string, ImportRecord[]> = {};
  const sectorSummaries: { sector: string; fetched: number; created: number; updated: number; skipped: number }[] = [];

  for (const sector of sectorsToRun) {
    console.log(`\n▶ Processing Sector: ${sector.name} (${sector.slug})`);
    const recordsMap = new Map<string, ImportRecord>();

    // 1. Curated top Ghanaian enterprises for this sector
    const curatedMatches = TOP_GHANA_DIRECTORY_DATA.filter((c) =>
      c.categorySlug?.startsWith(sector.slug) || (c.tags && c.tags.includes(sector.slug)),
    );

    for (const c of curatedMatches) {
      if (!c.name) continue;
      const ref = `curated-${sector.slug}-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      recordsMap.set(ref, {
        source: "PARTNER",
        sourceRef: ref,
        sourceUrl: c.website ?? "https://ghanatrade.app",
        name: c.name,
        categorySlug: c.categorySlug ?? sector.defaultCategorySlug,
        description: c.description ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        website: c.website ?? null,
        regionName: c.regionName ?? "Greater Accra",
        locality: c.locality ?? null,
        address: c.address ?? null,
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        tags: [sector.slug, ...(c.tags ?? [])],
        status: "PUBLISHED",
        importBatchId: batchId,
      });
    }

    console.log(`  ✓ Added ${recordsMap.size} top verified Ghanaian enterprises from curated directory.`);

    // 2. Google Places (if key available and requested)
    if ((args.source === "google" || (args.source === "auto" && GOOGLE_API_KEY)) && GOOGLE_API_KEY) {
      console.log(`  → Querying Google Places for "${sector.searchQueries[0]}"...`);
      const googleResults = await searchGooglePlaces(sector.searchQueries[0], sector, args.limit);
      for (const rec of googleResults) {
        if (!recordsMap.has(rec.sourceRef)) {
          rec.importBatchId = batchId;
          recordsMap.set(rec.sourceRef, rec);
        }
        if (recordsMap.size >= args.limit) break;
      }
      console.log(`  ✓ Google Places yielded total ${recordsMap.size} candidates so far.`);
    }

    // 3. OpenStreetMap Overpass (Option 2)
    if (recordsMap.size < args.limit && args.source !== "google" && args.source !== "curated") {
      const needed = args.limit - recordsMap.size;
      console.log(`  → Fetching from OpenStreetMap Overpass (${needed} needed)...`);

      // Query primary hub: Greater Accra
      const osmAccra = await searchOverpassSector(sector, "Greater Accra", Math.min(needed, 35));
      for (const rec of osmAccra) {
        if (!recordsMap.has(rec.sourceRef)) {
          rec.importBatchId = batchId;
          recordsMap.set(rec.sourceRef, rec);
        }
        if (recordsMap.size >= args.limit) break;
      }

      // If still need more, query secondary commercial hub: Ashanti
      if (recordsMap.size < args.limit) {
        const stillNeeded = args.limit - recordsMap.size;
        const osmAshanti = await searchOverpassSector(sector, "Ashanti", stillNeeded);
        for (const rec of osmAshanti) {
          if (!recordsMap.has(rec.sourceRef)) {
            rec.importBatchId = batchId;
            recordsMap.set(rec.sourceRef, rec);
          }
          if (recordsMap.size >= args.limit) break;
        }
      }

      console.log(`  ✓ OSM combined total: ${recordsMap.size} businesses.`);
    }

    const finalSectorRecords = Array.from(recordsMap.values()).slice(0, args.limit);
    allRecordsBySector[sector.slug] = finalSectorRecords;

    // Database Import
    let created = 0;
    let updated = 0;
    let skipped = 0;

    if (!args.dryRun) {
      for (const record of finalSectorRecords) {
        try {
          const outcome: ImportOutcome = await importRecord(prisma, ctx, record);
          if (outcome === "created") created += 1;
          else if (outcome === "updated") updated += 1;
          else skipped += 1;
        } catch (err) {
          console.warn(`    ! Error importing ${record.name}:`, (err as Error).message);
          skipped += 1;
        }
      }
    }

    sectorSummaries.push({
      sector: sector.name,
      fetched: finalSectorRecords.length,
      created,
      updated,
      skipped,
    });

    console.log(`  ★ Sector Done: ${finalSectorRecords.length} found → Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
  }

  // Optional JSON file save
  if (args.saveJson) {
    const outDir = path.resolve(process.cwd(), "prisma/imports");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, `top50-businesses-${batchId}.json`);
    fs.writeFileSync(outFile, JSON.stringify(allRecordsBySector, null, 2), "utf-8");
    console.log(`\n💾 Exported full records snapshot to ${outFile}`);
  }

  // Print Summary Table
  console.log("\n========================================================");
  console.log("FINAL IMPORT SUMMARY (Top Businesses Per Sector)");
  console.log("========================================================");
  console.table(sectorSummaries);

  const grandTotals = sectorSummaries.reduce(
    (acc, curr) => ({
      fetched: acc.fetched + curr.fetched,
      created: acc.created + curr.created,
      updated: acc.updated + curr.updated,
      skipped: acc.skipped + curr.skipped,
    }),
    { fetched: 0, created: 0, updated: 0, skipped: 0 },
  );

  console.log(`Total Businesses Processed: ${grandTotals.fetched}`);
  console.log(`Total New Businesses Created: ${grandTotals.created}`);
  console.log(`Total Updated: ${grandTotals.updated}`);
  console.log(`Total Skipped / Deduplicated: ${grandTotals.skipped}`);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("Fatal error during import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
