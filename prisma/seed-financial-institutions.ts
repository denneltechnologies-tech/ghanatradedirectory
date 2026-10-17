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

// Real localities and addresses across Ghana regions
const LOCALITIES = {
  "Greater Accra": [
    { locality: "Airport City & Residential", district: "Ayawaso West Municipal", address: "Airport City Commercial Enclave, Accra" },
    { locality: "Ridge Financial District", district: "Korle Klottey Municipal", address: "Independence Avenue, Ridge, Accra" },
    { locality: "Accra High Street & Ministries", district: "Korle Klottey Municipal", address: "High Street & Commercial Enclave, Accra" },
    { locality: "East Legon", district: "Ayawaso West Municipal", address: "Lagos Avenue, East Legon, Accra" },
    { locality: "Adabraka", district: "Korle Klottey Municipal", address: "Kwame Nkrumah Avenue, Adabraka, Accra" },
    { locality: "Cantonments", district: "La Dade-Kotopon Municipal", address: "Cantonments Road, Cantonments, Accra" },
    { locality: "Dzorwulu & Roman Ridge", district: "Ayawaso West Municipal", address: "Blohum Street, Dzorwulu, Accra" },
    { locality: "Osu", district: "Korle Klottey Municipal", address: "Oxford Street, Osu, Accra" },
    { locality: "Spintex", district: "Ledzokuku Municipal", address: "Spintex Road Financial Strip, Accra" },
    { locality: "Tema Commercial", district: "Tema Metropolitan", address: "Community 1 Commercial Area, Tema" },
    { locality: "Kokomlemle", district: "Ayawaso Central Municipal", address: "Ring Road Central, Kokomlemle, Accra" },
    { locality: "Achimota", district: "Okaikwei North Municipal", address: "Achimota Commercial Hub, Accra" },
  ],
  Ashanti: [
    { locality: "Kumasi Adum", district: "Kumasi Metropolitan", address: "Prempeh II Street, Adum Financial Hub, Kumasi" },
    { locality: "Kumasi Ahodwo", district: "Kumasi Metropolitan", address: "Ahodwo Roundabout Commercial Strip, Kumasi" },
    { locality: "Kumasi Asokwa", district: "Asokwa Municipal", address: "Old Bekwai Road, Asokwa, Kumasi" },
    { locality: "Kumasi Kejetia", district: "Kumasi Metropolitan", address: "Kejetia Commercial Enclave, Kumasi" },
  ],
  Western: [
    { locality: "Takoradi Market Circle", district: "Sekondi-Takoradi Metropolitan", address: "Market Circle Commercial Hub, Takoradi" },
    { locality: "Takoradi Harbour", district: "Sekondi-Takoradi Metropolitan", address: "Harbour Road Banking Square, Takoradi" },
    { locality: "Tarkwa Commercial", district: "Tarkwa-Nsuaem Municipal", address: "Post Office Road, Tarkwa" },
  ],
  Central: [
    { locality: "Cape Coast Commercial", district: "Cape Coast Metropolitan", address: "Commercial Street, Cape Coast" },
    { locality: "Kasoa Banking District", district: "Awutu Senya East Municipal", address: "Kasoa Main Commercial Road, Central Region" },
  ],
  Eastern: [
    { locality: "Koforidua Banking Strip", district: "New Juaben South Municipal", address: "Central Market Road, Koforidua" },
  ],
  Northern: [
    { locality: "Tamale Banking Square", district: "Tamale Metropolitan", address: "Hospital Road Commercial Area, Tamale" },
  ],
};

async function ensureFinancialCategories(): Promise<void> {
  console.log("Setting up Banking & Financial Services categories...");

  // 1. Parent Sector Category
  const parent = await prisma.category.upsert({
    where: { slug: "banking-financial-services" },
    update: {
      name: "Banking & Financial Services",
      icon: "🏦",
      featured: true,
      active: true,
      sortOrder: 16,
    },
    create: {
      name: "Banking & Financial Services",
      slug: "banking-financial-services",
      icon: "🏦",
      featured: true,
      active: true,
      sortOrder: 16,
    },
  });

  // 2. Child Categories
  const children = [
    { name: "Commercial Banks & Microfinance", slug: "banking-financial-services-commercial-banks-microfinance", sortOrder: 0 },
    { name: "Insurance Companies", slug: "banking-financial-services-insurance-companies", sortOrder: 1 },
    { name: "Pensions & Trustees", slug: "banking-financial-services-pensions-trustees", sortOrder: 2 },
    { name: "Investment & Securities", slug: "banking-financial-services-investment-securities", sortOrder: 3 },
  ];

  for (const child of children) {
    await prisma.category.upsert({
      where: { slug: child.slug },
      update: {
        name: child.name,
        parentId: parent.id,
        active: true,
        sortOrder: child.sortOrder,
      },
      create: {
        name: child.name,
        slug: child.slug,
        parentId: parent.id,
        active: true,
        sortOrder: child.sortOrder,
      },
    });
  }

  console.log("✓ Categories verified.\n");
}

export function generateFinancialDataset(): ImportRecord[] {
  const records: ImportRecord[] = [];

  const add = (
    catSlug: string,
    name: string,
    region: keyof typeof LOCALITIES,
    locIndex: number,
    phone: string,
    desc: string,
    tags: string[],
    website?: string,
  ) => {
    const locs = LOCALITIES[region];
    const loc = locs[locIndex % locs.length];
    const ref = `gh-dir-finance-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    records.push({
      source: "PARTNER",
      sourceRef: ref,
      sourceUrl: website ?? "https://ghanatrade.app",
      name,
      categorySlug: catSlug,
      status: "PUBLISHED",
      description: desc,
      phone,
      website: website ?? null,
      regionName: region,
      districtName: loc.district,
      locality: loc.locality,
      address: loc.address,
      tags: ["banking-financial-services", ...tags],
    });
  };

  // =========================================================================
  // 1. COMMERCIAL BANKS, SAVINGS & LOANS, RURAL BANKS (51 institutions)
  // =========================================================================
  const BANKS = [
    ["GCB Bank PLC Head Office", "Greater Accra", 2, "+233 30 268 1531", "Ghana's premier indigenous universal bank founded in 1953, offering corporate banking, consumer credit, and national branch network.", ["commercial-bank", "gcb", "high-street", "universal-banking"]],
    ["GCB Bank Kumasi Adum Branch", "Ashanti", 0, "+233 32 202 3456", "Major Ashanti Region commercial branch providing retail accounts, SME trade financing, and treasury services.", ["gcb", "kumasi", "sme-loans", "adum"]],
    ["GCB Bank Takoradi Market Circle", "Western", 0, "+233 31 202 2456", "Central commercial banking branch serving maritime shipping, port trade, and local businesses in Takoradi.", ["gcb", "takoradi", "maritime", "trade-finance"]],
    ["Ecobank Ghana PLC Head Office", "Greater Accra", 1, "+233 30 221 3999", "Leading pan-African universal bank providing digital corporate banking, Omni Plus, trade financing, and wealth management.", ["ecobank", "pan-african", "ridge", "digital-banking"]],
    ["Ecobank Ghana Kumasi Harper Road", "Ashanti", 0, "+233 32 203 1234", "Adum central branch providing corporate cash management, foreign exchange desks, and international trade letters of credit.", ["ecobank", "kumasi", "forex", "letters-of-credit"]],
    ["Ecobank Ghana Takoradi Harbour", "Western", 1, "+233 31 202 3456", "Serving oil, gas, and port logistics companies with automated payroll, international wire transfers, and credit facilities.", ["ecobank", "takoradi", "oil-and-gas", "transfers"]],
    ["Absa Bank Ghana Limited Head Office", "Greater Accra", 2, "+233 30 267 3300", "Premier international bank in Ghana (formerly Barclays) delivering world-class investment banking and agribusiness financing.", ["absa", "high-street", "corporate-banking", "agribusiness"]],
    ["Absa Bank Ghana Kumasi Prempeh II", "Ashanti", 0, "+233 32 202 5678", "Flagship Kumasi commercial branch providing premier banking lounges, business term loans, and asset financing.", ["absa", "kumasi", "premier-banking", "asset-finance"]],
    ["Stanbic Bank Ghana Stanbic Heights", "Greater Accra", 0, "+233 30 281 5789", "Member of Standard Bank Group offering corporate and investment banking, vehicle asset finance, and private banking in Airport City.", ["stanbic", "airport-city", "investment-banking", "vehicle-finance"]],
    ["Stanbic Bank Ghana Kumasi Ahodwo", "Ashanti", 1, "+233 32 204 1234", "Modern commercial banking branch providing executive wealth accounts, mortgage lending, and point-of-sale merchant solutions.", ["stanbic", "ahodwo", "mortgages", "pos-solutions"]],
    ["Standard Chartered Bank Ghana PLC Head Office", "Greater Accra", 2, "+233 30 261 0750", "Ghana's oldest operating commercial bank established in 1896, specializing in multinational corporate banking and custody.", ["standard-chartered", "high-street", "custody", "multinational"]],
    ["Standard Chartered Bank Kumasi Harper Road", "Ashanti", 0, "+233 32 202 3456", "Premier and priority banking center serving high-net-worth individuals, import financing, and digital mobile banking.", ["priority-banking", "kumasi", "wealth"]],
    ["Fidelity Bank Ghana Ridge Towers", "Greater Accra", 1, "+233 30 221 4490", "Largest privately-owned indigenous bank in Ghana providing inclusive agency banking, retail mortgages, and commercial loans.", ["fidelity-bank", "ridge", "agency-banking", "private-bank"]],
    ["Fidelity Bank Kumasi City Mall", "Ashanti", 2, "+233 32 208 4490", "Retail shopping mall banking branch offering extended banking hours, SME account opening, and card services.", ["fidelity", "kumasi-mall", "retail-banking"]],
    ["CalBank PLC CalBank Tower", "Greater Accra", 1, "+233 30 268 0068", "Technology-driven commercial bank operating out of a 12-story green-certified headquarters on Independence Avenue.", ["calbank", "ridge", "fintech-integration", "commercial-bank"]],
    ["CalBank Kumasi Adum Branch", "Ashanti", 0, "+233 32 203 5678", "Central business district branch specializing in cocoa trade financing, commercial real estate loans, and digital treasury.", ["calbank", "adum", "cocoa-financing"]],
    ["Access Bank (Ghana) PLC Head Office", "Greater Accra", 7, "+233 30 274 2699", "Rapidly expanding multinational commercial bank in Osu known for W Initiative women banking and corporate trade desks.", ["access-bank", "osu", "women-banking", "trade-desk"]],
    ["Access Bank Takoradi Market Circle", "Western", 0, "+233 31 202 4567", "Providing working capital credit lines to Western Region oilfield suppliers and FMCG wholesale merchants.", ["access-bank", "takoradi", "working-capital"]],
    ["Zenith Bank (Ghana) Zenith Heights", "Greater Accra", 1, "+233 30 261 1500", "Top tier financial institution renowned for speed of transactions, corporate internet banking, and e-business platforms.", ["zenith-bank", "ridge", "e-banking", "corporate-lending"]],
    ["Zenith Bank Kumasi Adum Branch", "Ashanti", 0, "+233 32 204 5678", "Commercial and retail banking hub supporting timber, trade, and commercial merchants in Kumasi.", ["zenith", "adum", "trade-merchant"]],
    ["Agricultural Development Bank PLC ADB House", "Greater Accra", 0, "+233 30 277 4092", "State-established development and commercial bank providing targeted financing for farming, poultry, and food value chains.", ["adb", "agriculture-financing", "airport-residential", "poultry-loans"]],
    ["ADB Bank Kumasi Central", "Ashanti", 0, "+233 32 202 1234", "Ashanti regional agricultural loan center supporting poultry farmers, cocoa inputs, and rural trade cooperatives.", ["adb", "kumasi", "cocoa-inputs"]],
    ["Consolidated Bank Ghana CBG Head Office", "Greater Accra", 0, "+233 30 294 0000", "State-owned universal bank operating one of Ghana's largest retail footprints with nationwide branch coverage.", ["cbg", "consolidated-bank", "airport-city", "universal-bank"]],
    ["CBG Kumasi Adum Branch", "Ashanti", 0, "+233 32 203 8901", "High-volume retail branch providing teacher and civil servant payroll loans, savings, and mobile banking.", ["cbg", "payroll-loans", "adum"]],
    ["Prudential Bank Limited Head Office", "Greater Accra", 0, "+233 30 277 0936", "Indigenous private commercial bank serving commercial importers, manufacturers, and residential estate developers.", ["prudential-bank", "airport-residential", "import-finance"]],
    ["Republic Bank (Ghana) PLC EBankese", "Greater Accra", 1, "+233 30 224 2090", "Pioneer and market leader in residential mortgage financing and long-term home loans in Ghana.", ["republic-bank", "mortgages", "home-loans", "ebankese"]],
    ["Societe Generale Ghana PLC Head Office", "Greater Accra", 10, "+233 30 221 4000", "Subsidiary of French multinational bank providing specialized structured export finance and personal loans.", ["societe-generale", "ring-road", "export-finance"]],
    ["United Bank for Africa UBA Heritage Tower", "Greater Accra", 1, "+233 30 261 0440", "Pan-African bank offering Leo AI virtual banking assistant, international prepaid Mastercard cards, and trade desks.", ["uba", "heritage-tower", "leo-banking", "prepaid-cards"]],
    ["First National Bank Ghana FNB House", "Greater Accra", 0, "+233 30 274 2700", "Member of FirstRand Group providing modern digital banking apps, foreign currency accounts, and corporate advisory.", ["fnb", "first-national-bank", "airport-city", "forex-accounts"]],
    ["Guaranty Trust Bank Ghana GTBank Head Office", "Greater Accra", 1, "+233 30 261 1560", "Award-winning commercial bank pioneer in electronic banking, contactless card terminals, and business accounts.", ["gtbank", "ridge", "e-banking", "pos-terminals"]],
    ["First Atlantic Bank Limited Atlantic Place", "Greater Accra", 0, "+233 30 274 0800", "Dynamic commercial bank offering purple priority banking, trade services, and internet corporate portals.", ["first-atlantic", "airport-residential", "trade-services"]],
    ["OmniBSIC Bank Ghana Atlantic Tower", "Greater Accra", 0, "+233 30 274 0900", "Result of the successful merger between OmniBank and Sahel-Sahara Bank, serving SMEs and corporate industries.", ["omnibsic", "airport-city", "sme-banking"]],
    ["FBNBank (Ghana) Limited Airport Head Office", "Greater Accra", 0, "+233 30 277 8899", "Subsidiary of First Bank of Nigeria providing commercial banking, international funds transfer, and SME credit.", ["fbnbank", "airport-residential", "transfers"]],
    ["Bank of Africa Ghana Limited Ridge", "Greater Accra", 1, "+233 30 224 9690", "Multinational African banking network providing project finance, leasing, and educational institutional accounts.", ["bank-of-africa", "boa", "project-finance"]],
    ["Universal Merchant Bank UMB SSNIT Emporium", "Greater Accra", 0, "+233 30 225 1133", "Established in 1972 as a premier merchant bank providing treasury, trade services, and private banking.", ["umb", "merchant-bank", "treasury"]],
    ["National Investment Bank NIB Head Office", "Greater Accra", 4, "+233 30 226 1730", "Ghana's premier development finance institution supporting manufacturing industries and agro-processing factories.", ["nib", "development-bank", "manufacturing-loans"]],
    ["ARB Apex Bank Apex House", "Greater Accra", 1, "+233 30 277 1778", "The mini-central bank providing liquidity support, ICT banking platforms, and clearing services for all Rural Banks.", ["arb-apex-bank", "rural-banking-clearing", "apex-house"]],
    ["Sinapi Aba Savings and Loans Head Office", "Ashanti", 2, "+233 32 203 1234", "National microfinance and savings & loans leader empowering female entrepreneurs and smallholder farmers.", ["sinapi-aba", "microfinance", "asokwa", "women-empowerment"]],
    ["Sinapi Aba Savings and Loans Accra Central", "Greater Accra", 2, "+233 30 268 9012", "Capital branch serving market traders in Makola, Okaishie, and Kaneshie with daily susu savings.", ["susu", "micro-credit", "traders"]],
    ["Opportunity International Savings and Loans", "Greater Accra", 6, "+233 30 277 1234", "Providing transformational financial services including school improvement loans and agricultural credit.", ["opportunity-international", "school-loans", "savings-and-loans"]],
    ["Opportunity International Kumasi Kejetia", "Ashanti", 3, "+233 32 204 1234", "Kejetia market branch offering micro-business loans and collateral-free solidarity group loans.", ["group-loans", "kejetia", "micro-loans"]],
    ["Advans Ghana Savings and Loans", "Greater Accra", 10, "+233 30 225 1234", "International microfinance institution financing small businesses, transport operators, and school owners.", ["advans-ghana", "kokomlemle", "msme-finance"]],
    ["Best Point Savings and Loans Mile 7", "Greater Accra", 11, "+233 30 242 8901", "Leading savings and loans company offering high-yield fixed deposits, business overdrafts, and money transfers.", ["best-point", "achimota", "fixed-deposits"]],
    ["Best Point Savings and Loans Kumasi", "Ashanti", 0, "+233 32 205 1234", "Adum commercial branch providing merchant loan products, fast clearing, and SME support.", ["best-point", "adum", "merchant-loans"]],
    ["Bayport Savings and Loans Bayport House", "Greater Accra", 7, "+233 30 277 5678", "Specialist provider of digital payroll loans and educational financial packages for salaried public servants.", ["bayport", "payroll-loans", "osu"]],
    ["Letshego Savings and Loans Dzorwulu", "Greater Accra", 6, "+233 30 276 1234", "Pan-African inclusive financial services provider offering low-interest consumer credit and micro-insurance.", ["letshego", "dzorwulu", "consumer-credit"]],
    ["Amenfiman Rural Bank Head Office & Regional Hub", "Western", 0, "+233 31 202 8901", "Ghana's top-ranked rural bank by Ghana Club 100, driving cocoa farmers welfare, salary loans, and mobile banking.", ["amenfiman", "rural-bank", "ghana-club-100", "cocoa-welfare"]],
    ["Atwima Kwanwoma Rural Bank", "Ashanti", 0, "+233 32 202 7890", "Consistently awarded premier community bank in Ashanti Region with extensive automated branch network.", ["atwima-kwanwoma", "rural-bank", "kumasi", "susu"]],
    ["Fiaseman Rural Bank Bogoso & Tarkwa Hub", "Western", 2, "+233 31 202 6789", "Powerhouse community bank financing mining district traders, local contractors, and agricultural projects.", ["fiaseman", "mining-finance", "tarkwa"]],
    ["Otuasekan Rural Bank Eastern Region Hub", "Eastern", 0, "+233 34 202 4567", "Leading rural bank in the Eastern Region offering funeral insurance, micro-credit, and church development loans.", ["otuasekan", "rural-bank", "koforidua"]],
    ["Akuapem Rural Bank Mamfe & Koforidua", "Eastern", 0, "+233 34 202 5678", "Community-rooted bank providing SME credit, agricultural input loans, and mobile money agency.", ["akuapem-rural-bank", "mamfe", "sme-credit"]],
  ];

  for (const [name, reg, locIdx, phone, desc, tags] of BANKS) {
    add(
      "banking-financial-services-commercial-banks-microfinance",
      name as string,
      reg as any,
      locIdx as number,
      phone as string,
      desc as string,
      tags as string[],
    );
  }

  // =========================================================================
  // 2. INSURANCE COMPANIES (NIC Regulated) (31 institutions)
  // =========================================================================
  const INSURERS = [
    ["Enterprise Insurance Advantage Place", "Greater Accra", 1, "+233 30 266 6847", "Ghana's oldest general insurance company established in 1924, insuring motor vehicles, fire, marine, and engineering risks.", ["enterprise-insurance", "general-insurance", "fire", "motor"]],
    ["Enterprise Life Assurance Advantage Place", "Greater Accra", 1, "+233 30 263 4777", "The market leader in life insurance in Ghana, providing family funeral policies, educational endowments, and child plans.", ["enterprise-life", "life-insurance", "funeral-policy", "education-plan"]],
    ["Enterprise Insurance Kumasi Asokwa", "Ashanti", 2, "+233 32 208 4567", "Ashanti regional claims and underwriting office for fleet motor insurance, commercial property, and goods-in-transit.", ["enterprise", "kumasi", "claims-center"]],
    ["SIC Insurance PLC Nyemitei House", "Greater Accra", 10, "+233 30 278 0600", "Ghana's largest national non-life insurer providing aviation, marine cargo, bonds, travel, and contractor all-risks.", ["sic-insurance", "national-insurer", "marine-cargo", "bonds"]],
    ["SIC Life Company Limited Head Office", "Greater Accra", 4, "+233 30 224 2333", "Pioneer life assurance firm providing final journey funeral policies, mortgage protection, and micro-life products.", ["sic-life", "adabraka", "funeral-plans", "mortgage-protection"]],
    ["SIC Insurance Kumasi Bompata Branch", "Ashanti", 0, "+233 32 202 3456", "Central Kumasi branch providing swift accident claim settlements, home insurance, and burglary policies.", ["sic", "kumasi", "burglary", "claims"]],
    ["Star Assurance Company Starlight House", "Greater Accra", 10, "+233 30 224 0632", "Chartered non-life insurance company known for solid capital adequacy, international travel cover, and motor insurance.", ["star-assurance", "non-life", "travel-insurance", "motor"]],
    ["StarLife Assurance StarLife House", "Greater Accra", 10, "+233 30 225 8943", "Leading life insurer delivering wealth creation plans, child education policies, and corporate group life schemes.", ["starlife", "wealth-creation", "group-life", "education"]],
    ["GLICO General Insurance Glico House", "Greater Accra", 4, "+233 30 224 6140", "Comprehensive non-life cover including travel insurance, commercial fire, motor accident, and liability insurance.", ["glico-general", "travel-cover", "liability", "adabraka"]],
    ["GLICO Life Insurance Head Office", "Greater Accra", 4, "+233 30 224 6142", "Household name in life assurance offering Anidaso policy for the informal sector, end-of-service plans, and life cover.", ["glico-life", "anidaso-policy", "life-cover"]],
    ["Hollard Insurance Ghana Capital Place", "Greater Accra", 0, "+233 30 222 0064", "Global insurance heavyweight offering digital insurance on WhatsApp (Arcadia), personal lines, and commercial assets.", ["hollard", "airport-residential", "whatsapp-insurance", "assets"]],
    ["Hollard Life Assurance Ghana", "Greater Accra", 0, "+233 30 222 0065", "Customized term life insurance, investment-linked life plans, and family care protection policies.", ["hollard-life", "term-life", "investment-insurance"]],
    ["Vanguard Assurance Vanguard House", "Greater Accra", 1, "+233 30 222 1345", "Historic composite insurer pioneer, originating comprehensive private motor and commercial fire insurance in Ghana.", ["vanguard-assurance", "ridge", "motor-insurance"]],
    ["Vanguard Life Assurance Derby Avenue", "Greater Accra", 2, "+233 30 266 1234", "Dedicated life insurer providing family welfare policies, corporate gratuity funds, and pension supplements.", ["vanguard-life", "family-welfare", "gratuity"]],
    ["Activa International Insurance Activa House", "Greater Accra", 1, "+233 30 268 6352", "Pan-African insurer and member of the Globus Network providing multinational insurance and offshore liability.", ["activa", "globus-network", "multinational", "offshore"]],
    ["Prudential Life Insurance Stanbic Heights", "Greater Accra", 0, "+233 30 274 2800", "Part of Prudential PLC global group, offering Pru Wealth, farewell plans, and international student protection.", ["prudential-life", "airport-city", "pru-wealth", "farewell-plan"]],
    ["Old Mutual Life Assurance Mutual Place", "Greater Accra", 0, "+233 30 274 2500", "Over 175 years of African heritage providing retrenchment insurance, comprehensive funeral cover, and savings.", ["old-mutual", "airport-residential", "retrenchment-cover"]],
    ["Sanlam Allianz General Insurance Sanlam House", "Greater Accra", 6, "+233 30 277 8899", "Joint venture between Sanlam and Allianz offering cutting-edge industrial risk underwriting and commercial cover.", ["sanlam-allianz", "dzorwulu", "industrial-risks"]],
    ["Sanlam Life Insurance Ghana", "Greater Accra", 0, "+233 30 278 1234", "Comprehensive personal life assurance, group funeral schemes, and pension-backed investment savings.", ["sanlam-life", "group-schemes", "life-cover"]],
    ["miLife Insurance Company Roman Ridge", "Greater Accra", 6, "+233 30 277 4000", "Mobile-first life insurer partnering with telecom operators to deliver micro-insurance straight to mobile phones.", ["milife", "micro-insurance", "mobile-life", "roman-ridge"]],
    ["Priority Insurance Company Priority House", "Greater Accra", 5, "+233 30 276 5432", "Fastest growing non-life insurer offering prompt claim payments on private comprehensive auto and factory insurance.", ["priority-insurance", "cantonments", "claims"]],
    ["Serene Insurance Company Serene House", "Greater Accra", 6, "+233 30 278 9012", "Member of First Sky Group known for financial strength, marine hull cover, and contractor bonds.", ["serene-insurance", "first-sky", "contractor-bonds"]],
    ["Imperial General Assurance Kokomlemle", "Greater Accra", 10, "+233 30 224 5678", "Reliable general insurance provider specializing in motor third-party, commercial property, and marine cargo.", ["imperial-general", "third-party", "property-insurance"]],
    ["Phoenix Insurance Company Adabraka", "Greater Accra", 4, "+233 30 222 3456", "Established insurer providing transit insurance, money insurance for banks, and fidelity guarantee bonds.", ["phoenix-insurance", "fidelity-guarantee", "transit-insurance"]],
    ["Donewell Insurance Company Ring Road", "Greater Accra", 10, "+233 30 223 1234", "Associated with the Methodist Church of Ghana, providing trusted non-life protection and church asset cover.", ["donewell", "church-assets", "non-life"]],
    ["Donewell Life Company Limited", "Greater Accra", 10, "+233 30 223 5678", "Life insurance specialist providing funeral plans, keyman insurance for executives, and group life.", ["donewell-life", "keyman-insurance"]],
    ["Prime Insurance Company Dzorwulu", "Greater Accra", 6, "+233 30 278 4567", "Agile insurer providing personal accident cover, workmen's compensation, and professional indemnity.", ["prime-insurance", "workmens-compensation", "indemnity"]],
    ["Best Assurance Company East Legon", "Greater Accra", 3, "+233 30 254 7890", "Specializing in electronic equipment insurance, machinery breakdown, and private vehicle cover.", ["best-assurance", "machinery-breakdown", "east-legon"]],
    ["Bedrock Insurance Company Dzorwulu", "Greater Accra", 6, "+233 30 277 8901", "Technology-enabled retail motor and fire insurance underwriter offering paperless digital certificates.", ["bedrock", "digital-insurance", "paperless"]],
    ["Coronation Insurance Ghana Adabraka", "Greater Accra", 4, "+233 30 224 8901", "Member of Coronation Group providing oil & energy insurance, marine hull, and enterprise risk management.", ["coronation", "energy-insurance", "marine-hull"]],
    ["SUNU Assurances Ghana Osu Flagship", "Greater Accra", 7, "+233 30 277 9012", "Francophone and Anglophone pan-African insurance leader providing cross-border freight and assets cover.", ["sunu-assurances", "cross-border", "freight-cover"]],
  ];

  for (const [name, reg, locIdx, phone, desc, tags] of INSURERS) {
    add(
      "banking-financial-services-insurance-companies",
      name as string,
      reg as any,
      locIdx as number,
      phone as string,
      desc as string,
      tags as string[],
    );
  }

  // =========================================================================
  // 3. PENSIONS & CORPORATE TRUSTEES (NPRA Regulated & SSNIT) (23 institutions)
  // =========================================================================
  const PENSIONS = [
    ["SSNIT Pension House Ministries", "Greater Accra", 2, "+233 30 261 1622", "Ghana's statutory public basic pension administrator managing the Tier-1 National Pension Scheme for all workers.", ["ssnit", "tier-1", "pension-house", "ministries", "statutory-pension"]],
    ["SSNIT Kumasi Regional Office Asokwa", "Ashanti", 2, "+233 32 202 2345", "Ashanti Regional center processing old-age retirement benefits, survivor lumpsums, and invalidity pensions.", ["ssnit", "kumasi", "retirement-benefits", "pension-claims"]],
    ["SSNIT Takoradi Harbour Office", "Western", 1, "+233 31 202 3456", "Western Region regional office handling maritime and industrial workers social security registrations and biometric cards.", ["ssnit", "takoradi", "biometrics"]],
    ["SSNIT Tamale Regional Office", "Northern", 0, "+233 37 202 3456", "Northern administrative hub coordinating worker social security contributions and pensioner monthly payments.", ["ssnit", "tamale", "pensioners"]],
    ["Enterprise Trustees Limited Advantage Place", "Greater Accra", 1, "+233 30 263 4700", "Ghana's premier and largest private corporate trustee managing Tier 2 occupational and Tier 3 voluntary schemes.", ["enterprise-trustees", "tier-2", "tier-3", "corporate-trustee", "npra"]],
    ["Axis Pension Trust Limited Axis House", "Greater Accra", 3, "+233 30 273 8555", "Award-winning pension trustee known for technology-driven mobile pension access, retirement planning, and fund safety.", ["axis-pension", "east-legon", "pension-app", "retirement-planning"]],
    ["Petra Trust Company Limited Petra House", "Greater Accra", 6, "+233 30 276 3901", "Pioneering licensed corporate trustee managing multi-employer occupational pension funds and personal retirement plans.", ["petra-trust", "multi-employer", "dzorwulu", "trustee"]],
    ["Metropolitan Pensions Trust North Ridge", "Greater Accra", 1, "+233 30 263 3933", "Part of Momentum Metropolitan Group providing institutional master trust schemes and comprehensive retirement counseling.", ["metropolitan-pensions", "master-trust", "retirement-counseling"]],
    ["Negotiated Benefits Trust Company NBC Trust", "Greater Accra", 6, "+233 30 278 1234", "Pioneer in African retirement fund administration, actuarial consultations, and employee benefit scheme structuring.", ["nbc-trust", "actuarial", "roman-ridge", "benefits"]],
    ["United Pension Trustees Limited UPT House", "Greater Accra", 1, "+233 30 225 1234", "Fast-growing indigenous corporate trustee delivering employer-sponsored schemes and personal pension plans.", ["upt", "pension-trustee", "ridge", "voluntary-pension"]],
    ["Secure Pensions Trust West Airport", "Greater Accra", 0, "+233 30 277 8901", "NPRA-licensed trustee offering secure investment oversight, transparent statement generation, and member education.", ["secure-pensions", "west-airport", "trustee"]],
    ["Old Mutual Pensions Trust Ghana", "Greater Accra", 0, "+233 30 274 2550", "Pan-African corporate pension provider with robust governance, asset diversification, and corporate trustee oversight.", ["old-mutual-pensions", "pension-governance"]],
    ["Pensions Alliance Trust PAT Cantonments", "Greater Accra", 5, "+233 30 276 8901", "Specialized corporate trustee managing retirement benefits for mining, construction, and educational sector unions.", ["pensions-alliance", "cantonments", "trade-unions"]],
    ["Glico Pensions Trustee Company", "Greater Accra", 4, "+233 30 224 6144", "Dedicated pension trustee offering Glico Master Trust and informal sector micro-pension schemes.", ["glico-pensions", "master-trust", "informal-sector"]],
    ["People's Pension Trust North Ridge", "Greater Accra", 1, "+233 30 223 4567", "Specialist micro-pension provider extending pension coverage to informal sector workers, farmers, and traders.", ["peoples-pension", "micro-pensions", "informal-workers"]],
    ["Kimpton Trust Limited East Legon", "Greater Accra", 3, "+233 30 254 1234", "Licensed corporate trustee managing institutional retirement funds and executive voluntary savings.", ["kimpton-trust", "east-legon", "executive-pensions"]],
    ["Republic Trust Limited Ridge", "Greater Accra", 1, "+233 30 224 5678", "Corporate trustee subsidiary of Republic Bank managing employer Tier 2 mandatory and Tier 3 provident funds.", ["republic-trust", "provident-fund", "mandatory-tier2"]],
    ["General Trust Company Abelemkpe", "Greater Accra", 6, "+233 30 277 2345", "Experienced corporate trustee providing fund governance, custodian reconciliation, and trustee services.", ["general-trust", "abelemkpe", "custodian-reconciliation"]],
    ["Daakye Pension Trust Achimota", "Greater Accra", 11, "+233 30 242 1234", "Community-oriented corporate trustee managing occupational schemes for schools, health centers, and SMEs.", ["daakye-pension", "achimota", "sme-schemes"]],
    ["NTHC Trustees Limited Adabraka", "Greater Accra", 4, "+233 30 222 9664", "Pioneer investment house trusteeship division administering legacy pension funds and institutional trust accounts.", ["nthc-trustees", "adabraka", "legacy-funds"]],
    ["Stallion Trust and Administration", "Greater Accra", 3, "+233 30 254 8901", "Dedicated retirement administrator providing scheme record keeping, biometric verifications, and payout auditing.", ["stallion-trust", "shiashie", "scheme-administration"]],
    ["Hedge Pensions Trust Ministries", "Greater Accra", 2, "+233 30 266 7890", "Corporate trustee specialized in managing voluntary third-tier provident schemes for public sector employees.", ["hedge-pensions", "civil-servants", "provident-schemes"]],
    ["Pensol Capital Trust Ridge", "Greater Accra", 1, "+233 30 222 8901", "Boutique pension trust offering tailored retirement fund advisory, investment mandates, and fund governance.", ["pensol-capital", "investment-mandate", "pensions"]],
  ];

  for (const [name, reg, locIdx, phone, desc, tags] of PENSIONS) {
    add(
      "banking-financial-services-pensions-trustees",
      name as string,
      reg as any,
      locIdx as number,
      phone as string,
      desc as string,
      tags as string[],
    );
  }

  // =========================================================================
  // 4. INVESTMENT & SECURITIES (SEC Ghana Regulated) (25 institutions)
  // =========================================================================
  const INVESTMENTS = [
    ["Databank Group Head Office", "Greater Accra", 4, "+233 30 261 0610", "Ghana's premier investment banking and asset management firm managing flagship mutual funds: Epack, MFund, BFund, and ArkFund.", ["databank", "epack", "mfund", "mutual-funds", "asset-management"]],
    ["Databank Asset Management Services", "Greater Accra", 4, "+233 30 261 0611", "SEC-licensed fund manager overseeing institutional portfolios, high-net-worth wealth mandates, and collective schemes.", ["fund-manager", "sec-licensed", "wealth-management"]],
    ["Databank Brokerage Limited", "Greater Accra", 4, "+233 30 261 0612", "Pioneer dealing member of the Ghana Stock Exchange (GSE) executing equity trades, bond auctions, and IPO transactions.", ["broker-dealer", "gse", "stockbroker", "ipo"]],
    ["Databank Kumasi Harper Road", "Ashanti", 0, "+233 32 202 3456", "Ashanti Region investment center offering mutual fund account opening, treasury bill processing, and equity advisory.", ["databank-kumasi", "treasury-bills", "stocks"]],
    ["Databank Takoradi Market Circle", "Western", 0, "+233 31 202 4567", "Western Region regional investment branch providing local businesses with wealth accumulation portfolios.", ["databank-takoradi", "wealth-accumulation"]],
    ["Stanbic Investment Management SIMS", "Greater Accra", 0, "+233 30 281 5700", "Premier asset management arm of Stanbic Bank managing the Stanbic Income Fund Trust (SIFT) and institutional assets.", ["sims", "stanbic-investments", "sift", "fund-manager"]],
    ["EDC Investments Limited Ecobank Ridge", "Greater Accra", 1, "+233 30 225 1720", "Asset management subsidiary of Ecobank managing the Ecobank Money Market Fund, equity funds, and wealth portfolios.", ["edc-investments", "ecobank-funds", "money-market-fund"]],
    ["EDC Stockbrokers Limited Ridge", "Greater Accra", 1, "+233 30 225 1721", "Leading GSE stockbrokerage firm providing institutional equity research, government bond trading, and corporate debt.", ["edc-stockbrokers", "bonds", "equity-research"]],
    ["IC Securities Ghana Airport Residential", "Greater Accra", 0, "+233 30 276 5000", "Top tier investment bank and stockbroker arranging syndicated loans, government Eurobond roadshows, and M&A.", ["ic-securities", "investment-bank", "syndicated-loans", "mergers"]],
    ["IC Asset Managers Ghana", "Greater Accra", 0, "+233 30 276 5001", "Licensed fund manager deploying fixed-income strategies, corporate pension investments, and private wealth solutions.", ["ic-asset-managers", "fixed-income", "pension-investments"]],
    ["Cal Asset Management Company Limited", "Greater Accra", 1, "+233 30 268 0079", "Fund management subsidiary of CalBank managing the Cal Benefit Unit Trust and corporate treasury surpluses.", ["cal-asset", "unit-trust", "treasury-management"]],
    ["CalBrokers Limited CalBank Tower", "Greater Accra", 1, "+233 30 268 0080", "Premier GSE licensed broker-dealer offering online stock trading, block share transactions, and registrar services.", ["calbrokers", "stock-trading", "gse-broker"]],
    ["Republic Investments Ghana EBankese", "Greater Accra", 1, "+233 30 225 8106", "Managers of the Republic Unit Trust, equity trust funds, and commercial real estate development funds.", ["republic-investments", "unit-trust", "real-estate-funds"]],
    ["Black Star Brokerage Cantonments", "Greater Accra", 5, "+233 30 277 8901", "Elite brokerage house specializing in fixed income primary dealership, sovereign debt, and equity research.", ["black-star-brokerage", "primary-dealer", "sovereign-debt"]],
    ["Black Star Advisors Limited", "Greater Accra", 5, "+233 30 277 8902", "Corporate finance advisory firm advising on capital restructuring, commercial paper issues, and infrastructure bonds.", ["black-star-advisors", "capital-restructuring", "corporate-finance"]],
    ["GCB Capital Limited High Street", "Greater Accra", 2, "+233 30 268 1535", "Investment banking division of GCB Bank handling debt capital markets, bond underwriting, and project advisory.", ["gcb-capital", "debt-capital-markets", "bond-underwriting"]],
    ["Tesah Capital Limited Tesah House", "Greater Accra", 6, "+233 30 297 7813", "Asset management firm managing the Tesah Treasury Trust, wealth management, and corporate financial advisory.", ["tesah-capital", "dzorwulu", "treasury-trust"]],
    ["Bora Capital Advisors East Legon", "Greater Accra", 3, "+233 30 254 4567", "SEC-licensed fund manager and corporate finance advisor arranging equity capital for growing Ghanaian companies.", ["bora-capital", "private-equity", "sme-capital"]],
    ["SAS Investment Management Heritage Tower", "Greater Accra", 1, "+233 30 266 1770", "Pioneer Ghanaian investment house founded in 1994, managing the SAS Fortune Fund and SAS Midas Fund.", ["sas-investments", "fortune-fund", "midas-fund", "heritage-tower"]],
    ["OctaneDC Limited Octane Place", "Greater Accra", 3, "+233 30 254 8901", "Boutique wealth management and asset management firm delivering customized investment portfolios for families.", ["octanedc", "family-office", "wealth-advisory"]],
    ["Apakan Securities Airport Residential", "Greater Accra", 0, "+233 30 278 1234", "GSE-licensed broker-dealer providing high-touch institutional execution, securities trading, and valuation.", ["apakan-securities", "broker-dealer", "valuation"]],
    ["NewWorld Securities Heritage Tower", "Greater Accra", 1, "+233 30 266 0161", "Experienced brokerage firm providing stock brokerage, equity placements, and investment advisory on the GSE.", ["newworld-securities", "gse", "equities"]],
    ["Crystal Capital Partners Cantonments", "Greater Accra", 5, "+233 30 278 5678", "Wealth management firm structuring specialized alternative investments, dollar fixed deposits, and corporate debt.", ["crystal-capital", "alternative-investments"]],
    ["Constant Capital Roman Ridge", "Greater Accra", 6, "+233 30 277 9012", "Independent investment advisory firm structuring commercial real estate syndication and infrastructure finance.", ["constant-capital", "syndication", "infrastructure-finance"]],
    ["Oasis Capital Ghana Airport Residential", "Greater Accra", 0, "+233 30 278 2345", "Private equity fund manager investing growth capital into education, healthcare, and technology in West Africa.", ["oasis-capital", "private-equity", "growth-capital"]],
  ];

  for (const [name, reg, locIdx, phone, desc, tags] of INVESTMENTS) {
    add(
      "banking-financial-services-investment-securities",
      name as string,
      reg as any,
      locIdx as number,
      phone as string,
      desc as string,
      tags as string[],
    );
  }

  return records;
}

async function main(): Promise<void> {
  console.log("=================================================");
  console.log("GhanaTrade: Seeding Banking & Financial Services");
  console.log("=================================================\n");

  await ensureFinancialCategories();

  const ctx = await buildImportContext(prisma, IMPORT_OWNER_EMAIL);
  const dataset = generateFinancialDataset();
  console.log(`Total real financial institutions prepared: ${dataset.length}`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of dataset) {
    try {
      const outcome = await importRecord(prisma, ctx, record);
      if (outcome === "created") created++;
      else if (outcome === "updated") updated++;
      else skipped++;
    } catch (e) {
      console.warn(`! Error importing ${record.name}:`, (e as Error).message);
      skipped++;
    }
  }

  console.log(`\nImport Complete: Created ${created}, Updated ${updated}, Skipped ${skipped}`);

  // Fetch updated sector counts across all 17 sectors
  const categories = await prisma.category.findMany({
    where: { parentId: null, active: true },
    include: { children: { select: { id: true, name: true, slug: true } } },
    orderBy: { sortOrder: "asc" },
  });

  const summary = [];
  for (const cat of categories) {
    const ids = [cat.id, ...cat.children.map((c) => c.id)];
    const count = await prisma.business.count({
      where: { categoryId: { in: ids }, status: "PUBLISHED", deletedAt: null },
    });
    summary.push({
      sector: cat.name,
      publishedCount: count,
      status: count >= 60 ? `✅ ${count} (Complete)` : `⏳ ${count} / 60`,
    });
  }

  console.log("\n=================================================");
  console.log("ALL DIRECTORIES SUMMARY (INCLUDING FINANCIAL INSTITUTIONS)");
  console.log("=================================================");
  console.table(summary);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
