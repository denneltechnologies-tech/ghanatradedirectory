"use client";

import { useState } from "react";

export function ShareButton({
  title,
  path,
  businessId,
}: {
  title: string;
  path: string;
  businessId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function track() {
    if (!businessId) return;
    try {
      await fetch("/api/v1/analytics/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
    } catch {
      // analytics must never block sharing
    }
  }

  async function share() {
    const url = `${window.location.origin}${path}`;
    void track();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} className="btn-secondary btn-sm">
      <span aria-hidden>🔗</span>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
