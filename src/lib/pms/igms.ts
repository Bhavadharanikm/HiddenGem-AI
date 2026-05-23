import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

const BASE_URL = "https://api.igms.com/v1";

const IGMS_STATUS_MAP: Record<string, string> = {
  accepted: "confirmed", confirmed: "confirmed", booked: "confirmed",
  checked_in: "confirmed", checked_out: "confirmed",
  pending: "inquiry", inquiry: "inquiry", request: "inquiry",
  cancelled: "cancelled", canceled: "cancelled", declined: "cancelled",
  expired: "cancelled", blocked: "blocked", unavailable: "blocked",
};

export class IgmsAdapter implements PMSAdapter {
  readonly provider = "igms" as const;
  constructor(private credentials: { api_key: string }) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.credentials.api_key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`iGMS API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async testConnection() {
    try { await this.get("/listings", { limit: "1" }); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Unknown" }; }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const data = await this.get<{ data?: unknown[]; listings?: unknown[] } | unknown[]>("/listings");
    const results = Array.isArray(data) ? data
      : (data as { data?: unknown[] }).data
        ?? (data as { listings?: unknown[] }).listings ?? [];
    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      const addr = (p.address ?? {}) as Record<string, unknown>;
      return {
        externalId: String(p.id ?? p.listingId ?? ""),
        name: String(p.name ?? p.title ?? ""),
        address: {
          street: String(addr.street ?? addr.address ?? ""),
          city: String(addr.city ?? p.city ?? ""),
          state: String(addr.state ?? p.state ?? ""),
          country: String(addr.country ?? p.country ?? ""),
        },
        bedrooms: Number(p.bedrooms ?? p.bedroomsCount ?? 0),
        bathrooms: Number(p.bathrooms ?? p.bathroomsCount ?? 0),
        amenities: Array.isArray(p.amenities) ? p.amenities.map(String) : [],
        basePrice: Number(p.basePrice ?? p.price ?? 0),
        currency: String(p.currency ?? "USD"),
        rawData: p,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {};
    if (params?.since) {
      query.updatedAfter = params.since;
    } else {
      const from = params?.from ?? new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const to   = params?.to   ?? new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
      query.checkInFrom = from;
      query.checkInTo   = to;
    }
    const data = await this.get<{ data?: unknown[]; reservations?: unknown[] } | unknown[]>(
      "/reservations", query
    );
    const results = Array.isArray(data) ? data
      : (data as { data?: unknown[] }).data
        ?? (data as { reservations?: unknown[] }).reservations ?? [];
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const rawStatus = String(res.status ?? "").toLowerCase();
      return {
        externalId: String(res.id ?? res.reservationId ?? ""),
        propertyExternalId: String(res.listingId ?? res.propertyId ?? ""),
        status: IGMS_STATUS_MAP[rawStatus] ?? rawStatus,
        checkIn: String(res.checkIn ?? res.arrivalDate ?? ""),
        checkOut: String(res.checkOut ?? res.departureDate ?? ""),
        guests: Number(res.guests ?? res.guestsCount ?? 0),
        totalRevenue: Number(res.totalPrice ?? res.amount ?? 0),
        platform: String(res.channel ?? res.source ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
