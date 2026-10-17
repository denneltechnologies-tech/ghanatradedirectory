import { humanizeEnum, formatDate } from "@/lib/format";
import type {
  BusinessStatus,
  VerificationLevel,
  QuoteRequestStatus,
  OfferingStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";

const STATUS_TONE: Record<BusinessStatus, string> = {
  DRAFT: "badge-neutral",
  PENDING_REVIEW: "badge-gold",
  PUBLISHED: "badge-brand",
  REJECTED: "badge-danger",
  SUSPENDED: "badge-danger",
  ARCHIVED: "badge-neutral",
};

export function StatusBadge({ status }: { status: BusinessStatus }) {
  return <span className={STATUS_TONE[status]}>{humanizeEnum(status)}</span>;
}

const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  UNVERIFIED: "Not yet checked",
  CONTACT_CONFIRMED: "Phone confirmed",
  DOCUMENTS_REVIEWED: "Documents reviewed",
  LOCATION_CHECKED: "Location checked",
};

export function VerificationBadge({
  level,
  verifiedAt,
  compact = false,
}: {
  level: VerificationLevel;
  verifiedAt?: Date | string | null;
  compact?: boolean;
}) {
  if (level === "UNVERIFIED") {
    return <span className="badge-neutral">Unverified</span>;
  }
  const label = VERIFICATION_LABEL[level];
  const suffix = !compact && verifiedAt ? ` \u00b7 ${formatDate(verifiedAt)}` : "";
  return (
    <span className="badge-brand">
      <span aria-hidden>✓</span>
      {label}
      {suffix}
    </span>
  );
}

export function QuoteStatusBadge({ status }: { status: QuoteRequestStatus }) {
  const tone: Record<QuoteRequestStatus, string> = {
    DRAFT: "badge-neutral",
    SENT: "badge-gold",
    RESPONSES_RECEIVED: "badge-brand",
    ACCEPTED: "badge-brand",
    CANCELLED: "badge-neutral",
    CLOSED: "badge-neutral",
  };
  return <span className={tone[status]}>{humanizeEnum(status)}</span>;
}

const USER_STATUS_TONE: Record<UserStatus, string> = {
  ACTIVE: "badge-brand",
  SUSPENDED: "badge-danger",
  DEACTIVATED: "badge-neutral",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <span className={USER_STATUS_TONE[status]}>{humanizeEnum(status)}</span>;
}

const ROLE_TONE: Record<UserRole, string> = {
  CUSTOMER: "badge-neutral",
  BUSINESS_OWNER: "badge-brand",
  LOGISTICS_PROVIDER: "badge-gold",
  MODERATOR: "badge-brand",
  ADMIN: "badge-gold",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={ROLE_TONE[role]}>{humanizeEnum(role)}</span>;
}

export function OfferingStatusBadge({ status }: { status: OfferingStatus }) {
  return (
    <span className={status === "ACTIVE" ? "badge-brand" : "badge-neutral"}>
      {humanizeEnum(status)}
    </span>
  );
}
