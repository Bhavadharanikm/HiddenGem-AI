import type {
  PMSAdapter,
  PMSProperty,
  PMSBooking,
  PMSReview,
  BookingQueryParams,
} from "./adapter";

type GuestyCredentials = {
  clientId?: string;
  clientSecret?: string;
  // also accept snake_case keys stored by the UI
  client_id?: string;
  client_secret?: string;
};

const BASE_URL = "https://open-api.guesty.com/v1";
const AUTH_URL = "https://open-api.guesty.com/oauth2/token";

export class GuestyAdapter implements PMSAdapter {
  readonly provider = "guesty" as const;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private credentials: GuestyCredentials) {}

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.credentials.clientId ?? this.credentials.client_id ?? "",
      client_secret: this.credentials.clientSecret ?? this.credentials.client_secret ?? "",
      scope: "open-api",
    });

    const MAX_RETRIES = 5;
    let delay = 3000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetch(AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
      } catch (err) {
        const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
        throw new Error(`Guesty auth network error${cause}`);
      }
      if (res.status === 429) {
        if (attempt === MAX_RETRIES) throw new Error(`Guesty auth rate limited after ${MAX_RETRIES} retries`);
        const retryAfter = Number(res.headers.get("Retry-After") ?? 0) * 1000;
        await new Promise((r) => setTimeout(r, retryAfter || delay));
        delay *= 2;
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Guesty auth failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return this.accessToken!;
    }
    throw new Error("Guesty auth failed after retries");
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${BASE_URL}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const MAX_RETRIES = 5;
    let delay = 2000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 429) {
        if (attempt === MAX_RETRIES) throw new Error(`Guesty API error 429: ${path} (rate limited after ${MAX_RETRIES} retries)`);
        const retryAfter = Number(res.headers.get("Retry-After") ?? 0) * 1000;
        await new Promise((r) => setTimeout(r, retryAfter || delay));
        delay *= 2;
        continue;
      }
      if (!res.ok) throw new Error(`Guesty API error ${res.status}: ${path}`);
      return res.json();
    }
    throw new Error(`Guesty API error: ${path}`);
  }

  private async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const PAGE = 100;
    let skip = 0;
    const all: T[] = [];
    while (true) {
      const data = await this.get<{ results: T[]; count: number }>(path, {
        ...params,
        limit: String(PAGE),
        skip: String(skip),
      });
      const results = data.results ?? [];
      all.push(...results);
      if (all.length >= data.count || results.length < PAGE) break;
      skip += PAGE;
      await new Promise((r) => setTimeout(r, 200));
    }
    return all;
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
    const results = await this.getAll<unknown>("/listings", {
      // Without explicit fields, Guesty omits bedrooms, bathrooms, pictures, prices, etc.
      fields: "_id title nickname accommodates bedrooms bathrooms address prices amenities pictures publicDescription tags active isListed",
    });
    return results.map((l: unknown) => {
      const listing = l as Record<string, unknown>;
      const address = (listing.address ?? {}) as Record<string, unknown>;
      const prices = (listing.prices ?? listing.pricing ?? {}) as Record<string, unknown>;
      return {
        externalId: String(listing._id ?? ""),
        name: String(listing.nickname ?? listing.title ?? listing.name ?? ""),
        address: {
          street: String(address.street ?? address.full ?? ""),
          city: String(address.city ?? ""),
          state: String(address.state ?? ""),
          country: String(address.country ?? ""),
        },
        bedrooms: Number(listing.bedrooms ?? listing.bedroomsCount ?? 0),
        bathrooms: Number(listing.bathrooms ?? listing.bathroomsCount ?? 0),
        amenities: Array.isArray(listing.amenities) ? listing.amenities.map(String) : [],
        basePrice: Number(prices.basePrice ?? prices.base ?? 0),
        currency: String(prices.currency ?? "USD"),
        rawData: listing,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {
      // Without explicit fields, Guesty returns only minimal data (_id, dates, listingId).
      // This tells Guesty to include status, money, guest count, and channel fields.
      fields: "_id status checkInDateLocalized checkOutDateLocalized checkIn checkOut guestsCount listing listingId money source channel integration lastUpdatedAt",
    };

    if (params?.since) {
      // Guesty v1 filter syntax — simple query params are ignored; must use filters[] array
      query["filters[0][field]"] = "lastUpdatedAt";
      query["filters[0][operator]"] = "gte";
      query["filters[0][value]"] = params.since;
    }

    const results = await this.getAll<unknown>("/reservations", query);
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const money = (res.money ?? {}) as Record<string, unknown>;
      const listing = (res.listing ?? {}) as Record<string, unknown>;
      const guestsField = (res.guests ?? {}) as Record<string, unknown>;

      // Guesty returns listingId as a top-level field OR nested under listing._id
      const propertyExternalId = String(
        res.listingId ?? listing._id ?? listing.id ?? ""
      );

      // Revenue: try multiple field names Guesty uses across API versions
      const totalRevenue = Number(
        money.totalPaid ?? money.netIncome ?? money.fareAccommodation ??
        money.hostPayout ?? money.totalRevenue ?? 0
      );

      // Guest count: top-level or nested; guests object may have adults/children
      const guestCount = Number(
        res.guestsCount ?? res.numberOfGuests ?? res.guestCount ??
        guestsField.count ?? guestsField.total ??
        ((guestsField.adults !== undefined)
          ? Number(guestsField.adults ?? 0) + Number(guestsField.children ?? 0)
          : undefined) ?? 0
      );

      // Dates: localized versions are more reliable
      const checkIn = String(
        res.checkInDateLocalized ?? res.checkIn ?? res.checkInDate ?? ""
      );
      const checkOut = String(
        res.checkOutDateLocalized ?? res.checkOut ?? res.checkOutDate ?? ""
      );

      // Platform/channel: Guesty returns channel as { _id, name } object, not a string
      const channelRaw = res.source ?? res.channel ?? res.integration;
      const platform = channelRaw == null
        ? "direct"
        : typeof channelRaw === "object"
          ? String((channelRaw as Record<string, unknown>).name ?? (channelRaw as Record<string, unknown>)._id ?? "direct")
          : String(channelRaw || "direct");

      // Status: try multiple field names
      const status = String(res.status ?? res.reservationStatus ?? res.type ?? "");

      return {
        externalId: String(res._id ?? res.id ?? ""),
        propertyExternalId,
        status,
        checkIn,
        checkOut,
        guests: guestCount,
        totalRevenue,
        platform,
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
