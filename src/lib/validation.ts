import { z } from "zod";
import {
  ClaimStatus,
  CoverageScope,
  LogisticsServiceType,
  OfferingType,
  ReportReason,
  ReportTargetType,
  UserRole,
} from "@/generated/prisma/enums";

const blankToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalText = (max = 500) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalNumber = z.preprocess((value) => {
  const cleaned = blankToUndefined(value);
  if (cleaned === undefined) return undefined;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().finite().optional());

const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true || value === "1",
  z.boolean(),
);

const csvToArray = z.preprocess((value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()).max(30));

const optionalHttpUrl = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .max(300)
    .refine((value) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(value), "Enter a full URL (https://...).")
    .optional(),
);

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(160),
  phone: optionalText(30),
  password: z.string().min(8, "Use at least 8 characters.").max(120),
  role: z.enum(UserRole).default("CUSTOMER"),
  acceptTerms: checkbox.refine((value) => value, "Please accept the terms to continue."),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset link is invalid."),
  password: z.string().min(8, "Use at least 8 characters.").max(120),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  phone: optionalText(30),
  password: z
    .preprocess(blankToUndefined, z.string().min(8, "Use at least 8 characters.").max(120).optional()),
});

// ---------------------------------------------------------------------------
// Businesses and offerings
// ---------------------------------------------------------------------------

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name.").max(140),
  description: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters so visitors know what you offer.")
    .max(400),
  longDescription: optionalText(4000),
  categoryId: z.string().trim().min(1, "Choose a sector."),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  email: z.preprocess(blankToUndefined, z.email().max(160).optional()),
  website: optionalHttpUrl,
  facebook: optionalHttpUrl,
  instagram: optionalHttpUrl,
  tiktok: optionalHttpUrl,
  twitter: optionalHttpUrl,
  contactHours: optionalText(200),
  preferredChannel: optionalText(40),
  registrationName: optionalText(160),
  registrationId: optionalText(80),
  deliveryOffered: checkbox,
  paymentMethods: csvToArray,
  languages: csvToArray,
  tags: csvToArray,
  accessibilityNotes: optionalText(500),
  regionId: z.string().trim().min(1, "Choose a region."),
  districtId: optionalText(60),
  locality: optionalText(120),
  address: optionalText(240),
  landmark: optionalText(240),
  latitude: optionalNumber,
  longitude: optionalNumber,
});

export const offeringSchema = z.object({
  businessId: z.string().trim().min(1),
  type: z.enum(OfferingType).default("PRODUCT"),
  title: z.string().trim().min(2, "Enter a title.").max(140),
  description: optionalText(2000),
  priceAmount: optionalNumber,
  currency: z.string().trim().min(3).max(3).default("GHS"),
  priceLabel: optionalText(80),
  availability: optionalText(80),
  deliveryNote: optionalText(300),
  actionUrl: optionalHttpUrl,
  sortOrder: z.preprocess((value) => {
    const cleaned = blankToUndefined(value);
    return cleaned === undefined ? 0 : Number(cleaned);
  }, z.number().int().min(0).max(999)),
});

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export const commentSchema = z.object({
  businessId: z.string().trim().min(1),
  parentId: optionalText(60),
  body: z
    .string()
    .trim()
    .min(2, "Comment is too short.")
    .max(1000, "Keep comments under 1000 characters."),
});

export const reportSchema = z.object({
  targetType: z.enum(ReportTargetType),
  targetId: z.string().trim().min(1),
  businessId: optionalText(60),
  reason: z.enum(ReportReason),
  detail: optionalText(1000),
});

export const claimSchema = z.object({
  businessId: z.string().trim().min(1),
  evidence: z
    .string()
    .trim()
    .min(10, "Describe the evidence you can provide (phone, documents, etc.).")
    .max(1500),
  contactPhone: optionalText(30),
});

export const claimDecisionSchema = z.object({
  claimId: z.string().trim().min(1),
  decision: z.enum(ClaimStatus),
  note: optionalText(1000),
});

// ---------------------------------------------------------------------------
// Logistics
// ---------------------------------------------------------------------------

export const providerProfileSchema = z.object({
  businessId: z.string().trim().min(1),
  description: z
    .string()
    .trim()
    .min(20, "Describe your service so customers know what you move and where.")
    .max(2000),
  serviceTypes: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return raw.filter((item): item is string =>
      Object.values(LogisticsServiceType).includes(item as LogisticsServiceType),
    );
  }, z.array(z.enum(LogisticsServiceType)).min(1, "Select at least one service type.")),
  coverage: z.preprocess((value) => {
    const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return raw.filter((item): item is string =>
      Object.values(CoverageScope).includes(item as CoverageScope),
    );
  }, z.array(z.enum(CoverageScope)).min(1, "Select at least one coverage level.")),
  baseRegionId: optionalText(60),
  baseDistrictId: optionalText(60),
  namedRoutes: csvToArray,
  vehicleTypes: csvToArray,
  capacityMinKg: optionalNumber,
  capacityMaxKg: optionalNumber,
  operatingHours: optionalText(200),
  trackingMethod: optionalText(200),
  insurancePolicy: optionalText(500),
  responseHours: z.preprocess((value) => {
    const cleaned = blankToUndefined(value);
    if (cleaned === undefined) return undefined;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? undefined : Math.round(parsed);
  }, z.number().int().min(1).max(720).optional()),
  contactChannel: optionalText(80),
  active: checkbox,
});

export const quoteRequestSchema = z.object({
  serviceType: z.enum(LogisticsServiceType),
  pickupRegionId: z.string().trim().min(1, "Choose the pickup region."),
  pickupDistrictId: optionalText(60),
  pickupDetails: z.string().trim().min(3, "Describe the pickup point.").max(300),
  dropoffRegionId: z.string().trim().min(1, "Choose the destination region."),
  dropoffDistrictId: optionalText(60),
  dropoffDetails: z.string().trim().min(3, "Describe the drop-off point.").max(300),
  requestedDate: z.preprocess(blankToUndefined, z.string().optional()),
  timeWindow: optionalText(80),
  cargoType: optionalText(120),
  cargoDescription: optionalText(1000),
  weightKg: optionalNumber,
  quantity: z.preprocess((value) => {
    const cleaned = blankToUndefined(value);
    if (cleaned === undefined) return undefined;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? undefined : Math.round(parsed);
  }, z.number().int().min(1).max(100000).optional()),
  vehicleNeeds: optionalText(300),
  specialHandling: optionalText(500),
  notes: optionalText(1000),
  contactName: z.string().trim().min(2, "Enter a contact name.").max(120),
  contactPhone: z.string().trim().min(6, "Enter a phone number.").max(30),
  contactEmail: z.preprocess(blankToUndefined, z.email().max(160).optional()),
  consentShare: checkbox.refine((value) => value, "You must consent to share this request."),
  recipientProfileIds: z.preprocess((value) => {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === "string" && value) return [value];
    return [];
  }, z.array(z.string()).min(1, "Select at least one provider.")),
});

export const quoteResponseSchema = z.object({
  quoteRequestId: z.string().trim().min(1),
  priceAmount: optionalNumber,
  currency: z.string().trim().min(3).max(3).default("GHS"),
  inclusions: optionalText(1000),
  estimatedPickup: optionalText(120),
  estimatedDelivery: optionalText(120),
  terms: optionalText(1500),
  validUntil: z.preprocess(blankToUndefined, z.string().optional()),
});

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  id: optionalText(60),
  name: z.string().trim().min(2).max(80),
  parentId: optionalText(60),
  icon: optionalText(8),
  description: optionalText(400),
  active: checkbox,
  featured: checkbox,
  sortOrder: z.preprocess((value) => {
    const cleaned = blankToUndefined(value);
    return cleaned === undefined ? 0 : Number(cleaned);
  }, z.number().int().min(0).max(999)),
});

export const districtSchema = z.object({
  regionId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  kind: optionalText(40),
});

export const moderationNoteSchema = z.object({
  note: optionalText(1000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type DistrictInput = z.infer<typeof districtSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type OfferingInput = z.infer<typeof offeringSchema>;
export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type QuoteResponseInput = z.infer<typeof quoteResponseSchema>;
