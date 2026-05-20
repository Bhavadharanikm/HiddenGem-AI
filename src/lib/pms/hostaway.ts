import type {
  PMSAdapter,
  PMSProperty,
  PMSBooking,
  PMSReview,
  BookingQueryParams,
} from "./adapter";

type HostawayCredentials = {
  accountId: string;
  apiKey: string;
};

const BASE_URL = "https://api.hostaway.com/v1";

export class HostawayAdapter implements PMSAdapter {
  readonly provider = "hostaway" as const;

  constructor(private credentials: HostawayCredentials) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.credentials.apiKey}`,
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) throw new Error(`Hostaway API error ${res.status}: ${path}`);
    const json = await res.json();
    return json.result ?? json;
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
    const data = await this.get<unknown[]>("/listings");
    return (data ?? []).map((l: unknown) => {
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
        amenities: Array.isArray(listing.amenities)
          ? listing.amenities.map(String)
          : [],
        basePrice: Number(listing.basePrice ?? 0),
        currency: String(listing.currencyCode ?? "USD"),
        rawData: listing,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {
      limit: String(params?.limit ?? 100),
      sortOrder: "desc",
    };
    if (params?.since) {
      // Hostaway uses Unix timestamps
      query.modifiedFrom = String(Math.floor(new Date(params.since).getTime() / 1000));
    }

    const data = await this.get<unknown[]>("/reservations", query);

    // Hostaway status vocabulary differs from Guesty
    const statusMap: Record<string, string> = {
      new: "confirmed",
      cancelled: "cancelled",
      blocked: "blocked",
      inquiry: "inquiry",
    };

    return (data ?? []).map((r: unknown) => {
      const res = r as Record<string, unknown>;
      return {
        externalId: String(res.id ?? ""),
        propertyExternalId: String(res.listingId ?? ""),
        status: statusMap[String(res.status ?? "")] ?? String(res.status ?? ""),
        checkIn: new Date(Number(res.arrivalDate) * 1000).toISOString().split("T")[0],
        checkOut: new Date(Number(res.departureDate) * 1000).toISOString().split("T")[0],
        guests: Number(res.guestCount ?? 0),
        totalRevenue: Number(res.totalPrice ?? 0),
        platform: String(res.channelName ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> {
    // Hostaway reviews endpoint varies by plan
    return [];
  }
}
