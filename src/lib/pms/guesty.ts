import type {
  PMSAdapter,
  PMSProperty,
  PMSBooking,
  PMSReview,
  BookingQueryParams,
} from "./adapter";

type GuestyCredentials = {
  clientId: string;
  clientSecret: string;
};

const BASE_URL = "https://open-api.guesty.com/v1";
const AUTH_URL = "https://auth.guesty.com/oauth/token";

export class GuestyAdapter implements PMSAdapter {
  readonly provider = "guesty" as const;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private credentials: GuestyCredentials) {}

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: "open-api",
      }),
    });
    if (!res.ok) throw new Error(`Guesty auth failed: ${res.status}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${BASE_URL}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Guesty API error ${res.status}: ${path}`);
    return res.json();
  }

  async testConnection() {
    try {
      await this.get("/account");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown" };
    }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const data = await this.get<{ results: unknown[] }>("/listings", {
      fields: "title,address,bedrooms,bathrooms,amenities,defaultCheckInTime,prices",
    });
    return (data.results ?? []).map((l: unknown) => {
      const listing = l as Record<string, unknown>;
      const address = (listing.address ?? {}) as Record<string, unknown>;
      const prices = (listing.prices ?? {}) as Record<string, unknown>;
      return {
        externalId: String(listing._id ?? ""),
        name: String(listing.title ?? ""),
        address: {
          street: String(address.street ?? ""),
          city: String(address.city ?? ""),
          state: String(address.state ?? ""),
          country: String(address.country ?? ""),
        },
        bedrooms: Number(listing.bedrooms ?? 0),
        bathrooms: Number(listing.bathrooms ?? 0),
        amenities: Array.isArray(listing.amenities) ? listing.amenities.map(String) : [],
        basePrice: Number(prices.basePrice ?? 0),
        currency: String(prices.currency ?? "USD"),
        rawData: listing,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {
      fields: "listingId,status,checkIn,checkOut,guestsCount,money,source",
      limit: String(params?.limit ?? 100),
    };
    if (params?.since) query.updatedAfter = params.since;

    const data = await this.get<{ results: unknown[] }>("/reservations", query);
    return (data.results ?? []).map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const money = (res.money ?? {}) as Record<string, unknown>;
      return {
        externalId: String(res._id ?? ""),
        propertyExternalId: String(res.listingId ?? ""),
        status: String(res.status ?? ""),
        checkIn: String(res.checkIn ?? ""),
        checkOut: String(res.checkOut ?? ""),
        guests: Number(res.guestsCount ?? 0),
        totalRevenue: Number(money.totalPaid ?? 0),
        platform: String(res.source ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(propertyId: string): Promise<PMSReview[]> {
    const data = await this.get<{ results: unknown[] }>("/reviews", {
      listingId: propertyId,
    });
    return (data.results ?? []).map((r: unknown) => {
      const review = r as Record<string, unknown>;
      return {
        externalId: String(review._id ?? ""),
        propertyExternalId: propertyId,
        rating: Number(review.rating ?? 0),
        reviewerName: String(review.reviewerName ?? ""),
        reviewText: String(review.publicReview ?? ""),
        responseText: String(review.response ?? ""),
        reviewDate: String(review.createdAt ?? ""),
        rawData: review,
      };
    });
  }
}
