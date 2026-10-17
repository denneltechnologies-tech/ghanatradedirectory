"use client";

import { mailtoHref } from "@/lib/client-links";
import { normalizeGhPhone, telHref, whatsappHref } from "@/lib/format";

type ContactChannels = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
};

export function ContactActions({
  business,
  offeringId,
  orderUrl,
  compact = false,
}: {
  business: ContactChannels;
  offeringId?: string;
  orderUrl?: string | null;
  compact?: boolean;
}) {
  async function track(channel: string) {
    try {
      await fetch("/api/v1/analytics/click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId: business.id, offeringId, channel }),
      });
    } catch {
      // ignore
    }
  }

  const tel = telHref(business.phone);
  const whatsapp = whatsappHref(
    business.whatsapp ?? business.phone,
    `Hello ${business.name}, I found you on Ghana Business Directory.`,
  );
  const email = business.email ? mailtoHref(business.email, `Enquiry from Ghana Business Directory`) : null;
  const website = business.website ?? null;
  const sizeClass = compact ? "btn-sm" : "";

  if (!tel && !whatsapp && !email && !website && !orderUrl) {
    return <p className="text-sm text-ink-500">No public contact channels yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          onClick={() => void track("whatsapp")}
          className={`btn-primary ${sizeClass}`}
        >
          <span aria-hidden>💬</span> WhatsApp
        </a>
      ) : null}
      {tel ? (
        <a href={tel} onClick={() => void track("call")} className={`btn-secondary ${sizeClass}`}>
          <span aria-hidden>📞</span> Call {normalizeGhPhone(business.phone) ?? business.phone}
        </a>
      ) : null}
      {email ? (
        <a href={email} onClick={() => void track("email")} className={`btn-secondary ${sizeClass}`}>
          <span aria-hidden>✉</span> Email
        </a>
      ) : null}
      {website ? (
        <a
          href={website}
          target="_blank"
          rel="noreferrer nofollow"
          onClick={() => void track("website")}
          className={`btn-secondary ${sizeClass}`}
        >
          <span aria-hidden>🌐</span> Website
        </a>
      ) : null}
      {orderUrl ? (
        <a
          href={orderUrl}
          target="_blank"
          rel="noreferrer nofollow"
          onClick={() => void track("order")}
          className={`btn-secondary ${sizeClass}`}
        >
          <span aria-hidden>🛒</span> Order / buy
        </a>
      ) : null}
    </div>
  );
}
