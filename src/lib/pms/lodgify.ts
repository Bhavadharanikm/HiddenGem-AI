import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

const BASE_URL = "https://api.lodgify.com";

const STATUS_MAP: Record<string, string> = {
  Booked: "confirmed", Confirmed: "confirmed", Tentative: "inquiry",
  Cancelled: "cancelled", Declined: "cancelled", Closed: "confirmed",
};

export class LodgifyAdapter implements PMSAdapter {
  readonly provider = "lodgify" as const;
  constructor(private credentials: { api_key: string }) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { "X-ApiKey": this.credentials.api_key, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Lodgify API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  private async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const PAGE_SIZE = 50;
    let page = 1;
    const all: T[] = [];
    while (true) {
      const data = await this.get<{ items?: T[]; result?: T[] } | T[]>(path, {
        ...params, page: String(page), pageSize: String(PAGE_SIZE), includeCount: "true",
      });
      const items: T[] = Array.isArray(data)
        ? data
        : (data as { items?: T[]; result?: T[] }).items ?? (data as { result?: T[] }).result ?? [];
      all.push(...items);
      if (items.length < PAGE_SIZE) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    }
    return all;
  }

  async testConnection() {
    try { await this.get("/v2/properties", { pageSize: "1" }); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Unknown" }; }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/v2/properties");
    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      const addr = (p.location ?? p.address ?? {}) as Record<string, unknown>;
      const prices = (p.priceSettings ?? {}) as Record<string, unknown>;
      return {
        externalId: String(p.id ?? ""),
        name: String(p.name ?? ""),
        address: {
          street: String(addr.address ?? addr.street ?? ""),
          city: String(addr.city ?? p.city ?? ""),
          state: String(addr.region ?? addr.state ?? p.state ?? ""),
          country: String(addr.countryCode ?? addr.country ?? p.country ?? ""),
          lat: Number(addr.latitude ?? 0),
          lng: Number(addr.longitude ?? 0),
        },
        bedrooms: Number(p.bedroomsCount ?? p.bedrooms ?? 0),
        bathrooms: Number(p.bathroomsCount ?? p.bathrooms ?? 0),
        amenities: Array.isArray(p.amenities) ? p.amenities.map(String) : [],
        basePrice: Number(prices.price ?? prices.basePrice ?? p.basePrice ?? 0),
        currency: String(prices.currencyCode ?? p.currencyCode ?? "USD"),
        rawData: p,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = {};
    if (params?.since) query.updatedSince = params.since;
    const results = await this.getAll<unknown>("/v2/reservations", query);
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const rawStatus = String(res.status ?? "");
      return {
        externalId: String(res.id ?? ""),
        propertyExternalId: String(res.propertyId ?? res.houseId ?? ""),
        status: STATUS_MAP[rawStatus] ?? rawStatus.toLowerCase(),
        checkIn: String(res.arrival ?? res.checkIn ?? ""),
        checkOut: String(res.departure ?? res.checkOut ?? ""),
        guests: Number(res.guestsCount ?? res.guests ?? 0),
        totalRevenue: Number(res.totalAmount ?? res.totalPrice ?? res.price ?? 0),
        platform: String(res.source ?? res.channelName ?? "direct"),
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
