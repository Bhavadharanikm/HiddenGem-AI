import type {
  PMSAdapter,
  PMSProperty,
  PMSBooking,
  PMSReview,
  BookingQueryParams,
} from "./adapter";

type HostawayCredentials = {
  accountId: string;
  apiKey: string; // client_secret used in OAuth2 client_credentials flow
};

const BASE_URL = "https://api.hostaway.com/v1";
const TOKEN_URL = "https://api.hostaway.com/v1/accessTokens";

// Hostaway returns dates as Unix timestamps (number), YYYY-MM-DD strings, or null
function parseHostawayDate(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n * 1000).toISOString().split("T")[0];
}

const STATUS_MAP: Record<string, string> = {
  new:        "confirmed",
  modified:   "confirmed",
  cancelled:  "cancelled",
  blocked:    "blocked",
  inquiry:    "inquiry",
  declined:   "cancelled",
};

export class HostawayAdapter implements PMSAdapter {
  readonly provider = "hostaway" as const;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(private credentials: HostawayCredentials) {}

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.credentials.accountId,
        client_secret: this.credentials.apiKey,
        scope: "general",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Hostaway auth failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Hostaway API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    return json.result ?? json;
  }

  private async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const LIMIT = 100;
    let offset = 0;
    const all: T[] = [];

    while (true) {
      const page = await this.get<T[]>(path, {
        ...params,
        limit: String(LIMIT),
        offset: String(offset),
      });

      const results = Array.isArray(page) ? page : [];
      all.push(...results);
      if (results.length < LIMIT) break;
      offset += LIMIT;
      await new Promise((r) => setTimeout(r, 200));
    }

    return all;
  }

  async testConnection() {
    try {
      await this.get("/listings", { limit: "1" });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown" };
    }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/listings");

    return results.map((l: unknown) => {
      const listing = l as Record<string, unknown>;
      return {
        externalId: String(listing.id ?? ""),
        name: String(listing.name ?? ""),
        address: {
          street: String(listing.address ?? ""),
          city: String(listing.city ?? ""),
          state: String(listing.state ?? ""),
          country: String(listing.countryCode ?? ""),
          lat: Number(listing.lat ?? 0),
          lng: Number(listing.lng ?? 0),
        },
        bedrooms: Number(listing.bedroomsNumber ?? 0),
        bathrooms: Number(listing.bathroomsNumber ?? 0),
        amenities: Array.isArray(listing.amenities) ? listing.amenities.map(String) : [],
        basePrice: Number(listing.basePrice ?? 0),
        currency: String(listing.currencyCode ?? "USD"),
        rawData: listing,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = { sortOrder: "desc" };
    if (params?.since) {
      query.modifiedFrom = String(Math.floor(new Date(params.since).getTime() / 1000));
    } else {
      // Full sync — 3 months back to 3 months forward
      const from = params?.from ?? new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const to   = params?.to   ?? new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
      query.arrivalStartDate = from;
      query.arrivalEndDate   = to;
    }

    const results = await this.getAll<unknown>("/reservations", query);

    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const rawStatus = String(res.status ?? "");
      return {
        externalId: String(res.id ?? ""),
        propertyExternalId: String(res.listingId ?? ""),
        status: STATUS_MAP[rawStatus] ?? rawStatus,
        checkIn: parseHostawayDate(res.arrivalDate),
        checkOut: parseHostawayDate(res.departureDate),
        guests: Number(res.guestCount ?? 0),
        totalRevenue: Number(res.totalPrice ?? 0),
        platform: String(res.channelName ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> {
    return [];
  }
}
