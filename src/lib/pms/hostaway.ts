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
  new:           "confirmed",
  modified:      "confirmed",
  accepted:      "confirmed",
  confirmed:     "confirmed",
  reserved:      "confirmed",
  booked:        "confirmed",
  checkedIn:     "checked_in",
  checked_in:    "checked_in",
  checkedOut:    "checked_out",
  checked_out:   "checked_out",
  cancelled:     "cancelled",
  canceled:      "cancelled",
  declined:      "cancelled",
  blocked:       "blocked",
  ownerBlock:    "blocked",
  ownerStay:     "blocked",
  maintenance:   "blocked",
  inquiry:       "inquiry",
  request:       "inquiry",
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

      // Amenities may be string[], object[] with {name}/{amenityName}, or missing
      const rawAmenities = listing.amenities ?? listing.listingAmenities;
      const amenities: string[] = Array.isArray(rawAmenities)
        ? rawAmenities
            .map((a: unknown) => {
              if (typeof a === "string") return a;
              const o = a as Record<string, unknown>;
              return String(o.name ?? o.amenityName ?? o.amenityId ?? "");
            })
            .filter(Boolean)
        : [];

      // basePrice may live under several field names depending on Hostaway plan
      const basePrice =
        Number(listing.basePrice ?? listing.price ?? listing.baseRate ??
               listing.pricePerNight ?? listing.weeklyRate ?? 0);

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
        bedrooms: Number(listing.bedroomsNumber ?? listing.bedrooms ?? 0),
        bathrooms: Number(listing.bathroomsNumber ?? listing.bathrooms ?? 0),
        amenities,
        basePrice,
        currency: String(listing.currencyCode ?? listing.currency ?? "USD"),
        rawData: listing,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = { sortOrder: "desc" };
    if (params?.since) {
      query.modifiedFrom = String(Math.floor(new Date(params.since).getTime() / 1000));
    } else {
      // Full sync: 12 months back to 12 months forward.
      const from = params?.from ?? new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0];
      const to   = params?.to   ?? new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
      query.arrivalStartDate = from;
      query.arrivalEndDate   = to;
    }

    const results = await this.getAll<unknown>("/reservations", query);

    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const rawStatus = String(res.status ?? res.reservationStatus ?? "");
      // listingId is the standard field; fall back to channelListingId or unitId
      const propertyExternalId = String(
        res.listingId ?? res.channelListingId ?? res.unitId ?? res.propertyId ?? ""
      );
      return {
        externalId: String(res.id ?? res.reservationId ?? ""),
        propertyExternalId,
        status: STATUS_MAP[rawStatus] ?? (rawStatus || "confirmed"),
        checkIn:  parseHostawayDate(res.arrivalDate ?? res.checkIn ?? res.checkInDate),
        checkOut: parseHostawayDate(res.departureDate ?? res.checkOut ?? res.checkOutDate),
        guests: Number(res.guestCount ?? res.numberOfGuests ?? res.adults ?? 0),
        totalRevenue: Number(res.totalPrice ?? res.price ?? res.amount ?? 0),
        platform: String(res.channelName ?? res.source ?? res.channel ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> {
    return [];
  }
}
