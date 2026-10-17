import { extractDomain } from "@/lib/sector-media";

export type DiscoveredLogoResult = {
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  source: "google_places" | "website_meta" | "google_favicon" | null;
};

/**
 * Discovers the official, accurate logo for a Ghanaian business online.
 * 1. Checks Google Places API if GOOGLE_PLACES_API_KEY is configured.
 * 2. Crawls the business's website (if available) for og:image, apple-touch-icon, and SVG/PNG logos.
 * 3. Uses Google high-resolution favicon service (256px).
 */
export async function discoverAccurateLogo(
  businessName: string,
  existingWebsite?: string | null,
): Promise<DiscoveredLogoResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

  // 1. Try Google Places API (New) if API key is provided
  if (apiKey) {
    try {
      const placesResult = await searchGooglePlaces(businessName, apiKey);
      if (placesResult?.logoUrl || placesResult?.website) {
        return placesResult;
      }
    } catch (err) {
      console.error("[LogoDiscovery] Google Places API error:", err);
    }
  }

  // 2. If website exists, crawl it to extract the real logo / og:image
  let targetWebsite = existingWebsite;
  if (!targetWebsite) {
    targetWebsite = await searchOfficialWebsite(businessName);
  }

  if (targetWebsite) {
    const domain = extractDomain(targetWebsite);
    if (domain && !domain.includes("facebook.com") && !domain.includes("instagram.com")) {
      try {
        const scrapedLogo = await scrapeWebsiteLogo(targetWebsite);
        if (scrapedLogo) {
          return {
            logoUrl: scrapedLogo,
            website: targetWebsite,
            phone: null,
            address: null,
            source: "website_meta",
          };
        }
      } catch {
        // Fall back to Google high-res favicon
      }

      return {
        logoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
        website: targetWebsite,
        phone: null,
        address: null,
        source: "google_favicon",
      };
    }
  }

  return {
    logoUrl: null,
    website: null,
    phone: null,
    address: null,
    source: null,
  };
}

/**
 * Query Google Places API (New) text search for accurate business data, photos, and website.
 */
async function searchGooglePlaces(
  businessName: string,
  apiKey: string,
): Promise<DiscoveredLogoResult | null> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.photos",
      },
      body: JSON.stringify({
        textQuery: `${businessName} Ghana`,
        maxResultCount: 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const place = data.places?.[0];
    if (!place) return null;

    let logoUrl: string | null = null;
    const website = place.websiteUri || null;
    const phone = place.nationalPhoneNumber || null;
    const address = place.formattedAddress || null;

    if (place.photos && place.photos.length > 0) {
      const photoName = place.photos[0].name;
      logoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=600&maxWidthPx=600&key=${apiKey}`;
    } else if (website) {
      const domain = extractDomain(website);
      if (domain) {
        logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
      }
    }

    return {
      logoUrl,
      website,
      phone,
      address,
      source: "google_places",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Scrapes a website's HTML to locate its og:image, apple-touch-icon, or brand logo.
 */
async function scrapeWebsiteLogo(websiteUrl: string): Promise<string | null> {
  const rawUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(rawUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const html = await res.text();

    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1]) {
      return resolveUrl(ogMatch[1], rawUrl);
    }

    const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
    if (appleMatch && appleMatch[1]) {
      return resolveUrl(appleMatch[1], rawUrl);
    }

    const svgIconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+type=["']image\/svg\+xml["'][^>]+href=["']([^"']+)["']/i);
    if (svgIconMatch && svgIconMatch[1]) {
      return resolveUrl(svgIconMatch[1], rawUrl);
    }

    const logoImgMatch = html.match(/<img[^>]+(?:class|id|alt)=["'][^"']*(?:logo|brand)[^"']*["'][^>]+src=["']([^"']+)["']/i);
    if (logoImgMatch && logoImgMatch[1] && !logoImgMatch[1].endsWith(".gif")) {
      return resolveUrl(logoImgMatch[1], rawUrl);
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lightweight web search for an official website domain.
 */
async function searchOfficialWebsite(businessName: string): Promise<string | null> {
  const query = encodeURIComponent(`${businessName} Ghana official website`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const html = await res.text();

    const matches = Array.from(html.matchAll(/class="result__url"[^>]*href=["']([^"']+)["']/gi));
    const ignored = [
      "duckduckgo.com",
      "google.com",
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "x.com",
      "linkedin.com",
      "yellowpages",
      "ghanayello",
      "businessghana.com",
      "wikipedia.org",
      "tripadvisor.com",
      "booking.com",
    ];

    for (const m of matches) {
      let raw = m[1];
      if (raw.includes("uddg=")) {
        const parsed = new URL(raw, "https://html.duckduckgo.com");
        raw = decodeURIComponent(parsed.searchParams.get("uddg") || "");
      }
      if (raw.startsWith("http") && !ignored.some((ign) => raw.toLowerCase().includes(ign))) {
        return raw;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}
