import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

const BASE_URL = "https://beds24.com/api/v2";

export class Beds24Adapter implements PMSAdapter {
  readonly provider = "beds24" as const;
  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(private credentials: { entry_id: string; api_key: string }) {}

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token;

    // Try using api_key directly as a long-lived token first.
    // If that fails, exchange entry_id (invite code) for a token.
    if (this.credentials.api_key) {
      this.token = this.credentials.api_key;
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // assume valid for 23h
      return this.token;
    }

    const res = await fetch(`${BASE_URL}/authentication/setup`, {
      method: "GET",
      headers: { code: this.credentials.entry_id },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Beds24 auth failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    this.token = data.token ?? data.access_token;
    this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return this.token!;
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { token, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Beds24 API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async testConnection() {
    try { await this.get("/properties", { limit: "1" }); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Unknown" }; }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const data = await this.get<{ data?: unknown[] } | unknown[]>("/properties");
    const results = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      return {
        externalId: String(p.id ?? p.propId ?? ""),
        name: String(p.name ?? p.title ?? ""),
        address: {
          street: String(p.address ?? ""),
          city: String(p.city ?? ""),
          state: String(p.state ?? p.province ?? ""),
          country: String(p.country ?? p.countryCode ?? ""),
        },
        bedrooms: Number(p.numBedrooms ?? p.bedrooms ?? 0),
        bathrooms: Number(p.numBathrooms ?? p.bathrooms ?? 0),
        amenities: Array.isArray(p.amenities) ? p.amenities.map(String) : [],
        basePrice: Number(p.price ?? p.basePrice ?? 0),
        currency: String(p.currency ?? "USD"),
        rawData: p,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {};
    if (params?.since) query.modifiedSince = params.since;
    const data = await this.get<{ data?: unknown[] } | unknown[]>("/bookings", query);
    const results = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const rawStatus = String(res.status ?? "");
      const status = rawStatus === "0" ? "confirmed"
        : rawStatus === "1" ? "confirmed"
        : rawStatus === "2" ? "cancelled"
        : rawStatus.toLowerCase();
      return {
        externalId: String(res.id ?? res.bookId ?? ""),
        propertyExternalId: String(res.propId ?? res.propertyId ?? ""),
        status,
        checkIn: String(res.firstNight ?? res.checkIn ?? res.arrivalDate ?? ""),
        checkOut: String(res.lastNight ?? res.checkOut ?? res.departureDate ?? ""),
        guests: Number(res.numAdult ?? res.guests ?? 0),
        totalRevenue: Number(res.price ?? res.totalPrice ?? 0),
        platform: String(res.bookedVia ?? res.channel ?? res.source ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
