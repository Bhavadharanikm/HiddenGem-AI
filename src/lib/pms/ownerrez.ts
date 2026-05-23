import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

const BASE_URL = "https://api.ownerreservations.com/v2";

const STATUS_MAP: Record<string, string> = {
  Booked: "confirmed", Confirmed: "confirmed", Inquiry: "inquiry",
  Cancelled: "cancelled", Blocked: "blocked", Closed: "confirmed",
};

export class OwnerRezAdapter implements PMSAdapter {
  readonly provider = "ownerrez" as const;
  private authHeader: string;

  constructor(private credentials: { client_id: string; client_secret: string }) {
    this.authHeader = "Basic " + btoa(`${credentials.client_id}:${credentials.client_secret}`);
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.authHeader, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OwnerRez API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  private async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const PAGE_SIZE = 100;
    let page = 1;
    const all: T[] = [];
    while (true) {
      const data = await this.get<{ items?: T[]; data?: T[] }>(path, {
        ...params, pageSize: String(PAGE_SIZE), page: String(page),
      });
      const items = data.items ?? data.data ?? [];
      all.push(...(items as T[]));
      if (items.length < PAGE_SIZE) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    }
    return all;
  }

  async testConnection() {
    try { await this.get("/properties", { pageSize: "1" }); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Unknown" }; }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/properties");
    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      const addr = (p.address ?? {}) as Record<string, unknown>;
      return {
        externalId: String(p.id ?? ""),
        name: String(p.name ?? p.title ?? ""),
        address: {
          street: String(addr.street ?? addr.address1 ?? ""),
          city: String(addr.city ?? ""),
          state: String(addr.state ?? addr.stateProvince ?? ""),
          country: String(addr.country ?? addr.countryCode ?? ""),
        },
        bedrooms: Number(p.bedroomsCount ?? p.bedrooms ?? 0),
        bathrooms: Number(p.bathroomsCount ?? p.bathrooms ?? 0),
        amenities: Array.isArray(p.amenities) ? p.amenities.map(String) : [],
        basePrice: Number(p.basePrice ?? p.nightlyRate ?? 0),
        currency: String(p.currency ?? p.currencyCode ?? "USD"),
        rawData: p,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {};
    if (params?.since) {
      query.modifiedSince = params.since;
    } else {
      const from = params?.from ?? new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const to   = params?.to   ?? new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
      query.arrivalFrom = from;
      query.arrivalTo   = to;
    }
    const results = await this.getAll<unknown>("/bookings", query);
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const rawStatus = String(res.status ?? "");
      return {
        externalId: String(res.id ?? ""),
        propertyExternalId: String(res.propertyId ?? res.propertyID ?? ""),
        status: STATUS_MAP[rawStatus] ?? rawStatus.toLowerCase(),
        checkIn: String(res.arrivalDate ?? res.checkIn ?? ""),
        checkOut: String(res.departureDate ?? res.checkOut ?? ""),
        guests: Number(res.adultCount ?? res.guests ?? 0),
        totalRevenue: Number(res.totalAmount ?? res.totalPrice ?? 0),
        platform: String(res.channelName ?? res.source ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
