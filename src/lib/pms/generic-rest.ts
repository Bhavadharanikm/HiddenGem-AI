import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

/**
 * Generic REST adapter for Streamline, LiveRez, Track, and Custom providers.
 * These systems expose REST APIs at a user-supplied base URL with Basic auth.
 * Tries common endpoint paths; if the API shape differs the sync returns 0
 * records (no error) until a provider-specific adapter is written.
 */
export class GenericRestAdapter implements PMSAdapter {
  readonly provider;
  private authHeader: string;

  constructor(
    provider: "streamline" | "liverez" | "track" | "custom",
    private credentials: { base_url: string; username?: string; password?: string; api_key?: string }
  ) {
    this.provider = provider;
    if (credentials.username && credentials.password) {
      this.authHeader = "Basic " + btoa(`${credentials.username}:${credentials.password}`);
    } else if (credentials.api_key) {
      this.authHeader = `Bearer ${credentials.api_key}`;
    } else {
      this.authHeader = "";
    }
  }

  private baseUrl() {
    return (this.credentials.base_url ?? "").replace(/\/$/, "");
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      headers: {
        ...(this.authHeader ? { Authorization: this.authHeader } : {}),
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${this.provider} API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async testConnection() {
    try {
      await this.get("/api/properties?limit=1");
      return { ok: true };
    } catch {
      try {
        await this.get("/properties?limit=1");
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Unknown" };
      }
    }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    for (const path of ["/api/properties", "/properties", "/api/listings", "/listings"]) {
      try {
        const data = await this.get<unknown>(path);
        const items: unknown[] = Array.isArray(data) ? data
          : (data as Record<string, unknown[]>).items
            ?? (data as Record<string, unknown[]>).data
            ?? (data as Record<string, unknown[]>).results ?? [];
        return items.map((l: unknown) => {
          const p = l as Record<string, unknown>;
          return {
            externalId: String(p.id ?? p.propertyId ?? ""),
            name: String(p.name ?? p.title ?? ""),
            address: { city: String(p.city ?? ""), state: String(p.state ?? ""), country: String(p.country ?? "") },
            bedrooms: Number(p.bedrooms ?? 0),
            bathrooms: Number(p.bathrooms ?? 0),
            amenities: [],
            basePrice: Number(p.basePrice ?? p.price ?? 0),
            currency: "USD",
            rawData: p,
          };
        });
      } catch { continue; }
    }
    console.warn(`[pms/${this.provider}] No recognised properties endpoint — returning empty`);
    return [];
  }

  async fetchBookings(_params?: BookingQueryParams): Promise<PMSBooking[]> {
    for (const path of ["/api/bookings", "/bookings", "/api/reservations", "/reservations"]) {
      try {
        const data = await this.get<unknown>(path);
        const items: unknown[] = Array.isArray(data) ? data
          : (data as Record<string, unknown[]>).items
            ?? (data as Record<string, unknown[]>).data
            ?? (data as Record<string, unknown[]>).results ?? [];
        return items.map((r: unknown) => {
          const res = r as Record<string, unknown>;
          return {
            externalId: String(res.id ?? res.bookingId ?? ""),
            propertyExternalId: String(res.propertyId ?? res.listingId ?? ""),
            status: String(res.status ?? "confirmed").toLowerCase(),
            checkIn: String(res.checkIn ?? res.arrivalDate ?? res.arrival ?? ""),
            checkOut: String(res.checkOut ?? res.departureDate ?? res.departure ?? ""),
            guests: Number(res.guests ?? res.guestCount ?? 0),
            totalRevenue: Number(res.totalPrice ?? res.totalAmount ?? 0),
            platform: String(res.channel ?? res.source ?? "direct"),
            rawData: res,
          };
        });
      } catch { continue; }
    }
    console.warn(`[pms/${this.provider}] No recognised bookings endpoint — returning empty`);
    return [];
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
